using System;
using System.Collections.Generic;
using Catalog.Domain.Entities.Generated;
using Microsoft.EntityFrameworkCore;

namespace Catalog.Infrastructure.Persistence;

public partial class CatalogDbContext : DbContext
{
    public CatalogDbContext(DbContextOptions<CatalogDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AddOn> AddOns { get; set; }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<Item> Items { get; set; }

    public virtual DbSet<Package> Packages { get; set; }

    public virtual DbSet<PackageInclusion> PackageInclusions { get; set; }

    public virtual DbSet<PackageItem> PackageItems { get; set; }

    public virtual DbSet<PackageVariant> PackageVariants { get; set; }

    public virtual DbSet<PriceHistory> PriceHistories { get; set; }

    public virtual DbSet<vw_PackageCosting> vw_PackageCostings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AddOn>(entity =>
        {
            entity.ToTable("AddOns", "catalog");

            entity.HasIndex(e => e.Name, "UX_AddOns_Name").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_AddOns_Id");
            entity.Property(e => e.Cost).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_AddOns_CreatedAt");
            entity.Property(e => e.CreatedBy).HasMaxLength(128);
            entity.Property(e => e.Description).HasMaxLength(512);
            entity.Property(e => e.IsActive).HasDefaultValue(true, "DF_AddOns_Active");
            entity.Property(e => e.Name).HasMaxLength(256);
            entity.Property(e => e.Price).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.PricingType).HasMaxLength(16);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_AddOns_UpdatedAt");
            entity.Property(e => e.UpdatedBy).HasMaxLength(128);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("Categories", "catalog");

            entity.HasIndex(e => e.Name, "UX_Categories_Name")
                .IsUnique()
                .HasFilter("([IsDeleted]=(0))");

            entity.HasIndex(e => e.Slug, "UX_Categories_Slug")
                .IsUnique()
                .HasFilter("([IsDeleted]=(0))");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Categories_Id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Categories_CreatedAt");
            entity.Property(e => e.CreatedBy).HasMaxLength(128);
            entity.Property(e => e.Description).HasMaxLength(512);
            entity.Property(e => e.ImageUrl).HasMaxLength(512);
            entity.Property(e => e.IsActive).HasDefaultValue(true, "DF_Categories_Active");
            entity.Property(e => e.Name).HasMaxLength(128);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.Slug).HasMaxLength(128);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Categories_UpdatedAt");
            entity.Property(e => e.UpdatedBy).HasMaxLength(128);
        });

        modelBuilder.Entity<Item>(entity =>
        {
            entity.ToTable("Items", "catalog");

            entity.HasIndex(e => e.Name, "UX_Items_Name")
                .IsUnique()
                .HasFilter("([IsDeleted]=(0))");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Items_Id");
            entity.Property(e => e.Allergens).HasMaxLength(256);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Items_CreatedAt");
            entity.Property(e => e.CreatedBy).HasMaxLength(128);
            entity.Property(e => e.Description).HasMaxLength(512);
            entity.Property(e => e.ImageUrl).HasMaxLength(512);
            entity.Property(e => e.IsActive).HasDefaultValue(true, "DF_Items_Active");
            entity.Property(e => e.Name).HasMaxLength(256);
            entity.Property(e => e.NameBn).HasMaxLength(256);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Items_UpdatedAt");
            entity.Property(e => e.UpdatedBy).HasMaxLength(128);
        });

        modelBuilder.Entity<Package>(entity =>
        {
            entity.ToTable("Packages", "catalog");

            entity.HasIndex(e => e.CategoryId, "IX_Packages_Category").HasFilter("([IsDeleted]=(0))");

            entity.HasIndex(e => e.Slug, "UX_Packages_Slug")
                .IsUnique()
                .HasFilter("([IsDeleted]=(0))");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Packages_Id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Packages_CreatedAt");
            entity.Property(e => e.CreatedBy).HasMaxLength(128);
            entity.Property(e => e.Description).HasMaxLength(1024);
            entity.Property(e => e.HeroImageUrl).HasMaxLength(512);
            entity.Property(e => e.IsActive).HasDefaultValue(true, "DF_Packages_Active");
            entity.Property(e => e.MinGuests).HasDefaultValue(1, "DF_Packages_MinGuests");
            entity.Property(e => e.Model3DUrl).HasMaxLength(512);
            entity.Property(e => e.Name).HasMaxLength(256);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.SalePricePerHead).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.Slug).HasMaxLength(256);
            entity.Property(e => e.Tagline).HasMaxLength(512);
            entity.Property(e => e.UpdatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Packages_UpdatedAt");
            entity.Property(e => e.UpdatedBy).HasMaxLength(128);

            entity.HasOne(d => d.Category).WithMany(p => p.Packages)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Packages_Categories");

            entity.HasMany(d => d.AddOns).WithMany(p => p.Packages)
                .UsingEntity<Dictionary<string, object>>(
                    "PackageAddOn",
                    r => r.HasOne<AddOn>().WithMany()
                        .HasForeignKey("AddOnId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_PackageAddOns_AddOns"),
                    l => l.HasOne<Package>().WithMany()
                        .HasForeignKey("PackageId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_PackageAddOns_Packages"),
                    j =>
                    {
                        j.HasKey("PackageId", "AddOnId");
                        j.ToTable("PackageAddOns", "catalog");
                    });
        });

        modelBuilder.Entity<PackageInclusion>(entity =>
        {
            entity.ToTable("PackageInclusions", "catalog");

            entity.HasIndex(e => e.PackageId, "IX_PackageInclusions_Package");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_PackageInclusions_Id");
            entity.Property(e => e.Text).HasMaxLength(512);

            entity.HasOne(d => d.Package).WithMany(p => p.PackageInclusions)
                .HasForeignKey(d => d.PackageId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PackageInclusions_Packages");
        });

        modelBuilder.Entity<PackageItem>(entity =>
        {
            entity.HasKey(e => new { e.PackageId, e.ItemId });

            entity.ToTable("PackageItems", "catalog");

            entity.HasIndex(e => e.ItemId, "IX_PackageItems_Item");

            entity.Property(e => e.CostPerHead).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.DisplayName).HasMaxLength(256);

            entity.HasOne(d => d.Item).WithMany(p => p.PackageItems)
                .HasForeignKey(d => d.ItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PackageItems_Items");

            entity.HasOne(d => d.Package).WithMany(p => p.PackageItems)
                .HasForeignKey(d => d.PackageId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PackageItems_Packages");
        });

        modelBuilder.Entity<PackageVariant>(entity =>
        {
            entity.ToTable("PackageVariants", "catalog");

            entity.HasIndex(e => e.PackageId, "IX_PackageVariants_Package");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_PackageVariants_Id");
            entity.Property(e => e.CostDeltaPerHead).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.Name).HasMaxLength(128);
            entity.Property(e => e.PriceDeltaPerHead).HasColumnType("decimal(12, 2)");

            entity.HasOne(d => d.Package).WithMany(p => p.PackageVariants)
                .HasForeignKey(d => d.PackageId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PackageVariants_Packages");
        });

        modelBuilder.Entity<PriceHistory>(entity =>
        {
            entity.ToTable("PriceHistory", "catalog");

            entity.HasIndex(e => e.PackageId, "IX_PriceHistory_Package");

            entity.Property(e => e.ChangedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_PriceHistory_ChangedAt");
            entity.Property(e => e.ChangedBy).HasMaxLength(128);
            entity.Property(e => e.NewPrice).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.OldPrice).HasColumnType("decimal(12, 2)");

            entity.HasOne(d => d.Package).WithMany(p => p.PriceHistories)
                .HasForeignKey(d => d.PackageId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_PriceHistory_Packages");
        });

        modelBuilder.Entity<vw_PackageCosting>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_PackageCosting", "catalog");

            entity.Property(e => e.CategoryName).HasMaxLength(128);
            entity.Property(e => e.MarginPct).HasColumnType("decimal(38, 6)");
            entity.Property(e => e.PackageName).HasMaxLength(256);
            entity.Property(e => e.PackageSlug).HasMaxLength(256);
            entity.Property(e => e.Profit).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.SalePricePerHead).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.TotalCost).HasColumnType("decimal(38, 2)");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
