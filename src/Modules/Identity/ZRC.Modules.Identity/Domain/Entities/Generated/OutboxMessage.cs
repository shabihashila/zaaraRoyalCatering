using System;
using System.Collections.Generic;

namespace Identity.Domain.Entities.Generated;

public partial class OutboxMessage
{
    public Guid Id { get; set; }

    public string EventType { get; set; } = null!;

    public string Payload { get; set; } = null!;

    public DateTime OccurredAt { get; set; }

    public DateTime? ProcessedAt { get; set; }

    public string? Error { get; set; }

    public DateTime CreatedAt { get; set; }
}
