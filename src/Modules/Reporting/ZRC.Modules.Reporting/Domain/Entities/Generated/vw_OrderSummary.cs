using System;
using System.Collections.Generic;

namespace Reporting.Domain.Entities.Generated;

public partial class vw_OrderSummary
{
    public Guid Id { get; set; }

    public string OrderNo { get; set; } = null!;

    public DateOnly EventDate { get; set; }

    public string Status { get; set; } = null!;

    public string PackageName { get; set; } = null!;

    public string CategoryName { get; set; } = null!;

    public int Guests { get; set; }

    public decimal GrandTotal { get; set; }

    public decimal TotalCost { get; set; }

    public decimal? Profit { get; set; }

    public decimal PaidAmount { get; set; }
}
