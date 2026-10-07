using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace ZRC.Infrastructure.Common;

public static class DatabaseProvider
{
    public static bool IsPostgres(IConfiguration configuration) =>
        string.Equals(configuration["Database:Provider"], "PostgreSQL", StringComparison.OrdinalIgnoreCase);

    public static void Configure(DbContextOptionsBuilder options, IConfiguration configuration)
    {
        if (IsPostgres(configuration))
        {
            var value = configuration["DATABASE_URL"] ?? configuration.GetConnectionString("Default")
                ?? throw new InvalidOperationException("DATABASE_URL or ConnectionStrings:Default is required.");
            if (value.StartsWith("postgres://") || value.StartsWith("postgresql://"))
            {
                var uri = new Uri(value);
                var credentials = uri.UserInfo.Split(':', 2);
                value = new NpgsqlConnectionStringBuilder
                {
                    Host = uri.Host, Port = uri.IsDefaultPort ? 5432 : uri.Port,
                    Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
                    Username = Uri.UnescapeDataString(credentials[0]),
                    Password = Uri.UnescapeDataString(credentials[1]),
                    SslMode = SslMode.Require
                }.ConnectionString;
            }
            options.UseNpgsql(value);
        }
        else if (string.IsNullOrEmpty(configuration["Database:Provider"]) ||
                 string.Equals(configuration["Database:Provider"], "SqlServer", StringComparison.OrdinalIgnoreCase))
            options.UseSqlServer(configuration.GetConnectionString("Default"));
        else throw new InvalidOperationException("Database:Provider must be SqlServer or PostgreSQL.");
    }

    // Applied by context partials after the database-first SQL Server mappings.
    public static void AdaptPostgres(ModelBuilder builder, DbContext context)
    {
        if (!context.Database.IsNpgsql()) return;
        foreach (var property in builder.Model.GetEntityTypes().SelectMany(e => e.GetProperties()))
        {
            var sql = property.GetDefaultValueSql();
            if (sql?.Contains("newid", StringComparison.OrdinalIgnoreCase) == true)
                property.SetDefaultValueSql("gen_random_uuid()");
            if (sql?.Contains("sysutcdatetime", StringComparison.OrdinalIgnoreCase) == true)
                property.SetDefaultValueSql("timezone('UTC', now())");
            if ((Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType) == typeof(DateTime))
            {
                property.SetColumnType("timestamp without time zone");
                property.SetValueConverter(new ValueConverter<DateTime, DateTime>(
                    value => DateTime.SpecifyKind(value, DateTimeKind.Unspecified),
                    value => DateTime.SpecifyKind(value, DateTimeKind.Utc)));
            }
            if (property.Name == "RowVersion" && property.ClrType == typeof(byte[]))
            {
                property.SetColumnType("bytea");
                property.SetDefaultValueSql("decode(replace(gen_random_uuid()::text, '-', ''), 'hex')");
                property.ValueGenerated = ValueGenerated.OnAddOrUpdate;
                property.IsConcurrencyToken = true;
            }
        }
    }
}
