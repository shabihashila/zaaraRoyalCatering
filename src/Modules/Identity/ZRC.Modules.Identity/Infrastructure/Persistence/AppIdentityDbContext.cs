using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ZRC.Modules.Identity.Domain;

namespace ZRC.Modules.Identity.Infrastructure.Persistence;

/// <summary>
/// Identity store mapped onto the database-first identity.* tables.
/// Never run migrations against this context (no Add-Migration / Migrate()).
/// Reads of permissions/menu/audit use the scaffolded IdentityDbContext instead.
/// </summary>
public sealed class AppIdentityDbContext(DbContextOptions<AppIdentityDbContext> options)
    : IdentityDbContext<ZrcUser, ZrcRole, string>(options)
{
    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<ZrcUser>(e =>
        {
            e.ToTable("Users", "identity");
            e.Property(u => u.DisplayName).HasMaxLength(128);
            e.Property(u => u.CreatedBy).HasMaxLength(128);
            e.Property(u => u.UpdatedBy).HasMaxLength(128);
        });
        b.Entity<ZrcRole>(e =>
        {
            e.ToTable("Roles", "identity");
            e.Property(r => r.Name).HasMaxLength(128);
            e.Property(r => r.NormalizedName).HasMaxLength(128);
            e.Property(r => r.Description).HasMaxLength(512);
        });
        b.Entity<IdentityUserRole<string>>(e => e.ToTable("UserRoles", "identity"));
        b.Entity<IdentityUserClaim<string>>(e => e.ToTable("UserClaims", "identity"));
        b.Entity<IdentityUserLogin<string>>(e => e.ToTable("UserLogins", "identity"));
        b.Entity<IdentityUserToken<string>>(e => e.ToTable("UserTokens", "identity"));
        b.Entity<IdentityRoleClaim<string>>(e => e.ToTable("RoleClaims", "identity"));
        ZRC.Infrastructure.Common.DatabaseProvider.AdaptPostgres(b, this);
    }
}
