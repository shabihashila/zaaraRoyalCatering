using ZRC.Infrastructure.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ZRC.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Ordering.Infrastructure.Persistence;
using ZRC.Modules.Ordering.Api;

namespace ZRC.Modules.Ordering;

public sealed class OrderingModule : IModule
{
    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
        => services.AddDbContext<OrderingDbContext>(o => DatabaseProvider.Configure(o, configuration));
    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        OrderEndpoints.Map(endpoints);
        endpoints.MapGroup("/api/v1/public/orders").WithTags("orders")
            .MapGet("/_ping", () => Results.Ok(new { module = "ordering", ok = true }));
    }
}
