param([string]$EnvironmentFile = ".env.render.local")
$ErrorActionPreference = "Stop"
if (Test-Path -LiteralPath $EnvironmentFile) {
    foreach ($line in Get-Content -LiteralPath $EnvironmentFile) {
        if ($line -match '^([^#=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
        }
    }
}
$env:Database__Provider = "PostgreSQL"
dotnet run --no-launch-profile --project src/Host/ZRC.Api -p:NuGetAudit=false -- --initialize-postgres
if ($LASTEXITCODE -ne 0) { throw "PostgreSQL deployment failed." }
