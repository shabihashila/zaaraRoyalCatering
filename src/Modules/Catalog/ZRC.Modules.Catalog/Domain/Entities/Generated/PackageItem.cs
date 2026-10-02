using System;
using System.Collections.Generic;

namespace Catalog.Domain.Entities.Generated;

public partial class PackageItem
{
    public Guid PackageId { get; set; }

    public Guid ItemId { get; set; }

    public decimal CostPerHead { get; set; }

    public string? DisplayName { get; set; }

    public int SortOrder { get; set; }

    public virtual Item Item { get; set; } = null!;

    public virtual Package Package { get; set; } = null!;
}
