using System;
using System.Collections.Generic;
using Content.Domain.Entities.Generated;
using Microsoft.EntityFrameworkCore;

namespace Content.Infrastructure.Persistence;

public partial class ContentDbContext : DbContext
{
    public ContentDbContext(DbContextOptions<ContentDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Entry> Entries { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Entry>(entity =>
        {
            entity.ToTable("Entries", "content");

            entity.HasIndex(e => new { e.Kind, e.Key }, "UX_Entries_Key").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Entries_Id");
            entity.Property(e => e.Body).HasMaxLength(4000);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Entries_Created");
            entity.Property(e => e.CreatedBy).HasMaxLength(450);
            entity.Property(e => e.ImageUrl).HasMaxLength(1000);
            entity.Property(e => e.Key).HasMaxLength(100);
            entity.Property(e => e.Kind).HasMaxLength(20);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.UpdatedAt).HasPrecision(3);
            entity.Property(e => e.UpdatedBy).HasMaxLength(450);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
