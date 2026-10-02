CREATE TABLE [catalog].[AddOns]
(
    [Id]            UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_AddOns_Id] DEFAULT (NEWID()),
    [Name]          NVARCHAR(256)    NOT NULL,
    [Description]   NVARCHAR(512)    NULL,
    [PricingType]   NVARCHAR(16)     NOT NULL, -- Flat | PerHead
    [Price]         DECIMAL(12, 2)   NOT NULL,
    [Cost]          DECIMAL(12, 2)   NOT NULL CONSTRAINT [DF_AddOns_Cost] DEFAULT (0),
    [IsActive]      BIT              NOT NULL CONSTRAINT [DF_AddOns_Active] DEFAULT (1),
    [CreatedAt]     DATETIME2(3)     NOT NULL CONSTRAINT [DF_AddOns_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [CreatedBy]     NVARCHAR(128)    NULL,
    [UpdatedAt]     DATETIME2(3)     NOT NULL CONSTRAINT [DF_AddOns_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedBy]     NVARCHAR(128)    NULL,
    [RowVersion]    ROWVERSION       NOT NULL,
    CONSTRAINT [PK_AddOns] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK_AddOns_PricingType] CHECK ([PricingType] IN ('Flat', 'PerHead')),
    CONSTRAINT [CK_AddOns_Price_NonNegative] CHECK ([Price] >= 0),
    CONSTRAINT [CK_AddOns_Cost_NonNegative] CHECK ([Cost] >= 0)
);
GO
CREATE UNIQUE INDEX [UX_AddOns_Name] ON [catalog].[AddOns] ([Name]);
GO
