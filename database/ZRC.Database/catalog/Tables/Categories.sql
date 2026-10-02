CREATE TABLE [catalog].[Categories]
(
    [Id]            UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Categories_Id] DEFAULT (NEWID()),
    [Name]          NVARCHAR(128)    NOT NULL,
    [Slug]          NVARCHAR(128)    NOT NULL,
    [Description]   NVARCHAR(512)    NULL,
    [ImageUrl]      NVARCHAR(512)    NULL,
    [SortOrder]     INT              NOT NULL CONSTRAINT [DF_Categories_Sort] DEFAULT (0),
    [IsActive]      BIT              NOT NULL CONSTRAINT [DF_Categories_Active] DEFAULT (1),
    [IsDeleted]     BIT              NOT NULL CONSTRAINT [DF_Categories_Deleted] DEFAULT (0),
    [CreatedAt]     DATETIME2(3)     NOT NULL CONSTRAINT [DF_Categories_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [CreatedBy]     NVARCHAR(128)    NULL,
    [UpdatedAt]     DATETIME2(3)     NOT NULL CONSTRAINT [DF_Categories_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedBy]     NVARCHAR(128)    NULL,
    [RowVersion]    ROWVERSION       NOT NULL,
    CONSTRAINT [PK_Categories] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO
CREATE UNIQUE INDEX [UX_Categories_Slug] ON [catalog].[Categories] ([Slug]) WHERE [IsDeleted] = 0;
GO
CREATE UNIQUE INDEX [UX_Categories_Name] ON [catalog].[Categories] ([Name]) WHERE [IsDeleted] = 0;
GO
