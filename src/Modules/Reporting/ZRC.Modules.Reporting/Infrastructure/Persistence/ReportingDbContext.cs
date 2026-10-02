using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Reporting.Domain.Entities.Generated;

namespace Reporting.Infrastructure.Persistence;

public partial class ReportingDbContext : DbContext
{
    public ReportingDbContext(DbContextOptions<ReportingDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<vw_OrderSummary> vw_OrderSummaries { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<vw_OrderSummary>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_OrderSummary", "reporting");

            entity.Property(e => e.CategoryName).HasMaxLength(160);
            entity.Property(e => e.GrandTotal).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.OrderNo).HasMaxLength(40);
            entity.Property(e => e.PackageName).HasMaxLength(160);
            entity.Property(e => e.PaidAmount).HasColumnType("decimal(38, 2)");
            entity.Property(e => e.Profit).HasColumnType("decimal(13, 2)");
            entity.Property(e => e.Status).HasMaxLength(24);
            entity.Property(e => e.TotalCost).HasColumnType("decimal(12, 2)");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
