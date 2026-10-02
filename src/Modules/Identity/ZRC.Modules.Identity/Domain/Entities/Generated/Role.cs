using System;
using System.Collections.Generic;

namespace Identity.Domain.Entities.Generated;

public partial class Role
{
    public string Id { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? NormalizedName { get; set; }

    public string? ConcurrencyStamp { get; set; }

    public string? Description { get; set; }

    public bool IsSystem { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual ICollection<RoleClaim> RoleClaims { get; set; } = new List<RoleClaim>();

    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();

    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}
