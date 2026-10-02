CREATE TABLE [identity].[RolePermissions]
(
    [RoleId]       NVARCHAR(450) NOT NULL,
    [PermissionId] INT           NOT NULL,
    [GrantedAt]    DATETIME2(3)  NOT NULL CONSTRAINT [DF_RolePermissions_GrantedAt] DEFAULT (SYSUTCDATETIME()),
    [GrantedBy]    NVARCHAR(128) NULL,
    CONSTRAINT [PK_RolePermissions] PRIMARY KEY CLUSTERED ([RoleId] ASC, [PermissionId] ASC),
    CONSTRAINT [FK_RolePermissions_Roles] FOREIGN KEY ([RoleId]) REFERENCES [identity].[Roles] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RolePermissions_Permissions] FOREIGN KEY ([PermissionId]) REFERENCES [identity].[Permissions] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [identity].[UserRoles]
(
    [UserId]     NVARCHAR(450) NOT NULL,
    [RoleId]     NVARCHAR(450) NOT NULL,
    [AssignedAt] DATETIME2(3)  NOT NULL CONSTRAINT [DF_UserRoles_AssignedAt] DEFAULT (SYSUTCDATETIME()),
    [AssignedBy] NVARCHAR(128) NULL,
    CONSTRAINT [PK_UserRoles] PRIMARY KEY CLUSTERED ([UserId] ASC, [RoleId] ASC),
    CONSTRAINT [FK_UserRoles_Users] FOREIGN KEY ([UserId]) REFERENCES [identity].[Users] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserRoles_Roles] FOREIGN KEY ([RoleId]) REFERENCES [identity].[Roles] ([Id]) ON DELETE CASCADE
);
GO
