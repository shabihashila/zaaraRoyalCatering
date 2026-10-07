# Render deployment with PostgreSQL

The API supports `SqlServer` (default) and `PostgreSQL`. SQL Server retains its connection string, DACPAC deployment and scaffolded models. PostgreSQL uses provider-specific context partials and a versioned SQL deployment script. No EF migrations or EnsureCreated are used.

## Database

The supplied Render database is initialized with all eight schemas, 29 tables, three views, six roles, 25 permissions, role grants, navigation and the catalogue (five categories, 16 packages, 76 items, 122 links). Credentials are stored only in the ignored `.env.render.local`; the separately supplied `docs/render_postgress_creds.txt` is also ignored.

To initialize an empty PostgreSQL database, set `Database__Provider=PostgreSQL` and `DATABASE_URL`, then run from the repository root:

```powershell
./database/postgresql/deploy.ps1
```

The installer executes reviewed scripts inside a transaction with an advisory lock and records each version in `public.zrc_schema_versions`. Version 1 installs the schema and seeds; version 2 repairs normalized names of seeded roles in databases initialized before the seed converter was corrected. Re-running skips installed scripts and preserves staff edits. Existing schema conflicts fail and roll back. Future schema changes require additional reviewed, versioned scripts and an installer update. `generate.py` regenerates only the initial script from the SQL Server sources; regenerating version 1 does not upgrade installed databases.

## Web service

1. Publish these changes to GitHub, then create a Render Blueprint from this repository using `render.yaml`. Alternatively create a Docker web service using the root `Dockerfile`, with the repository root as its build context.
2. Set `DATABASE_URL` to your Render URL. Prefer the internal database URL when the web service is in the same region.
3. Set `Database__Provider=PostgreSQL`, `Database__InitializeOnStartup=true`, and `ASPNETCORE_ENVIRONMENT=Production`.
4. Set `Jwt__Key` to a random secret of at least 32 bytes. The Blueprint generates one automatically.
5. Set `Seed__SuperAdmin__Email` and `Seed__SuperAdmin__Password`. The existing seeder creates this account and grants SuperAdmin. It does not reset existing passwords. Remove the password variable after successful creation.
6. Use `/health` as the health check. Render supplies `PORT`; the API listens on `0.0.0.0:$PORT`.

The Docker build compiles Angular with the `render` configuration and copies browser output into the API's `wwwroot`. API calls use the same origin, with no localhost address or cross-origin cookie setup. Static public pages are prerendered; dynamic package pages and private routes render in the browser in this deployment. The normal local production build retains its existing SSR configuration.

The API processes Render's forwarded HTTPS scheme for secure refresh cookies and avoids redirecting its internal HTTP connection. Unknown `/api/*` paths return 404. SQL Server development retains its existing behavior.

Verify `/health`, `/api/v1/_ping`, public catalogue endpoints, `/login`, admin login and direct reload of an admin route after deployment. `/health` checks that the API is running; startup checks database permissions. It is not a continuous database health monitor.

## SQL Server

Set `Database__Provider=SqlServer`, `Database__InitializeOnStartup=false`, and `ConnectionStrings__Default` to the SQL Server connection string. Deploy with the existing `database/deploy.ps1`. Data stays independent between providers; local bookings and users are not copied to Render.

## Verification

The opt-in `PostgresDatabaseTests` checks module models, seeds, views, audit SQL, stale row-version conflicts, Identity user creation and role assignment. Writes roll back:

```powershell
$env:Database__Provider = 'PostgreSQL'
$env:DATABASE_URL = '<connection URL>'
$env:ZRC_TEST_POSTGRES = '1'
dotnet test tests/ZRC.Api.IntegrationTests --filter FullyQualifiedName~PostgresDatabaseTests
```

The standard integration suite uses local SQL Server, including its separate operations-test database. Do not point its write-oriented tests at production PostgreSQL.
