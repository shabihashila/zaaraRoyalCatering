CREATE TABLE [ordering].[OrderStatusHistory]
(
 [Id] BIGINT IDENTITY NOT NULL, [OrderId] UNIQUEIDENTIFIER NOT NULL,
 [FromStatus] NVARCHAR(24) NULL, [ToStatus] NVARCHAR(24) NOT NULL, [Note] NVARCHAR(1000) NULL,
 [ChangedAt] DATETIME2(3) NOT NULL CONSTRAINT [DF_OrderStatusHistory_Date] DEFAULT SYSUTCDATETIME(),
 [ChangedBy] NVARCHAR(450) NULL,
 CONSTRAINT [PK_OrderStatusHistory] PRIMARY KEY ([Id]),
 CONSTRAINT [FK_OrderStatusHistory_Order] FOREIGN KEY ([OrderId]) REFERENCES [ordering].[Orders]([Id])
);
