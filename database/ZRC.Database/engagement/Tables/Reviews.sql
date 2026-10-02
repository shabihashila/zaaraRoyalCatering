CREATE TABLE [engagement].[Reviews]
(
 [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Reviews_Id] DEFAULT NEWID(),
 [AuthorName] NVARCHAR(160) NOT NULL, [Rating] INT NOT NULL,
 [Body] NVARCHAR(2000) NOT NULL, [EventType] NVARCHAR(160) NULL,
 [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Reviews_Status] DEFAULT N'Pending',
 [IsFeatured] BIT NOT NULL CONSTRAINT [DF_Reviews_Featured] DEFAULT 0,
 [CreatedAt] DATETIME2(3) NOT NULL CONSTRAINT [DF_Reviews_Created] DEFAULT SYSUTCDATETIME(),
 [CreatedBy] NVARCHAR(450) NULL, [UpdatedAt] DATETIME2(3) NULL, [UpdatedBy] NVARCHAR(450) NULL,
 [RowVersion] ROWVERSION NOT NULL,
 CONSTRAINT [PK_Reviews] PRIMARY KEY ([Id]),
 CONSTRAINT [CK_Reviews_Rating] CHECK ([Rating] BETWEEN 1 AND 5),
 CONSTRAINT [CK_Reviews_Status] CHECK ([Status] IN (N'Pending',N'Approved',N'Rejected')),
 CONSTRAINT [CK_Reviews_Feature] CHECK ([IsFeatured]=0 OR [Status]=N'Approved')
);
