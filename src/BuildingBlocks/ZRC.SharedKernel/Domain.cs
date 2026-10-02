namespace ZRC.SharedKernel;

public interface IDomainEvent
{
    Guid EventId { get; }
    DateTimeOffset OccurredAt { get; }
}

public abstract record DomainEvent : IDomainEvent
{
    public Guid EventId { get; init; } = Guid.NewGuid();
    public DateTimeOffset OccurredAt { get; init; } = DateTimeOffset.UtcNow;
}

/// <summary>Cross-module integration event (via in-process bus + outbox).</summary>
public interface IIntegrationEvent : IDomainEvent
{
}

public abstract class Entity
{
    public List<IDomainEvent> DomainEvents { get; } = [];
    protected void Raise(IDomainEvent @event) => DomainEvents.Add(@event);
    public void ClearEvents() => DomainEvents.Clear();
}

public abstract class AggregateRoot : Entity
{
}
