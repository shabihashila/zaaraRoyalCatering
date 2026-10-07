using Microsoft.EntityFrameworkCore;
using Npgsql;
using ZRC.Infrastructure.Common;

namespace ZRC.Host;

public static class PostgresDeployment
{
    public static async Task InitializeAsync(IConfiguration configuration)
    {
        if (!DatabaseProvider.IsPostgres(configuration))
            throw new InvalidOperationException("PostgreSQL initialization requires Database:Provider=PostgreSQL.");
        var options = new DbContextOptionsBuilder();
        DatabaseProvider.Configure(options, configuration);
        await using var db = new DbContext(options.Options);
        var connection = (NpgsqlConnection)db.Database.GetDbConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        await Execute("SELECT pg_advisory_xact_lock(78234910)");
        await Execute("CREATE TABLE IF NOT EXISTS public.zrc_schema_versions (version integer PRIMARY KEY, installed_at timestamptz NOT NULL DEFAULT now())");
        foreach (var (version, filename) in new[] { (1, "001_initial.sql"), (2, "002_role_normalization.sql") })
        {
            await using var check = new NpgsqlCommand("SELECT COUNT(*) FROM public.zrc_schema_versions WHERE version=@version", connection, transaction);
            check.Parameters.AddWithValue("version", version);
            if ((long)(await check.ExecuteScalarAsync())! == 0)
            {
                await using var stream = typeof(PostgresDeployment).Assembly.GetManifestResourceStream("ZRC.PostgreSQL." + filename)
                    ?? throw new InvalidOperationException("PostgreSQL deployment resource missing.");
                using var reader = new StreamReader(stream);
                await Execute(await reader.ReadToEndAsync());
                await Execute($"INSERT INTO public.zrc_schema_versions(version) VALUES ({version})");
                Console.WriteLine($"PostgreSQL schema version {version} installed.");
            }
            else Console.WriteLine($"PostgreSQL schema version {version} already installed; preserving existing data.");
        }
        await transaction.CommitAsync();

        async Task Execute(string sql)
        {
            await using var command = new NpgsqlCommand(sql, connection, transaction) { CommandTimeout = 180 };
            await command.ExecuteNonQueryAsync();
        }
    }
}
