using System;
using System.Collections.Generic;

namespace Navigation.Domain.Entities.Generated;

public partial class MenuItem
{
    public Guid Id { get; set; }

    public Guid? ParentId { get; set; }

    public string Key { get; set; } = null!;

    public string Label { get; set; } = null!;

    public string? LabelBn { get; set; }

    public string? Icon { get; set; }

    public string? Route { get; set; }

    public string? ExternalUrl { get; set; }

    public string? RequiredPermission { get; set; }

    public string MenuArea { get; set; } = null!;

    public int SortOrder { get; set; }

    public bool IsVisible { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual ICollection<MenuItem> InverseParent { get; set; } = new List<MenuItem>();

    public virtual MenuItem? Parent { get; set; }
}
