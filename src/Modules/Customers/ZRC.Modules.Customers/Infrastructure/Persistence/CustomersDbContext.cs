using System;
using System.Collections.Generic;
using Customers.Domain.Entities.Generated;
using Microsoft.EntityFrameworkCore;

namespace Customers.Infrastructure.Persistence;

public partial class CustomersDbContext : DbContext
{
    public CustomersDbContext(DbContextOptions<CustomersDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Customer> Customers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.ToTable("Customers", "customers");

            entity.HasIndex(e => e.Phone, "UX_Customers_Phone")
                .IsUnique()
                .HasFilter("([IsDeleted]=(0))");

            entity.Property(e => e.Id).HasDefaultValueSql("(newid())", "DF_Customers_Id");
            entity.Property(e => e.Address).HasMaxLength(1000);
            entity.Property(e => e.CreatedAt)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())", "DF_Customers_Created");
            entity.Property(e => e.CreatedBy).HasMaxLength(450);
            entity.Property(e => e.Email).HasMaxLength(254);
            entity.Property(e => e.Name).HasMaxLength(160);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.UpdatedAt).HasPrecision(3);
            entity.Property(e => e.UpdatedBy).HasMaxLength(450);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
