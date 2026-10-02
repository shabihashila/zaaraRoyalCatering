using System.Text.Json;
using FluentValidation;
using Identity.Infrastructure.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using ZRC.Modules.Identity.Application;
using ZRC.Modules.Identity.Contracts;
using ZRC.Modules.Identity.Domain;
using ZRC.SharedKernel;

namespace ZRC.Modules.Identity.Api;

public sealed record CreateStaffRequest(string Email, string Password, string DisplayName, string[] Roles);
public sealed record SetRolesRequest(string[] Roles);
public sealed record SetPermissionsRequest(string[] Permissions);

public sealed class CreateStaffValidator : AbstractValidator<CreateStaffRequest>
{
    public CreateStaffValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).MinimumLength(8);
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Roles).NotEmpty();
    }
}

public static class AdminUserEndpoints
{
    public static void Map(RouteGroupBuilder g)
    {
        g.MapGet("/users", ListUsers).RequirePermission(IdentityPermissions.UserView);
        g.MapPost("/users", CreateStaff).RequirePermission(IdentityPermissions.UserManage);
        g.MapPut("/users/{id}/roles", SetRoles).RequirePermission(IdentityPermissions.RoleManage);
        g.MapGet("/roles", ListRoles).RequirePermission(IdentityPermissions.RoleView);
        g.MapPut("/roles/{id}/permissions", SetPermissions).RequirePermission(IdentityPermissions.RoleManage);
        g.MapGet("/audit", ListAudit).RequirePermission(IdentityPermissions.AuditView);
    }

    private static async Task<IResult> ListUsers(int page, int pageSize, UserManager<ZrcUser> users, CancellationToken ct)
    {
        page = Math.Max(page, 1); pageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 200);
        var q = users.Users.OrderBy(u => u.Email);
        var total = await q.CountAsync(ct);
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new { id = u.Id, email = u.Email, name = u.DisplayName, phone = u.PhoneNumber, isStaff = u.IsStaff, isActive = u.IsActive })
            .ToListAsync(ct);
        return Results.Ok(new PagedResult<object>(items.Cast<object>().ToList(), page, pageSize, total));
    }

    private static async Task<IResult> CreateStaff(CreateStaffRequest req, IValidator<CreateStaffRequest> v,
        UserManager<ZrcUser> users, RoleManager<ZrcRole> roles, AuditWriter audit, HttpContext ctx, CancellationToken ct)
    {
        var vr = await v.ValidateAsync(req, ct);
        if (!vr.IsValid) return Results.ValidationProblem(vr.ToDictionary());
        foreach (var r in req.Roles)
            if (!await roles.RoleExistsAsync(r)) return Results.Problem($"Unknown role '{r}'.", statusCode: 400);
        if (req.Roles.Contains("Customer"))
            return Results.Problem("Staff accounts cannot carry the Customer role.", statusCode: 400);
        var actor = ctx.User.FindFirst("sub")?.Value ?? ctx.User.Identity?.Name;
        var user = new ZrcUser
        {
            UserName = req.Email, Email = req.Email, DisplayName = req.DisplayName,
            IsStaff = true, IsActive = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, CreatedBy = actor,
        };
        var cr = await users.CreateAsync(user, req.Password);
        if (!cr.Succeeded) return Results.Problem(string.Join("; ", cr.Errors.Select(e => e.Description)), statusCode: 400);
        await users.AddToRolesAsync(user, req.Roles);
        await audit.WriteAsync(actor, "identity.user.create", "User", user.Id, null,
            JsonSerializer.Serialize(new { user.Email, req.Roles }), ctx.Connection.RemoteIpAddress?.ToString(), ct);
        return Results.Created($"/api/v1/admin/users/{user.Id}", new { id = user.Id });
    }

    private static async Task<IResult> SetRoles(string id, SetRolesRequest req,
        UserManager<ZrcUser> users, RoleManager<ZrcRole> roles, IPermissionService perms,
        AuditWriter audit, HttpContext ctx, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(id);
        if (user is null) return Results.NotFound();
        foreach (var r in req.Roles)
            if (!await roles.RoleExistsAsync(r)) return Results.Problem($"Unknown role '{r}'.", statusCode: 400);
        var before = await users.GetRolesAsync(user);
        var actor = ctx.User.FindFirst("sub")?.Value;
        await users.RemoveFromRolesAsync(user, before);
        await users.AddToRolesAsync(user, req.Roles);
        perms.Invalidate(id);
        await audit.WriteAsync(actor, "identity.user.roles", "User", id,
            JsonSerializer.Serialize(before), JsonSerializer.Serialize(req.Roles),
            ctx.Connection.RemoteIpAddress?.ToString(), ct);
        return Results.Ok(new { id, roles = req.Roles });
    }

    private static async Task<IResult> ListRoles(IdentityDbContext db, CancellationToken ct)
    {
        var roles = await db.Roles.AsNoTracking().OrderBy(r => r.Name)
            .Select(r => new
            {
                id = r.Id, name = r.Name, description = r.Description, isSystem = r.IsSystem,
                permissions = db.RolePermissions.Where(rp => rp.RoleId == r.Id)
                    .Join(db.Permissions, rp => rp.PermissionId, p => p.Id, (_, p) => p.Code).ToList(),
            }).ToListAsync(ct);
        return Results.Ok(roles);
    }

    private static async Task<IResult> SetPermissions(string id, SetPermissionsRequest req,
        IdentityDbContext db, IPermissionService perms, AuditWriter audit, HttpContext ctx, CancellationToken ct)
    {
        if (!await db.Roles.AnyAsync(r => r.Id == id, ct)) return Results.NotFound();
        var valid = await db.Permissions.AsNoTracking().Select(p => p.Code).ToListAsync(ct);
        var unknown = req.Permissions.Except(valid).ToList();
        if (unknown.Count > 0) return Results.Problem("Unknown permissions: " + string.Join(", ", unknown), statusCode: 400);
        var before = await db.RolePermissions.Where(rp => rp.RoleId == id)
            .Join(db.Permissions, rp => rp.PermissionId, p => p.Id, (_, p) => p.Code).ToListAsync(ct);
        db.RolePermissions.RemoveRange(db.RolePermissions.Where(rp => rp.RoleId == id));
        var ids = await db.Permissions.Where(p => req.Permissions.Contains(p.Code)).Select(p => p.Id).ToListAsync(ct);
        var actor = ctx.User.FindFirst("sub")?.Value;
        foreach (var pid in ids)
            db.RolePermissions.Add(new global::Identity.Domain.Entities.Generated.RolePermission { RoleId = id, PermissionId = pid, GrantedBy = actor });
        await db.SaveChangesAsync(ct);
        perms.InvalidateAll();
        await audit.WriteAsync(actor, "identity.role.permissions", "Role", id,
            JsonSerializer.Serialize(before), JsonSerializer.Serialize(req.Permissions),
            ctx.Connection.RemoteIpAddress?.ToString(), ct);
        return Results.Ok(new { id, permissions = req.Permissions });
    }

    private static async Task<IResult> ListAudit(int page, int pageSize, IdentityDbContext db, CancellationToken ct)
    {
        page = Math.Max(page, 1); pageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 200);
        var q = db.AuditLogs.AsNoTracking().OrderByDescending(a => a.Id);
        var total = await q.CountAsync(ct);
        var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return Results.Ok(new PagedResult<object>(items.Cast<object>().ToList(), page, pageSize, total));
    }
}
