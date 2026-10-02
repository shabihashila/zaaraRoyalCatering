CREATE TABLE [ordering].[Payments]
(
 [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Payments_Id] DEFAULT NEWID(),
 [OrderId] UNIQUEIDENTIFIER NOT NULL, [Method] NVARCHAR(20) NOT NULL,
 [Amount] DECIMAL(12,2) NOT NULL, [Reference] NVARCHAR(120) NULL,
 [PaidAt] DATETIME2(3) NOT NULL CONSTRAINT [DF_Payments_Date] DEFAULT SYSUTCDATETIME(),
 [RecordedBy] NVARCHAR(450) NULL,
 CONSTRAINT [PK_Payments] PRIMARY KEY ([Id]),
 CONSTRAINT [FK_Payments_Order] FOREIGN KEY ([OrderId]) REFERENCES [ordering].[Orders]([Id]),
 CONSTRAINT [CK_Payments_Amount] CHECK ([Amount]>0),
 CONSTRAINT [CK_Payments_Method] CHECK ([Method] IN (N'Cash',N'bKash',N'Nagad',N'Bank',N'Card'))
);
