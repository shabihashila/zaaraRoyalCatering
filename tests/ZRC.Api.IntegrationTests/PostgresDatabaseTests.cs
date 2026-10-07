using Catalog.Infrastructure.Persistence;
using Content.Infrastructure.Persistence;
using Customers.Infrastructure.Persistence;
using Engagement.Infrastructure.Persistence;
using Identity.Infrastructure.Persistence;
using Navigation.Infrastructure.Persistence;
using Ordering.Infrastructure.Persistence;
using Reporting.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Identity;
using ZRC.Modules.Identity;
using ZRC.Modules.Identity.Domain;
using ZRC.Infrastructure.Common;
using ZRC.Modules.Identity.Infrastructure.Persistence;

namespace ZRC.Api.IntegrationTests;

// Opt-in against an initialized database. Writes are always rolled back.
public sealed class PostgresDatabaseTests
{
    public sealed class PostgresFactAttribute : FactAttribute
    {
        public PostgresFactAttribute()
        {
            if (Environment.GetEnvironmentVariable("ZRC_TEST_POSTGRES") != "1")
                Skip = "Set ZRC_TEST_POSTGRES=1 and PostgreSQL connection environment variables to run.";
        }
    }
    private static IConfiguration Config => new ConfigurationBuilder().AddEnvironmentVariables().Build();
    private static T Context<T>() where T : DbContext
    {
        var options = new DbContextOptionsBuilder<T>();
        DatabaseProvider.Configure(options, Config);
        return (T)Activator.CreateInstance(typeof(T), options.Options)!;
    }

    [PostgresFact]
    public async Task PostgreSQL_models_seeds_views_and_concurrency_work()
    {
        await using var catalog = Context<CatalogDbContext>();
        Assert.Equal(5, await catalog.Categories.CountAsync());
        Assert.Equal(16, await catalog.Packages.CountAsync());
        Assert.Equal(122, await catalog.PackageItems.CountAsync());
        Assert.Equal(76, await catalog.Items.CountAsync());
        var costs = await catalog.vw_PackageCostings.AsNoTracking().ToListAsync();
        Assert.Equal(336.25m, costs.Average(x => x.SalePricePerHead));
        Assert.Equal(70m, costs.Single(x => x.PackageSlug == "breakfast-classic-breakfast").TotalCost);
        Assert.Equal(300m, costs.Single(x => x.PackageSlug == "lunch-royal-kacchi").TotalCost);
        Assert.Equal(380m, costs.Single(x => x.PackageSlug == "house-party-bbq-night").TotalCost);
        await using var identity = Context<IdentityDbContext>();
        Assert.Equal(6, await identity.Roles.CountAsync());
        Assert.Equal(25, await identity.Permissions.CountAsync());
        Assert.NotEmpty(await identity.RolePermissions.ToListAsync());
        await identity.Users.Take(1).ToListAsync();
        await identity.RefreshTokens.Take(1).ToListAsync();
        await using var auth = Context<AppIdentityDbContext>();
        Assert.Equal(6, await auth.Roles.CountAsync());
        await auth.Users.Take(1).ToListAsync();
        await using var nav = Context<NavigationDbContext>();
        Assert.NotEmpty(await nav.MenuItems.ToListAsync());
        await using var orders = Context<OrderingDbContext>();
        await orders.Orders.Take(1).ToListAsync();
        await orders.vw_KitchenPreps.Take(1).ToListAsync();
        await using var reporting = Context<ReportingDbContext>();
        await reporting.vw_OrderSummaries.Take(1).ToListAsync();
        await using var customers = Context<CustomersDbContext>();
        await customers.Customers.Take(1).ToListAsync();
        await using var engagement = Context<EngagementDbContext>();
        await engagement.Requests.Take(1).ToListAsync();
        await engagement.Reviews.Take(1).ToListAsync();
        await using var content = Context<ContentDbContext>();
        await content.Entries.Take(1).ToListAsync();

        await using var transaction = await catalog.Database.BeginTransactionAsync();
        var package = await catalog.Packages.FirstAsync();
        var previousVersion = package.RowVersion.ToArray();
        package.UpdatedAt = DateTime.UtcNow;
        await catalog.SaveChangesAsync();
        Assert.NotEqual(Convert.ToBase64String(previousVersion), Convert.ToBase64String(package.RowVersion));
        await OperationsAudit.WriteAsync(catalog, null, "test", "Package", package.Id.ToString(), null, new { package.Name }, default);
        catalog.Entry(package).Property(x => x.RowVersion).OriginalValue = previousVersion;
        package.UpdatedAt = DateTime.UtcNow.AddSeconds(1);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => catalog.SaveChangesAsync());
        await transaction.RollbackAsync();

        // Exercise the actual Identity store, including UTC dates and role links.
        var authConfig = new ConfigurationBuilder().AddConfiguration(Config)
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Jwt:Key"] = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N") }).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        new IdentityModule().RegisterServices(services, authConfig);
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var authDb = scope.ServiceProvider.GetRequiredService<AppIdentityDbContext>();
        await using var authTransaction = await authDb.Database.BeginTransactionAsync();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ZrcUser>>();
        var email = $"rollback-{Guid.NewGuid():N}@test.invalid";
        var user = new ZrcUser { UserName = email, Email = email, IsStaff = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        Assert.True((await users.CreateAsync(user, Guid.NewGuid().ToString("N") + "A1!")).Succeeded);
        Assert.True((await users.AddToRoleAsync(user, "SuperAdmin")).Succeeded);
        Assert.True(await users.IsInRoleAsync(user, "SuperAdmin"));
        Assert.NotNull(await users.FindByEmailAsync(email));
        await authTransaction.RollbackAsync();
    }
}
