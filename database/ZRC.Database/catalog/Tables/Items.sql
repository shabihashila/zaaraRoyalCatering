CREATE TABLE [catalog].[Items]
(
    [Id]            UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Items_Id] DEFAULT (NEWID()),
    [Name]          NVARCHAR(256)    NOT NULL, -- deduplicated by normalized name (importer-upserted)
    [NameBn]        NVARCHAR(256)    NULL,
    [Description]   NVARCHAR(512)    NULL,
    [IsVegetarian]  BIT              NOT NULL CONSTRAINT [DF_Items_Veg] DEFAULT (0),
    [Allergens]     NVARCHAR(256)    NULL,
    [ImageUrl]      NVARCHAR(512)    NULL,
    [IsActive]      BIT              NOT NULL CONSTRAINT [DF_Items_Active] DEFAULT (1),
    [IsDeleted]     BIT              NOT NULL CONSTRAINT [DF_Items_Deleted] DEFAULT (0),
    [CreatedAt]     DATETIME2(3)     NOT NULL CONSTRAINT [DF_Items_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [CreatedBy]     NVARCHAR(128)    NULL,
    [UpdatedAt]     DATETIME2(3)     NOT NULL CONSTRAINT [DF_Items_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedBy]     NVARCHAR(128)    NULL,
    [RowVersion]    ROWVERSION       NOT NULL,
    CONSTRAINT [PK_Items] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO
CREATE UNIQUE INDEX [UX_Items_Name] ON [catalog].[Items] ([Name]) WHERE [IsDeleted] = 0;
GO
