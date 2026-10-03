using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ZRC.Api.IntegrationTests;

/// <summary>Phase 2: public catalogue works anonymously and NEVER leaks cost/profit/margin.</summary>
public sealed class CatalogPublicTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public CatalogPublicTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Categories_returns_five()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/public/catalog/categories");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        Assert.Equal(5, doc.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task Packages_returns_sixteen()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/public/catalog/packages");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        Assert.Equal(16, doc.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task Package_filters_work()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/public/catalog/packages?category=lunch&guests=50&maxPrice=400");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        Assert.All(doc.RootElement.EnumerateArray(), el =>
        {
            Assert.Equal("lunch", el.GetProperty("categorySlug").GetString());
            Assert.True(el.GetProperty("salePricePerHead").GetDecimal() <= 400);
        });
        Assert.Equal(2, doc.RootElement.GetArrayLength()); // Standard + Premium (Royal Kacchi is 500)
    }

    [Fact]
    public async Task Package_detail_contains_no_cost_fields()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/public/catalog/packages/lunch-royal-kacchi");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        Assert.Equal("Royal Kacchi", root.GetProperty("name").GetString());
        Assert.True(root.GetProperty("items").GetArrayLength() > 0);
        // Confidentiality snapshot: no cost/profit/margin anywhere in the payload.
        Assert.DoesNotContain("cost", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("profit", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("margin", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Unknown_package_slug_returns_404()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/public/catalog/packages/no-such-package");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Theory]
    [InlineData("/api/v1/admin/catalog/costing")]
    [InlineData("/api/v1/admin/catalog/packages")]
    [InlineData("/api/v1/admin/catalog/categories")]
    [InlineData("/api/v1/admin/catalog/items?page=1&pageSize=5")]
    [InlineData("/api/v1/admin/catalog/addons")]
    public async Task Admin_catalog_endpoints_require_auth(string url)
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync(url);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }
}
