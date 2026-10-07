using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace ZRC.Infrastructure.Common;

public static class OperationsAudit
{
    // Invoke inside the same module transaction as the business write.
    public static Task WriteAsync(DbContext db, string? actor, string action, string entity,
        string id, object? before, object? after, CancellationToken ct)
    {
        var beforeJson = before is null ? null : JsonSerializer.Serialize(before);
        var afterJson = after is null ? null : JsonSerializer.Serialize(after);
        if (db.Database.IsNpgsql())
            return db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"identity\".\"AuditLogs\" (\"UserId\",\"Action\",\"EntityType\",\"EntityId\",\"BeforeJson\",\"AfterJson\") VALUES ({actor},{action},{entity},{id},{beforeJson},{afterJson})", ct);
        return db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO [identity].[AuditLogs] ([UserId],[Action],[EntityType],[EntityId],[BeforeJson],[AfterJson]) VALUES ({actor},{action},{entity},{id},{beforeJson},{afterJson})", ct);
    }
}
