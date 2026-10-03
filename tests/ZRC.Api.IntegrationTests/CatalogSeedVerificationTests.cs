using Catalog.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ZRC.Api.IntegrationTests;

/// <summary>Phase 2: the deployed seed reproduces the workbook exactly (read-only checks).</summary>
public sealed class CatalogSeedVerificationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public CatalogSeedVerificationTests(WebApplicationFactory<Program> factory) => _factory = factory;

    private CatalogDbContext Db()
    {
        var scope = _factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<CatalogDbContext>();
    }

    [Fact]
    public async Task Seed_has_16_packages_122_links_76_items_5_categories()
    {
        using var db = Db();
        Assert.Equal(5, await db.Categories.CountAsync(c => !c.IsDeleted));
        Assert.Equal(76, await db.Items.CountAsync(i => !i.IsDeleted));
        Assert.Equal(16, await db.Packages.CountAsync(p => !p.IsDeleted));
        Assert.Equal(122, await db.PackageItems.CountAsync());
    }

    [Fact]
    public async Task Costing_view_matches_workbook_averages()
    {
        using var db = Db();
        var rows = await db.vw_PackageCostings.AsNoTracking().ToListAsync();
        Assert.Equal(16, rows.Count);
        Assert.Equal(336.25m, Math.Round(rows.Average(r => r.SalePricePerHead), 2));
        Assert.Equal(196.56m, Math.Round(rows.Average(r => r.TotalCost), 2));
        Assert.Equal(139.69m, Math.Round(rows.Average(r => (r.Profit ?? 0)), 2));
    }

    [Fact]
    public async Task Costing_view_spot_checks_match_workbook()
    {
        using var db = Db();
        var bySlug = await db.vw_PackageCostings.AsNoTracking().ToDictionaryAsync(r => r.PackageSlug);
        Assert.Equal(70m, bySlug["breakfast-classic-breakfast"].TotalCost);
        Assert.Equal(300m, bySlug["lunch-royal-kacchi"].TotalCost);
        Assert.Equal(380m, bySlug["house-party-bbq-night"].TotalCost);
        Assert.Equal(500m, bySlug["lunch-royal-kacchi"].SalePricePerHead);
    }

    [Fact]
    public async Task Workbook_business_rules_are_modeled_as_data()
    {
        using var db = Db();
        var buffet = await db.Packages.SingleAsync(p => p.Slug == "corporate-program-standard-buffet");
        Assert.Equal(40, buffet.MinGuests);

        var kacchiId = (await db.Packages.SingleAsync(p => p.Slug == "lunch-royal-kacchi")).Id;
        var variants = await db.PackageVariants.Where(v => v.PackageId == kacchiId).ToListAsync();
        Assert.Contains(variants, v => v.Name == "Chicken" && v.PriceDeltaPerHead == 0 && v.IsDefault);
        Assert.Contains(variants, v => v.Name == "Mutton" && v.PriceDeltaPerHead == 80);

        var execId = (await db.Packages.SingleAsync(p => p.Slug == "corporate-program-executive-buffet")).Id;
        Assert.Contains(await db.PackageInclusions.Where(i => i.PackageId == execId).Select(i => i.Text).ToListAsync(),
            t => t.Contains("waiter"));
    }
}
