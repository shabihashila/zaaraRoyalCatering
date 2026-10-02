<#Requires -Version 5.1>
<#
.SYNOPSIS Re-scaffolds each module DbContext from the database (database-first).
.RULES Never hand-edit files under Generated/. Put behaviour in partials + OnModelCreatingPartial.
.EXAMPLE .\database\scaffold.ps1 -ConnectionString "Server=...;Database=ZRC;..."
#>
param([string]$ConnectionString = $env:ZRC_CONNECTION_STRING, [switch]$SkipBuild)
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($ConnectionString)) {
  $ConnectionString = "Server=localhost,1433;Database=ZRC;User Id=sa;Password=ZRC_dev_12345!;TrustServerCertificate=True"
}
$efVersion = "10.0.1"
# dotnet writes NU1903/NU1603 warnings to stderr; keep those non-terminating.
$prevPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
Write-Host "Building module projects first (scaffold needs fresh binaries)..." -ForegroundColor Cyan
if (-not $SkipBuild) {
  dotnet build ZaraRoyalCatering.slnx --nologo -v minimal
  if ($LASTEXITCODE -ne 0) { throw "Build failed; scaffold aborted." }
}
$modules = @(
  @{ Schema = "identity";  Context = "IdentityDbContext";    Project = "src/Modules/Identity/ZRC.Modules.Identity" },
  @{ Schema = "nav";       Context = "NavigationDbContext";  Project = "src/Modules/Navigation/ZRC.Modules.Navigation" },
  @{ Schema = "catalog";   Context = "CatalogDbContext";     Project = "src/Modules/Catalog/ZRC.Modules.Catalog" },
  @{ Schema = "ordering";  Context = "OrderingDbContext";    Project = "src/Modules/Ordering/ZRC.Modules.Ordering" },
  @{ Schema = "customers"; Context = "CustomersDbContext";   Project = "src/Modules/Customers/ZRC.Modules.Customers" },
  @{ Schema = "engagement";Context = "EngagementDbContext";  Project = "src/Modules/Engagement/ZRC.Modules.Engagement" },
  @{ Schema = "content";   Context = "ContentDbContext";     Project = "src/Modules/Content/ZRC.Modules.Content" },
  @{ Schema = "reporting"; Context = "ReportingDbContext";   Project = "src/Modules/Reporting/ZRC.Modules.Reporting" }
)
foreach ($m in $modules) {
  Write-Host "Scaffolding $($m.Schema) -> $($m.Context)..." -ForegroundColor Cyan
  dotnet ef dbcontext scaffold "$ConnectionString" Microsoft.EntityFrameworkCore.SqlServer `
    --project $m.Project --context $m.Context --schema $m.Schema `
    --output-dir Domain/Entities/Generated --context-dir Infrastructure/Persistence `
    --namespace "$($m.Context -replace 'DbContext','').Domain.Entities.Generated" `
    --context-namespace "$($m.Context -replace 'DbContext','').Infrastructure.Persistence" `
    --no-onconfiguring --use-database-names --force --no-build
  if ($LASTEXITCODE -ne 0) { throw "Scaffold failed for $($m.Schema)." }
}
Write-Host "Done. Review git diff: SQL change + regenerated code must commit together." -ForegroundColor Green
$ErrorActionPreference = $prevPreference
