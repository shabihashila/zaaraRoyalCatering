using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Identity.Domain.Entities.Generated;
using Identity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using ZRC.Modules.Identity.Domain;
using ZRC.SharedKernel;

namespace ZRC.Modules.Identity.Application;

public sealed record JwtOptions(string Key, string Issuer, string Audience, int AccessTokenMinutes, int RefreshTokenDays)
{
    public static JwtOptions FromConfig(IConfiguration cfg) => new(
        cfg["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured (user-secrets or env)."),
        cfg["Jwt:Issuer"] ?? "zrc",
        cfg["Jwt:Audience"] ?? "zrc-web",
        int.TryParse(cfg["Jwt:AccessTokenMinutes"], out var m) ? m : 15,
        int.TryParse(cfg["Jwt:RefreshTokenDays"], out var d) ? d : 7);
}

public sealed class TokenService(
    JwtOptions jwt, IdentityDbContext db, IClock clock, ILogger<TokenService> log)
{
    public (string AccessToken, DateTimeOffset ExpiresAt) CreateAccessToken(ZrcUser user, IList<string> roles)
    {
        var now = clock.UtcNow;
        var expires = now.AddMinutes(jwt.AccessTokenMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, user.DisplayName ?? user.UserName ?? user.Email ?? user.Id),
        };
        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(jwt.Issuer, jwt.Audience, claims,
            notBefore: now.UtcDateTime, expires: expires.UtcDateTime, signingCredentials: creds);
        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    public static string NewRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public async Task<(Guid Id, string Raw, DateTimeOffset ExpiresAt)> IssueRefreshAsync(string userId, string? ip, CancellationToken ct)
    {
        var raw = NewRefreshToken();
        var expires = clock.UtcNow.AddDays(jwt.RefreshTokenDays);
        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = Hash(raw), // only the hash is stored
            ExpiresAt = expires.UtcDateTime,
            CreatedAt = clock.UtcNow.UtcDateTime,
            CreatedByIp = ip,
        });
        await db.SaveChangesAsync(ct);
        log.LogInformation("Refresh issued for {UserId}", userId);
        return (Guid.NewGuid(), raw, expires);
    }

    public async Task<Result<(string UserId, string Raw, DateTimeOffset ExpiresAt)>> RotateAsync(string raw, string? ip, CancellationToken ct)
    {
        var hash = Hash(raw);
        var current = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (current is null) return Result<(string, string, DateTimeOffset)>.Failure("auth.refresh.invalid", "Invalid refresh token.");
        if (current.RevokedAt is not null)
        {
            await RevokeFamilyAsync(current.UserId, "reuse-detected", ct); // reuse attack: kill family
            log.LogWarning("Refresh reuse detected for {UserId}", current.UserId);
            return Result<(string, string, DateTimeOffset)>.Failure("auth.refresh.reused", "Refresh token reused.");
        }
        if (current.ExpiresAt <= clock.UtcNow.UtcDateTime)
            return Result<(string, string, DateTimeOffset)>.Failure("auth.refresh.expired", "Refresh token expired.");

        var nextRaw = NewRefreshToken();
        var nextExpires = clock.UtcNow.AddDays(jwt.RefreshTokenDays);
        current.RevokedAt = clock.UtcNow.UtcDateTime;
        current.RevokedByIp = ip;
        var next = new RefreshToken
        {
            Id = Guid.NewGuid(), UserId = current.UserId, TokenHash = Hash(nextRaw),
            ExpiresAt = nextExpires.UtcDateTime,
            CreatedAt = clock.UtcNow.UtcDateTime, CreatedByIp = ip,
        };
        current.ReplacedByTokenHash = next.TokenHash;
        db.RefreshTokens.Add(next);
        await db.SaveChangesAsync(ct);
        return Result<(string, string, DateTimeOffset)>.Success((current.UserId, nextRaw, nextExpires));
    }

    public async Task RevokeAsync(string raw, string? ip, CancellationToken ct)
    {
        var current = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == Hash(raw), ct);
        if (current is not null && current.RevokedAt is null)
        {
            current.RevokedAt = clock.UtcNow.UtcDateTime;
            current.RevokedByIp = ip;
            await db.SaveChangesAsync(ct);
        }
    }

    private async Task RevokeFamilyAsync(string userId, string reason, CancellationToken ct)
    {
        var active = await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null).ToListAsync(ct);
        foreach (var t in active) { t.RevokedAt = clock.UtcNow.UtcDateTime; t.RevokedByIp = reason; }
        await db.SaveChangesAsync(ct);
    }
}
