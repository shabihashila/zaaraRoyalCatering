CREATE VIEW [ordering].[vw_KitchenPrep] AS
SELECT o.EventDate, j.[name] AS ItemName, ISNULL(o.VariantName,N'Standard') AS VariantName,
 SUM(o.Guests) AS TotalHeads, COUNT_BIG(*) AS OrderCount
FROM [ordering].[Orders] o
CROSS APPLY OPENJSON(o.SnapshotJson,'$.items') WITH ([name] NVARCHAR(300) '$') j
WHERE o.[Status] IN (N'Confirmed',N'InPreparation')
GROUP BY o.EventDate, j.[name], o.VariantName;
