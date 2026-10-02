using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using ZRC.Modules.Catalog.Application;

namespace ZRC.Modules.Catalog.Api;

public static class PublicCatalogEndpoints
{
    public static void Map(RouteGroupBuilder g)
    {
        g.MapGet("/categories", ListCategories).CacheOutput(p => { p.Expire(TimeSpan.FromMinutes(5)); p.Tag("catalog"); });
        g.MapGet("/packages", ListPackages).CacheOutput(p => { p.Expire(TimeSpan.FromMinutes(5)); p.Tag("catalog"); });
        g.MapGet("/packages/{slug}", GetPackage).CacheOutput(p => { p.Expire(TimeSpan.FromMinutes(5)); p.Tag("catalog"); });
    }

    private static async Task<IResult> ListCategories(CatalogQuery q, CancellationToken ct)
        => Results.Ok(await q.ListCategoriesAsync(ct));

    private static async Task<IResult> ListPackages(string? category, int? guests, decimal? maxPrice,
        CatalogQuery q, CancellationToken ct)
    {
        if (guests is < 1) return Results.ValidationProblem(new Dictionary<string, string[]> { ["guests"] = ["Guests must be >= 1."] });
        if (maxPrice is < 0) return Results.ValidationProblem(new Dictionary<string, string[]> { ["maxPrice"] = ["maxPrice must be >= 0."] });
        return Results.Ok(await q.ListPackagesAsync(category, guests, maxPrice, ct));
    }

    private static async Task<IResult> GetPackage(string slug, CatalogQuery q, CancellationToken ct)
    {
        var dto = await q.GetPublicPackageAsync(slug, ct);
        return dto is null ? Results.NotFound() : Results.Ok(dto);
    }
}
