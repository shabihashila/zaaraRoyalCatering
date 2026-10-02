using Engagement.Domain.Entities.Generated;
using Engagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
using ZRC.SharedKernel;

namespace ZRC.Modules.Engagement.Api;

public sealed record ReviewInput(string AuthorName,int Rating,string Body,string? EventType);
public sealed record ModerateInput(string Status,bool IsFeatured,string RowVersion);
public sealed record ContactInput(string Name,string? Email,string? Phone,string? Subject,string Message);
public sealed record HandleInput(string Status,string? StaffNotes,string RowVersion);
public static class EngagementEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var a=endpoints.MapGroup("/api/v1/admin/engagement").WithTags("engagement");
        a.MapGet("/reviews",Reviews).RequirePermission("engagement.review.moderate");
        a.MapPost("/reviews",CreateReview).RequirePermission("engagement.review.moderate");
        a.MapPut("/reviews/{id:guid}",Moderate).RequirePermission("engagement.review.moderate");
        a.MapGet("/requests",Requests).RequirePermission("engagement.inquiry.view");
        a.MapPut("/requests/{id:guid}",Handle).RequirePermission("engagement.inquiry.manage");
        endpoints.MapGet("/api/v1/public/testimonials",Testimonials);
        endpoints.MapPost("/api/v1/public/reviews",CreateReview).RequireAuthorization().RequireRateLimiting("public-write");
        endpoints.MapPost("/api/v1/public/inquiries",(ContactInput req,HttpContext ctx,EngagementDbContext db,CancellationToken ct)=>Submit("Inquiry",req,ctx,db,ct)).RequireRateLimiting("public-write");
        endpoints.MapPost("/api/v1/public/contact",(ContactInput req,HttpContext ctx,EngagementDbContext db,CancellationToken ct)=>Submit("Contact",req,ctx,db,ct)).RequireRateLimiting("public-write");
        endpoints.MapPost("/api/v1/public/newsletter",(ContactInput req,HttpContext ctx,EngagementDbContext db,CancellationToken ct)=>Submit("Newsletter",req,ctx,db,ct)).RequireRateLimiting("public-write");
    }
    private static async Task<IResult> Reviews(EngagementDbContext db,string? status,int? page,int? pageSize,CancellationToken ct)
    {
        var p=Math.Max(1,page??1);var size=Math.Clamp(pageSize??20,1,100);var q=db.Reviews.AsNoTracking();if(!string.IsNullOrWhiteSpace(status))q=q.Where(r=>r.Status==status);
        var total=await q.CountAsync(ct);var rows=await q.OrderByDescending(r=>r.CreatedAt).Skip((p-1)*size).Take(size).ToListAsync(ct);
        return Results.Ok(new {items=rows.Select(ReviewDto),page=p,pageSize=size,totalCount=total});
    }
    private static async Task<IResult> Testimonials(EngagementDbContext db,CancellationToken ct)
        =>Results.Ok(await db.Reviews.AsNoTracking().Where(r=>r.Status=="Approved"&&r.IsFeatured).OrderByDescending(r=>r.CreatedAt).Take(12).Select(r=>new{r.AuthorName,r.Rating,r.Body,r.EventType}).ToListAsync(ct));
    private static async Task<IResult> CreateReview(ReviewInput req,HttpContext ctx,EngagementDbContext db,CancellationToken ct)
    {
        if(!OperationsInput.Text(req.AuthorName,160)||!OperationsInput.Text(req.Body,2000)||req.Rating is <1 or >5||!OperationsInput.Optional(req.EventType,160))return Invalid("review","Enter a name, review and rating from 1 to 5 within the field limits.");
        var r=new Review {Id=Guid.NewGuid(),AuthorName=req.AuthorName.Trim(),Rating=req.Rating,Body=req.Body.Trim(),EventType=req.EventType,Status="Pending",CreatedAt=DateTime.UtcNow,CreatedBy=ctx.User.FindFirst("sub")?.Value};
        await using var tx=await db.Database.BeginTransactionAsync(ct);db.Reviews.Add(r);await db.SaveChangesAsync(ct);await OperationsAudit.WriteAsync(db,r.CreatedBy,"Review.Submitted","Review",r.Id.ToString(),null,new{r.Status},ct);await tx.CommitAsync(ct);
        return Results.Ok(new{r.Id,r.Status});
    }
    private static async Task<IResult> Moderate(Guid id,ModerateInput req,HttpContext ctx,EngagementDbContext db,CancellationToken ct)
    {
        if(!new[]{"Pending","Approved","Rejected"}.Contains(req.Status)||(req.IsFeatured&&req.Status!="Approved"))return Invalid("status","Only approved reviews can be featured.");
        var r=await db.Reviews.SingleOrDefaultAsync(r=>r.Id==id,ct);if(r is null)return Results.NotFound();var before=new{r.Status,r.IsFeatured};
        if(!OperationsInput.Version(db,r,req.RowVersion))return Invalid("rowVersion","Refresh the review first.");
        r.Status=req.Status;r.IsFeatured=req.IsFeatured;r.UpdatedAt=DateTime.UtcNow;r.UpdatedBy=ctx.User.FindFirst("sub")?.Value;
        await using var tx=await db.Database.BeginTransactionAsync(ct);try{await db.SaveChangesAsync(ct);}catch(DbUpdateConcurrencyException){return Conflict();}
        await OperationsAudit.WriteAsync(db,r.UpdatedBy,"Review.Moderated","Review",id.ToString(),before,new{r.Status,r.IsFeatured},ct);await tx.CommitAsync(ct);return Results.Ok(ReviewDto(r));
    }
    private static async Task<IResult> Submit(string kind,ContactInput req,HttpContext ctx,EngagementDbContext db,CancellationToken ct)
    {
        if(!OperationsInput.Text(req.Name,160)||!OperationsInput.Text(req.Message,4000)||!OperationsInput.Optional(req.Subject,160)||!OperationsInput.Optional(req.Email,254)||(!string.IsNullOrWhiteSpace(req.Email)&&!System.Net.Mail.MailAddress.TryCreate(req.Email,out _))||(!string.IsNullOrWhiteSpace(req.Phone)&&!OperationsInput.ValidPhone(req.Phone))||(string.IsNullOrWhiteSpace(req.Email)&&string.IsNullOrWhiteSpace(req.Phone)))
            return Invalid("contact","Enter a name, message and valid email or Bangladesh mobile number within the field limits.");
        var r=new Request {Id=Guid.NewGuid(),Kind=kind,Name=req.Name.Trim(),Email=req.Email?.Trim(),Phone=string.IsNullOrWhiteSpace(req.Phone)?null:OperationsInput.Phone(req.Phone),Subject=req.Subject,Message=req.Message.Trim(),Status="New",CreatedAt=DateTime.UtcNow,CreatedBy=ctx.User.FindFirst("sub")?.Value};
        await using var tx=await db.Database.BeginTransactionAsync(ct);db.Requests.Add(r);await db.SaveChangesAsync(ct);await OperationsAudit.WriteAsync(db,r.CreatedBy,"Request.Received","Request",r.Id.ToString(),null,new{r.Kind,r.Status},ct);await tx.CommitAsync(ct);return Results.Ok(new{r.Id,r.Status});
    }
    private static async Task<IResult> Requests(EngagementDbContext db,string? kind,string? status,int? page,int? pageSize,CancellationToken ct)
    {
        var p=Math.Max(1,page??1);var size=Math.Clamp(pageSize??20,1,100);var q=db.Requests.AsNoTracking();if(!string.IsNullOrWhiteSpace(kind))q=q.Where(r=>r.Kind==kind);if(!string.IsNullOrWhiteSpace(status))q=q.Where(r=>r.Status==status);
        var total=await q.CountAsync(ct);var rows=await q.OrderByDescending(r=>r.CreatedAt).Skip((p-1)*size).Take(size).ToListAsync(ct);return Results.Ok(new{items=rows.Select(RequestDto),page=p,pageSize=size,totalCount=total});
    }
    private static async Task<IResult> Handle(Guid id,HandleInput req,HttpContext ctx,EngagementDbContext db,CancellationToken ct)
    {
        if(!new[]{"New","InProgress","Closed"}.Contains(req.Status)||!OperationsInput.Optional(req.StaffNotes,2000))return Invalid("status","Choose a valid status and notes of up to 2000 characters.");
        var r=await db.Requests.SingleOrDefaultAsync(r=>r.Id==id,ct);if(r is null)return Results.NotFound();var before=new{r.Status,r.StaffNotes};if(!OperationsInput.Version(db,r,req.RowVersion))return Invalid("rowVersion","Refresh the request first.");
        r.Status=req.Status;r.StaffNotes=req.StaffNotes;r.UpdatedAt=DateTime.UtcNow;r.UpdatedBy=ctx.User.FindFirst("sub")?.Value;
        await using var tx=await db.Database.BeginTransactionAsync(ct);try{await db.SaveChangesAsync(ct);}catch(DbUpdateConcurrencyException){return Conflict();}
        await OperationsAudit.WriteAsync(db,r.UpdatedBy,"Request.Handled","Request",id.ToString(),before,new{r.Status,r.StaffNotes},ct);await tx.CommitAsync(ct);return Results.Ok(RequestDto(r));
    }
    private static object ReviewDto(Review r)=>new{r.Id,r.AuthorName,r.Rating,r.Body,r.EventType,r.Status,r.IsFeatured,r.CreatedAt,rowVersion=Convert.ToBase64String(r.RowVersion)};
    private static object RequestDto(Request r)=>new{r.Id,r.Kind,r.Name,r.Email,r.Phone,r.Subject,r.Message,r.Status,r.StaffNotes,r.CreatedAt,rowVersion=Convert.ToBase64String(r.RowVersion)};
    private static IResult Invalid(string field,string message)=>Results.ValidationProblem(new Dictionary<string,string[]>{{field,[message]}});
    private static IResult Conflict()=>Results.Problem(statusCode:409,detail:"This record changed. Refresh and try again.");
}
