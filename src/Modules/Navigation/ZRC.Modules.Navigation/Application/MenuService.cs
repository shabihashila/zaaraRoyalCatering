using Microsoft.EntityFrameworkCore;
using Navigation.Domain.Entities.Generated;
using Navigation.Infrastructure.Persistence;

namespace ZRC.Modules.Navigation.Application;

public sealed record MenuItemDto(Guid Id, Guid? ParentId, string Key, string Label, string? LabelBn,
    string? Icon, string? Route, string? ExternalUrl, string? RequiredPermission, string MenuArea,
    int SortOrder, bool IsVisible, string RowVersion, List<MenuItemDto> Children);

public sealed class MenuService(NavigationDbContext db)
{
    public static MenuItemDto ToDto(MenuItem m, string? rowVersion = null) => new(
        m.Id, m.ParentId, m.Key, m.Label, m.LabelBn, m.Icon, m.Route, m.ExternalUrl,
        m.RequiredPermission, m.MenuArea, m.SortOrder, m.IsVisible,
        rowVersion ?? Convert.ToBase64String(m.RowVersion), []);

    /// <summary>Tree already filtered to the caller's permissions. Parents with no visible children are dropped.</summary>
    public async Task<List<MenuItemDto>> GetFilteredTreeAsync(HashSet<string> permissions, string area, CancellationToken ct)
    {
        var items = await db.MenuItems.AsNoTracking()
            .Where(m => !m.IsDeleted && m.IsVisible && m.MenuArea == area)
            .OrderBy(m => m.SortOrder).ToListAsync(ct);
        var allowed = items.Where(m => m.RequiredPermission == null || permissions.Contains(m.RequiredPermission)).ToList();
        var allowedIds = allowed.Select(m => m.Id).ToHashSet();
        // A child whose parent is not allowed is dropped too (no orphan promotion).
        var roots = BuildTree(allowed.Where(m => m.ParentId == null || !allowedIds.Contains(m.ParentId.Value)).ToList(), allowed);
        return roots;
    }

    public async Task<List<MenuItemDto>> GetFullTreeAsync(string area, CancellationToken ct)
    {
        var items = await db.MenuItems.AsNoTracking()
            .Where(m => !m.IsDeleted && m.MenuArea == area)
            .OrderBy(m => m.SortOrder).ToListAsync(ct);
        return BuildTree(items.Where(m => m.ParentId == null).ToList(), items);
    }

    private static List<MenuItemDto> BuildTree(List<MenuItem> roots, List<MenuItem> all)
    {
        var byParent = all.Where(m => m.ParentId != null)
            .GroupBy(m => m.ParentId!.Value)
            .ToDictionary(g => g.Key, g => g.OrderBy(m => m.SortOrder).ToList());
        // Returns null for grouping nodes left with no visible children and no link of their own.
        MenuItemDto? Recurse(MenuItem m)
        {
            var dto = ToDto(m);
            if (byParent.TryGetValue(m.Id, out var kids))
                foreach (var k in kids.OrderBy(x => x.SortOrder))
                {
                    var child = Recurse(k);
                    if (child is not null) dto.Children.Add(child);
                }
            if (dto.Children.Count == 0 && dto.Route == null && dto.ExternalUrl == null)
                return null;
            return dto;
        }
        var result = new List<MenuItemDto>();
        foreach (var r in roots.OrderBy(m => m.SortOrder))
        {
            var dto = Recurse(r);
            if (dto is not null) result.Add(dto);
        }
        return result;
    }
}
