# Run ZaraRoyalCatering API + UI (right-click > Run with PowerShell)
$root = $PSScriptRoot
Start-Process dotnet -ArgumentList 'run --project "src\Host\ZRC.Api\ZRC.Api.csproj" --launch-profile https' -WorkingDirectory $root
Start-Process "C:\Program Files\nodejs\npm.cmd" -ArgumentList 'start -- --port 4200 --host localhost' -WorkingDirectory (Join-Path $root 'web')
Write-Host ""
Write-Host "UI:        http://localhost:4200/"
Write-Host "API HTTP:  http://localhost:5289/api/v1/_ping"
Write-Host "API HTTPS: https://localhost:7106/scalar/v1"
