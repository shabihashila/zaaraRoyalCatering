using ZRC.Infrastructure.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ZRC.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Reporting.Infrastructure.Persistence;
using ZRC.Modules.Reporting.Api;

namespace ZRC.Modules.Reporting;
public sealed class ReportingModule : IModule
{
    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
        =>services.AddDbContext<ReportingDbContext>(o => DatabaseProvider.Configure(o, configuration));
    public void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        ReportEndpoints.Map(endpoints);
        endpoints.MapGroup("/api/v1/admin/reports").WithTags("reports")
            .MapGet("/_ping", () => Results.Ok(new { module = "reporting", ok = true }));
    }
}
