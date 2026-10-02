namespace ZRC.Modules.Identity.Contracts;

/// <summary>Server-side role -&gt; permission resolution. JWT carries roles; the API enforces permissions.</summary>
public interface IPermissionService
{
    Task<HashSet<string>> GetUserPermissionsAsync(string userId, CancellationToken ct = default);
    Task<IList<string>> GetUserRolesAsync(string userId, CancellationToken ct = default);
    void Invalidate(string userId);
    void InvalidateAll();
}
