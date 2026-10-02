using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;

namespace ZRC.SharedKernel;

/// <summary>Permission-based auth primitive. Code checks permissions, never role names.</summary>
public sealed record PermissionRequirement(string Permission) : IAuthorizationRequirement;

public static class PermissionEndpointExtensions
{
    public static TBuilder RequirePermission<TBuilder>(this TBuilder builder, string permission)
        where TBuilder : IEndpointConventionBuilder
        => builder.RequireAuthorization($"perm:{permission}");
}
