using System;
using System.Collections.Generic;

namespace Ordering.Domain.Entities.Generated;

public partial class Order
{
    public Guid Id { get; set; }

    public string OrderNo { get; set; } = null!;

    public Guid? CustomerId { get; set; }

    public string? UserId { get; set; }

    public string ContactName { get; set; } = null!;

    public string ContactPhone { get; set; } = null!;

    public Guid PackageId { get; set; }

    public string PackageName { get; set; } = null!;

    public string CategoryName { get; set; } = null!;

    public string? VariantName { get; set; }

    public int Guests { get; set; }

    public DateOnly EventDate { get; set; }

    public TimeOnly EventTime { get; set; }

    public string EventType { get; set; } = null!;

    public string VenueAddress { get; set; } = null!;

    public string? SpecialInstructions { get; set; }

    public string Status { get; set; } = null!;

    public decimal UnitPricePerHead { get; set; }

    public decimal UnitCostPerHead { get; set; }

    public decimal SubTotal { get; set; }

    public decimal AddOnTotal { get; set; }

    public decimal DeliveryCharge { get; set; }

    public decimal Discount { get; set; }

    public decimal GrandTotal { get; set; }

    public decimal TotalCost { get; set; }

    public string SnapshotJson { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public string? CreatedBy { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public string? UpdatedBy { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual ICollection<OrderStatusHistory> OrderStatusHistories { get; set; } = new List<OrderStatusHistory>();

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
