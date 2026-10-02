-- Standard Identity support tables (claims/logins/tokens/role-claims).
CREATE TABLE [identity].[UserClaims]
(
    [Id]         INT            IDENTITY(1,1) NOT NULL,
    [UserId]     NVARCHAR(450)  NOT NULL,
    [ClaimType]  NVARCHAR(MAX)  NULL,
    [ClaimValue] NVARCHAR(MAX)  NULL,
    CONSTRAINT [PK_UserClaims] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_UserClaims_Users] FOREIGN KEY ([UserId]) REFERENCES [identity].[Users] ([Id]) ON DELETE CASCADE
);
GO
CREATE INDEX [IX_UserClaims_UserId] ON [identity].[UserClaims] ([UserId]);
GO

CREATE TABLE [identity].[UserLogins]
(
    [LoginProvider]       NVARCHAR(128) NOT NULL,
    [ProviderKey]         NVARCHAR(450) NOT NULL,
    [ProviderDisplayName] NVARCHAR(MAX) NULL,
    [UserId]              NVARCHAR(450) NOT NULL,
    CONSTRAINT [PK_UserLogins] PRIMARY KEY CLUSTERED ([LoginProvider] ASC, [ProviderKey] ASC),
    CONSTRAINT [FK_UserLogins_Users] FOREIGN KEY ([UserId]) REFERENCES [identity].[Users] ([Id]) ON DELETE CASCADE
);
GO
CREATE INDEX [IX_UserLogins_UserId] ON [identity].[UserLogins] ([UserId]);
GO

CREATE TABLE [identity].[UserTokens]
(
    [UserId]        NVARCHAR(450) NOT NULL,
    [LoginProvider] NVARCHAR(128) NOT NULL,
    [Name]          NVARCHAR(128) NOT NULL,
    [Value]         NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_UserTokens] PRIMARY KEY CLUSTERED ([UserId] ASC, [LoginProvider] ASC, [Name] ASC),
    CONSTRAINT [FK_UserTokens_Users] FOREIGN KEY ([UserId]) REFERENCES [identity].[Users] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [identity].[RoleClaims]
(
    [Id]         INT           IDENTITY(1,1) NOT NULL,
    [RoleId]     NVARCHAR(450) NOT NULL,
    [ClaimType]  NVARCHAR(MAX) NULL,
    [ClaimValue] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_RoleClaims] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_RoleClaims_Roles] FOREIGN KEY ([RoleId]) REFERENCES [identity].[Roles] ([Id]) ON DELETE CASCADE
);
GO
CREATE INDEX [IX_RoleClaims_RoleId] ON [identity].[RoleClaims] ([RoleId]);
GO
