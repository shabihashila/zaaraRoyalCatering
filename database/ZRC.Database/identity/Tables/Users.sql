-- identity.Users mirrors ASP.NET Core Identity (no EF migrations; DDL is the truth).
CREATE TABLE [identity].[Users]
(
    [Id]                   NVARCHAR(450)  NOT NULL,
    [UserName]             NVARCHAR(256)  NULL,
    [NormalizedUserName]   NVARCHAR(256)  NULL,
    [Email]                NVARCHAR(256)  NULL,
    [NormalizedEmail]      NVARCHAR(256)  NULL,
    [EmailConfirmed]       BIT            NOT NULL CONSTRAINT [DF_Users_EmailConfirmed] DEFAULT (0),
    [PasswordHash]         NVARCHAR(MAX)  NULL,
    [SecurityStamp]        NVARCHAR(MAX)  NULL,
    [ConcurrencyStamp]     NVARCHAR(MAX)  NULL,
    [PhoneNumber]          NVARCHAR(32)   NULL,
    [PhoneNumberConfirmed] BIT            NOT NULL CONSTRAINT [DF_Users_PhoneConfirmed] DEFAULT (0),
    [TwoFactorEnabled]     BIT            NOT NULL CONSTRAINT [DF_Users_2FA] DEFAULT (0),
    [LockoutEnd]           DATETIMEOFFSET NULL,
    [LockoutEnabled]       BIT            NOT NULL CONSTRAINT [DF_Users_LockoutEnabled] DEFAULT (1),
    [AccessFailedCount]    INT            NOT NULL CONSTRAINT [DF_Users_AccessFailed] DEFAULT (0),
    [DisplayName]          NVARCHAR(128)  NULL,
    [IsStaff]              BIT            NOT NULL CONSTRAINT [DF_Users_IsStaff] DEFAULT (0),
    [IsActive]             BIT            NOT NULL CONSTRAINT [DF_Users_IsActive] DEFAULT (1),
    [CreatedAt]            DATETIME2(3)   NOT NULL CONSTRAINT [DF_Users_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [CreatedBy]            NVARCHAR(128)  NULL,
    [UpdatedAt]            DATETIME2(3)   NOT NULL CONSTRAINT [DF_Users_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedBy]            NVARCHAR(128)  NULL,
    [RowVersion]           ROWVERSION     NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO
CREATE UNIQUE INDEX [IX_Users_NormalizedUserName] ON [identity].[Users] ([NormalizedUserName]) WHERE [NormalizedUserName] IS NOT NULL;
GO
CREATE UNIQUE INDEX [IX_Users_NormalizedEmail] ON [identity].[Users] ([NormalizedEmail]) WHERE [NormalizedEmail] IS NOT NULL;
GO
