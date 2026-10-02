using Identity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ZRC.Host.Auth;

/// <summary>Fail-fast startup check: every permission constant declared in code must exist in identity.Permissions.</summary>
public static class StartupPermissionCheck
{
    public static async Task EnsureAsync(IServiceProvider sp, IEnumerable<string> declared, CancellationToken ct = default)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var inDb = await db.Permissions.AsNoTracking().Select(p => p.Code).ToListAsync(ct);
        var missing = declared.Except(inDb, StringComparer.Ordinal).ToList();
        if (missing.Count > 0)
            throw new InvalidOperationException(
                "Permission constants missing in identity.Permissions (post-deploy seed): " + string.Join(", ", missing));
    }
}
