-- Per-head price variants, e.g. Royal Kacchi Chicken (+0, default) / Mutton (+80).
CREATE TABLE [catalog].[PackageVariants]
(
    [Id]                UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_PackageVariants_Id] DEFAULT (NEWID()),
    [PackageId]         UNIQUEIDENTIFIER NOT NULL,
    [Name]              NVARCHAR(128)    NOT NULL,
    [PriceDeltaPerHead] DECIMAL(12, 2)   NOT NULL CONSTRAINT [DF_PackageVariants_PriceDelta] DEFAULT (0),
    [CostDeltaPerHead]  DECIMAL(12, 2)   NOT NULL CONSTRAINT [DF_PackageVariants_CostDelta] DEFAULT (0),
    [IsDefault]         BIT              NOT NULL CONSTRAINT [DF_PackageVariants_Default] DEFAULT (0),
    CONSTRAINT [PK_PackageVariants] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_PackageVariants_Packages] FOREIGN KEY ([PackageId]) REFERENCES [catalog].[Packages] ([Id])
);
GO
CREATE INDEX [IX_PackageVariants_Package] ON [catalog].[PackageVariants] ([PackageId]);
GO
