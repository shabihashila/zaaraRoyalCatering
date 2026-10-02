using System;
using System.Collections.Generic;

namespace Catalog.Domain.Entities.Generated;

public partial class Package
{
    public Guid Id { get; set; }

    public Guid CategoryId { get; set; }

    public string Name { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string? Tagline { get; set; }

    public string? Description { get; set; }

    public decimal SalePricePerHead { get; set; }

    public int MinGuests { get; set; }

    public int? MaxGuests { get; set; }

    public string? HeroImageUrl { get; set; }

    public string? Model3DUrl { get; set; }

    public int SortOrder { get; set; }

    public bool IsFeatured { get; set; }

    public bool IsActive { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual Category Category { get; set; } = null!;

    public virtual ICollection<PackageInclusion> PackageInclusions { get; set; } = new List<PackageInclusion>();

    public virtual ICollection<PackageItem> PackageItems { get; set; } = new List<PackageItem>();

    public virtual ICollection<PackageVariant> PackageVariants { get; set; } = new List<PackageVariant>();

    public virtual ICollection<PriceHistory> PriceHistories { get; set; } = new List<PriceHistory>();

    public virtual ICollection<AddOn> AddOns { get; set; } = new List<AddOn>();
}
