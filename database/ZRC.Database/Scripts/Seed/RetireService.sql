-- Remove the retired seeded service without affecting staff-created categories.
-- The stable legacy slug fingerprint works across independently seeded databases.
-- Never remove historical orders as part of a catalogue update.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @categories TABLE (Id UNIQUEIDENTIFIER PRIMARY KEY);
INSERT @categories SELECT Id FROM catalog.Categories
WHERE HASHBYTES('SHA2_256', Slug) = 0x5dca242857ad4391bfbc591418459f67049f9d00c6a010f2991cffd75da7ae02;
DECLARE @packages TABLE (Id UNIQUEIDENTIFIER PRIMARY KEY);
INSERT @packages SELECT Id FROM catalog.Packages WHERE CategoryId IN (SELECT Id FROM @categories);
IF EXISTS (SELECT 1 FROM ordering.Orders WHERE PackageId IN (SELECT Id FROM @packages))
    THROW 51000, 'Retired service has historical bookings. Review these records before removing the catalogue entries.', 1;
DECLARE @items TABLE (Id UNIQUEIDENTIFIER PRIMARY KEY);
INSERT @items SELECT DISTINCT ItemId FROM catalog.PackageItems WHERE PackageId IN (SELECT Id FROM @packages);
DELETE FROM catalog.PackageAddOns WHERE PackageId IN (SELECT Id FROM @packages);
DELETE FROM catalog.PackageVariants WHERE PackageId IN (SELECT Id FROM @packages);
DELETE FROM catalog.PackageInclusions WHERE PackageId IN (SELECT Id FROM @packages);
DELETE FROM catalog.PriceHistory WHERE PackageId IN (SELECT Id FROM @packages);
DELETE FROM catalog.PackageItems WHERE PackageId IN (SELECT Id FROM @packages);
DELETE FROM catalog.Packages WHERE Id IN (SELECT Id FROM @packages);
DELETE FROM catalog.Categories WHERE Id IN (SELECT Id FROM @categories);
DELETE FROM catalog.Items WHERE Id IN (SELECT Id FROM @items)
    AND NOT EXISTS (SELECT 1 FROM catalog.PackageItems WHERE ItemId = catalog.Items.Id);
COMMIT TRANSACTION;
GO
