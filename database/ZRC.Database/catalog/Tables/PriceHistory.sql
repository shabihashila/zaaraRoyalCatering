CREATE TABLE [catalog].[PriceHistory]
(
    [Id]            BIGINT           IDENTITY(1, 1) NOT NULL,
    [PackageId]     UNIQUEIDENTIFIER NOT NULL,
    [OldPrice]      DECIMAL(12, 2)   NOT NULL,
    [NewPrice]      DECIMAL(12, 2)   NOT NULL,
    [ChangedAt]     DATETIME2(3)     NOT NULL CONSTRAINT [DF_PriceHistory_ChangedAt] DEFAULT (SYSUTCDATETIME()),
    [ChangedBy]     NVARCHAR(128)    NULL,
    CONSTRAINT [PK_PriceHistory] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_PriceHistory_Packages] FOREIGN KEY ([PackageId]) REFERENCES [catalog].[Packages] ([Id]),
    CONSTRAINT [CK_PriceHistory_Prices_Positive] CHECK ([OldPrice] > 0 AND [NewPrice] > 0)
);
GO
CREATE INDEX [IX_PriceHistory_Package] ON [catalog].[PriceHistory] ([PackageId]);
GO
