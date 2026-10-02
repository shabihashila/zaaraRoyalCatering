using System;
using System.Collections.Generic;

namespace Engagement.Domain.Entities.Generated;

public partial class Review
{
    public Guid Id { get; set; }

    public string AuthorName { get; set; } = null!;

    public int Rating { get; set; }

    public string Body { get; set; } = null!;

    public string? EventType { get; set; }

    public string Status { get; set; } = null!;

    public bool IsFeatured { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public byte[] RowVersion { get; set; } = null!;
}
