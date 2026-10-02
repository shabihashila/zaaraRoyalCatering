using ZRC.Modules.Catalog.Contracts;

namespace ZRC.Modules.Ordering.Application;

public sealed record OrderAmounts(decimal UnitPrice, decimal UnitCost, decimal SubTotal,
    decimal AddOnTotal, decimal GrandTotal, decimal TotalCost);

public static class OrderPricing
{
    public static OrderAmounts Calculate(OrderCatalogDto source, Guid? variantId, int guests,
        IReadOnlyList<Guid> addOnIds, decimal delivery = 0, decimal discount = 0)
    {
        var p = source.Package;
        if (guests < p.MinGuests || guests > (p.MaxGuests ?? 100000))
            throw new ArgumentException($"Choose between {p.MinGuests} and {p.MaxGuests ?? 100000} guests.");
        var variant = p.Variants.SingleOrDefault(v => v.Id == variantId);
        if (variantId is not null && variant is null) throw new ArgumentException("Choose a variant from this package.");
        if (p.Variants.Count > 0 && variant is null) throw new ArgumentException("Choose a package variant.");
        if (addOnIds.Distinct().Count() != addOnIds.Count || addOnIds.Any(id => !p.AddOns.Any(a => a.Id == id)))
            throw new ArgumentException("Choose valid, distinct add-ons from this package.");
        if (delivery < 0 || discount < 0 || delivery > 1000000 || discount > 1000000 || decimal.Round(delivery,2)!=delivery || decimal.Round(discount,2)!=discount)
            throw new ArgumentException("Delivery and discount must be valid non-negative amounts.");
        var unitPrice = p.SalePricePerHead + (variant?.PriceDeltaPerHead ?? 0);
        var unitCost = source.CostPerHead + (variant is null ? 0 : source.VariantCosts[variant.Id]);
        var extras = p.AddOns.Where(a => addOnIds.Contains(a.Id)).ToList();
        var addOnTotal = extras.Sum(a => a.Price * (a.PricingType == "PerHead" ? guests : 1));
        var total = guests * unitPrice + addOnTotal + delivery - discount;
        if (total <= 0 || total > 9999999999m || unitPrice <= 0 || unitCost < 0)
            throw new ArgumentException("Order total must be positive and within the supported limit.");
        return new(unitPrice, unitCost, guests * unitPrice, addOnTotal, total,
            guests * unitCost + extras.Sum(a => source.AddOnCosts[a.Id] * (a.PricingType == "PerHead" ? guests : 1)));
    }
}
