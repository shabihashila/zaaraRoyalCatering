using System;
using System.Collections.Generic;
using Engagement.Domain.Entities.Generated;
using Microsoft.EntityFrameworkCore;

namespace Engagement.Infrastructure.Persistence;

public partial class EngagementDbContext : DbContext
{
    public EngagementDbContext(DbContextOptions<EngagementDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Request> Requests { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Request>(entity =>
        {
            entity.ToTable("Requests", "engagement");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Requests_Id");
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Requests_Created");
            entity.Property(e => e.CreatedBy).HasMaxLength(450);
            entity.Property(e => e.Email).HasMaxLength(254);
            entity.Property(e => e.Kind).HasMaxLength(20);
            entity.Property(e => e.Message).HasMaxLength(4000);
            entity.Property(e => e.Name).HasMaxLength(160);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.StaffNotes).HasMaxLength(2000);
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("New", "DF_Requests_Status");
            entity.Property(e => e.Subject).HasMaxLength(160);
            entity.Property(e => e.UpdatedAt).HasPrecision(3);
            entity.Property(e => e.UpdatedBy).HasMaxLength(450);
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("Reviews", "engagement");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Reviews_Id");
            entity.Property(e => e.AuthorName).HasMaxLength(160);
            entity.Property(e => e.Body).HasMaxLength(2000);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Reviews_Created");
            entity.Property(e => e.CreatedBy).HasMaxLength(450);
            entity.Property(e => e.EventType).HasMaxLength(160);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValue("Pending", "DF_Reviews_Status");
            entity.Property(e => e.UpdatedAt).HasPrecision(3);
            entity.Property(e => e.UpdatedBy).HasMaxLength(450);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
