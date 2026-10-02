using Microsoft.AspNetCore.Identity;

namespace ZRC.Modules.Identity.Domain;

/// <summary>App user mapped onto identity.Users (database-first, no migrations).</summary>
public sealed class ZrcUser : IdentityUser<string>
{
    public ZrcUser() => Id = Guid.NewGuid().ToString();

    public string? DisplayName { get; set; }
    public bool IsStaff { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

/// <summary>App role mapped onto identity.Roles.</summary>
public sealed class ZrcRole : IdentityRole<string>
{
    public ZrcRole() => Id = Guid.NewGuid().ToString();

    public string? Description { get; set; }
    public bool IsSystem { get; set; }
}
