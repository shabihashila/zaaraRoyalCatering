using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Scalar.AspNetCore;
using Serilog;
using ZRC.SharedKernel;
using ZRC.Modules.Identity;
using ZRC.Modules.Identity.Application;
using ZRC.Modules.Navigation;
using ZRC.Modules.Catalog;
using ZRC.Modules.Ordering;
using ZRC.Modules.Customers;
using ZRC.Modules.Engagement;
using ZRC.Modules.Content;
using ZRC.Modules.Reporting;
using ZRC.Host.Auth;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.WithProperty("App", "ZRC.Api")
    .WriteTo.Console());

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();
builder.Services.AddOutputCache();
builder.Services.AddCors(o => o.AddPolicy("web", p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:4200"])
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
builder.Services.AddRateLimiter(o =>
{
    o.AddFixedWindowLimiter("public-write", x =>
    {
        x.PermitLimit = 60;
        x.Window = TimeSpan.FromMinutes(1);
        x.QueueLimit = 0;
    });
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddJwt(builder.Configuration);
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionHandler>();
builder.Services.AddAuthorization();

// Module registration (vertical slices live inside each module)
IModule[] modules =
[
    new IdentityModule(), new NavigationModule(), new CatalogModule(),
    new OrderingModule(), new CustomersModule(), new EngagementModule(),
    new ContentModule(), new ReportingModule(),
];
foreach (var m in modules) m.RegisterServices(builder.Services, builder.Configuration);
builder.Services.AddSingleton<IEnumerable<IModule>>(modules);

var app = builder.Build();

// Fail fast if a code-declared permission is missing from the post-deploy seed.
await StartupPermissionCheck.EnsureAsync(app.Services,
[
    .. IdentityPermissions.All,
    .. NavPermissions.All,
    .. CatalogPermissions.All,
]);
await SuperAdminSeeder.EnsureAsync(app.Services);

app.UseSerilogRequestLogging();
app.UseExceptionHandler();
app.UseStatusCodePages();
// CORS before HTTPS redirection: otherwise preflight (OPTIONS) requests get
// a 307 redirect, which browsers reject ("Redirect is not allowed for a preflight request").
app.UseCors("web");
// In Development the Angular dev server calls the http endpoint directly;
// redirecting /api calls to https breaks that (browser cert trust), so only
// redirect in non-Development. Scalar/OpenAPI stay reachable over https.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseRateLimiter();
app.UseOutputCache();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(o => o.WithTitle("Zaara Royal Catering API"));
}

app.MapHealthChecks("/health").DisableRateLimiting();
app.MapGet("/api/v1/_ping", () => Results.Ok(new { ok = true, app = "zrc", time = DateTimeOffset.UtcNow }))
    .DisableRateLimiting();

foreach (var m in modules) m.MapEndpoints(app);

app.Run();

public partial class Program { }
