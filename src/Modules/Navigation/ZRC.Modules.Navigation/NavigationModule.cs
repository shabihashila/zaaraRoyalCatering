using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Navigation.Infrastructure.Persistence;
using ZRC.Modules.Navigation.Api;
using ZRC.Modules.Navigation.Application;
using ZRC.SharedKernel;

namespace ZRC.Modules.Navigation;

public sealed class NavigationModule : IModule
{
    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        var cs = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default missing.");
        services.AddDbContext<NavigationDbContext>(o => o.UseSqlServer(cs));
        services.AddScoped<MenuService>();
        services.AddValidatorsFromAssemblyContaining<UpsertMenuValidator>();
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var admin = endpoints.MapGroup("/api/v1/admin").WithTags("navigation").RequireAuthorization();
        MenuEndpoints.Map(admin);
        endpoints.MapGroup("/api/v1/admin/navigation").WithTags("navigation")
            .MapGet("/_ping", () => Results.Ok(new { module = "navigation", ok = true }));
    }
}
