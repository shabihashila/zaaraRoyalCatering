using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using System.Security.Claims;
using ZRC.Modules.Identity.Domain;

namespace ZRC.Api.IntegrationTests;

/// <summary>Phase 1: the API hides nothing client-side — it enforces auth server-side.</summary>
public sealed class Phase1AuthTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public Phase1AuthTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public void UserManager_resolves_unmapped_JWT_subject()
    {
        using var scope = _factory.Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ZrcUser>>();
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("sub", "staff-subject")], "Bearer"));
        Assert.Equal("staff-subject", users.GetUserId(principal));
    }

    [Theory]
    [InlineData("/api/v1/admin/users?page=1&pageSize=5")]
    [InlineData("/api/v1/admin/roles")]
    [InlineData("/api/v1/admin/audit?page=1&pageSize=5")]
    [InlineData("/api/v1/admin/navigation/menu")]
    [InlineData("/api/v1/admin/navigation/menu/all?area=Admin")]
    [InlineData("/api/v1/auth/me")]
    public async Task Admin_and_me_endpoints_require_auth(string url)
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync(url);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Login_with_bad_credentials_returns_401()
    {
        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/v1/auth/login",
            new { emailOrPhone = "nobody@example.com", password = "wrong-password-123" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Refresh_without_cookie_returns_401()
    {
        var client = _factory.CreateClient();
        var res = await client.PostAsync("/api/v1/auth/refresh", null);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }
}
