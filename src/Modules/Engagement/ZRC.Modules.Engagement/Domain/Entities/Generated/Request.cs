using System;
using System.Collections.Generic;

namespace Engagement.Domain.Entities.Generated;

public partial class Request
{
    public Guid Id { get; set; }

    public string Kind { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Subject { get; set; }

    public string Message { get; set; } = null!;

    public string Status { get; set; } = null!;

    public string? StaffNotes { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public byte[] RowVersion { get; set; } = null!;
}
