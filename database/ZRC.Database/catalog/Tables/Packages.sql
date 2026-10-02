CREATE TABLE [catalog].[Packages]
(
    [Id]                UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Packages_Id] DEFAULT (NEWID()),
    [CategoryId]        UNIQUEIDENTIFIER NOT NULL,
    [Name]              NVARCHAR(256)    NOT NULL,
    [Slug]              NVARCHAR(256)    NOT NULL,
    [Tagline]           NVARCHAR(512)    NULL,
    [Description]       NVARCHAR(1024)   NULL,
    [SalePricePerHead]  DECIMAL(12, 2)   NOT NULL, -- editable (blue cells); cost is always derived
    [MinGuests]         INT              NOT NULL CONSTRAINT [DF_Packages_MinGuests] DEFAULT (1),
    [MaxGuests]         INT              NULL,
    [HeroImageUrl]      NVARCHAR(512)    NULL,
    [Model3DUrl]        NVARCHAR(512)    NULL,
    [SortOrder]         INT              NOT NULL CONSTRAINT [DF_Packages_Sort] DEFAULT (0),
    [IsFeatured]        BIT              NOT NULL CONSTRAINT [DF_Packages_Featured] DEFAULT (0),
    [IsActive]          BIT              NOT NULL CONSTRAINT [DF_Packages_Active] DEFAULT (1),
    [IsDeleted]         BIT              NOT NULL CONSTRAINT [DF_Packages_Deleted] DEFAULT (0),
    [CreatedAt]         DATETIME2(3)     NOT NULL CONSTRAINT [DF_Packages_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [CreatedBy]         NVARCHAR(128)    NULL,
    [UpdatedAt]         DATETIME2(3)     NOT NULL CONSTRAINT [DF_Packages_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedBy]         NVARCHAR(128)    NULL,
    [RowVersion]        ROWVERSION       NOT NULL,
    CONSTRAINT [PK_Packages] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Packages_Categories] FOREIGN KEY ([CategoryId]) REFERENCES [catalog].[Categories] ([Id]),
    CONSTRAINT [CK_Packages_SalePrice_Positive] CHECK ([SalePricePerHead] > 0),
    CONSTRAINT [CK_Packages_Guests] CHECK ([MinGuests] >= 1 AND ([MaxGuests] IS NULL OR [MaxGuests] >= [MinGuests]))
);
GO
CREATE UNIQUE INDEX [UX_Packages_Slug] ON [catalog].[Packages] ([Slug]) WHERE [IsDeleted] = 0;
GO
CREATE INDEX [IX_Packages_Category] ON [catalog].[Packages] ([CategoryId]) WHERE [IsDeleted] = 0;
GO
