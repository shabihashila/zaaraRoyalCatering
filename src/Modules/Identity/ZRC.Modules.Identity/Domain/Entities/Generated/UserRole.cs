using System;
using System.Collections.Generic;

namespace Identity.Domain.Entities.Generated;

public partial class UserRole
{
    public string UserId { get; set; } = null!;

    public string RoleId { get; set; } = null!;

    public DateTime AssignedAt { get; set; }

    public string? AssignedBy { get; set; }

    public virtual Role Role { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
