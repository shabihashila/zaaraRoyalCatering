using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using ZRC.SharedKernel;

namespace ZRC.Infrastructure.Common;

/// <summary>Audit + soft-delete + outbox interceptor (Phase 0 minimal).</summary>
public sealed class AuditInterceptor(IClock clock) : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        if (eventData.Context is not null)
        {
            var now = clock.UtcNow.UtcDateTime;
            foreach (var e in eventData.Context.ChangeTracker.Entries<IAuditable>())
            {
                if (e.State == EntityState.Added)
                {
                    e.Entity.CreatedAt = now;
                    e.Entity.UpdatedAt = now;
                }
                else if (e.State == EntityState.Modified)
                {
                    e.Entity.UpdatedAt = now;
                }
            }
        }
        return base.SavingChangesAsync(eventData, result, ct);
    }
}

public interface IAuditable
{
    DateTime CreatedAt { get; set; }
    DateTime UpdatedAt { get; set; }
    string? CreatedBy { get; set; }
    string? UpdatedBy { get; set; }
}
