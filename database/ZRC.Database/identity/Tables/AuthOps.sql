CREATE TABLE [identity].[RefreshTokens]
(
    [Id]                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_RefreshTokens_Id] DEFAULT (NEWID()),
    [UserId]             NVARCHAR(450)    NOT NULL,
    [TokenHash]          NVARCHAR(256)    NOT NULL,
    [ExpiresAt]          DATETIME2(3)     NOT NULL,
    [CreatedAt]          DATETIME2(3)     NOT NULL CONSTRAINT [DF_RefreshTokens_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [CreatedByIp]        NVARCHAR(64)     NULL,
    [RevokedAt]          DATETIME2(3)     NULL,
    [RevokedByIp]        NVARCHAR(64)     NULL,
    [ReplacedByTokenHash] NVARCHAR(256)   NULL,
    CONSTRAINT [PK_RefreshTokens] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_RefreshTokens_Users] FOREIGN KEY ([UserId]) REFERENCES [identity].[Users] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [CK_RefreshTokens_Expiry] CHECK ([ExpiresAt] > [CreatedAt])
);
GO
CREATE UNIQUE INDEX [UX_RefreshTokens_TokenHash] ON [identity].[RefreshTokens] ([TokenHash]);
GO
CREATE INDEX [IX_RefreshTokens_UserId] ON [identity].[RefreshTokens] ([UserId], [ExpiresAt]);
GO

CREATE TABLE [identity].[AuditLogs]
(
    [Id]         BIGINT         IDENTITY(1,1) NOT NULL,
    [OccurredAt] DATETIME2(3)   NOT NULL CONSTRAINT [DF_AuditLogs_OccurredAt] DEFAULT (SYSUTCDATETIME()),
    [UserId]     NVARCHAR(450)  NULL,
    [Action]     NVARCHAR(128)  NOT NULL,
    [EntityType] NVARCHAR(256)  NULL,
    [EntityId]   NVARCHAR(128)  NULL,
    [BeforeJson] NVARCHAR(MAX)  NULL,
    [AfterJson]  NVARCHAR(MAX)  NULL,
    [IpAddress]  NVARCHAR(64)   NULL,
    CONSTRAINT [PK_AuditLogs] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO
CREATE INDEX [IX_AuditLogs_OccurredAt] ON [identity].[AuditLogs] ([OccurredAt] DESC);
GO
CREATE INDEX [IX_AuditLogs_Entity] ON [identity].[AuditLogs] ([EntityType], [EntityId]);
GO

-- Transactional outbox (single table; modules write via their DbContext).
CREATE TABLE [identity].[OutboxMessages]
(
    [Id]          UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Outbox_Id] DEFAULT (NEWID()),
    [EventType]   NVARCHAR(512)    NOT NULL,
    [Payload]     NVARCHAR(MAX)    NOT NULL,
    [OccurredAt]  DATETIME2(3)     NOT NULL CONSTRAINT [DF_Outbox_OccurredAt] DEFAULT (SYSUTCDATETIME()),
    [ProcessedAt] DATETIME2(3)     NULL,
    [Error]       NVARCHAR(MAX)    NULL,
    [CreatedAt]   DATETIME2(3)     NOT NULL CONSTRAINT [DF_Outbox_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_OutboxMessages] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO
CREATE INDEX [IX_Outbox_Unprocessed] ON [identity].[OutboxMessages] ([OccurredAt]) WHERE [ProcessedAt] IS NULL;
GO
