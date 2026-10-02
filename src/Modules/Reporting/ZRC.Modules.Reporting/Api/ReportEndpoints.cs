using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Reporting.Infrastructure.Persistence;
using ZRC.Modules.Identity.Contracts;
using ZRC.SharedKernel;

namespace ZRC.Modules.Reporting.Api;
public static class ReportEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
        =>endpoints.MapGet("/api/v1/admin/reports",Summary).WithTags("reports").RequirePermission("reporting.view");
    private static async Task<IResult> Summary(DateOnly? from,DateOnly? to,HttpContext ctx,ReportingDbContext db,IPermissionService permissions,CancellationToken ct)
    {
        var today=DateOnly.FromDateTime(DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(6)).DateTime);var start=from??new DateOnly(today.Year,today.Month,1);var end=to??start.AddMonths(1).AddDays(-1);
        if(end<start||end.DayNumber-start.DayNumber>366)return Results.Problem(statusCode:400,detail:"Choose a date range of up to one year.");
        var rows=await db.vw_OrderSummaries.AsNoTracking().Where(o=>o.EventDate>=start&&o.EventDate<=end).ToListAsync(ct);
        var active=rows.Where(o=>o.Status!="Cancelled"&&o.Status!="Rejected").ToList();var committed=active.Where(o=>o.Status!="Pending").ToList();
        var user=ctx.User.FindFirst("sub")?.Value;var grants=user is null?[]:await permissions.GetUserPermissionsAsync(user,ct);var canCost=grants.Contains("catalog.costing.view");
        return Results.Ok(new{from=start,to=end,orderCount=rows.Count,pendingCount=rows.Count(o=>o.Status=="Pending"),guests=committed.Sum(o=>o.Guests),bookedSales=committed.Sum(o=>o.GrandTotal),collected=active.Sum(o=>o.PaidAmount),outstanding=active.Sum(o=>o.GrandTotal-o.PaidAmount),
            totalCost=canCost?(decimal?)committed.Sum(o=>o.TotalCost):null,profit=canCost?(decimal?)committed.Sum(o=>o.Profit):null,
            byStatus=rows.GroupBy(o=>o.Status).Select(g=>new{status=g.Key,count=g.Count()}),
            byPackage=committed.GroupBy(o=>new{o.PackageName,o.CategoryName}).Select(g=>new{g.Key.PackageName,g.Key.CategoryName,orders=g.Count(),guests=g.Sum(o=>o.Guests),sales=g.Sum(o=>o.GrandTotal)}).OrderByDescending(g=>g.sales)});
    }
}
