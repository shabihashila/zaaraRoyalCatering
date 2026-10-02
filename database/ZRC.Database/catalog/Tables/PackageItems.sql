-- Cost belongs to the package-item link: the same item costs different amounts in different packages.
CREATE TABLE [catalog].[PackageItems]
(
    [PackageId]     UNIQUEIDENTIFIER NOT NULL,
    [ItemId]        UNIQUEIDENTIFIER NOT NULL,
    [CostPerHead]   DECIMAL(12, 2)   NOT NULL, -- editable (yellow cells)
    [DisplayName]   NVARCHAR(256)    NULL,     -- e.g. "Paratha (2 pcs)"
    [SortOrder]     INT              NOT NULL CONSTRAINT [DF_PackageItems_Sort] DEFAULT (0),
    CONSTRAINT [PK_PackageItems] PRIMARY KEY CLUSTERED ([PackageId] ASC, [ItemId] ASC),
    CONSTRAINT [FK_PackageItems_Packages] FOREIGN KEY ([PackageId]) REFERENCES [catalog].[Packages] ([Id]),
    CONSTRAINT [FK_PackageItems_Items] FOREIGN KEY ([ItemId]) REFERENCES [catalog].[Items] ([Id]),
    CONSTRAINT [CK_PackageItems_Cost_NonNegative] CHECK ([CostPerHead] >= 0)
);
GO
CREATE INDEX [IX_PackageItems_Item] ON [catalog].[PackageItems] ([ItemId]);
GO
