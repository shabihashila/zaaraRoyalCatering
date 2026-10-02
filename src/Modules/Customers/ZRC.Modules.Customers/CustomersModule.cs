using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ZRC.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Customers.Infrastructure.Persistence;
using ZRC.Modules.Customers.Api;
using ZRC.Modules.Customers.Contracts;

namespace ZRC.Modules.Customers;
public sealed class CustomersModule : IModule
{
    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<CustomersDbContext>(o=>o.UseSqlServer(configuration.GetConnectionString("Default")));
        services.AddScoped<ICustomerQuery,CustomerQuery>();
    }
    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        CustomerEndpoints.Map(endpoints);
        endpoints.MapGroup("/api/v1/customers").WithTags("customers")
            .MapGet("/_ping", () => Results.Ok(new { module = "customers", ok = true }));
    }
}
