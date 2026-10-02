using ZRC.SharedKernel;

namespace ZRC.Infrastructure.Common;

/// <summary>Transactional outbox record (one table per DB; schema identity or dbo).</summary>
public sealed class OutboxMessage : IAuditable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string EventType { get; set; }
    public required string Payload { get; set; }
    public DateTime OccurredAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    public static OutboxMessage From(IIntegrationEvent e, string payload) => new()
    {
        EventType = e.GetType().FullName!,
        Payload = payload,
        OccurredAt = e.OccurredAt.UtcDateTime,
    };
}

public interface INotificationSender
{
    Task SendEmailAsync(string to, string subject, string htmlBody, CancellationToken ct = default);
    Task SendSmsAsync(string to, string text, CancellationToken ct = default);
}

public interface IFileStorage
{
    Task<string> SaveImageAsync(Stream content, string fileName, string contentType, CancellationToken ct = default);
}
