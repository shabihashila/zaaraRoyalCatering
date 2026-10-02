using System;
using System.Collections.Generic;

namespace Catalog.Domain.Entities.Generated;

public partial class AddOn
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string PricingType { get; set; } = null!;

    public decimal Price { get; set; }

    public decimal Cost { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual ICollection<Package> Packages { get; set; } = new List<Package>();
}
