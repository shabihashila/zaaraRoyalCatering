FROM node:22-bookworm-slim AS frontend
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build -- --configuration render

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /source
COPY src/ src/
COPY database/postgresql/ database/postgresql/
RUN dotnet publish src/Host/ZRC.Api/ZRC.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend /app ./
COPY --from=frontend /web/dist/zrc-web/browser ./wwwroot
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_HTTP_PORTS=10000
EXPOSE 10000
USER $APP_UID
ENTRYPOINT ["dotnet", "ZRC.Api.dll"]
