using System;
using System.Collections.Generic;

namespace Ordering.Domain.Entities.Generated;

public partial class vw_KitchenPrep
{
    public DateOnly EventDate { get; set; }

    public string? ItemName { get; set; }

    public string VariantName { get; set; } = null!;

    public int? TotalHeads { get; set; }

    public long? OrderCount { get; set; }
}
