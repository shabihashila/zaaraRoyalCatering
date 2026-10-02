using Catalog.Domain.Entities.Generated;
using Catalog.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using ZRC.Modules.Catalog.Application;
using ZRC.Modules.Catalog.Contracts;
using ZRC.SharedKernel;

namespace ZRC.Modules.Catalog.Api;

// ---- admin DTOs (internal fields allowed here; public DTOs stay in Contracts) ----
public sealed record AdminPackageItemDto(Guid ItemId, string ItemName, string? DisplayName, decimal CostPerHead, int SortOrder);
public sealed record AdminPackageDto(Guid Id, string CategoryName, string Name, string Slug,
    decimal SalePricePerHead, decimal TotalCost, decimal Profit, decimal MarginPct,
    int MinGuests, int? MaxGuests, string? Tagline, string? Description, bool IsActive, bool IsFeatured,
    string? RowVersion, IReadOnlyList<AdminPackageItemDto> Items);
public sealed record UpdatePackageRequest(decimal SalePricePerHead, string? Tagline, string? Description,
    int MinGuests, int? MaxGuests, bool IsActive, bool IsFeatured, string? RowVersion);
public sealed record UpsertItemCostRequest(Guid ItemId, decimal CostPerHead, string? DisplayName, int SortOrder);
public sealed record CreateItemRequest(string Name);
public sealed record UpdateItemRequest(string Name, bool IsActive, string? RowVersion);
public sealed record CreateCategoryRequest(string Name, string? Description, int SortOrder);
public sealed record UpdateCategoryRequest(string Name, string? Description, int SortOrder, bool IsActive, string? RowVersion);
public sealed record UpsertAddOnRequest(string Name, string? Description, string PricingType, decimal Price, decimal Cost, bool IsActive);
public sealed record LinkAddOnRequest(Guid AddOnId);

public sealed class UpdatePackageValidator : AbstractValidator<UpdatePackageRequest>
{
    public UpdatePackageValidator()
    {
        RuleFor(x => x.SalePricePerHead).GreaterThan(0);
        RuleFor(x => x.MinGuests).GreaterThanOrEqualTo(1);
        RuleFor(x => x.MaxGuests).GreaterThanOrEqualTo(x => x.MinGuests).When(x => x.MaxGuests.HasValue);
    }
}

public sealed class UpsertAddOnValidator : AbstractValidator<UpsertAddOnRequest>
{
    public UpsertAddOnValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(256);
        RuleFor(x => x.PricingType).Must(t => t is "Flat" or "PerHead");
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Cost).GreaterThanOrEqualTo(0);
    }
}

public static class AdminCatalogEndpoints
{
    public static void Map(RouteGroupBuilder g)
    {
        g.MapGet("/catalog/costing", Costing).RequirePermission(CatalogPermissions.CostingView);
        g.MapGet("/catalog/packages", AdminPackages).RequirePermission(CatalogPermissions.PackageView);
        g.MapGet("/catalog/packages/{id:guid}", AdminPackage).RequirePermission(CatalogPermissions.PackageView);
        g.MapPut("/catalog/packages/{id:guid}", UpdatePackage).RequirePermission(CatalogPermissions.PackageEdit);
        g.MapPut("/catalog/packages/{id:guid}/items", UpsertItemCosts).RequirePermission(CatalogPermissions.PackageEdit);
        g.MapPost("/catalog/packages/{id:guid}/addons", LinkAddOn).RequirePermission(CatalogPermissions.PackageEdit);
        g.MapDelete("/catalog/packages/{id:guid}/addons/{addOnId:guid}", UnlinkAddOn).RequirePermission(CatalogPermissions.PackageEdit);
        g.MapGet("/catalog/packages/{id:guid}/prices", PriceHistory).RequirePermission(CatalogPermissions.CostingView);
        g.MapGet("/catalog/categories", Categories).RequirePermission(CatalogPermissions.CategoryView);
        g.MapPost("/catalog/categories", CreateCategory).RequirePermission(CatalogPermissions.CategoryEdit);
        g.MapPut("/catalog/categories/{id:guid}", UpdateCategory).RequirePermission(CatalogPermissions.CategoryEdit);
        g.MapGet("/catalog/items", Items).RequirePermission(CatalogPermissions.PackageView);
        g.MapPost("/catalog/items", CreateItem).RequirePermission(CatalogPermissions.PackageEdit);
        g.MapPut("/catalog/items/{id:guid}", UpdateItem).RequirePermission(CatalogPermissions.PackageEdit);
        g.MapGet("/catalog/addons", AddOns).RequirePermission(CatalogPermissions.PackageView);
        g.MapPost("/catalog/addons", CreateAddOn).RequirePermission(CatalogPermissions.PackageEdit);
        g.MapPut("/catalog/addons/{id:guid}", UpdateAddOn).RequirePermission(CatalogPermissions.PackageEdit);
    }

    private static async Task<IResult> Costing(CatalogQuery q, CancellationToken ct)
        => Results.Ok(await q.ListCostingAsync(ct));

    private static async Task<IResult> AdminPackages(CatalogQuery q, CatalogDbContext db, CancellationToken ct)
    {
        var costing = await q.ListCostingAsync(ct);
        var byId = costing.ToDictionary(c => c.PackageId);
        var pkgs = await db.Packages.AsNoTracking().Where(p => !p.IsDeleted)
            .OrderBy(p => p.Category.SortOrder).ThenBy(p => p.SortOrder).ToListAsync(ct);
        var result = pkgs.Select(p =>
        {
            byId.TryGetValue(p.Id, out var c);
            return new AdminPackageDto(p.Id, "", p.Name, p.Slug, p.SalePricePerHead,
                c?.TotalCost ?? 0, c?.Profit ?? 0, c?.MarginPct ?? 0,
                p.MinGuests, p.MaxGuests, p.Tagline, p.Description, p.IsActive, p.IsFeatured,
                Convert.ToBase64String(p.RowVersion), []);
        }).ToList();
        // Fill category names in one query.
        var cats = await db.Categories.AsNoTracking().ToDictionaryAsync(c => c.Id, c => c.Name, ct);
        return Results.Ok(result.Select(r =>
        {
            var p = pkgs.First(x => x.Id == r.Id);
            return r with { CategoryName = cats.TryGetValue(p.CategoryId, out var n) ? n : "" };
        }));
    }

    private static async Task<IResult> AdminPackage(Guid id, CatalogDbContext db, CatalogQuery q, CancellationToken ct)
    {
        var p = await db.Packages.AsNoTracking()
            .Include(x => x.Category)
            .Include(x => x.PackageItems).ThenInclude(x => x.Item)
            .Include(x => x.PackageInclusions)
            .Include(x => x.PackageVariants)
            .Include(x => x.AddOns)
            .SingleOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (p is null) return Results.NotFound();
        var costing = await q.GetCostingAsync(id, ct);
        return Results.Ok(new AdminPackageDto(p.Id, p.Category.Name, p.Name, p.Slug, p.SalePricePerHead,
            costing?.TotalCost ?? 0, costing?.Profit ?? 0, costing?.MarginPct ?? 0,
            p.MinGuests, p.MaxGuests, p.Tagline, p.Description, p.IsActive, p.IsFeatured,
            Convert.ToBase64String(p.RowVersion),
            [.. p.PackageItems.OrderBy(i => i.SortOrder).Select(i =>
                new AdminPackageItemDto(i.ItemId, i.Item.Name, i.DisplayName, i.CostPerHead, i.SortOrder))]));
    }

    private static async Task<IResult> UpdatePackage(Guid id, UpdatePackageRequest req, IValidator<UpdatePackageRequest> v,
        CatalogDbContext db, IOutputCacheStore cache, HttpContext ctx, CancellationToken ct)
    {
        var vr = await v.ValidateAsync(req, ct);
        if (!vr.IsValid) return Results.ValidationProblem(vr.ToDictionary());
        var p = await db.Packages.SingleOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (p is null) return Results.NotFound();
        if (req.RowVersion is not null && Convert.ToBase64String(p.RowVersion) != req.RowVersion)
            return Results.Problem("Package was modified by someone else.", statusCode: 409);
        var actor = ctx.User.FindFirst("sub")?.Value;
        if (p.SalePricePerHead != req.SalePricePerHead)
            db.PriceHistories.Add(new PriceHistory
            {
                PackageId = id, OldPrice = p.SalePricePerHead, NewPrice = req.SalePricePerHead,
                ChangedAt = DateTime.UtcNow, ChangedBy = actor,
            });
        p.SalePricePerHead = req.SalePricePerHead;
        p.Tagline = req.Tagline; p.Description = req.Description;
        p.MinGuests = req.MinGuests; p.MaxGuests = req.MaxGuests;
        p.IsActive = req.IsActive; p.IsFeatured = req.IsFeatured;
        p.UpdatedBy = actor;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Results.Problem("Package was modified by someone else.", statusCode: 409); }
        await cache.EvictByTagAsync("catalog", ct);
        return Results.Ok(new { id });
    }

    private static async Task<IResult> UpsertItemCosts(Guid id, List<UpsertItemCostRequest> req,
        CatalogDbContext db, IOutputCacheStore cache, HttpContext ctx, CancellationToken ct)
    {
        var p = await db.Packages.Include(x => x.PackageItems)
            .SingleOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (p is null) return Results.NotFound();
        if (req.Any(r => r.CostPerHead < 0))
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["costPerHead"] = ["Costs must be >= 0."] });
        var itemIds = req.Select(r => r.ItemId).Distinct().ToList();
        var existing = await db.Items.Where(i => itemIds.Contains(i.Id) && !i.IsDeleted)
            .Select(i => i.Id).ToListAsync(ct);
        if (existing.Count != itemIds.Count)
            return Results.Problem("Unknown item id in cost grid.", statusCode: 400);
        var actor = ctx.User.FindFirst("sub")?.Value;
        db.PackageItems.RemoveRange(p.PackageItems);
        foreach (var r in req.OrderBy(x => x.SortOrder))
            db.PackageItems.Add(new PackageItem
            {
                PackageId = id, ItemId = r.ItemId, CostPerHead = r.CostPerHead,
                DisplayName = r.DisplayName, SortOrder = r.SortOrder,
            });
        p.UpdatedBy = actor;
        await db.SaveChangesAsync(ct);
        await cache.EvictByTagAsync("catalog", ct);
        return Results.Ok(new { id });
    }

    private static async Task<IResult> LinkAddOn(Guid id, LinkAddOnRequest req,
        CatalogDbContext db, IOutputCacheStore cache, CancellationToken ct)
    {
        var p = await db.Packages.Include(x => x.AddOns)
            .SingleOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (p is null) return Results.NotFound();
        var addon = await db.AddOns.SingleOrDefaultAsync(a => a.Id == req.AddOnId, ct);
        if (addon is null) return Results.Problem("Unknown add-on.", statusCode: 400);
        if (p.AddOns.All(a => a.Id != addon.Id))
        {
            p.AddOns.Add(addon);
            await db.SaveChangesAsync(ct);
            await cache.EvictByTagAsync("catalog", ct);
        }
        return Results.Ok(new { id });
    }

    private static async Task<IResult> UnlinkAddOn(Guid id, Guid addOnId,
        CatalogDbContext db, IOutputCacheStore cache, CancellationToken ct)
    {
        var p = await db.Packages.Include(x => x.AddOns)
            .SingleOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (p is null) return Results.NotFound();
        var addon = p.AddOns.SingleOrDefault(a => a.Id == addOnId);
        if (addon is null) return Results.NotFound();
        p.AddOns.Remove(addon);
        await db.SaveChangesAsync(ct);
        await cache.EvictByTagAsync("catalog", ct);
        return Results.NoContent();
    }

    private static async Task<IResult> PriceHistory(Guid id, CatalogDbContext db, CancellationToken ct)
    {
        if (!await db.Packages.AnyAsync(p => p.Id == id, ct)) return Results.NotFound();
        var rows = await db.PriceHistories.AsNoTracking()
            .Where(h => h.PackageId == id).OrderByDescending(h => h.Id).Take(100).ToListAsync(ct);
        return Results.Ok(rows.Select(h => new { h.Id, h.OldPrice, h.NewPrice, h.ChangedAt, h.ChangedBy }));
    }

    private static async Task<IResult> Categories(CatalogDbContext db, CancellationToken ct)
    {
        var rows = await db.Categories.AsNoTracking().Where(c => !c.IsDeleted)
            .OrderBy(c => c.SortOrder).ToListAsync(ct);
        return Results.Ok(rows.Select(c => new
        {
            c.Id, c.Name, c.Slug, c.Description, c.SortOrder, c.IsActive,
            RowVersion = Convert.ToBase64String(c.RowVersion),
        }));
    }

    private static async Task<IResult> CreateCategory(CreateCategoryRequest req, CatalogDbContext db,
        IOutputCacheStore cache, HttpContext ctx, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return Results.ValidationProblem(
            new Dictionary<string, string[]> { ["name"] = ["Name is required."] });
        var slug = Slug(req.Name);
        if (await db.Categories.AnyAsync(c => (c.Slug == slug || c.Name == req.Name) && !c.IsDeleted, ct))
            return Results.Problem("Category already exists.", statusCode: 409);
        var c = new Category
        {
            Id = Guid.NewGuid(), Name = req.Name.Trim(), Slug = slug, Description = req.Description,
            SortOrder = req.SortOrder, IsActive = true, CreatedBy = ctx.User.FindFirst("sub")?.Value,
        };
        db.Categories.Add(c);
        await db.SaveChangesAsync(ct);
        await cache.EvictByTagAsync("catalog", ct);
        return Results.Created($"/api/v1/admin/catalog/categories/{c.Id}", new { id = c.Id });
    }

    private static async Task<IResult> UpdateCategory(Guid id, UpdateCategoryRequest req,
        CatalogDbContext db, IOutputCacheStore cache, HttpContext ctx, CancellationToken ct)
    {
        var c = await db.Categories.SingleOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
        if (c is null) return Results.NotFound();
        if (req.RowVersion is not null && Convert.ToBase64String(c.RowVersion) != req.RowVersion)
            return Results.Problem("Category was modified by someone else.", statusCode: 409);
        if (string.IsNullOrWhiteSpace(req.Name)) return Results.ValidationProblem(
            new Dictionary<string, string[]> { ["name"] = ["Name is required."] });
        c.Name = req.Name.Trim(); c.Description = req.Description;
        c.SortOrder = req.SortOrder; c.IsActive = req.IsActive;
        c.UpdatedBy = ctx.User.FindFirst("sub")?.Value;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Results.Problem("Category was modified by someone else.", statusCode: 409); }
        await cache.EvictByTagAsync("catalog", ct);
        return Results.Ok(new { id });
    }

    private static async Task<IResult> Items(string? search, int page, int pageSize, CatalogDbContext db, CancellationToken ct)
    {
        page = Math.Max(page, 1); pageSize = Math.Clamp(pageSize == 0 ? 20 : pageSize, 1, 200);
        var q = db.Items.AsNoTracking().Where(i => !i.IsDeleted);
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(i => i.Name.Contains(search));
        var total = await q.CountAsync(ct);
        var rows = await q.OrderBy(i => i.Name).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        return Results.Ok(new PagedResult<object>([.. rows.Select(i => (object)new
        {
            i.Id, i.Name, i.IsActive, RowVersion = Convert.ToBase64String(i.RowVersion),
        })], page, pageSize, total));
    }

    private static async Task<IResult> CreateItem(CreateItemRequest req, CatalogDbContext db,
        IOutputCacheStore cache, HttpContext ctx, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return Results.ValidationProblem(
            new Dictionary<string, string[]> { ["name"] = ["Name is required."] });
        if (await db.Items.AnyAsync(i => i.Name == req.Name.Trim() && !i.IsDeleted, ct))
            return Results.Problem("Item already exists.", statusCode: 409);
        var item = new Item { Id = Guid.NewGuid(), Name = req.Name.Trim(), CreatedBy = ctx.User.FindFirst("sub")?.Value };
        db.Items.Add(item);
        await db.SaveChangesAsync(ct);
        await cache.EvictByTagAsync("catalog", ct);
        return Results.Created($"/api/v1/admin/catalog/items/{item.Id}", new { id = item.Id });
    }

    private static async Task<IResult> UpdateItem(Guid id, UpdateItemRequest req,
        CatalogDbContext db, IOutputCacheStore cache, HttpContext ctx, CancellationToken ct)
    {
        var item = await db.Items.SingleOrDefaultAsync(i => i.Id == id && !i.IsDeleted, ct);
        if (item is null) return Results.NotFound();
        if (req.RowVersion is not null && Convert.ToBase64String(item.RowVersion) != req.RowVersion)
            return Results.Problem("Item was modified by someone else.", statusCode: 409);
        if (string.IsNullOrWhiteSpace(req.Name)) return Results.ValidationProblem(
            new Dictionary<string, string[]> { ["name"] = ["Name is required."] });
        item.Name = req.Name.Trim(); item.IsActive = req.IsActive;
        item.UpdatedBy = ctx.User.FindFirst("sub")?.Value;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Results.Problem("Item was modified by someone else.", statusCode: 409); }
        await cache.EvictByTagAsync("catalog", ct);
        return Results.Ok(new { id });
    }

    private static async Task<IResult> AddOns(CatalogDbContext db, CancellationToken ct)
    {
        var rows = await db.AddOns.AsNoTracking().OrderBy(a => a.Name).ToListAsync(ct);
        return Results.Ok(rows.Select(a => new
        {
            a.Id, a.Name, a.Description, a.PricingType, a.Price, a.Cost, a.IsActive,
            RowVersion = Convert.ToBase64String(a.RowVersion),
        }));
    }

    private static async Task<IResult> CreateAddOn(UpsertAddOnRequest req, IValidator<UpsertAddOnRequest> v,
        CatalogDbContext db, IOutputCacheStore cache, HttpContext ctx, CancellationToken ct)
    {
        var vr = await v.ValidateAsync(req, ct);
        if (!vr.IsValid) return Results.ValidationProblem(vr.ToDictionary());
        if (await db.AddOns.AnyAsync(a => a.Name == req.Name.Trim(), ct))
            return Results.Problem("Add-on already exists.", statusCode: 409);
        var a = new AddOn
        {
            Id = Guid.NewGuid(), Name = req.Name.Trim(), Description = req.Description,
            PricingType = req.PricingType, Price = req.Price, Cost = req.Cost, IsActive = req.IsActive,
            CreatedBy = ctx.User.FindFirst("sub")?.Value,
        };
        db.AddOns.Add(a);
        await db.SaveChangesAsync(ct);
        await cache.EvictByTagAsync("catalog", ct);
        return Results.Created($"/api/v1/admin/catalog/addons/{a.Id}", new { id = a.Id });
    }

    private static async Task<IResult> UpdateAddOn(Guid id, UpsertAddOnRequest req, IValidator<UpsertAddOnRequest> v,
        CatalogDbContext db, IOutputCacheStore cache, HttpContext ctx, CancellationToken ct)
    {
        var vr = await v.ValidateAsync(req, ct);
        if (!vr.IsValid) return Results.ValidationProblem(vr.ToDictionary());
        var a = await db.AddOns.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (a is null) return Results.NotFound();
        a.Name = req.Name.Trim(); a.Description = req.Description;
        a.PricingType = req.PricingType; a.Price = req.Price; a.Cost = req.Cost; a.IsActive = req.IsActive;
        a.UpdatedBy = ctx.User.FindFirst("sub")?.Value;
        await db.SaveChangesAsync(ct);
        await cache.EvictByTagAsync("catalog", ct);
        return Results.Ok(new { id });
    }

    private static string Slug(string s)
    {
        var sb = new System.Text.StringBuilder();
        foreach (var ch in s.ToLowerInvariant())
            if (char.IsLetterOrDigit(ch)) sb.Append(ch);
            else if (ch is ' ' or '/' or '-' or '_' or '.') sb.Append('-');
        var slug = sb.ToString();
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        return slug.Trim('-');
    }
}
