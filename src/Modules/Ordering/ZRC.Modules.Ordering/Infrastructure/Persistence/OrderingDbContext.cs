using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Ordering.Domain.Entities.Generated;

namespace Ordering.Infrastructure.Persistence;

public partial class OrderingDbContext : DbContext
{
    public OrderingDbContext(DbContextOptions<OrderingDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderStatusHistory> OrderStatusHistories { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<vw_KitchenPrep> vw_KitchenPreps { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("Orders", "ordering");

            entity.HasIndex(e => e.CustomerId, "IX_Orders_Customer");

            entity.HasIndex(e => new { e.EventDate, e.Status }, "IX_Orders_EventDate");

            entity.HasIndex(e => e.OrderNo, "UX_Orders_Number").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Orders_Id");
            entity.Property(e => e.AddOnTotal).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.CategoryName).HasMaxLength(160);
            entity.Property(e => e.ContactName).HasMaxLength(160);
            entity.Property(e => e.ContactPhone).HasMaxLength(20);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Orders_Created");
            entity.Property(e => e.CreatedBy).HasMaxLength(450);
            entity.Property(e => e.DeliveryCharge).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.Discount).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.EventTime).HasPrecision(0);
            entity.Property(e => e.EventType).HasMaxLength(160);
            entity.Property(e => e.GrandTotal).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.OrderNo).HasMaxLength(40);
            entity.Property(e => e.PackageName).HasMaxLength(160);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.SpecialInstructions).HasMaxLength(2000);
            entity.Property(e => e.Status)
                .HasMaxLength(24)
                .HasDefaultValue("Pending", "DF_Orders_Status");
            entity.Property(e => e.SubTotal).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.TotalCost).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.UnitCostPerHead).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.UnitPricePerHead).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.UpdatedAt).HasPrecision(3);
            entity.Property(e => e.UpdatedBy).HasMaxLength(450);
            entity.Property(e => e.UserId).HasMaxLength(450);
            entity.Property(e => e.VariantName).HasMaxLength(160);
            entity.Property(e => e.VenueAddress).HasMaxLength(1000);
        });

        modelBuilder.Entity<OrderStatusHistory>(entity =>
        {
            entity.ToTable("OrderStatusHistory", "ordering");

            entity.Property(e => e.ChangedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_OrderStatusHistory_Date");
            entity.Property(e => e.ChangedBy).HasMaxLength(450);
            entity.Property(e => e.FromStatus).HasMaxLength(24);
            entity.Property(e => e.Note).HasMaxLength(1000);
            entity.Property(e => e.ToStatus).HasMaxLength(24);

            entity.HasOne(d => d.Order).WithMany(p => p.OrderStatusHistories)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_OrderStatusHistory_Order");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("Payments", "ordering");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Payments_Id");
            entity.Property(e => e.Amount).HasColumnType("decimal(12, 2)");
            entity.Property(e => e.Method).HasMaxLength(20);
            entity.Property(e => e.PaidAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Payments_Date");
            entity.Property(e => e.RecordedBy).HasMaxLength(450);
            entity.Property(e => e.Reference).HasMaxLength(120);

            entity.HasOne(d => d.Order).WithMany(p => p.Payments)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Payments_Order");
        });

        modelBuilder.Entity<vw_KitchenPrep>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("vw_KitchenPrep", "ordering");

            entity.Property(e => e.ItemName).HasMaxLength(300);
            entity.Property(e => e.VariantName).HasMaxLength(160);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
