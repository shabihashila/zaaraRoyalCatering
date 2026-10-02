using System;
using System.Collections.Generic;

namespace Identity.Domain.Entities.Generated;

public partial class RolePermission
{
    public string RoleId { get; set; } = null!;

    public int PermissionId { get; set; }

    public DateTime GrantedAt { get; set; }

    public string? GrantedBy { get; set; }

    public virtual Permission Permission { get; set; } = null!;

    public virtual Role Role { get; set; } = null!;
}
