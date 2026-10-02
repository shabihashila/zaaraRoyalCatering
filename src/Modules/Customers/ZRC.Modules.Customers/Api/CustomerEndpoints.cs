using Customers.Domain.Entities.Generated;
using Customers.Infrastructure.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ZRC.Infrastructure.Common;
using ZRC.Modules.Customers.Contracts;
using ZRC.SharedKernel;

namespace ZRC.Modules.Customers.Api;

public sealed record CustomerRequest(string Name,string Phone,string? Email,string? Address,string? Notes,string? RowVersion);
public sealed class CustomerQuery(CustomersDbContext db):ICustomerQuery
{
    public Task<CustomerContact?> GetAsync(Guid id,CancellationToken ct=default)
        => db.Customers.AsNoTracking().Where(c=>c.Id==id&&!c.IsDeleted).Select(c=>new CustomerContact(c.Id,c.Name,c.Phone,c.Address)).SingleOrDefaultAsync(ct);
}
public static class CustomerEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var g=endpoints.MapGroup("/api/v1/admin/customers").WithTags("customers");
        g.MapGet("",List).RequirePermission("customers.view");
        g.MapPost("",Create).RequirePermission("customers.manage");
        g.MapPut("/{id:guid}",Update).RequirePermission("customers.manage");
    }
    private static async Task<IResult> List(CustomersDbContext db,string? search,int? page,int? pageSize,CancellationToken ct)
    {
        var p=Math.Max(1,page??1);var size=Math.Clamp(pageSize??20,1,100);var q=db.Customers.AsNoTracking().Where(c=>!c.IsDeleted);
        if(!string.IsNullOrWhiteSpace(search))q=q.Where(c=>c.Name.Contains(search)||c.Phone.Contains(search)||(c.Email!=null&&c.Email.Contains(search)));
        var total=await q.CountAsync(ct);var rows=await q.OrderBy(c=>c.Name).Skip((p-1)*size).Take(size).ToListAsync(ct);
        return Results.Ok(new {items=rows.Select(Dto),page=p,pageSize=size,totalCount=total});
    }
    private static Task<IResult> Create(CustomerRequest req,HttpContext ctx,CustomersDbContext db,CancellationToken ct)=>Save(null,req,ctx,db,ct);
    private static Task<IResult> Update(Guid id,CustomerRequest req,HttpContext ctx,CustomersDbContext db,CancellationToken ct)=>Save(id,req,ctx,db,ct);
    private static async Task<IResult> Save(Guid? id,CustomerRequest req,HttpContext ctx,CustomersDbContext db,CancellationToken ct)
    {
        if(!OperationsInput.Text(req.Name,160)||!OperationsInput.ValidPhone(req.Phone)||!OperationsInput.Optional(req.Address,1000)||!OperationsInput.Optional(req.Notes,2000)||!OperationsInput.Optional(req.Email,254)||(!string.IsNullOrWhiteSpace(req.Email)&&!System.Net.Mail.MailAddress.TryCreate(req.Email,out _)))
            return Results.ValidationProblem(new Dictionary<string,string[]>{{"customer",["Enter a customer name, valid Bangladesh mobile number and valid optional email within the field limits."]}});
        var c=id is null?new Customer {Id=Guid.NewGuid(),CreatedAt=DateTime.UtcNow,CreatedBy=ctx.User.FindFirst("sub")?.Value}:await db.Customers.SingleOrDefaultAsync(c=>c.Id==id&&!c.IsDeleted,ct);
        if(c is null)return Results.NotFound();var before=id is null?null:Dto(c);
        if(id is not null&&!OperationsInput.Version(db,c,req.RowVersion))return Results.Problem(statusCode:400,detail:"Refresh this customer before editing.");
        c.Name=req.Name.Trim();c.Phone=OperationsInput.Phone(req.Phone);c.Email=string.IsNullOrWhiteSpace(req.Email)?null:req.Email.Trim();c.Address=req.Address;c.Notes=req.Notes;c.UpdatedAt=DateTime.UtcNow;c.UpdatedBy=ctx.User.FindFirst("sub")?.Value;
        await using var tx=await db.Database.BeginTransactionAsync(ct);if(id is null)db.Customers.Add(c);
        try{await db.SaveChangesAsync(ct);}catch(DbUpdateConcurrencyException){return Results.Problem(statusCode:409,detail:"This customer changed. Refresh and try again.");}
        catch(DbUpdateException ex)when(ex.InnerException is SqlException {Number:2601 or 2627}){return Results.Problem(statusCode:409,detail:"A customer with this phone already exists.");}
        await OperationsAudit.WriteAsync(db,c.UpdatedBy,id is null?"Customer.Created":"Customer.Updated","Customer",c.Id.ToString(),before,Dto(c),ct);await tx.CommitAsync(ct);return Results.Ok(Dto(c));
    }
    private static object Dto(Customer c)=>new{c.Id,c.Name,c.Phone,c.Email,c.Address,c.Notes,c.CreatedAt,rowVersion=Convert.ToBase64String(c.RowVersion)};
}
