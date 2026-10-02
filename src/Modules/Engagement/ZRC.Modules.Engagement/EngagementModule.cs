using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ZRC.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Engagement.Infrastructure.Persistence;
using ZRC.Modules.Engagement.Api;

namespace ZRC.Modules.Engagement;
public sealed class EngagementModule : IModule
{
    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
        =>services.AddDbContext<EngagementDbContext>(o=>o.UseSqlServer(configuration.GetConnectionString("Default")));
    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        EngagementEndpoints.Map(endpoints);
        endpoints.MapGroup("/api/v1/public/engagement").WithTags("engagement")
            .MapGet("/_ping", () => Results.Ok(new { module = "engagement", ok = true }));
    }
}
