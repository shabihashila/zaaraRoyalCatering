using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ZRC.Api.IntegrationTests;

public sealed class PingTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public PingTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Ping_returns_ok()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/_ping");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Theory]
    [InlineData("/api/v1/auth/_ping")]
    [InlineData("/api/v1/public/catalog/_ping")]
    [InlineData("/api/v1/public/orders/_ping")]
    public async Task Module_pings_return_ok(string url)
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }
}
