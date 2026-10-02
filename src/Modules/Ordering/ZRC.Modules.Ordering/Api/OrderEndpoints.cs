using System.Data;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Ordering.Domain.Entities.Generated;
using Ordering.Infrastructure.Persistence;
using ZRC.Infrastructure.Common;
using ZRC.Modules.Catalog.Contracts;
using ZRC.Modules.Customers.Contracts;
using ZRC.Modules.Ordering.Application;
using ZRC.Modules.Identity.Contracts;
using ZRC.SharedKernel;

namespace ZRC.Modules.Ordering.Api;

public sealed record BookingRequest(Guid PackageId, Guid? VariantId, int Guests, DateOnly EventDate,
    TimeOnly EventTime, string EventType, string VenueAddress, string ContactName, string ContactPhone,
    Guid? CustomerId, IReadOnlyList<Guid>? AddOnIds, string? Notes, decimal DeliveryCharge = 0, decimal Discount = 0);
public sealed record StatusRequest(string Status, string? Note, string RowVersion);
public sealed record PaymentRequest(string Method, decimal Amount, string? Reference, string RowVersion);
public sealed record QuoteRequest(Guid PackageId, Guid? VariantId, int Guests, IReadOnlyList<Guid>? AddOnIds);

public static class OrderEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var a = endpoints.MapGroup("/api/v1/admin/orders").WithTags("orders");
        a.MapGet("", List).RequirePermission("ordering.order.view");
        a.MapGet("/calendar", Calendar).RequirePermission("ordering.order.view");
        a.MapGet("/kitchen", Kitchen).RequirePermission("ordering.kitchen.view");
        a.MapGet("/{id:guid}", Detail).RequirePermission("ordering.order.view");
        a.MapPost("", Create).RequirePermission("ordering.order.manage").RequirePermission("ordering.pricing.view");
        a.MapPut("/{id:guid}/status", Status).RequirePermission("ordering.order.manage").RequirePermission("ordering.pricing.view");
        a.MapPost("/{id:guid}/payments", Payment).RequirePermission("ordering.payment.record").RequirePermission("ordering.pricing.view");
        endpoints.MapPost("/api/v1/public/quotes", Quote).RequireRateLimiting("public-write");
        endpoints.MapPost("/api/v1/public/orders", CreatePublic).RequireAuthorization().RequireRateLimiting("public-write");
        endpoints.MapGet("/api/v1/public/me/orders", MyOrders).RequireAuthorization();
    }

    private static IQueryable<Order> Filter(OrderingDbContext db, string? search, string? status, DateOnly? from, DateOnly? to)
    {
        var q = db.Orders.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(o => o.OrderNo.Contains(search) || o.ContactName.Contains(search) || o.ContactPhone.Contains(search));
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(o => o.Status == status);
        if (from is not null) q = q.Where(o => o.EventDate >= from);
        if (to is not null) q = q.Where(o => o.EventDate <= to);
        return q;
    }
    private static async Task<IResult> List(OrderingDbContext db, HttpContext ctx, IPermissionService permissions, string? search, string? status, DateOnly? from, DateOnly? to, int? page, int? pageSize, CancellationToken ct)
    {
        var p = Math.Max(1, page ?? 1); var size = Math.Clamp(pageSize ?? 20, 1, 100);
        var q = Filter(db, search, status, from, to);
        var total = await q.CountAsync(ct);
        var rows = await q.Include(o => o.Payments).OrderByDescending(o => o.EventDate).ThenBy(o => o.OrderNo).Skip((p-1)*size).Take(size).ToListAsync(ct);
        var canMoney = await CanMoney(ctx,permissions,ct);
        return Results.Ok(new { items = rows.Select(o=>canMoney?SaleDto(o):OperationalDto(o)), page = p, pageSize = size, totalCount = total });
    }
    private static async Task<IResult> Calendar(OrderingDbContext db, HttpContext ctx, IPermissionService permissions, DateOnly from, DateOnly to, CancellationToken ct)
    {
        if (to < from || to.DayNumber - from.DayNumber > 62) return Invalid("date", "Choose a calendar range of up to 62 days.");
        var rows = await Filter(db,null,null,from,to).Include(o=>o.Payments).OrderBy(o=>o.EventDate).ThenBy(o=>o.EventTime).ToListAsync(ct);
        var canMoney=await CanMoney(ctx,permissions,ct);
        return Results.Ok(rows.Select(o=>canMoney?SaleDto(o):OperationalDto(o)));
    }
    private static async Task<IResult> Kitchen(OrderingDbContext db, DateOnly date, CancellationToken ct)
        => Results.Ok(await db.vw_KitchenPreps.AsNoTracking().Where(x=>x.EventDate==date).OrderBy(x=>x.ItemName).ToListAsync(ct));
    private static async Task<IResult> Detail(Guid id, OrderingDbContext db, HttpContext ctx, IPermissionService permissions, CancellationToken ct)
    {
        var o = await db.Orders.AsNoTracking().Include(x=>x.Payments).Include(x=>x.OrderStatusHistories).SingleOrDefaultAsync(x=>x.Id==id,ct);
        if(o is null)return Results.NotFound();
        if(!await CanMoney(ctx,permissions,ct))return Results.Ok(new {order=OperationalDto(o),snapshot=KitchenSnapshot(o),payments=Array.Empty<object>(),
            history=o.OrderStatusHistories.OrderBy(h=>h.Id).Select(h=>new{h.FromStatus,h.ToStatus,h.Note,h.ChangedAt}),allowedTransitions=Array.Empty<string>()});
        return Results.Ok(new { order = SaleDto(o), snapshot = JsonSerializer.Deserialize<JsonElement>(o.SnapshotJson),
            payments = o.Payments.OrderBy(p=>p.PaidAt).Select(p=>new {p.Id,p.Method,p.Amount,p.Reference,p.PaidAt}),
            history = o.OrderStatusHistories.OrderBy(h=>h.Id).Select(h=>new {h.FromStatus,h.ToStatus,h.Note,h.ChangedAt,h.ChangedBy}),
            allowedTransitions = OrderStatuses.Allowed[o.Status] });
    }
    private static async Task<IResult> MyOrders(HttpContext ctx, OrderingDbContext db, CancellationToken ct)
    {
        var user = ctx.User.FindFirst("sub")?.Value;
        var rows = await db.Orders.AsNoTracking().Include(o=>o.Payments).Where(o=>o.UserId==user).OrderByDescending(o=>o.CreatedAt).Take(100).ToListAsync(ct);
        return Results.Ok(rows.Select(SaleDto));
    }
    private static async Task<IResult> Quote(QuoteRequest req, ICatalogQuery catalog, CancellationToken ct)
    {
        var source = await catalog.GetOrderPackageAsync(req.PackageId,ct);
        if (source is null) return Results.NotFound();
        try { var q=OrderPricing.Calculate(source,req.VariantId,req.Guests,req.AddOnIds??[]); return Results.Ok(new {req.PackageId,req.Guests,unitPricePerHead=q.UnitPrice,q.SubTotal,q.AddOnTotal,q.GrandTotal}); }
        catch(ArgumentException ex) {return Invalid("quote",ex.Message);}
    }
    private static Task<IResult> Create(BookingRequest req, HttpContext ctx, OrderingDbContext db, ICatalogQuery catalog, ICustomerQuery customers, CancellationToken ct)
        => SaveBooking(req,ctx,db,catalog,customers,false,ct);
    private static Task<IResult> CreatePublic(BookingRequest req, HttpContext ctx, OrderingDbContext db, ICatalogQuery catalog, ICustomerQuery customers, CancellationToken ct)
        => SaveBooking(req with {CustomerId=null,DeliveryCharge=0,Discount=0},ctx,db,catalog,customers,true,ct);

    private static async Task<IResult> SaveBooking(BookingRequest req,HttpContext ctx,OrderingDbContext db,ICatalogQuery catalog,ICustomerQuery customers,bool publicOrder,CancellationToken ct)
    {
        if (!OperationsInput.Text(req.ContactName,160) || !OperationsInput.ValidPhone(req.ContactPhone) || !OperationsInput.Text(req.EventType,160) || !OperationsInput.Text(req.VenueAddress,1000) || !OperationsInput.Optional(req.Notes,2000))
            return Invalid("booking","Enter a name, valid Bangladesh mobile number, event type and venue within the field limits.");
        if(req.EventDate.ToDateTime(req.EventTime) < DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(6)).DateTime.AddHours(48))
            return Invalid("eventDate","Events require at least 48 hours notice.");
        var source=await catalog.GetOrderPackageAsync(req.PackageId,ct);
        if(source is null)return Invalid("packageId","This package is unavailable.");
        CustomerContact? customer = null;
        if(req.CustomerId is not null) { customer=await customers.GetAsync(req.CustomerId.Value,ct); if(customer is null)return Invalid("customerId","Choose an existing customer."); }
        OrderAmounts q;
        try {q=OrderPricing.Calculate(source,req.VariantId,req.Guests,req.AddOnIds??[],req.DeliveryCharge,req.Discount);}
        catch(ArgumentException ex){return Invalid("booking",ex.Message);}
        var p=source.Package;var actor=ctx.User.FindFirst("sub")?.Value;var now=DateTime.UtcNow;
        var variant=p.Variants.SingleOrDefault(v=>v.Id==req.VariantId);
        var o=new Order {Id=Guid.NewGuid(),OrderNo=$"ZRC-{now:yyyyMM}-{Guid.NewGuid():N}",CustomerId=req.CustomerId,UserId=publicOrder?actor:null,
            ContactName=customer?.Name??req.ContactName.Trim(),ContactPhone=customer?.Phone??OperationsInput.Phone(req.ContactPhone),
            PackageId=p.Id,PackageName=p.Name,CategoryName=p.CategoryName,VariantName=variant?.Name,Guests=req.Guests,EventDate=req.EventDate,EventTime=req.EventTime,
            EventType=req.EventType.Trim(),VenueAddress=req.VenueAddress.Trim(),SpecialInstructions=req.Notes,Status=OrderStatuses.Pending,
            UnitPricePerHead=q.UnitPrice,UnitCostPerHead=q.UnitCost,SubTotal=q.SubTotal,AddOnTotal=q.AddOnTotal,DeliveryCharge=req.DeliveryCharge,Discount=req.Discount,GrandTotal=q.GrandTotal,TotalCost=q.TotalCost,
            SnapshotJson=JsonSerializer.Serialize(new {items=p.Items,variant=variant?.Name,addOns=p.AddOns.Where(a=>(req.AddOnIds??[]).Contains(a.Id)).Select(a=>new {a.Id,a.Name,a.PricingType,a.Price})},new JsonSerializerOptions(JsonSerializerDefaults.Web)),CreatedAt=now,CreatedBy=actor};
        // Use a compact, collision-resistant suffix; the unique index is authoritative.
        o.OrderNo=o.OrderNo[..25];
        await using var tx=await db.Database.BeginTransactionAsync(ct);
        db.Orders.Add(o);db.OrderStatusHistories.Add(new OrderStatusHistory {OrderId=o.Id,ToStatus=o.Status,ChangedAt=now,ChangedBy=actor,Note="Booking created"});
        await db.SaveChangesAsync(ct);
        await OperationsAudit.WriteAsync(db,actor,"Order.Created","Order",o.Id.ToString(),null,new {o.OrderNo,o.Status,o.GrandTotal},ct);
        await tx.CommitAsync(ct);
        return Results.Created($"/api/v1/admin/orders/{o.Id}",SaleDto(o));
    }
    private static async Task<IResult> Status(Guid id,StatusRequest req,HttpContext ctx,OrderingDbContext db,CancellationToken ct)
    {
        await using var tx=await db.Database.BeginTransactionAsync(IsolationLevel.Serializable,ct);
        var o=await db.Orders.Include(x=>x.Payments).SingleOrDefaultAsync(x=>x.Id==id,ct);if(o is null)return Results.NotFound();
        if(!OperationsInput.Version(db,o,req.RowVersion))return Invalid("rowVersion","Refresh this order before updating.");
        if(!OrderStatuses.CanTransition(o.Status,req.Status))return Invalid("status","This status transition is not allowed.");
        if(!OperationsInput.Optional(req.Note,1000))return Invalid("note","Notes must be at most 1000 characters.");
        if(req.Status is "Cancelled" or "Rejected" && o.Payments.Count>0)return Invalid("status","Paid bookings require refund handling before cancellation.");
        var before=o.Status;var actor=ctx.User.FindFirst("sub")?.Value;o.Status=req.Status;o.UpdatedAt=DateTime.UtcNow;o.UpdatedBy=actor;
        db.OrderStatusHistories.Add(new OrderStatusHistory {OrderId=id,FromStatus=before,ToStatus=req.Status,Note=req.Note,ChangedAt=DateTime.UtcNow,ChangedBy=actor});
        try {await db.SaveChangesAsync(ct);}catch(DbUpdateConcurrencyException){return Conflict();}
        await OperationsAudit.WriteAsync(db,actor,"Order.Status","Order",id.ToString(),new {status=before},new {o.Status,req.Note},ct);await tx.CommitAsync(ct);return Results.Ok(SaleDto(o));
    }
    private static async Task<IResult> Payment(Guid id,PaymentRequest req,HttpContext ctx,OrderingDbContext db,CancellationToken ct)
    {
        if(!new[]{"Cash","bKash","Nagad","Bank","Card"}.Contains(req.Method)||req.Amount<=0||decimal.Round(req.Amount,2)!=req.Amount||!OperationsInput.Optional(req.Reference,120))return Invalid("payment","Choose a payment method and positive amount with at most two decimals.");
        if(req.Method!="Cash"&&!OperationsInput.Text(req.Reference,120))return Invalid("reference","Enter the payment reference.");
        await using var tx=await db.Database.BeginTransactionAsync(IsolationLevel.Serializable,ct);
        var o=await db.Orders.Include(x=>x.Payments).SingleOrDefaultAsync(x=>x.Id==id,ct);if(o is null)return Results.NotFound();
        if(!OperationsInput.Version(db,o,req.RowVersion))return Invalid("rowVersion","Refresh this order before recording a payment.");
        if(o.Status is "Cancelled" or "Rejected" || req.Amount>o.GrandTotal-o.Payments.Sum(x=>x.Amount))return Invalid("amount","Payment exceeds the balance or this order is closed.");
        if(!string.IsNullOrWhiteSpace(req.Reference)&&o.Payments.Any(p=>p.Reference==req.Reference.Trim()))return Invalid("reference","This reference has already been recorded.");
        var actor=ctx.User.FindFirst("sub")?.Value;var payment=new Payment {Id=Guid.NewGuid(),OrderId=id,Method=req.Method,Amount=req.Amount,Reference=req.Reference?.Trim(),PaidAt=DateTime.UtcNow,RecordedBy=actor};
        db.Payments.Add(payment);o.UpdatedAt=DateTime.UtcNow;o.UpdatedBy=actor;
        try{await db.SaveChangesAsync(ct);}catch(DbUpdateConcurrencyException){return Conflict();}
        await OperationsAudit.WriteAsync(db,actor,"Order.Payment","Order",id.ToString(),null,new{payment.Id,payment.Amount,payment.Method,payment.Reference},ct);await tx.CommitAsync(ct);return Results.Ok(SaleDto(o));
    }
    private static object SaleDto(Order o) => new {o.Id,o.OrderNo,o.CustomerId,o.ContactName,o.ContactPhone,o.PackageId,o.PackageName,o.CategoryName,o.VariantName,o.Guests,o.EventDate,o.EventTime,o.EventType,o.VenueAddress,o.SpecialInstructions,o.Status,o.UnitPricePerHead,o.SubTotal,o.AddOnTotal,o.DeliveryCharge,o.Discount,o.GrandTotal,
        paidAmount=o.Payments.Sum(p=>p.Amount),balance=o.GrandTotal-o.Payments.Sum(p=>p.Amount),o.CreatedAt,rowVersion=Convert.ToBase64String(o.RowVersion)};
    private static object OperationalDto(Order o)=>new {o.Id,o.OrderNo,o.CustomerId,o.ContactName,o.ContactPhone,o.PackageId,o.PackageName,o.CategoryName,o.VariantName,o.Guests,o.EventDate,o.EventTime,o.EventType,o.VenueAddress,o.SpecialInstructions,o.Status,o.CreatedAt,rowVersion=Convert.ToBase64String(o.RowVersion)};
    private static async Task<bool> CanMoney(HttpContext ctx,IPermissionService permissions,CancellationToken ct)
        =>(await permissions.GetUserPermissionsAsync(ctx.User.FindFirst("sub")!.Value,ct)).Contains("ordering.pricing.view");
    private static object KitchenSnapshot(Order o)
    {
        var snapshot=JsonSerializer.Deserialize<JsonElement>(o.SnapshotJson);
        return new {items=snapshot.GetProperty("items"),variant=o.VariantName,
            addOns=snapshot.GetProperty("addOns").EnumerateArray().Select(a=>new {id=a.TryGetProperty("id",out var id)?id:a.GetProperty("Id"),name=a.TryGetProperty("name",out var name)?name:a.GetProperty("Name")}).ToArray()};
    }
    private static IResult Invalid(string field,string message)=>Results.ValidationProblem(new Dictionary<string,string[]>{{field,[message]}});
    private static IResult Conflict()=>Results.Problem(statusCode:409,detail:"This order changed. Refresh and try again.");
}
