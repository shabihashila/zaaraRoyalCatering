using System;
using System.Collections.Generic;
using Identity.Domain.Entities.Generated;
using Microsoft.EntityFrameworkCore;

namespace Identity.Infrastructure.Persistence;

public partial class IdentityDbContext : DbContext
{
    public IdentityDbContext(DbContextOptions<IdentityDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<OutboxMessage> OutboxMessages { get; set; }

    public virtual DbSet<Permission> Permissions { get; set; }

    public virtual DbSet<RefreshToken> RefreshTokens { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<RoleClaim> RoleClaims { get; set; }

    public virtual DbSet<RolePermission> RolePermissions { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserClaim> UserClaims { get; set; }

    public virtual DbSet<UserLogin> UserLogins { get; set; }

    public virtual DbSet<UserRole> UserRoles { get; set; }

    public virtual DbSet<UserToken> UserTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLogs", "identity");

            entity.HasIndex(e => new { e.EntityType, e.EntityId }, "IX_AuditLogs_Entity");

            entity.HasIndex(e => e.OccurredAt, "IX_AuditLogs_OccurredAt").IsDescending();

            entity.Property(e => e.Action).HasMaxLength(128);
            entity.Property(e => e.EntityId).HasMaxLength(128);
            entity.Property(e => e.EntityType).HasMaxLength(256);
            entity.Property(e => e.IpAddress).HasMaxLength(64);
            entity.Property(e => e.OccurredAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_AuditLogs_OccurredAt");
            entity.Property(e => e.UserId).HasMaxLength(450);
        });

        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.ToTable("OutboxMessages", "identity");

            entity.HasIndex(e => e.OccurredAt, "IX_Outbox_Unprocessed").HasFilter("([ProcessedAt] IS NULL)");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Outbox_Id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Outbox_CreatedAt");
            entity.Property(e => e.EventType).HasMaxLength(512);
            entity.Property(e => e.OccurredAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Outbox_OccurredAt");
            entity.Property(e => e.ProcessedAt).HasPrecision(3);
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.ToTable("Permissions", "identity");

            entity.HasIndex(e => e.Module, "IX_Permissions_Module");

            entity.HasIndex(e => e.Code, "UX_Permissions_Code").IsUnique();

            entity.Property(e => e.Code).HasMaxLength(128);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Permissions_CreatedAt");
            entity.Property(e => e.Description).HasMaxLength(512);
            entity.Property(e => e.Module).HasMaxLength(64);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshTokens", "identity");

            entity.HasIndex(e => new { e.UserId, e.ExpiresAt }, "IX_RefreshTokens_UserId");

            entity.HasIndex(e => e.TokenHash, "UX_RefreshTokens_TokenHash").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_RefreshTokens_Id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_RefreshTokens_CreatedAt");
            entity.Property(e => e.CreatedByIp).HasMaxLength(64);
            entity.Property(e => e.ExpiresAt).HasPrecision(3);
            entity.Property(e => e.ReplacedByTokenHash).HasMaxLength(256);
            entity.Property(e => e.RevokedAt).HasPrecision(3);
            entity.Property(e => e.RevokedByIp).HasMaxLength(64);
            entity.Property(e => e.TokenHash).HasMaxLength(256);

            entity.HasOne(d => d.User).WithMany(p => p.RefreshTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_RefreshTokens_Users");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("Roles", "identity");

            entity.HasIndex(e => e.NormalizedName, "IX_Roles_NormalizedName")
                .IsUnique()
                .HasFilter("([NormalizedName] IS NOT NULL)");

            entity.HasIndex(e => e.Name, "UX_Roles_Name").IsUnique();

            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Roles_CreatedAt");
            entity.Property(e => e.CreatedBy).HasMaxLength(128);
            entity.Property(e => e.Description).HasMaxLength(512);
            entity.Property(e => e.Name).HasMaxLength(128);
            entity.Property(e => e.NormalizedName).HasMaxLength(128);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Roles_UpdatedAt");
            entity.Property(e => e.UpdatedBy).HasMaxLength(128);
        });

        modelBuilder.Entity<RoleClaim>(entity =>
        {
            entity.ToTable("RoleClaims", "identity");

            entity.HasIndex(e => e.RoleId, "IX_RoleClaims_RoleId");

            entity.HasOne(d => d.Role).WithMany(p => p.RoleClaims)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK_RoleClaims_Roles");
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.HasKey(e => new { e.RoleId, e.PermissionId });

            entity.ToTable("RolePermissions", "identity");

            entity.Property(e => e.GrantedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_RolePermissions_GrantedAt");
            entity.Property(e => e.GrantedBy).HasMaxLength(128);

            entity.HasOne(d => d.Permission).WithMany(p => p.RolePermissions)
                .HasForeignKey(d => d.PermissionId)
                .HasConstraintName("FK_RolePermissions_Permissions");

            entity.HasOne(d => d.Role).WithMany(p => p.RolePermissions)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK_RolePermissions_Roles");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users", "identity");

            entity.HasIndex(e => e.NormalizedEmail, "IX_Users_NormalizedEmail")
                .IsUnique()
                .HasFilter("([NormalizedEmail] IS NOT NULL)");

            entity.HasIndex(e => e.NormalizedUserName, "IX_Users_NormalizedUserName")
                .IsUnique()
                .HasFilter("([NormalizedUserName] IS NOT NULL)");

            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Users_CreatedAt");
            entity.Property(e => e.CreatedBy).HasMaxLength(128);
            entity.Property(e => e.DisplayName).HasMaxLength(128);
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.IsActive).HasDefaultValue(true, "DF_Users_IsActive");
            entity.Property(e => e.LockoutEnabled).HasDefaultValue(true, "DF_Users_LockoutEnabled");
            entity.Property(e => e.NormalizedEmail).HasMaxLength(256);
            entity.Property(e => e.NormalizedUserName).HasMaxLength(256);
            entity.Property(e => e.PhoneNumber).HasMaxLength(32);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Users_UpdatedAt");
            entity.Property(e => e.UpdatedBy).HasMaxLength(128);
            entity.Property(e => e.UserName).HasMaxLength(256);
        });

        modelBuilder.Entity<UserClaim>(entity =>
        {
            entity.ToTable("UserClaims", "identity");

            entity.HasIndex(e => e.UserId, "IX_UserClaims_UserId");

            entity.HasOne(d => d.User).WithMany(p => p.UserClaims)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_UserClaims_Users");
        });

        modelBuilder.Entity<UserLogin>(entity =>
        {
            entity.HasKey(e => new { e.LoginProvider, e.ProviderKey });

            entity.ToTable("UserLogins", "identity");

            entity.HasIndex(e => e.UserId, "IX_UserLogins_UserId");

            entity.Property(e => e.LoginProvider).HasMaxLength(128);

            entity.HasOne(d => d.User).WithMany(p => p.UserLogins)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_UserLogins_Users");
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.RoleId });

            entity.ToTable("UserRoles", "identity");

            entity.Property(e => e.AssignedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_UserRoles_AssignedAt");
            entity.Property(e => e.AssignedBy).HasMaxLength(128);

            entity.HasOne(d => d.Role).WithMany(p => p.UserRoles)
                .HasForeignKey(d => d.RoleId)
                .HasConstraintName("FK_UserRoles_Roles");

            entity.HasOne(d => d.User).WithMany(p => p.UserRoles)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_UserRoles_Users");
        });

        modelBuilder.Entity<UserToken>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.LoginProvider, e.Name });

            entity.ToTable("UserTokens", "identity");

            entity.Property(e => e.LoginProvider).HasMaxLength(128);
            entity.Property(e => e.Name).HasMaxLength(128);

            entity.HasOne(d => d.User).WithMany(p => p.UserTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_UserTokens_Users");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
