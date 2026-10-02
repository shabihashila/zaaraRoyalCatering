using System;
using System.Collections.Generic;

namespace Ordering.Domain.Entities.Generated;

public partial class Payment
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public string Method { get; set; } = null!;

    public decimal Amount { get; set; }

    public string? Reference { get; set; }

    public DateTime PaidAt { get; set; }

    public string? RecordedBy { get; set; }

    public virtual Order Order { get; set; } = null!;
}
