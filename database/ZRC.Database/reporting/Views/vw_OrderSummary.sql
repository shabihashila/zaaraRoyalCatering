CREATE VIEW [reporting].[vw_OrderSummary] AS
SELECT [Id], [OrderNo], [EventDate], [Status], [PackageName], [CategoryName], [Guests],
 [GrandTotal], [TotalCost], [GrandTotal]-[TotalCost] AS Profit,
 ISNULL((SELECT SUM(p.Amount) FROM [ordering].[Payments] p WHERE p.OrderId=o.Id),0) AS PaidAmount
FROM [ordering].[Orders] o;
