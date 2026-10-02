using System.Globalization;
using System.Text.RegularExpressions;

namespace ZRC.SharedKernel;

/// <summary>BDT money. Always decimal, never double. Rounding only for display.</summary>
public readonly record struct Money(decimal Amount, string Currency = "BDT")
{
    public static Money Bdt(decimal amount) => new(decimal.Round(amount, 2), "BDT");
    public static Money Zero => new(0m, "BDT");

    public static Money operator +(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return new(a.Amount + b.Amount, a.Currency);
    }

    public static Money operator *(Money m, int qty) => new(m.Amount * qty, m.Currency);
    public static Money operator *(Money m, decimal qty) => new(m.Amount * qty, m.Currency);

    private static void EnsureSameCurrency(Money a, Money b)
    {
        if (a.Currency != b.Currency) throw new InvalidOperationException("Currency mismatch.");
    }

    /// <summary>Format as ৳1,20,000 (configurable grouping; BD commonly uses en-IN grouping).</summary>
    public string Format(CultureInfo? culture = null)
    {
        culture ??= CultureInfo.GetCultureInfo("en-IN");
        return "৳" + Amount.ToString("N2", culture);
    }

    public override string ToString() => Format();
}

public readonly record struct Slug
{
    public string Value { get; }
    private Slug(string value) => Value = value;

    public static Result<Slug> Create(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return Result<Slug>.Failure("slug.empty", "Slug is required.");
        var s = input.Trim().ToLowerInvariant().Replace(' ', '-');
        s = Regex.Replace(s, @"[^a-z0-9\-]", string.Empty);
        s = Regex.Replace(s, @"-+", "-").Trim('-');
        if (s.Length == 0) return Result<Slug>.Failure("slug.invalid", "Slug is invalid.");
        return Result<Slug>.Success(new Slug(s));
    }

    public static Slug FromTrusted(string value) => new(value);
    public override string ToString() => Value;
    public static implicit operator string(Slug s) => s.Value;
}

public readonly record struct PhoneNumber
{
    public string Value { get; }
    private PhoneNumber(string value) => Value = value;

    /// <summary>BD mobile: 01XXXXXXXXX (11 digits).</summary>
    public static Result<PhoneNumber> Create(string input)
    {
        var digits = Regex.Replace(input ?? string.Empty, @"\D", string.Empty);
        if (digits.StartsWith("880")) digits = "0" + digits[3..];
        if (!Regex.IsMatch(digits, @"^01\d{9}$"))
            return Result<PhoneNumber>.Failure("phone.invalid", "Phone must be BD format 01XXXXXXXXX.");
        return Result<PhoneNumber>.Success(new PhoneNumber(digits));
    }

    public override string ToString() => Value;
    public static implicit operator string(PhoneNumber p) => p.Value;
}

public readonly record struct GuestCount
{
    public int Value { get; }
    private GuestCount(int value) => Value = value;

    public static Result<GuestCount> Create(int guests, int min = 1, int? max = null)
    {
        if (guests < min) return Result<GuestCount>.Failure("guests.min", $"At least {min} guests required.");
        if (max.HasValue && guests > max.Value)
            return Result<GuestCount>.Failure("guests.max", $"At most {max.Value} guests allowed.");
        return Result<GuestCount>.Success(new GuestCount(guests));
    }

    public static implicit operator int(GuestCount g) => g.Value;
}
