using Content.Domain.Entities.Generated;
using Content.Infrastructure.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
using ZRC.SharedKernel;

namespace ZRC.Modules.Content.Api;
public sealed record ContentInput(string Kind,string Key,string Title,string Body,string? ImageUrl,int SortOrder,bool IsPublished,string? RowVersion);
public static class ContentEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var g=endpoints.MapGroup("/api/v1/admin/content").WithTags("content");
        g.MapGet("",List).RequirePermission("content.view");g.MapPost("",Create).RequirePermission("content.edit");g.MapPut("/{id:guid}",Update).RequirePermission("content.edit");
        endpoints.MapGet("/api/v1/public/content",Public);
    }
    private static async Task<IResult> List(ContentDbContext db,string? kind,int? page,int? pageSize,CancellationToken ct)
    {
        var p=Math.Max(1,page??1);var size=Math.Clamp(pageSize??20,1,100);var q=db.Entries.AsNoTracking();if(!string.IsNullOrWhiteSpace(kind))q=q.Where(e=>e.Kind==kind);
        var total=await q.CountAsync(ct);var rows=await q.OrderBy(e=>e.Kind).ThenBy(e=>e.SortOrder).ThenBy(e=>e.Key).Skip((p-1)*size).Take(size).ToListAsync(ct);return Results.Ok(new{items=rows.Select(Dto),page=p,pageSize=size,totalCount=total});
    }
    private static async Task<IResult> Public(ContentDbContext db,string? kind,CancellationToken ct)
    {
        var q=db.Entries.AsNoTracking().Where(e=>e.IsPublished);if(!string.IsNullOrWhiteSpace(kind))q=q.Where(e=>e.Kind==kind);
        return Results.Ok(await q.OrderBy(e=>e.SortOrder).ThenBy(e=>e.Key).Select(e=>new{e.Kind,e.Key,e.Title,e.Body,e.ImageUrl,e.SortOrder}).Take(200).ToListAsync(ct));
    }
    private static Task<IResult> Create(ContentInput req,HttpContext ctx,ContentDbContext db,CancellationToken ct)=>Save(null,req,ctx,db,ct);
    private static Task<IResult> Update(Guid id,ContentInput req,HttpContext ctx,ContentDbContext db,CancellationToken ct)=>Save(id,req,ctx,db,ct);
    private static async Task<IResult> Save(Guid? id,ContentInput req,HttpContext ctx,ContentDbContext db,CancellationToken ct)
    {
        if(!new[]{"Page","Hero","Gallery","FAQ","Setting"}.Contains(req.Kind)||!OperationsInput.Text(req.Key,100)||!System.Text.RegularExpressions.Regex.IsMatch(req.Key,@"^[a-z0-9][a-z0-9.-]*$")||!OperationsInput.Text(req.Title,200)||!OperationsInput.Text(req.Body,4000)||!OperationsInput.Optional(req.ImageUrl,1000)||req.SortOrder<0)
            return Results.ValidationProblem(new Dictionary<string,string[]>{{"content",["Enter a valid content type, lowercase key, title, body and non-negative sort order within the field limits."]}});
        if(!string.IsNullOrWhiteSpace(req.ImageUrl)&&!(req.ImageUrl.StartsWith("/assets/",StringComparison.Ordinal)||Uri.TryCreate(req.ImageUrl,UriKind.Absolute,out var uri)&&uri.Scheme=="https"))return Results.Problem(statusCode:400,detail:"Images must use /assets/ paths or HTTPS URLs.");
        var e=id is null?new Entry{Id=Guid.NewGuid(),CreatedAt=DateTime.UtcNow,CreatedBy=ctx.User.FindFirst("sub")?.Value}:await db.Entries.SingleOrDefaultAsync(e=>e.Id==id,ct);if(e is null)return Results.NotFound();var before=id is null?null:Dto(e);
        if(id is not null&&!OperationsInput.Version(db,e,req.RowVersion))return Results.Problem(statusCode:400,detail:"Refresh this content before editing.");
        e.Kind=req.Kind;e.Key=req.Key.Trim();e.Title=req.Title.Trim();e.Body=req.Body.Trim();e.ImageUrl=string.IsNullOrWhiteSpace(req.ImageUrl)?null:req.ImageUrl.Trim();e.SortOrder=req.SortOrder;e.IsPublished=req.IsPublished;e.UpdatedAt=DateTime.UtcNow;e.UpdatedBy=ctx.User.FindFirst("sub")?.Value;
        await using var tx=await db.Database.BeginTransactionAsync(ct);if(id is null)db.Entries.Add(e);try{await db.SaveChangesAsync(ct);}catch(DbUpdateConcurrencyException){return Results.Problem(statusCode:409,detail:"This content changed. Refresh and try again.");}catch(DbUpdateException ex)when(ex.InnerException is SqlException{Number:2601 or 2627}){return Results.Problem(statusCode:409,detail:"This content key already exists in this type.");}
        await OperationsAudit.WriteAsync(db,e.UpdatedBy,"Content.Saved","Content",e.Id.ToString(),before,Dto(e),ct);await tx.CommitAsync(ct);return Results.Ok(Dto(e));
    }
    private static object Dto(Entry e)=>new{e.Id,e.Kind,e.Key,e.Title,e.Body,e.ImageUrl,e.SortOrder,e.IsPublished,e.CreatedAt,rowVersion=Convert.ToBase64String(e.RowVersion)};
}
