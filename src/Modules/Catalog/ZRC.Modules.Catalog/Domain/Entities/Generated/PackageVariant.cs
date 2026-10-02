using System;
using System.Collections.Generic;

namespace Catalog.Domain.Entities.Generated;

public partial class PackageVariant
{
    public Guid Id { get; set; }

    public Guid PackageId { get; set; }

    public string Name { get; set; } = null!;

    public decimal PriceDeltaPerHead { get; set; }

    public decimal CostDeltaPerHead { get; set; }

    public bool IsDefault { get; set; }

    public virtual Package Package { get; set; } = null!;
}
