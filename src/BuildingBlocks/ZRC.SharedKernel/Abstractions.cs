using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ZRC.SharedKernel;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
    DateOnly TodayUtc();
}

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
    public DateOnly TodayUtc() => DateOnly.FromDateTime(DateTime.UtcNow);
}

public sealed record PagedQuery(int Page = 1, int PageSize = 20, string? Sort = null, string? Search = null)
{
    public int Skip => (Math.Max(Page, 1) - 1) * Math.Clamp(PageSize, 1, 200);
    public int Take => Math.Clamp(PageSize, 1, 200);
}

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, long TotalCount);

/// <summary>Every module exposes this. Host discovers and calls it.</summary>
public interface IModule
{
    void RegisterServices(IServiceCollection services, IConfiguration configuration);
    void MapEndpoints(IEndpointRouteBuilder endpoints);
}
