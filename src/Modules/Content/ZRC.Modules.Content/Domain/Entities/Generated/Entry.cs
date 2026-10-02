using System;
using System.Collections.Generic;

namespace Content.Domain.Entities.Generated;

public partial class Entry
{
    public Guid Id { get; set; }

    public string Kind { get; set; } = null!;

    public string Key { get; set; } = null!;

    public string Title { get; set; } = null!;

    public string Body { get; set; } = null!;

    public string? ImageUrl { get; set; }

    public int SortOrder { get; set; }

    public bool IsPublished { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public byte[] RowVersion { get; set; } = null!;
}
