using ZRC.Infrastructure.Common;
using Catalog.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ZRC.Modules.Catalog.Api;
using ZRC.Modules.Catalog.Application;
using ZRC.Modules.Catalog.Contracts;
using ZRC.SharedKernel;

namespace ZRC.Modules.Catalog;

public sealed class CatalogModule : IModule
{
    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<CatalogDbContext>(o => DatabaseProvider.Configure(o, configuration));
        services.AddScoped<CatalogQuery>();
        services.AddScoped<ICatalogQuery, CatalogQuery>();
        services.AddValidatorsFromAssemblyContaining<UpdatePackageValidator>();
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        var pub = endpoints.MapGroup("/api/v1/public/catalog").WithTags("public-catalog");
        PublicCatalogEndpoints.Map(pub);
        pub.MapGet("/_ping", () => Results.Ok(new { module = "catalog", ok = true }));

        var admin = endpoints.MapGroup("/api/v1/admin").WithTags("admin-catalog").RequireAuthorization();
        AdminCatalogEndpoints.Map(admin);
    }
}
