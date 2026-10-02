CREATE TABLE [nav].[MenuItems]
(
    [Id]                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_MenuItems_Id] DEFAULT (NEWID()),
    [ParentId]            UNIQUEIDENTIFIER NULL,
    [Key]                 NVARCHAR(128)    NOT NULL,
    [Label]               NVARCHAR(128)    NOT NULL,
    [LabelBn]             NVARCHAR(128)    NULL,
    [Icon]                NVARCHAR(128)    NULL, -- Font Awesome / PrimeIcons class
    [Route]               NVARCHAR(256)    NULL,
    [ExternalUrl]         NVARCHAR(512)    NULL,
    [RequiredPermission]  NVARCHAR(128)    NULL, -- NULL = visible to all authenticated staff
    [MenuArea]            NVARCHAR(16)     NOT NULL CONSTRAINT [DF_MenuItems_Area] DEFAULT ('Admin'),
    [SortOrder]           INT              NOT NULL CONSTRAINT [DF_MenuItems_Sort] DEFAULT (0),
    [IsVisible]           BIT              NOT NULL CONSTRAINT [DF_MenuItems_Visible] DEFAULT (1),
    [IsDeleted]           BIT              NOT NULL CONSTRAINT [DF_MenuItems_Deleted] DEFAULT (0),
    [CreatedAt]           DATETIME2(3)     NOT NULL CONSTRAINT [DF_MenuItems_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [CreatedBy]           NVARCHAR(128)    NULL,
    [UpdatedAt]           DATETIME2(3)     NOT NULL CONSTRAINT [DF_MenuItems_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedBy]           NVARCHAR(128)    NULL,
    [RowVersion]          ROWVERSION       NOT NULL,
    CONSTRAINT [PK_MenuItems] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_MenuItems_Parent] FOREIGN KEY ([ParentId]) REFERENCES [nav].[MenuItems] ([Id]),
    CONSTRAINT [CK_MenuItems_Area] CHECK ([MenuArea] IN ('Admin', 'Public')),
    CONSTRAINT [CK_MenuItems_Target] CHECK ([Route] IS NOT NULL OR [ExternalUrl] IS NOT NULL OR [ParentId] IS NULL)
);
GO
CREATE UNIQUE INDEX [UX_MenuItems_Key_Area] ON [nav].[MenuItems] ([Key], [MenuArea]) WHERE [IsDeleted] = 0;
GO
CREATE INDEX [IX_MenuItems_Parent_Sort] ON [nav].[MenuItems] ([ParentId], [SortOrder]) WHERE [IsDeleted] = 0;
GO
