<#Requires -Version 5.1>
<#
.SYNOPSIS Deploys the ZRC DACPAC to SQL Server (default: docker-compose instance).
.EXAMPLE .\database\deploy.ps1
.EXAMPLE .\database\deploy.ps1 -ConnectionString "Server=localhost,1433;Database=ZRC;..." -BlockOnPossibleDataLoss $false
#>
param(
  [string]$ConnectionString = $env:ZRC_CONNECTION_STRING,
  [string]$Database = "",
  [string]$Dacpac = "database/ZRC.Database/bin/Debug/ZRC.Database.dacpac",
  [bool]$BlockOnPossibleDataLoss = $true
)
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($ConnectionString)) {
  $ConnectionString = "Server=localhost;Database=ZRC;Trusted_Connection=True;TrustServerCertificate=True"
}
if (-not [string]::IsNullOrWhiteSpace($Database)) {
  $csb = New-Object System.Data.Common.DbConnectionStringBuilder
  $csb.ConnectionString = $ConnectionString
  $csb["Database"] = $Database
  $ConnectionString = $csb.ConnectionString
}
Write-Host "Building DACPAC..." -ForegroundColor Cyan
dotnet build database/ZRC.Database/ZRC.Database.sqlproj -c Debug --nologo -v minimal
if (-not (Test-Path -LiteralPath $Dacpac)) { throw "DACPAC not found at $Dacpac" }

$sqlpackage = Get-Command sqlpackage -ErrorAction SilentlyContinue
if ($null -eq $sqlpackage) {
  Write-Host "Installing SqlPackage as .NET tool (pinned 162.x = .NET 8 LTS)..." -ForegroundColor Yellow
  dotnet tool install -g microsoft.sqlpackage --version 162.2.111
  $env:PATH = "$env:USERPROFILE\.dotnet\tools;$env:PATH"
}
Write-Host "Publishing to $ConnectionString (BlockOnPossibleDataLoss=$BlockOnPossibleDataLoss)" -ForegroundColor Cyan
& sqlpackage /Action:Publish /SourceFile:$Dacpac /TargetConnectionString:"$ConnectionString" `
  /p:BlockOnPossibleDataLoss=$BlockOnPossibleDataLoss /p:DropObjectsNotInSource=false
Write-Host "Deploy complete." -ForegroundColor Green
