using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Navigation.Domain.Entities.Generated;
using Navigation.Infrastructure.Persistence;
using ZRC.Modules.Identity.Contracts;
using ZRC.SharedKernel;
using ZRC.Modules.Navigation.Application;

namespace ZRC.Modules.Navigation.Api;

public sealed record UpsertMenuRequest(string Key, string Label, string? LabelBn, string? Icon,
    string? Route, string? ExternalUrl, string? RequiredPermission, string MenuArea,
    Guid? ParentId, int SortOrder, bool IsVisible, string? RowVersion);
public sealed record ReorderRequest(List<ReorderRow> Rows);
public sealed record ReorderRow(Guid Id, Guid? ParentId, int SortOrder);

public sealed class UpsertMenuValidator : AbstractValidator<UpsertMenuRequest>
{
    public UpsertMenuValidator()
    {
        RuleFor(x => x.Key).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Label).NotEmpty().MaximumLength(128);
        RuleFor(x => x.MenuArea).Must(a => a is "Admin" or "Public");
        RuleFor(x => x).Must(x => x.Route != null || x.ExternalUrl != null || x.ParentId == null)
            .WithMessage("Link, external URL, or top-level group required.");
    }
}

public static class MenuEndpoints
{
    public static void Map(RouteGroupBuilder admin)
    {
        admin.MapGet("/navigation/menu", MyMenu).RequireAuthorization();
        admin.MapGet("/navigation/menu/all", All).RequirePermission(NavPermissions.MenuManage);
        admin.MapPost("/navigation/menu", Create).RequirePermission(NavPermissions.MenuManage);
        admin.MapPut("/navigation/menu/{id:guid}", Update).RequirePermission(NavPermissions.MenuManage);
        admin.MapDelete("/navigation/menu/{id:guid}", Delete).RequirePermission(NavPermissions.MenuManage);
        admin.MapPut("/navigation/menu/order", Reorder).RequirePermission(NavPermissions.MenuManage);
    }

    private static async Task<IResult> MyMenu(HttpContext ctx, MenuService menus,
        IPermissionService perms, CancellationToken ct)
    {
        var userId = ctx.User.FindFirst("sub")?.Value;
        if (userId is null) return Results.Unauthorized();
        var p = await perms.GetUserPermissionsAsync(userId, ct);
        return Results.Ok(await menus.GetFilteredTreeAsync(p, "Admin", ct));
    }

    private static async Task<IResult> All(string area, MenuService menus, CancellationToken ct)
        => Results.Ok(await menus.GetFullTreeAsync(area == "Public" ? "Public" : "Admin", ct));

    private static async Task<IResult> Create(UpsertMenuRequest req, IValidator<UpsertMenuRequest> v,
        NavigationDbContext db, HttpContext ctx, CancellationToken ct)
    {
        var vr = await v.ValidateAsync(req, ct);
        if (!vr.IsValid) return Results.ValidationProblem(vr.ToDictionary());
        if (await db.MenuItems.AnyAsync(m => m.Key == req.Key && m.MenuArea == req.MenuArea && !m.IsDeleted, ct))
            return Results.Problem($"Menu key '{req.Key}' already exists.", statusCode: 409);
        var actor = ctx.User.FindFirst("sub")?.Value;
        var m = new MenuItem
        {
            Id = Guid.NewGuid(), ParentId = req.ParentId, Key = req.Key, Label = req.Label,
            LabelBn = req.LabelBn, Icon = req.Icon, Route = req.Route, ExternalUrl = req.ExternalUrl,
            RequiredPermission = req.RequiredPermission, MenuArea = req.MenuArea,
            SortOrder = req.SortOrder, IsVisible = true, CreatedBy = actor, UpdatedBy = actor,
        };
        db.MenuItems.Add(m);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/v1/admin/navigation/menu/{m.Id}", MenuService.ToDto(m));
    }

    private static async Task<IResult> Update(Guid id, UpsertMenuRequest req, IValidator<UpsertMenuRequest> v,
        NavigationDbContext db, HttpContext ctx, CancellationToken ct)
    {
        var vr = await v.ValidateAsync(req, ct);
        if (!vr.IsValid) return Results.ValidationProblem(vr.ToDictionary());
        var m = await db.MenuItems.SingleOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (m is null) return Results.NotFound();
        if (req.RowVersion is not null && Convert.ToBase64String(m.RowVersion) != req.RowVersion)
            return Results.Problem("Menu item was modified by someone else.", statusCode: 409);
        if (req.ParentId == id) return Results.Problem("An item cannot be its own parent.", statusCode: 400);
        m.Key = req.Key; m.Label = req.Label; m.LabelBn = req.LabelBn; m.Icon = req.Icon;
        m.Route = req.Route; m.ExternalUrl = req.ExternalUrl; m.RequiredPermission = req.RequiredPermission;
        m.MenuArea = req.MenuArea; m.ParentId = req.ParentId; m.SortOrder = req.SortOrder;
        m.IsVisible = req.IsVisible; m.UpdatedBy = ctx.User.FindFirst("sub")?.Value;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Results.Problem("Menu item was modified by someone else.", statusCode: 409); }
        return Results.Ok(MenuService.ToDto(m));
    }

    private static async Task<IResult> Delete(Guid id, NavigationDbContext db, HttpContext ctx, CancellationToken ct)
    {
        var m = await db.MenuItems.Include(x => x.InverseParent)
            .SingleOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (m is null) return Results.NotFound();
        if (m.InverseParent.Any(c => !c.IsDeleted))
            return Results.Problem("Delete or move child items first.", statusCode: 400);
        m.IsDeleted = true;
        m.UpdatedBy = ctx.User.FindFirst("sub")?.Value;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Reorder(ReorderRequest req, NavigationDbContext db,
        HttpContext ctx, CancellationToken ct)
    {
        var ids = req.Rows.Select(r => r.Id).ToList();
        var items = await db.MenuItems.Where(m => ids.Contains(m.Id) && !m.IsDeleted).ToListAsync(ct);
        if (items.Count != ids.Count) return Results.Problem("Unknown menu item in reorder list.", statusCode: 400);
        var actor = ctx.User.FindFirst("sub")?.Value;
        foreach (var item in items)
        {
            var row = req.Rows.First(r => r.Id == item.Id);
            item.ParentId = row.ParentId;
            item.SortOrder = row.SortOrder;
            item.UpdatedBy = actor;
        }
        await db.SaveChangesAsync(ct);
        return Results.Ok(new { ok = true });
    }
}
