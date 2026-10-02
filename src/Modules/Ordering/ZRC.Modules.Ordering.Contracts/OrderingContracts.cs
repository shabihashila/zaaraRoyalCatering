using ZRC.SharedKernel;

namespace ZRC.Modules.Ordering.Contracts;

public sealed record OrderPriceSnapshot(
    Guid PackageId, Guid? VariantId, int Guests, decimal UnitPricePerHead,
    decimal UnitCostPerHead, decimal LineTotal);

public sealed record PlaceOrderRequest(
    Guid PackageId, Guid? VariantId, int Guests, DateOnly EventDate,
    string EventType, string VenueAddress, string ContactName, string ContactPhone,
    IReadOnlyList<Guid> AddOnIds, string? Notes);

public interface IOrderingApi
{
    Task<Guid> PlaceOrderAsync(PlaceOrderRequest request, CancellationToken ct = default);
}
