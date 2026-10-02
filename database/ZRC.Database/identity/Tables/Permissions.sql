CREATE TABLE [identity].[Permissions]
(
    [Id]          INT            IDENTITY(1,1) NOT NULL,
    [Code]        NVARCHAR(128)  NOT NULL, -- e.g. catalog.package.edit
    [Module]      NVARCHAR(64)   NOT NULL,
    [Description] NVARCHAR(512)  NULL,
    [CreatedAt]   DATETIME2(3)   NOT NULL CONSTRAINT [DF_Permissions_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Permissions] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO
CREATE UNIQUE INDEX [UX_Permissions_Code] ON [identity].[Permissions] ([Code]);
GO
CREATE INDEX [IX_Permissions_Module] ON [identity].[Permissions] ([Module]);
GO
