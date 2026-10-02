using Identity.Domain.Entities.Generated;
using Identity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ZRC.Modules.Identity.Contracts;
using ZRC.SharedKernel;

namespace ZRC.Modules.Identity.Application;

/// <summary>Server-side role -> permission resolution with cache. JWT carries roles; API enforces permissions.</summary>
public sealed class PermissionService(IdentityDbContext db, IMemoryCache cache) : IPermissionService
{
    private static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    public async Task<HashSet<string>> GetUserPermissionsAsync(string userId, CancellationToken ct = default)
    {
        if (cache.TryGetValue<HashSet<string>>(Key(userId), out var cached) && cached is not null)
            return cached;
        var perms = await (from ur in db.UserRoles.AsNoTracking()
                           join rp in db.RolePermissions.AsNoTracking() on ur.RoleId equals rp.RoleId
                           join p in db.Permissions.AsNoTracking() on rp.PermissionId equals p.Id
                           where ur.UserId == userId
                           select p.Code).Distinct().ToListAsync(ct);
        var set = perms.ToHashSet(StringComparer.Ordinal);
        cache.Set(Key(userId), set, Ttl);
        return set;
    }

    public async Task<IList<string>> GetUserRolesAsync(string userId, CancellationToken ct = default)
    {
        if (cache.TryGetValue<IList<string>>(RolesKey(userId), out var cached) && cached is not null)
            return cached;
        var roles = await (from ur in db.UserRoles.AsNoTracking()
                           join r in db.Roles.AsNoTracking() on ur.RoleId equals r.Id
                           where ur.UserId == userId
                           select r.Name).ToListAsync(ct);
        cache.Set(RolesKey(userId), roles, Ttl);
        return roles;
    }

    public void Invalidate(string userId)
    {
        cache.Remove(Key(userId));
        cache.Remove(RolesKey(userId));
    }

    public void InvalidateAll() => (cache as MemoryCache)?.Compact(1.0);

    private static string Key(string userId) => $"zrc:perms:{userId}";
    private static string RolesKey(string userId) => $"zrc:roles:{userId}";
}

/// <summary>Every privileged action is audited (who, what, entity, before/after, IP, time).</summary>
public sealed class AuditWriter(IdentityDbContext db, IClock clock)
{
    public async Task WriteAsync(string? userId, string action, string? entityType, string? entityId,
        string? beforeJson, string? afterJson, string? ip, CancellationToken ct = default)
    {
        db.AuditLogs.Add(new AuditLog
        {
            OccurredAt = clock.UtcNow.UtcDateTime,
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            BeforeJson = beforeJson,
            AfterJson = afterJson,
            IpAddress = ip,
        });
        await db.SaveChangesAsync(ct);
    }
}
