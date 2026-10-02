using System;
using System.Collections.Generic;

namespace Catalog.Domain.Entities.Generated;

public partial class Item
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string? NameBn { get; set; }

    public string? Description { get; set; }

    public bool IsVegetarian { get; set; }

    public string? Allergens { get; set; }

    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual ICollection<PackageItem> PackageItems { get; set; } = new List<PackageItem>();
}
