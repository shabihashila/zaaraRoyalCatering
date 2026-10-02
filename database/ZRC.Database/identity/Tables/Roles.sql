CREATE TABLE [identity].[Roles]
(
    [Id]               NVARCHAR(450) NOT NULL,
    [Name]             NVARCHAR(128) NOT NULL,
    [NormalizedName]   NVARCHAR(128) NULL,
    [ConcurrencyStamp] NVARCHAR(MAX)  NULL,
    [Description]      NVARCHAR(512) NULL,
    [IsSystem]         BIT           NOT NULL CONSTRAINT [DF_Roles_IsSystem] DEFAULT (0),
    [CreatedAt]        DATETIME2(3)  NOT NULL CONSTRAINT [DF_Roles_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [CreatedBy]        NVARCHAR(128) NULL,
    [UpdatedAt]        DATETIME2(3)  NOT NULL CONSTRAINT [DF_Roles_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedBy]        NVARCHAR(128) NULL,
    [RowVersion]       ROWVERSION    NOT NULL,
    CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO
CREATE UNIQUE INDEX [IX_Roles_NormalizedName] ON [identity].[Roles] ([NormalizedName]) WHERE [NormalizedName] IS NOT NULL;
GO
CREATE UNIQUE INDEX [UX_Roles_Name] ON [identity].[Roles] ([Name]);
GO
