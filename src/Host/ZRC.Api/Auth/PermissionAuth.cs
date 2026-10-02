using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ZRC.Modules.Identity.Application;
using ZRC.Modules.Identity.Contracts;
using ZRC.SharedKernel;

namespace ZRC.Host.Auth;

public sealed class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private DefaultAuthorizationPolicyProvider Fallback { get; }
    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options) => Fallback = new DefaultAuthorizationPolicyProvider(options);

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith("perm:", StringComparison.Ordinal))
        {
            var policy = new AuthorizationPolicyBuilder()
                .AddAuthenticationSchemes("Bearer")
                .AddRequirements(new PermissionRequirement(policyName["perm:".Length..]))
                .Build();
            return Task.FromResult<AuthorizationPolicy?>(policy);
        }
        return Fallback.GetPolicyAsync(policyName);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => Fallback.GetDefaultPolicyAsync();
    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => Fallback.GetFallbackPolicyAsync();
}

public sealed class PermissionHandler(IPermissionService perms) : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var userId = context.User.FindFirst("sub")?.Value
            ?? context.User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        if (userId is null) return;
        var permissions = await perms.GetUserPermissionsAsync(userId);
        if (permissions.Contains(requirement.Permission))
            context.Succeed(requirement);
    }
}

public static class JwtSetup
{
    public static void AddJwt(this IServiceCollection services, IConfiguration configuration)
    {
        var jwt = JwtOptions.FromConfig(configuration);
        services.AddAuthentication("Bearer").AddJwtBearer("Bearer", o =>
        {
            // Keep JWT claim names as-is ("sub", "role"). The default inbound
            // map renames "sub" to NameIdentifier, which breaks FindFirst("sub").
            o.MapInboundClaims = false;
            o.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwt.Issuer,
                ValidAudience = jwt.Audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)),
                ClockSkew = TimeSpan.FromMinutes(1),
                NameClaimType = "name",
                RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            };
        });
    }
}

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        log.LogError(ex, "Unhandled {TraceId}", ctx.TraceIdentifier);
        ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await ctx.Response.WriteAsJsonAsync(new
        {
            type = "https://zrc/errors/internal",
            title = "Unexpected error",
            status = 500,
            detail = "Something went wrong. Reference: " + ctx.TraceIdentifier,
        }, ct);
        return true;
    }
}
