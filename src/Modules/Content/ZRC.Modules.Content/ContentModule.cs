using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ZRC.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Content.Infrastructure.Persistence;
using ZRC.Modules.Content.Api;

namespace ZRC.Modules.Content;
public sealed class ContentModule : IModule
{
    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
        =>services.AddDbContext<ContentDbContext>(o=>o.UseSqlServer(configuration.GetConnectionString("Default")));
    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        ContentEndpoints.Map(endpoints);
        endpoints.MapGroup("/api/v1/public/content").WithTags("content")
            .MapGet("/_ping", () => Results.Ok(new { module = "content", ok = true }));
    }
}
