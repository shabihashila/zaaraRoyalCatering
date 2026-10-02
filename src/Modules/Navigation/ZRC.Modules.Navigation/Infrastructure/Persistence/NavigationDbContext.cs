using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Navigation.Domain.Entities.Generated;

namespace Navigation.Infrastructure.Persistence;

public partial class NavigationDbContext : DbContext
{
    public NavigationDbContext(DbContextOptions<NavigationDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<MenuItem> MenuItems { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MenuItem>(entity =>
        {
            entity.ToTable("MenuItems", "nav");

            entity.HasIndex(e => new { e.ParentId, e.SortOrder }, "IX_MenuItems_Parent_Sort").HasFilter("([IsDeleted]=(0))");

            entity.HasIndex(e => new { e.Key, e.MenuArea }, "UX_MenuItems_Key_Area")
                .IsUnique()
                .HasFilter("([IsDeleted]=(0))");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_MenuItems_Id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_MenuItems_CreatedAt");
            entity.Property(e => e.CreatedBy).HasMaxLength(128);
            entity.Property(e => e.ExternalUrl).HasMaxLength(512);
            entity.Property(e => e.Icon).HasMaxLength(128);
            entity.Property(e => e.IsVisible).HasDefaultValue(true, "DF_MenuItems_Visible");
            entity.Property(e => e.Key).HasMaxLength(128);
            entity.Property(e => e.Label).HasMaxLength(128);
            entity.Property(e => e.LabelBn).HasMaxLength(128);
            entity.Property(e => e.MenuArea)
                .HasMaxLength(16)
                .HasDefaultValue("Admin", "DF_MenuItems_Area");
            entity.Property(e => e.RequiredPermission).HasMaxLength(128);
            entity.Property(e => e.Route).HasMaxLength(256);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_MenuItems_UpdatedAt");
            entity.Property(e => e.UpdatedBy).HasMaxLength(128);

            entity.HasOne(d => d.Parent).WithMany(p => p.InverseParent)
                .HasForeignKey(d => d.ParentId)
                .HasConstraintName("FK_MenuItems_Parent");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
