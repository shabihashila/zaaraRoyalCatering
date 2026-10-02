using System;
using System.Collections.Generic;

namespace Catalog.Domain.Entities.Generated;

public partial class vw_PackageCosting
{
    public Guid PackageId { get; set; }

    public string PackageName { get; set; } = null!;

    public string PackageSlug { get; set; } = null!;

    public string CategoryName { get; set; } = null!;

    public decimal SalePricePerHead { get; set; }

    public decimal TotalCost { get; set; }

    public decimal? Profit { get; set; }

    public decimal? MarginPct { get; set; }
}
