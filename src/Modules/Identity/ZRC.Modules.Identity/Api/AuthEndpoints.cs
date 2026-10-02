using System.Text.Json;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Routing;
using ZRC.Modules.Identity.Application;
using ZRC.Modules.Identity.Contracts;
using ZRC.Modules.Identity.Domain;
using ZRC.SharedKernel;

namespace ZRC.Modules.Identity.Api;

public sealed record RegisterRequest(string FullName, string Phone, string Email, string Password);
public sealed record LoginRequest(string EmailOrPhone, string Password);
public sealed record AuthResponse(string AccessToken, DateTimeOffset ExpiresAt, object User);

public sealed class RegisterValidator : AbstractValidator<RegisterRequest>
{
    public RegisterValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(128);
        RuleFor(x => x.Phone).Must(p => PhoneNumber.Create(p).IsSuccess).WithMessage("Phone must be BD format 01XXXXXXXXX.");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.Password).MinimumLength(8).MaximumLength(128);
    }
}

public sealed class LoginValidator : AbstractValidator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(x => x.EmailOrPhone).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public static class AuthEndpoints
{
    public const string RefreshCookie = "zrc_refresh";

    public static void Map(RouteGroupBuilder g)
    {
        g.MapPost("/register", Register).RequireRateLimiting("public-write");
        g.MapPost("/login", Login).RequireRateLimiting("public-write");
        g.MapPost("/refresh", Refresh).RequireRateLimiting("public-write");
        g.MapPost("/logout", Logout).RequireAuthorization();
        g.MapGet("/me", Me).RequireAuthorization();
    }

    private static async Task<IResult> Register(RegisterRequest req, IValidator<RegisterRequest> v,
        UserManager<ZrcUser> users, IPermissionService perms, AuditWriter audit,
        HttpContext ctx, CancellationToken ct)
    {
        var vr = await v.ValidateAsync(req, ct);
        if (!vr.IsValid) return Results.ValidationProblem(vr.ToDictionary());
        var phone = PhoneNumber.Create(req.Phone).Value.ToString();
        if (await users.FindByEmailAsync(req.Email) is not null)
            return Problem("auth.email.taken", "Email is already registered.", 409);
        var user = new ZrcUser
        {
            UserName = req.Email, Email = req.Email, PhoneNumber = phone,
            DisplayName = req.FullName, IsStaff = false, IsActive = true,
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        var cr = await users.CreateAsync(user, req.Password);
        if (!cr.Succeeded) return Problem("auth.create.failed", string.Join("; ", cr.Errors.Select(e => e.Description)), 400);
        await users.AddToRoleAsync(user, "Customer");
        await audit.WriteAsync(user.Id, "auth.register", "User", user.Id, null,
            JsonSerializer.Serialize(new { user.Email }), ctx.Connection.RemoteIpAddress?.ToString(), ct);
        return Results.Created($"/api/v1/auth/me", new { id = user.Id });
    }

    private static async Task<IResult> Login(LoginRequest req, IValidator<LoginRequest> v,
        UserManager<ZrcUser> users, SignInManager<ZrcUser> signIn, TokenService tokens,
        HttpContext ctx, CancellationToken ct)
    {
        var vr = await v.ValidateAsync(req, ct);
        if (!vr.IsValid) return Results.ValidationProblem(vr.ToDictionary());
        var user = req.EmailOrPhone.Contains('@')
            ? await users.FindByEmailAsync(req.EmailOrPhone)
            : users.Users.FirstOrDefault(u => u.PhoneNumber == req.EmailOrPhone);
        if (user is null || !user.IsActive)
            return Problem("auth.invalid", "Invalid credentials.", 401);
        var check = await signIn.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: true);
        if (check.IsLockedOut) return Problem("auth.locked", "Account locked after repeated failures. Try later.", 423);
        if (!check.Succeeded) return Problem("auth.invalid", "Invalid credentials.", 401);

        var roles = await users.GetRolesAsync(user);
        var (access, expires) = tokens.CreateAccessToken(user, roles);
        var refresh = await tokens.IssueRefreshAsync(user.Id, ctx.Connection.RemoteIpAddress?.ToString(), ct);
        SetRefreshCookie(ctx, refresh.Raw, refresh.ExpiresAt);
        return Results.Ok(new AuthResponse(access, expires, new { id = user.Id, email = user.Email, name = user.DisplayName, roles }));
    }

    private static async Task<IResult> Refresh(TokenService tokens, UserManager<ZrcUser> users,
        HttpContext ctx, CancellationToken ct)
    {
        if (!ctx.Request.Cookies.TryGetValue(RefreshCookie, out var raw) || string.IsNullOrEmpty(raw))
            return Problem("auth.refresh.missing", "Refresh token missing.", 401);
        var r = await tokens.RotateAsync(raw, ctx.Connection.RemoteIpAddress?.ToString(), ct);
        if (r.IsFailure) return Problem(r.Error.Code, r.Error.Message, 401);
        var user = await users.FindByIdAsync(r.Value.UserId);
        if (user is null || !user.IsActive) return Problem("auth.refresh.invalid", "Invalid refresh token.", 401);
        var roles = await users.GetRolesAsync(user);
        var (access, expires) = tokens.CreateAccessToken(user, roles);
        SetRefreshCookie(ctx, r.Value.Raw, r.Value.ExpiresAt);
        return Results.Ok(new AuthResponse(access, expires, new { id = user.Id, email = user.Email, name = user.DisplayName, roles }));
    }

    private static async Task<IResult> Logout(TokenService tokens, HttpContext ctx, CancellationToken ct)
    {
        if (ctx.Request.Cookies.TryGetValue(RefreshCookie, out var raw) && !string.IsNullOrEmpty(raw))
            await tokens.RevokeAsync(raw, ctx.Connection.RemoteIpAddress?.ToString(), ct);
        ctx.Response.Cookies.Delete(RefreshCookie, new CookieOptions { Path = "/api/v1/auth" });
        return Results.Ok(new { ok = true });
    }

    private static async Task<IResult> Me(HttpContext ctx, UserManager<ZrcUser> users,
        IPermissionService perms, CancellationToken ct)
    {
        var user = await users.GetUserAsync(ctx.User);
        if (user is null) return Results.Unauthorized();
        var roles = await perms.GetUserRolesAsync(user.Id, ct);
        var permissions = await perms.GetUserPermissionsAsync(user.Id, ct);
        return Results.Ok(new { id = user.Id, email = user.Email, name = user.DisplayName, phone = user.PhoneNumber, isStaff = user.IsStaff, roles, permissions });
    }

    private static void SetRefreshCookie(HttpContext ctx, string raw, DateTimeOffset expires)
        => ctx.Response.Cookies.Append(RefreshCookie, raw, new CookieOptions
        {
            HttpOnly = true,
            Secure = ctx.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = "/api/v1/auth",
            Expires = expires,
        });

    private static IResult Problem(string code, string detail, int status)
        => Results.Problem(detail: detail, statusCode: status, extensions: new Dictionary<string, object?> { ["code"] = code });
}
