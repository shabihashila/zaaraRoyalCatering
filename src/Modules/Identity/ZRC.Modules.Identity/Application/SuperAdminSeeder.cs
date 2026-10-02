using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ZRC.Modules.Identity.Domain;

namespace ZRC.Modules.Identity.Application;

/// <summary>
/// Seeds the SuperAdmin user from configuration on startup (user row only — never schema).
/// Credentials come from user-secrets / env (Seed:SuperAdmin), never committed.
/// </summary>
public static class SuperAdminSeeder
{
    public static async Task EnsureAsync(IServiceProvider sp, CancellationToken ct = default)
    {
        using var scope = sp.CreateScope();
        var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var log = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("SuperAdminSeeder");
        var email = cfg["Seed:SuperAdmin:Email"];
        var password = cfg["Seed:SuperAdmin:Password"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            log.LogInformation("Seed:SuperAdmin not configured; skipping.");
            return;
        }
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ZrcUser>>();
        var user = await users.FindByEmailAsync(email);
        if (user is null)
        {
            user = new ZrcUser
            {
                UserName = email, Email = email, EmailConfirmed = true,
                DisplayName = "Super Admin", IsStaff = true, IsActive = true,
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, CreatedBy = "seed",
            };
            var cr = await users.CreateAsync(user, password);
            if (!cr.Succeeded) throw new InvalidOperationException("SuperAdmin seed failed: " + string.Join("; ", cr.Errors.Select(e => e.Description)));
        }
        // Idempotent: a previous crashed run may have left the user without its role.
        if (!await users.IsInRoleAsync(user, "SuperAdmin"))
        {
            var ar = await users.AddToRoleAsync(user, "SuperAdmin");
            if (!ar.Succeeded) throw new InvalidOperationException("SuperAdmin role grant failed: " + string.Join("; ", ar.Errors.Select(e => e.Description)));
            log.LogWarning("Seeded SuperAdmin {Email}", email);
        }
    }
}
