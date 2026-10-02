namespace ZRC.Modules.Catalog.Contracts;

/// <summary>Public catalog DTO. NEVER contains cost/profit/margin (confidentiality rule).</summary>
public sealed record PublicPackageDto(
    Guid Id, string CategorySlug, string CategoryName,
    string Name, string Slug, string? Tagline, string? Description,
    decimal SalePricePerHead, int MinGuests, int? MaxGuests,
    IReadOnlyList<string> Items, IReadOnlyList<string> Inclusions,
    IReadOnlyList<PublicVariantDto> Variants, IReadOnlyList<PublicAddOnDto> AddOns,
    string? HeroImageUrl, bool IsFeatured);

public sealed record PublicVariantDto(Guid Id, string Name, decimal PriceDeltaPerHead, bool IsDefault);
public sealed record PublicAddOnDto(Guid Id, string Name, string? Description, string PricingType, decimal Price);
public sealed record PublicCategoryDto(Guid Id, string Name, string Slug, string? Description, string? ImageUrl, int PackageCount);

/// <summary>Internal costing DTO (admin/reporting only).</summary>
public sealed record PackageCostingDto(
    Guid PackageId, string PackageName, string CategoryName, decimal SalePricePerHead,
    decimal TotalCost, decimal Profit, decimal MarginPct);

public interface ICatalogQuery
{
    Task<OrderCatalogDto?> GetOrderPackageAsync(Guid packageId, CancellationToken ct = default);
    Task<PublicPackageDto?> GetPublicPackageAsync(string slug, CancellationToken ct = default);
    Task<PackageCostingDto?> GetCostingAsync(Guid packageId, CancellationToken ct = default);
}

// Internal module contract. Never serialize this DTO from public endpoints.
public sealed record OrderCatalogDto(PublicPackageDto Package, decimal CostPerHead,
    IReadOnlyDictionary<Guid, decimal> VariantCosts, IReadOnlyDictionary<Guid, decimal> AddOnCosts);
