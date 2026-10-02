using System;
using System.Collections.Generic;

namespace Ordering.Domain.Entities.Generated;

public partial class OrderStatusHistory
{
    public long Id { get; set; }

    public Guid OrderId { get; set; }

    public string? FromStatus { get; set; }

    public string ToStatus { get; set; } = null!;

    public string? Note { get; set; }

    public DateTime ChangedAt { get; set; }

    public string? ChangedBy { get; set; }

    public virtual Order Order { get; set; } = null!;
}
