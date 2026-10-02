namespace ZRC.Modules.Ordering;

public static class OrderStatuses
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string InPreparation = "InPreparation";
    public const string Dispatched = "Dispatched";
    public const string Delivered = "Delivered";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
    public const string Rejected = "Rejected";

    public static readonly IReadOnlyDictionary<string, string[]> Allowed = new Dictionary<string, string[]>
    {
        [Pending] = [Confirmed, Cancelled, Rejected],
        [Confirmed] = [InPreparation, Cancelled],
        [InPreparation] = [Dispatched],
        [Dispatched] = [Delivered],
        [Delivered] = [Completed],
        [Completed] = [],
        [Cancelled] = [],
        [Rejected] = [],
    };

    public static bool CanTransition(string from, string to)
        => Allowed.TryGetValue(from, out var next) && next.Contains(to);
}
