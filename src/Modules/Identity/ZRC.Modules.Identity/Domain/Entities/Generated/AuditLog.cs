using System;
using System.Collections.Generic;

namespace Identity.Domain.Entities.Generated;

public partial class AuditLog
{
    public long Id { get; set; }

    public DateTime OccurredAt { get; set; }

    public string? UserId { get; set; }

    public string Action { get; set; } = null!;

    public string? EntityType { get; set; }

    public string? EntityId { get; set; }

    public string? BeforeJson { get; set; }

    public string? AfterJson { get; set; }

    public string? IpAddress { get; set; }
}
