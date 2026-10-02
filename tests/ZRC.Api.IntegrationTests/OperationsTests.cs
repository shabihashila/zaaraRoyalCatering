using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Catalog.Infrastructure.Persistence;
using Ordering.Infrastructure.Persistence;
using Reporting.Infrastructure.Persistence;
using ZRC.Modules.Identity.Domain;
using ZRC.Modules.Ordering;
using ZRC.Modules.Ordering.Application;
using ZRC.Modules.Catalog.Contracts;

namespace ZRC.Api.IntegrationTests;

// Deploy the DACPAC to ZRC_OperationsTests first. This factory never writes to ZRC.
public sealed class OperationsFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
        => builder.ConfigureAppConfiguration((_,c)=>c.AddInMemoryCollection(new Dictionary<string,string?> {
            ["ConnectionStrings:Default"]="Server=localhost;Database=ZRC_OperationsTests;Trusted_Connection=True;TrustServerCertificate=True"
        }));
    public async Task<HttpClient> Authorized(string role="SuperAdmin")
    {
        using var scope=Services.CreateScope();var users=scope.ServiceProvider.GetRequiredService<UserManager<ZrcUser>>();
        var email=$"ops-{Guid.NewGuid():N}@test.local";const string password="Operations_test_123!";
        var user=new ZrcUser {UserName=email,Email=email,DisplayName="Operations verification",IsActive=true,IsStaff=role!="Customer",CreatedAt=DateTime.UtcNow};
        Assert.True((await users.CreateAsync(user,password)).Succeeded);Assert.True((await users.AddToRoleAsync(user,role)).Succeeded);
        var client=CreateClient();var login=await client.PostAsJsonAsync("/api/v1/auth/login",new{emailOrPhone=email,password});login.EnsureSuccessStatusCode();
        var session=await login.Content.ReadFromJsonAsync<JsonElement>();client.DefaultRequestHeaders.Authorization=new AuthenticationHeaderValue("Bearer",session.GetProperty("accessToken").GetString());return client;
    }
}

public sealed class OperationsTests(OperationsFactory factory):IClassFixture<OperationsFactory>
{
    [Theory]
    [InlineData("/api/v1/admin/orders")]
    [InlineData("/api/v1/admin/orders/calendar?from=2027-01-01&to=2027-01-31")]
    [InlineData("/api/v1/admin/orders/kitchen?date=2027-01-01")]
    [InlineData("/api/v1/admin/customers")]
    [InlineData("/api/v1/admin/engagement/reviews")]
    [InlineData("/api/v1/admin/engagement/requests")]
    [InlineData("/api/v1/admin/content")]
    [InlineData("/api/v1/admin/reports")]
    public async Task Operational_routes_require_auth_and_allow_authorized_staff(string url)
    {
        Assert.Equal(HttpStatusCode.Unauthorized,(await factory.CreateClient().GetAsync(url)).StatusCode);
        using var owner=await factory.Authorized();Assert.Equal(HttpStatusCode.OK,(await owner.GetAsync(url)).StatusCode);
    }
    [Fact]
    public async Task Kitchen_permissions_allow_prep_but_reject_financial_and_management_calls()
    {
        using var kitchen=await factory.Authorized("Kitchen");
        Assert.Equal(HttpStatusCode.OK,(await kitchen.GetAsync("/api/v1/admin/orders/kitchen?date=2027-01-01")).StatusCode);
        foreach(var url in new[]{"/api/v1/admin/customers","/api/v1/admin/content","/api/v1/admin/reports","/api/v1/admin/engagement/reviews"})
            Assert.Equal(HttpStatusCode.Forbidden,(await kitchen.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await kitchen.PostAsJsonAsync("/api/v1/admin/orders",new{})).StatusCode);
    }
    [Fact]
    public async Task Booking_snapshots_mutton_prices_status_history_payments_and_money_free_prep()
    {
        using var owner=await factory.Authorized();var publicPackages=await owner.GetFromJsonAsync<JsonElement>("/api/v1/public/catalog/packages");
        var package=publicPackages.EnumerateArray().Single(p=>p.GetProperty("slug").GetString()=="lunch-royal-kacchi");var id=package.GetProperty("id").GetGuid();
        var variant=package.GetProperty("variants").EnumerateArray().Single(v=>v.GetProperty("name").GetString()!.Contains("Mutton")).GetProperty("id").GetGuid();
        var phone="017"+Random.Shared.Next(10000000,99999999);var customerRes=await owner.PostAsJsonAsync("/api/v1/admin/customers",new{name="Test celebration",phone,email="customer@test.local",address="Dhaka test venue",notes="isolated verification"});customerRes.EnsureSuccessStatusCode();var customer=await customerRes.Content.ReadFromJsonAsync<JsonElement>();
        var date=DateOnly.FromDateTime(DateTime.UtcNow).AddDays(40);
        var created=await owner.PostAsJsonAsync("/api/v1/admin/orders",new{packageId=id,variantId=variant,guests=60,eventDate=date,eventTime="12:00",eventType="Test wedding",venueAddress="Dhaka verification venue",contactName="Test celebration",contactPhone=phone,customerId=customer.GetProperty("id").GetGuid(),addOnIds=Array.Empty<Guid>(),deliveryCharge=0,discount=0});created.EnsureSuccessStatusCode();
        var order=await created.Content.ReadFromJsonAsync<JsonElement>();Assert.Equal(34800m,order.GetProperty("grandTotal").GetDecimal());AssertNoInternalMoney(order.GetRawText());var orderId=order.GetProperty("id").GetGuid();var version=order.GetProperty("rowVersion").GetString();
        var invalid=await owner.PutAsJsonAsync($"/api/v1/admin/orders/{orderId}/status",new{status="Completed",rowVersion=version});Assert.Equal(HttpStatusCode.BadRequest,invalid.StatusCode);
        var confirmed=await owner.PutAsJsonAsync($"/api/v1/admin/orders/{orderId}/status",new{status="Confirmed",note="Test confirmation",rowVersion=version});confirmed.EnsureSuccessStatusCode();var current=await confirmed.Content.ReadFromJsonAsync<JsonElement>();
        var stale=await owner.PutAsJsonAsync($"/api/v1/admin/orders/{orderId}/status",new{status="InPreparation",rowVersion=version});Assert.Equal(HttpStatusCode.Conflict,stale.StatusCode);
        var paid=await owner.PostAsJsonAsync($"/api/v1/admin/orders/{orderId}/payments",new{method="bKash",amount=1000,reference="TEST-"+Guid.NewGuid(),rowVersion=current.GetProperty("rowVersion").GetString()});paid.EnsureSuccessStatusCode();current=await paid.Content.ReadFromJsonAsync<JsonElement>();Assert.Equal(33800m,current.GetProperty("balance").GetDecimal());
        var excessive=await owner.PostAsJsonAsync($"/api/v1/admin/orders/{orderId}/payments",new{method="Cash",amount=40000,rowVersion=current.GetProperty("rowVersion").GetString()});Assert.Equal(HttpStatusCode.BadRequest,excessive.StatusCode);
        var prep=await owner.GetStringAsync($"/api/v1/admin/orders/kitchen?date={date:yyyy-MM-dd}");AssertNoInternalMoney(prep);Assert.DoesNotContain("price",prep,StringComparison.OrdinalIgnoreCase);Assert.DoesNotContain("amount",prep,StringComparison.OrdinalIgnoreCase);Assert.Contains("Mutton",prep);
        using(var kitchen=await factory.Authorized("Kitchen")){
            foreach(var url in new[]{"/api/v1/admin/orders",$"/api/v1/admin/orders/{orderId}",$"/api/v1/admin/orders/calendar?from={date:yyyy-MM-dd}&to={date:yyyy-MM-dd}"}){
                var json=await kitchen.GetStringAsync(url);AssertNoInternalMoney(json);Assert.DoesNotContain("grandTotal",json,StringComparison.OrdinalIgnoreCase);Assert.DoesNotContain("unitPrice",json,StringComparison.OrdinalIgnoreCase);Assert.DoesNotContain("balance",json,StringComparison.OrdinalIgnoreCase);
            }
        }
        using(var scope=factory.Services.CreateScope()){
            var db=scope.ServiceProvider.GetRequiredService<CatalogDbContext>();await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE catalog.Packages SET SalePricePerHead=700 WHERE Id={id}");
            try{var detail=await owner.GetFromJsonAsync<JsonElement>($"/api/v1/admin/orders/{orderId}");Assert.Equal(34800m,detail.GetProperty("order").GetProperty("grandTotal").GetDecimal());Assert.Equal(2,detail.GetProperty("history").GetArrayLength());}
            finally{await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE catalog.Packages SET SalePricePerHead=500 WHERE Id={id}");}
        }
        var report=await owner.GetFromJsonAsync<JsonElement>($"/api/v1/admin/reports?from={date:yyyy-MM-dd}&to={date:yyyy-MM-dd}");
        using(var scope=factory.Services.CreateScope()){var db=scope.ServiceProvider.GetRequiredService<ReportingDbContext>();var expected=await db.vw_OrderSummaries.Where(o=>o.EventDate==date&&o.Status!="Pending"&&o.Status!="Cancelled"&&o.Status!="Rejected").SumAsync(o=>o.GrandTotal);Assert.Equal(expected,report.GetProperty("bookedSales").GetDecimal());}
        var customerUpdate=await owner.PutAsJsonAsync($"/api/v1/admin/customers/{customer.GetProperty("id").GetGuid()}",new{name="Updated test customer",phone,email="customer@test.local",address="Dhaka test venue",notes="updated",rowVersion=customer.GetProperty("rowVersion").GetString()});customerUpdate.EnsureSuccessStatusCode();
        var staleCustomer=await owner.PutAsJsonAsync($"/api/v1/admin/customers/{customer.GetProperty("id").GetGuid()}",new{name="Stale edit",phone,rowVersion=customer.GetProperty("rowVersion").GetString()});Assert.Equal(HttpStatusCode.Conflict,staleCustomer.StatusCode);
    }
    [Fact]
    public async Task Draft_content_pending_reviews_and_inbox_preserve_publication_boundaries()
    {
        using var owner=await factory.Authorized();var key="test-"+Guid.NewGuid().ToString("N");var submitted=await owner.PostAsJsonAsync("/api/v1/admin/content",new{kind="FAQ",key,title=key,body="Test answer",sortOrder=0,isPublished=false});submitted.EnsureSuccessStatusCode();var entry=await submitted.Content.ReadFromJsonAsync<JsonElement>();
        Assert.DoesNotContain(key,await factory.CreateClient().GetStringAsync("/api/v1/public/content"));
        var publish=await owner.PutAsJsonAsync($"/api/v1/admin/content/{entry.GetProperty("id").GetGuid()}",new{kind="FAQ",key,title=key,body="Test answer",sortOrder=0,isPublished=true,rowVersion=entry.GetProperty("rowVersion").GetString()});publish.EnsureSuccessStatusCode();Assert.Contains(key,await factory.CreateClient().GetStringAsync("/api/v1/public/content"));
        var author="Review "+Guid.NewGuid();var reviewRes=await owner.PostAsJsonAsync("/api/v1/admin/engagement/reviews",new{authorName=author,rating=5,body="Excellent test catering",eventType="Test event"});reviewRes.EnsureSuccessStatusCode();var reviewId=(await reviewRes.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        Assert.DoesNotContain(author,await factory.CreateClient().GetStringAsync("/api/v1/public/testimonials"));
        var rows=await owner.GetFromJsonAsync<JsonElement>("/api/v1/admin/engagement/reviews?pageSize=100");var review=rows.GetProperty("items").EnumerateArray().Single(r=>r.GetProperty("id").GetGuid()==reviewId);
        var approve=await owner.PutAsJsonAsync($"/api/v1/admin/engagement/reviews/{reviewId}",new{status="Approved",isFeatured=true,rowVersion=review.GetProperty("rowVersion").GetString()});approve.EnsureSuccessStatusCode();Assert.Contains(author,await factory.CreateClient().GetStringAsync("/api/v1/public/testimonials"));
        var message=await factory.CreateClient().PostAsJsonAsync("/api/v1/public/contact",new{name="Test inquiry",phone="01712345678",subject=key,message="Please discuss a test celebration."});message.EnsureSuccessStatusCode();var messageId=(await message.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var inbox=await owner.GetFromJsonAsync<JsonElement>("/api/v1/admin/engagement/requests?pageSize=100");var request=inbox.GetProperty("items").EnumerateArray().Single(r=>r.GetProperty("id").GetGuid()==messageId);
        var handle=await owner.PutAsJsonAsync($"/api/v1/admin/engagement/requests/{messageId}",new{status="Closed",staffNotes="Handled test",rowVersion=request.GetProperty("rowVersion").GetString()});handle.EnsureSuccessStatusCode();
    }
    [Theory]
    [InlineData("Pending","Confirmed",true)] [InlineData("Pending","Completed",false)]
    [InlineData("Confirmed","Cancelled",true)] [InlineData("Completed","Confirmed",false)]
    public void Status_rules_reject_invalid_transitions(string from,string to,bool expected)=>Assert.Equal(expected,OrderStatuses.CanTransition(from,to));
    [Fact]
    public async Task Quote_enforces_guests_variant_and_authoritative_prices()
    {
        using var scope=factory.Services.CreateScope();var query=scope.ServiceProvider.GetRequiredService<ICatalogQuery>();var p=await query.GetPublicPackageAsync("lunch-royal-kacchi");var source=await query.GetOrderPackageAsync(p!.Id);var mutton=p.Variants.Single(v=>v.Name.Contains("Mutton"));
        Assert.Equal(34800m,OrderPricing.Calculate(source!,mutton.Id,60,[]).GrandTotal);
        Assert.Throws<ArgumentException>(()=>OrderPricing.Calculate(source!,Guid.NewGuid(),60,[]));Assert.Throws<ArgumentException>(()=>OrderPricing.Calculate(source!,mutton.Id,0,[]));
        Assert.Throws<ArgumentException>(()=>OrderPricing.Calculate(source!,mutton.Id,60,[],0.001m));
    }
    private static void AssertNoInternalMoney(string json){foreach(var word in new[]{"unitCost","totalCost","profit","margin"})Assert.DoesNotContain(word,json,StringComparison.OrdinalIgnoreCase);}
}
