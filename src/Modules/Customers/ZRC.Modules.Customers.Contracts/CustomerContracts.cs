namespace ZRC.Modules.Customers.Contracts;
public sealed record CustomerContact(Guid Id, string Name, string Phone, string? Address);
public interface ICustomerQuery
{
    Task<CustomerContact?> GetAsync(Guid id, CancellationToken ct = default);
}
