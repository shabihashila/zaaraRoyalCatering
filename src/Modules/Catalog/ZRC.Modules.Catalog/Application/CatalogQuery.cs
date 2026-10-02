using Catalog.Domain.Entities.Generated;
using Catalog.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using ZRC.Modules.Catalog.Contracts;

namespace ZRC.Modules.Catalog.Application;

/// <summary>Read model for the catalogue. Public projections NEVER include cost/profit/margin.</summary>
public sealed class CatalogQuery(CatalogDbContext db) : ICatalogQuery
{
    public async Task<OrderCatalogDto?> GetOrderPackageAsync(Guid packageId, CancellationToken ct = default)
    {
        var p = await db.Packages.AsNoTracking().Include(x => x.Category)
            .Include(x => x.PackageItems).ThenInclude(x => x.Item)
            .Include(x => x.PackageInclusions).Include(x => x.PackageVariants).Include(x => x.AddOns)
            .SingleOrDefaultAsync(x => x.Id == packageId && x.IsActive && !x.IsDeleted && x.Category.IsActive && !x.Category.IsDeleted, ct);
        return p is null ? null : new(ToPublic(p), p.PackageItems.Sum(x => x.CostPerHead),
            p.PackageVariants.ToDictionary(x => x.Id, x => x.CostDeltaPerHead),
            p.AddOns.Where(x => x.IsActive).ToDictionary(x => x.Id, x => x.Cost));
    }
    public async Task<PublicPackageDto?> GetPublicPackageAsync(string slug, CancellationToken ct = default)
    {
        var p = await db.Packages.AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.PackageItems).ThenInclude(x => x.Item)
            .Include(x => x.PackageInclusions)
            .Include(x => x.PackageVariants)
            .Include(x => x.AddOns)
            .SingleOrDefaultAsync(x => x.Slug == slug && x.IsActive && !x.IsDeleted, ct);
        return p is null ? null : ToPublic(p);
    }

    public async Task<PackageCostingDto?> GetCostingAsync(Guid packageId, CancellationToken ct = default)
    {
        var row = await db.vw_PackageCostings.AsNoTracking()
            .SingleOrDefaultAsync(x => x.PackageId == packageId, ct);
        return row is null
            ? null
            : new PackageCostingDto(row.PackageId, row.PackageName, row.CategoryName, row.SalePricePerHead,
                row.TotalCost, row.Profit ?? 0, row.MarginPct ?? 0);
    }

    public async Task<List<PublicCategoryDto>> ListCategoriesAsync(CancellationToken ct)
    {
        var cats = await db.Categories.AsNoTracking()
            .Where(c => c.IsActive && !c.IsDeleted)
            .OrderBy(c => c.SortOrder)
            .Select(c => new
            {
                c.Id, c.Name, c.Slug, c.Description, c.ImageUrl,
                Count = db.Packages.Count(p => p.CategoryId == c.Id && p.IsActive && !p.IsDeleted),
            }).ToListAsync(ct);
        return [.. cats.Select(c => new PublicCategoryDto(c.Id, c.Name, c.Slug, c.Description, c.ImageUrl, c.Count))];
    }

    public async Task<List<PublicPackageDto>> ListPackagesAsync(string? category, int? guests, decimal? maxPrice, CancellationToken ct)
    {
        var q = db.Packages.AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.PackageItems).ThenInclude(x => x.Item)
            .Include(x => x.PackageInclusions)
            .Include(x => x.PackageVariants)
            .Include(x => x.AddOns)
            .Where(p => p.IsActive && !p.IsDeleted);
        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(p => p.Category.Slug == category);
        if (guests.HasValue)
            q = q.Where(p => p.MinGuests <= guests.Value && (p.MaxGuests == null || p.MaxGuests >= guests.Value));
        if (maxPrice.HasValue)
            q = q.Where(p => p.SalePricePerHead <= maxPrice.Value);
        var list = await q.OrderBy(p => p.Category.SortOrder).ThenBy(p => p.SortOrder).ToListAsync(ct);
        return [.. list.Select(ToPublic)];
    }

    public async Task<List<PackageCostingDto>> ListCostingAsync(CancellationToken ct)
    {
        var rows = await db.vw_PackageCostings.AsNoTracking()
            .OrderBy(x => x.CategoryName).ThenBy(x => x.PackageName).ToListAsync(ct);
        return [.. rows.Select(r => new PackageCostingDto(r.PackageId, r.PackageName, r.CategoryName, r.SalePricePerHead,
            r.TotalCost, r.Profit ?? 0, r.MarginPct ?? 0))];
    }

    internal static PublicPackageDto ToPublic(Package p) => new(
        p.Id, p.Category.Slug, p.Category.Name,
        p.Name, p.Slug, p.Tagline, p.Description,
        p.SalePricePerHead, p.MinGuests, p.MaxGuests,
        [.. p.PackageItems.OrderBy(i => i.SortOrder).Select(i => i.DisplayName ?? i.Item.Name)],
        [.. p.PackageInclusions.OrderBy(i => i.SortOrder).Select(i => i.Text)],
        [.. p.PackageVariants.Select(v => new PublicVariantDto(v.Id, v.Name, v.PriceDeltaPerHead, v.IsDefault))],
        [.. p.AddOns.Where(a => a.IsActive).Select(a => new PublicAddOnDto(a.Id, a.Name, a.Description, a.PricingType, a.Price))],
        p.HeroImageUrl, p.IsFeatured);
}
