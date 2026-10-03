// ZRC.SeedImporter — Phase 2: Excel -> Catalogue.sql + catalogue.json (database-first).
// Usage: dotnet run --project src/Tools/ZRC.SeedImporter -- [workbook] [output-sql] [output-json]
// Defaults resolve against the repo root (folder containing ZaraRoyalCatering.slnx).
// Rules: never hand-edit the generated SQL; re-run only when the owner sends an updated workbook.
// Fails loudly (exit 2) if any package total does not match the workbook.
using System.Globalization;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;

static string RepoRoot()
{
    var dir = new DirectoryInfo(AppContext.BaseDirectory);
    while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "ZaraRoyalCatering.slnx")))
        dir = dir.Parent;
    if (dir is null) throw new InvalidOperationException("Repo root (ZaraRoyalCatering.slnx) not found.");
    return dir.FullName;
}

if (args.Length == 1 && args[0] is "--help" or "-h")
{
    Console.WriteLine("Usage: dotnet run --project src/Tools/ZRC.SeedImporter -- [workbook] [output-sql] [output-json]");
    return 0;
}

var root = RepoRoot();
var workbookPath = args.Length > 0 ? args[0] : Path.Combine(root, "docs", "zaara_royal_catering_menu.xlsx");
var sqlPath = args.Length > 1 ? args[1] : Path.Combine(root, "database", "ZRC.Database", "Scripts", "Seed", "Catalogue.sql");
var jsonPath = args.Length > 2 ? args[2] : Path.Combine(root, "seed", "catalogue.json");

if (!File.Exists(workbookPath)) { Console.Error.WriteLine($"Workbook not found: {workbookPath}"); return 2; }

// ---- model ----
var itemRows = new List<(string Category, string Package, string Item, decimal Cost)>();
var packageRows = new List<(string Category, string Package, decimal Sale, decimal Total, string? Note)>();

using (var wb = new XLWorkbook(workbookPath))
{
    var detail = wb.Worksheets.FirstOrDefault(w => w.Name.Trim().Equals("Item Cost Detail", StringComparison.OrdinalIgnoreCase))
        ?? throw new InvalidOperationException("Sheet 'Item Cost Detail' missing.");
    var r = 1;
    while (true) // find header row
    {
        var h = detail.Cell(r, 1).GetValue<string>().Trim();
        if (h.Equals("Category", StringComparison.OrdinalIgnoreCase)) break;
        if (++r > 20) throw new InvalidOperationException("Header 'Category' not found in Item Cost Detail.");
    }
    r++;
    while (true)
    {
        var cat = detail.Cell(r, 1).GetValue<string>().Trim();
        var pkg = detail.Cell(r, 2).GetValue<string>().Trim();
        var item = detail.Cell(r, 3).GetValue<string>().Trim();
        var costRaw = detail.Cell(r, 4).GetValue<string>().Trim();
        if (cat == "" && pkg == "" && item == "") break; // end of data
        if (cat == "" || pkg == "" || item == "" || !decimal.TryParse(costRaw, NumberStyles.Any, CultureInfo.InvariantCulture, out var cost))
            throw new InvalidOperationException($"Bad item row {r} in Item Cost Detail.");
        itemRows.Add((cat, pkg, item, cost));
        r++;
    }

    var summary = wb.Worksheets.FirstOrDefault(w => w.Name.Trim().Equals("Package Summary", StringComparison.OrdinalIgnoreCase))
        ?? throw new InvalidOperationException("Sheet 'Package Summary' missing.");
    r = 1;
    while (true)
    {
        if (summary.Cell(r, 1).GetValue<string>().Trim().Equals("Category", StringComparison.OrdinalIgnoreCase)
            && summary.Cell(r, 2).GetValue<string>().Trim().Equals("Package", StringComparison.OrdinalIgnoreCase)) break;
        if (++r > 20) throw new InvalidOperationException("Header not found in Package Summary.");
    }
    r++;
    while (true)
    {
        var cat = summary.Cell(r, 1).GetValue<string>().Trim();
        var pkg = summary.Cell(r, 2).GetValue<string>().Trim();
        if (cat == "" && pkg == "") break; // blank separator before averages
        if (pkg == "") { r++; continue; } // category group header row
        var saleRaw = summary.Cell(r, 3).GetValue<string>().Trim();
        var totalRaw = summary.Cell(r, 4).GetValue<string>().Trim();
        var note = summary.Cell(r, 7).GetValue<string>().Trim();
        if (!decimal.TryParse(saleRaw, NumberStyles.Any, CultureInfo.InvariantCulture, out var sale)
            || !decimal.TryParse(totalRaw, NumberStyles.Any, CultureInfo.InvariantCulture, out var total))
            throw new InvalidOperationException($"Bad package row {r} in Package Summary.");
        packageRows.Add((cat, pkg, sale, total, note == "" ? null : note));
        r++;
    }
}

// Only the owner's current service catalogue is eligible for publishing.
string[] supportedCategories = ["Breakfast", "Lunch", "Dinner", "Corporate Program", "House Party"];
itemRows.RemoveAll(row => !supportedCategories.Contains(row.Category, StringComparer.Ordinal));
packageRows.RemoveAll(row => !supportedCategories.Contains(row.Category, StringComparer.Ordinal));

// ---- business rules from the workbook (guideline 2.3), keyed by exact package name ----
var minGuests = new Dictionary<string, int>(StringComparer.Ordinal) { ["Standard Buffet"] = 40 };
var taglines = new Dictionary<string, string>(StringComparer.Ordinal)
{
    ["Snacks / Tea Break Package"] = "Ideal for morning or afternoon meeting breaks",
    ["BBQ Night"] = "Outdoor setup & live chef service available (extra charges apply)",
};
var inclusions = new Dictionary<string, string[]>(StringComparer.Ordinal)
{
    ["Executive Buffet"] = ["Includes waiter service & cutlery"],
};
// Royal Kacchi: Chicken +0 (default) / Mutton +80 per head (workbook note).
var variants = new Dictionary<string, (string Name, decimal PriceDelta, bool IsDefault)[]>(StringComparer.Ordinal)
{
    ["Royal Kacchi"] = [("Chicken", 0m, true), ("Mutton", 80m, false)],
};

static string Slug(string s)
{
    var sb = new StringBuilder();
    foreach (var ch in s.ToLowerInvariant())
    {
        if (char.IsLetterOrDigit(ch)) sb.Append(ch);
        else if (ch is ' ' or '/' or '-' or '_' or '.') sb.Append('-');
        // drop '&' and anything else
    }
    var slug = sb.ToString();
    while (slug.Contains("--")) slug = slug.Replace("--", "-");
    return slug.Trim('-');
}

static string NormItem(string s) =>
    string.Join(" ", s.Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToUpperInvariant();

static string SqlStr(string s) => "N'" + s.Replace("'", "''") + "'";
static string Dec(decimal d) => d.ToString("0.00", CultureInfo.InvariantCulture);

// ---- validation: computed cost must equal the workbook Total Cost ----
var errors = new List<string>();
var byPackage = itemRows.GroupBy(x => (x.Category, x.Package)).ToDictionary(g => g.Key, g => g.ToList());
if (packageRows.Count != 16) errors.Add($"Expected 16 packages, found {packageRows.Count}.");
foreach (var p in packageRows)
{
    if (!byPackage.TryGetValue((p.Category, p.Package), out var items) || items.Count == 0)
    {
        errors.Add($"Package '{p.Package}' has no item rows.");
        continue;
    }
    var computed = items.Sum(i => i.Cost);
    if (computed != p.Total) errors.Add($"'{p.Package}': computed {computed} != workbook total {p.Total}.");
    if (p.Sale <= 0) errors.Add($"'{p.Package}': sale price must be > 0.");
    if (!minGuests.TryGetValue(p.Package, out var mg)) mg = 1;
    if (mg < 1) errors.Add($"'{p.Package}': MinGuests must be >= 1.");
}
var avgSale = packageRows.Count == 0 ? 0 : packageRows.Average(p => p.Sale);
var avgCost = packageRows.Count == 0 ? 0 : packageRows.Average(p => p.Total);
var avgProfit = avgSale - avgCost;
if (Math.Abs(avgSale - 336.25m) > 0.01m) errors.Add($"Avg sale {avgSale:F2} != 336.25.");
if (Math.Abs(avgCost - 196.56m) > 0.01m) errors.Add($"Avg cost {avgCost:F2} != 196.56.");
if (Math.Abs(avgProfit - 139.69m) > 0.01m) errors.Add($"Avg profit {avgProfit:F2} != 139.69.");
if (errors.Count > 0)
{
    Console.Error.WriteLine("SEED VALIDATION FAILED:");
    foreach (var e in errors) Console.Error.WriteLine(" - " + e);
    return 2;
}

// ---- build catalogue ----
var categories = packageRows.Select(p => p.Category).Distinct().ToList();
var catSlug = categories.ToDictionary(c => c, Slug);
var distinctItems = new List<(string Name, string Norm)>();
var itemSeen = new HashSet<string>(StringComparer.Ordinal);
foreach (var row in itemRows)
{
    var norm = NormItem(row.Item);
    if (itemSeen.Add(norm)) distinctItems.Add((row.Item.Trim(), norm));
}

// ---- Catalogue.sql ----
var sql = new StringBuilder();
sql.AppendLine("-- GENERATED by ZRC.SeedImporter. Do not hand-edit; re-run the importer on workbook updates.");
sql.AppendLine($"-- Source: docs/zaara_royal_catering_menu.xlsx ({itemRows.Count} item rows, {packageRows.Count} packages).");
sql.AppendLine("-- Idempotent: re-deploying changes nothing.");
sql.AppendLine();
sql.AppendLine("MERGE INTO [catalog].[Categories] AS t");
sql.AppendLine("USING (VALUES");
for (var i = 0; i < categories.Count; i++)
    sql.AppendLine($"    ({SqlStr(categories[i])}, {SqlStr(catSlug[categories[i]])}, {(i + 1) * 10}, 1){(i < categories.Count - 1 ? "," : "")}");
sql.AppendLine(") AS s ([Name], [Slug], [SortOrder], [IsActive])");
sql.AppendLine("ON t.[Name] = s.[Name]");
sql.AppendLine("WHEN MATCHED THEN UPDATE SET [Slug] = s.[Slug], [SortOrder] = s.[SortOrder], [IsActive] = s.[IsActive], [UpdatedAt] = SYSUTCDATETIME()");
sql.AppendLine("WHEN NOT MATCHED THEN INSERT ([Name], [Slug], [SortOrder], [IsActive]) VALUES (s.[Name], s.[Slug], s.[SortOrder], s.[IsActive]);");
sql.AppendLine("GO");
sql.AppendLine();
sql.AppendLine("MERGE INTO [catalog].[Items] AS t");
sql.AppendLine("USING (VALUES");
for (var i = 0; i < distinctItems.Count; i++)
    sql.AppendLine($"    ({SqlStr(distinctItems[i].Name)}, 1){(i < distinctItems.Count - 1 ? "," : "")}");
sql.AppendLine(") AS s ([Name], [IsActive])");
sql.AppendLine("ON t.[Name] = s.[Name]");
sql.AppendLine("WHEN MATCHED THEN UPDATE SET [IsActive] = s.[IsActive], [UpdatedAt] = SYSUTCDATETIME()");
sql.AppendLine("WHEN NOT MATCHED THEN INSERT ([Name], [IsActive]) VALUES (s.[Name], s.[IsActive]);");
sql.AppendLine("GO");
sql.AppendLine();
sql.AppendLine("MERGE INTO [catalog].[AddOns] AS t");
sql.AppendLine("USING (VALUES");
sql.AppendLine("    (N'Outdoor Setup', N'Outdoor setup for BBQ / house parties (admin must set price)', N'Flat', 0, 0, 0),");
sql.AppendLine("    (N'Live Chef Service', N'Live chef service for BBQ / house parties (admin must set price)', N'PerHead', 0, 0, 0)");
sql.AppendLine(") AS s ([Name], [Description], [PricingType], [Price], [Cost], [IsActive])");
sql.AppendLine("ON t.[Name] = s.[Name]");
sql.AppendLine("WHEN MATCHED THEN UPDATE SET [Description] = s.[Description], [PricingType] = s.[PricingType], [UpdatedAt] = SYSUTCDATETIME()");
sql.AppendLine("WHEN NOT MATCHED THEN INSERT ([Name], [Description], [PricingType], [Price], [Cost], [IsActive]) VALUES (s.[Name], s.[Description], s.[PricingType], s.[Price], s.[Cost], s.[IsActive]);");
sql.AppendLine("GO");
sql.AppendLine();
sql.AppendLine("MERGE INTO [catalog].[Packages] AS t");
sql.AppendLine("USING (VALUES");
for (var i = 0; i < packageRows.Count; i++)
{
    var p = packageRows[i];
    minGuests.TryGetValue(p.Package, out var mg);
    if (mg == 0) mg = 1;
    taglines.TryGetValue(p.Package, out var tag);
    sql.AppendLine($"    ({SqlStr(p.Category)}, {SqlStr(p.Package)}, {SqlStr(Slug(p.Category + "-" + p.Package))}, {(tag is null ? "NULL" : SqlStr(tag))}, {Dec(p.Sale)}, {mg}, {(i + 1) * 10}, 0, 1){(i < packageRows.Count - 1 ? "," : "")}");
}
sql.AppendLine(") AS s ([CategoryName], [Name], [Slug], [Tagline], [SalePricePerHead], [MinGuests], [SortOrder], [IsFeatured], [IsActive])");
sql.AppendLine("ON t.[Slug] = s.[Slug]");
sql.AppendLine("WHEN MATCHED THEN UPDATE SET [CategoryId] = (SELECT [Id] FROM [catalog].[Categories] WHERE [Name] = s.[CategoryName]),");
sql.AppendLine("    [Name] = s.[Name], [Tagline] = s.[Tagline], [SalePricePerHead] = s.[SalePricePerHead], [MinGuests] = s.[MinGuests],");
sql.AppendLine("    [SortOrder] = s.[SortOrder], [IsActive] = s.[IsActive], [UpdatedAt] = SYSUTCDATETIME()");
sql.AppendLine("WHEN NOT MATCHED THEN INSERT ([CategoryId], [Name], [Slug], [Tagline], [SalePricePerHead], [MinGuests], [SortOrder], [IsFeatured], [IsActive])");
sql.AppendLine("    VALUES ((SELECT [Id] FROM [catalog].[Categories] WHERE [Name] = s.[CategoryName]), s.[Name], s.[Slug], s.[Tagline], s.[SalePricePerHead], s.[MinGuests], s.[SortOrder], s.[IsFeatured], s.[IsActive]);");
sql.AppendLine("GO");

// Full-replace link tables (the file always carries the whole catalogue).
string PkgId(string slug) => $"(SELECT [Id] FROM [catalog].[Packages] WHERE [Slug] = {SqlStr(slug)})";
sql.AppendLine();
sql.AppendLine("-- PackageItems: full replace (cost lives on the link).");
sql.AppendLine("DELETE pi FROM [catalog].[PackageItems] pi");
sql.AppendLine($"JOIN [catalog].[Packages] p ON p.[Id] = pi.[PackageId] WHERE p.[Slug] IN ({string.Join(", ", packageRows.Select(p => SqlStr(Slug(p.Category + "-" + p.Package))))});");
var links = new List<string>();
foreach (var p in packageRows)
{
    var slug = Slug(p.Category + "-" + p.Package);
    var sort = 0;
    foreach (var it in byPackage[(p.Category, p.Package)])
    {
        sort += 10;
        links.Add($"    ({PkgId(slug)}, (SELECT [Id] FROM [catalog].[Items] WHERE [Name] = {SqlStr(it.Item.Trim())}), {Dec(it.Cost)}, {SqlStr(it.Item.Trim())}, {sort})");
    }
}
sql.AppendLine("INSERT INTO [catalog].[PackageItems] ([PackageId], [ItemId], [CostPerHead], [DisplayName], [SortOrder]) VALUES");
sql.AppendLine(string.Join(",\n", links) + ";");
sql.AppendLine("GO");
sql.AppendLine();
sql.AppendLine("-- PackageInclusions: full replace.");
sql.AppendLine("DELETE i FROM [catalog].[PackageInclusions] i");
sql.AppendLine($"JOIN [catalog].[Packages] p ON p.[Id] = i.[PackageId] WHERE p.[Slug] IN ({string.Join(", ", packageRows.Select(p => SqlStr(Slug(p.Category + "-" + p.Package))))});");
var incRows = new List<string>();
foreach (var p in packageRows)
    if (inclusions.TryGetValue(p.Package, out var texts))
        for (var k = 0; k < texts.Length; k++)
            incRows.Add($"    ({PkgId(Slug(p.Category + "-" + p.Package))}, {SqlStr(texts[k])}, {(k + 1) * 10})");
if (incRows.Count == 0) sql.AppendLine("-- (no inclusions in this catalogue)");
else
{
    sql.AppendLine("INSERT INTO [catalog].[PackageInclusions] ([PackageId], [Text], [SortOrder]) VALUES");
    sql.AppendLine(string.Join(",\n", incRows) + ";");
}
sql.AppendLine("GO");
sql.AppendLine();
sql.AppendLine("-- PackageVariants: full replace.");
sql.AppendLine("DELETE v FROM [catalog].[PackageVariants] v");
sql.AppendLine($"JOIN [catalog].[Packages] p ON p.[Id] = v.[PackageId] WHERE p.[Slug] IN ({string.Join(", ", packageRows.Select(p => SqlStr(Slug(p.Category + "-" + p.Package))))});");
var varRows = new List<string>();
foreach (var p in packageRows)
    if (variants.TryGetValue(p.Package, out var vv))
        foreach (var v in vv)
            varRows.Add($"    ({PkgId(Slug(p.Category + "-" + p.Package))}, {SqlStr(v.Name)}, {Dec(v.PriceDelta)}, 0, {(v.IsDefault ? 1 : 0)})");
if (varRows.Count == 0) sql.AppendLine("-- (no variants in this catalogue)");
else
{
    sql.AppendLine("INSERT INTO [catalog].[PackageVariants] ([PackageId], [Name], [PriceDeltaPerHead], [CostDeltaPerHead], [IsDefault]) VALUES");
    sql.AppendLine(string.Join(",\n", varRows) + ";");
}
sql.AppendLine("GO");
sql.AppendLine();
sql.AppendLine("-- PackageAddOns: full replace.");
sql.AppendLine("DELETE pa FROM [catalog].[PackageAddOns] pa");
sql.AppendLine($"JOIN [catalog].[Packages] p ON p.[Id] = pa.[PackageId] WHERE p.[Slug] IN ({string.Join(", ", packageRows.Select(p => SqlStr(Slug(p.Category + "-" + p.Package))))});");
sql.AppendLine("INSERT INTO [catalog].[PackageAddOns] ([PackageId], [AddOnId]) VALUES");
sql.AppendLine($"    ({PkgId(Slug("House Party-BBQ Night"))}, (SELECT [Id] FROM [catalog].[AddOns] WHERE [Name] = N'Outdoor Setup')),");
sql.AppendLine($"    ({PkgId(Slug("House Party-BBQ Night"))}, (SELECT [Id] FROM [catalog].[AddOns] WHERE [Name] = N'Live Chef Service'));");
sql.AppendLine("GO");
sql.AppendLine();

Directory.CreateDirectory(Path.GetDirectoryName(sqlPath)!);
await File.WriteAllTextAsync(sqlPath, sql.ToString(), new UTF8Encoding(false));

// ---- catalogue.json (reference) ----
var jsonPackages = packageRows.Select(p =>
{
    var slug = Slug(p.Category + "-" + p.Package);
    var items = byPackage[(p.Category, p.Package)];
    var cost = items.Sum(i => i.Cost);
    return new
    {
        category = p.Category,
        name = p.Package,
        slug,
        salePricePerHead = p.Sale,
        totalCost = cost,
        profit = p.Sale - cost,
        marginPct = p.Sale == 0 ? 0 : (p.Sale - cost) / p.Sale,
        minGuests = minGuests.TryGetValue(p.Package, out var mg) && mg != 0 ? mg : 1,
        tagline = taglines.TryGetValue(p.Package, out var t) ? t : null,
        workbookNote = p.Note,
        items = items.Select(i => new { item = i.Item.Trim(), costPerHead = i.Cost }).ToArray(),
        inclusions = inclusions.TryGetValue(p.Package, out var inc) ? inc : [],
        variants = variants.TryGetValue(p.Package, out var vv)
            ? vv.Select(v => new { name = v.Name, priceDeltaPerHead = v.PriceDelta, isDefault = v.IsDefault }).ToArray()
            : [],
    };
}).ToArray();
var doc = new
{
    generatedAt = DateTimeOffset.UtcNow,
    source = "docs/zaara_royal_catering_menu.xlsx",
    packageCount = packageRows.Count,
    itemRowCount = itemRows.Count,
    distinctItemCount = distinctItems.Count,
    averages = new { sale = Math.Round(avgSale, 2), cost = Math.Round(avgCost, 2), profit = Math.Round(avgProfit, 2) },
    categories = categories.Select((c, i) => new { name = c, slug = catSlug[c], sortOrder = (i + 1) * 10 }).ToArray(),
    packages = jsonPackages,
};
Directory.CreateDirectory(Path.GetDirectoryName(jsonPath)!);
await File.WriteAllTextAsync(jsonPath, JsonSerializer.Serialize(doc, new JsonSerializerOptions { WriteIndented = true }) + Environment.NewLine, new UTF8Encoding(false));

Console.WriteLine($"OK: {packageRows.Count} packages, {itemRows.Count} item rows, {distinctItems.Count} distinct items.");
Console.WriteLine($"Averages: sale {avgSale:F2} / cost {avgCost:F2} / profit {avgProfit:F2}.");
Console.WriteLine($"Wrote {sqlPath}");
Console.WriteLine($"Wrote {jsonPath}");
return 0;
