CREATE TABLE [ordering].[Orders]
(
 [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Orders_Id] DEFAULT NEWID(),
 [OrderNo] NVARCHAR(40) NOT NULL,
 [CustomerId] UNIQUEIDENTIFIER NULL,
 [UserId] NVARCHAR(450) NULL,
 [ContactName] NVARCHAR(160) NOT NULL, [ContactPhone] NVARCHAR(20) NOT NULL,
 [PackageId] UNIQUEIDENTIFIER NOT NULL, [PackageName] NVARCHAR(160) NOT NULL,
 [CategoryName] NVARCHAR(160) NOT NULL, [VariantName] NVARCHAR(160) NULL,
 [Guests] INT NOT NULL, [EventDate] DATE NOT NULL, [EventTime] TIME(0) NOT NULL,
 [EventType] NVARCHAR(160) NOT NULL, [VenueAddress] NVARCHAR(1000) NOT NULL,
 [SpecialInstructions] NVARCHAR(2000) NULL,
 [Status] NVARCHAR(24) NOT NULL CONSTRAINT [DF_Orders_Status] DEFAULT N'Pending',
 [UnitPricePerHead] DECIMAL(12,2) NOT NULL, [UnitCostPerHead] DECIMAL(12,2) NOT NULL,
 [SubTotal] DECIMAL(12,2) NOT NULL, [AddOnTotal] DECIMAL(12,2) NOT NULL,
 [DeliveryCharge] DECIMAL(12,2) NOT NULL, [Discount] DECIMAL(12,2) NOT NULL,
 [GrandTotal] DECIMAL(12,2) NOT NULL, [TotalCost] DECIMAL(12,2) NOT NULL,
 [SnapshotJson] NVARCHAR(MAX) NOT NULL,
 [CreatedAt] DATETIME2(3) NOT NULL CONSTRAINT [DF_Orders_Created] DEFAULT SYSUTCDATETIME(),
 [CreatedBy] NVARCHAR(450) NULL, [UpdatedAt] DATETIME2(3) NULL, [UpdatedBy] NVARCHAR(450) NULL,
 [RowVersion] ROWVERSION NOT NULL,
 CONSTRAINT [PK_Orders] PRIMARY KEY ([Id]),
 CONSTRAINT [FK_Orders_Customers] FOREIGN KEY ([CustomerId]) REFERENCES [customers].[Customers]([Id]),
 CONSTRAINT [CK_Orders_Guests] CHECK ([Guests] BETWEEN 1 AND 100000),
 CONSTRAINT [CK_Orders_Status] CHECK ([Status] IN (N'Pending',N'Confirmed',N'InPreparation',N'Dispatched',N'Delivered',N'Completed',N'Cancelled',N'Rejected')),
 CONSTRAINT [CK_Orders_Money] CHECK ([UnitPricePerHead]>0 AND [UnitCostPerHead]>=0 AND [SubTotal]>0 AND [AddOnTotal]>=0 AND [DeliveryCharge]>=0 AND [Discount]>=0 AND [GrandTotal]>0 AND [TotalCost]>=0 AND [GrandTotal]=[SubTotal]+[AddOnTotal]+[DeliveryCharge]-[Discount]),
 CONSTRAINT [CK_Orders_Snapshot] CHECK (ISJSON([SnapshotJson])=1)
);
GO
CREATE UNIQUE INDEX [UX_Orders_Number] ON [ordering].[Orders]([OrderNo]);
GO
CREATE INDEX [IX_Orders_EventDate] ON [ordering].[Orders]([EventDate],[Status]);
GO
CREATE INDEX [IX_Orders_Customer] ON [ordering].[Orders]([CustomerId]);
