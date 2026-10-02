-- Admin/reporting only. NEVER expose through public endpoints (confidentiality rule).
CREATE VIEW [catalog].[vw_PackageCosting]
AS
SELECT
    p.[Id] AS [PackageId],
    p.[Name] AS [PackageName],
    p.[Slug] AS [PackageSlug],
    c.[Name] AS [CategoryName],
    p.[SalePricePerHead] AS [SalePricePerHead],
    ISNULL((
        SELECT SUM(pi.[CostPerHead])
        FROM [catalog].[PackageItems] pi
        WHERE pi.[PackageId] = p.[Id]
    ), 0) AS [TotalCost],
    p.[SalePricePerHead] - ISNULL((
        SELECT SUM(pi.[CostPerHead])
        FROM [catalog].[PackageItems] pi
        WHERE pi.[PackageId] = p.[Id]
    ), 0) AS [Profit],
    CASE
        WHEN p.[SalePricePerHead] = 0 THEN 0
        ELSE (p.[SalePricePerHead] - ISNULL((
            SELECT SUM(pi.[CostPerHead])
            FROM [catalog].[PackageItems] pi
            WHERE pi.[PackageId] = p.[Id]
        ), 0)) / p.[SalePricePerHead]
    END AS [MarginPct]
FROM [catalog].[Packages] p
JOIN [catalog].[Categories] c ON c.[Id] = p.[CategoryId]
WHERE p.[IsDeleted] = 0;
GO
