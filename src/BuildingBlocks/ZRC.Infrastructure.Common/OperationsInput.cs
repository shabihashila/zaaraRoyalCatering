using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace ZRC.Infrastructure.Common;

public static class OperationsInput
{
    public static bool Text(string? value, int max) => !string.IsNullOrWhiteSpace(value) && value.Trim().Length <= max;
    public static bool Optional(string? value, int max) => value is null || value.Length <= max;
    public static string Phone(string? value) => Regex.Replace(value ?? "", @"[\s()-]", "").Replace("+880", "0");
    public static bool ValidPhone(string? value) => Regex.IsMatch(Phone(value), @"^01[3-9]\d{8}$");
    public static bool Version(DbContext db, object entity, string? version)
    {
        try
        {
            var bytes = Convert.FromBase64String(version ?? "");
            if (bytes.Length != 8) return false;
            db.Entry(entity).Property("RowVersion").OriginalValue = bytes;
            return true;
        }
        catch (FormatException) { return false; }
    }
}
