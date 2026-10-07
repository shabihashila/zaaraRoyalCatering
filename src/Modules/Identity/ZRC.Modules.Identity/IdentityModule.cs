using ZRC.Infrastructure.Common;
using FluentValidation;
using Identity.Infrastructure.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ZRC.Modules.Identity.Api;
using ZRC.Modules.Identity.Application;
using ZRC.Modules.Identity.Contracts;
using ZRC.Modules.Identity.Domain;
using ZRC.Modules.Identity.Infrastructure.Persistence;
using ZRC.SharedKernel;

namespace ZRC.Modules.Identity;

public sealed class IdentityModule : IModule
{
    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppIdentityDbContext>(o => DatabaseProvider.Configure(o, configuration));
        services.AddDbContext<IdentityDbContext>(o => DatabaseProvider.Configure(o, configuration));
        services.AddSingleton(JwtOptions.FromConfig(configuration));
        services.AddScoped<TokenService>();
        services.AddScoped<AuditWriter>();
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddMemoryCache();
        services.AddValidatorsFromAssemblyContaining<RegisterValidator>();

        services.AddIdentityCore<ZrcUser>(o =>
            {
                o.Password.RequiredLength = 8;
                o.Password.RequireNonAlphanumeric = false;
                o.Password.RequireUppercase = false;
                o.Lockout.MaxFailedAccessAttempts = 5;
                o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                o.User.RequireUniqueEmail = true;
                // JWT inbound mapping is disabled by the host; UserManager
                // must resolve the same subject claim as permission policies.
                o.ClaimsIdentity.UserIdClaimType = "sub";
            })
            .AddRoles<ZrcRole>()
            .AddEntityFrameworkStores<AppIdentityDbContext>()
            .AddSignInManager();
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var auth = endpoints.MapGroup("/api/v1/auth").WithTags("auth");
        AuthEndpoints.Map(auth);
        auth.MapGet("/_ping", () => Results.Ok(new { module = "identity", ok = true }));

        var admin = endpoints.MapGroup("/api/v1/admin").WithTags("admin-identity").RequireAuthorization();
        AdminUserEndpoints.Map(admin);
    }
}
