@echo off
REM Run ZaraRoyalCatering API + UI (double-click)
cd /d "%~dp0"
start "ZRC.Api" dotnet run --project "src\Host\ZRC.Api\ZRC.Api.csproj" --launch-profile https
start "ZRC.Web" cmd /k "cd /d ""%~dp0web"" && npm start -- --port 4200 --host localhost"
echo.
echo UI:        http://localhost:4200/
echo API HTTP:  http://localhost:5289/api/v1/_ping
echo API HTTPS: https://localhost:7106/scalar/v1
echo.
pause
