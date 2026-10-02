using System;
using System.Collections.Generic;

namespace Catalog.Domain.Entities.Generated;

public partial class PriceHistory
{
    public long Id { get; set; }

    public Guid PackageId { get; set; }

    public decimal OldPrice { get; set; }

    public decimal NewPrice { get; set; }

    public DateTime ChangedAt { get; set; }

    public string? ChangedBy { get; set; }

    public virtual Package Package { get; set; } = null!;
}
