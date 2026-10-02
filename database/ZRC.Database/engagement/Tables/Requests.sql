CREATE TABLE [engagement].[Requests]
(
 [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Requests_Id] DEFAULT NEWID(),
 [Kind] NVARCHAR(20) NOT NULL, [Name] NVARCHAR(160) NOT NULL,
 [Email] NVARCHAR(254) NULL, [Phone] NVARCHAR(20) NULL,
 [Subject] NVARCHAR(160) NULL, [Message] NVARCHAR(4000) NOT NULL,
 [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Requests_Status] DEFAULT N'New',
 [StaffNotes] NVARCHAR(2000) NULL,
 [CreatedAt] DATETIME2(3) NOT NULL CONSTRAINT [DF_Requests_Created] DEFAULT SYSUTCDATETIME(),
 [CreatedBy] NVARCHAR(450) NULL, [UpdatedAt] DATETIME2(3) NULL, [UpdatedBy] NVARCHAR(450) NULL,
 [RowVersion] ROWVERSION NOT NULL,
 CONSTRAINT [PK_Requests] PRIMARY KEY ([Id]),
 CONSTRAINT [CK_Requests_Kind] CHECK ([Kind] IN (N'Inquiry',N'Contact',N'Newsletter')),
 CONSTRAINT [CK_Requests_Status] CHECK ([Status] IN (N'New',N'InProgress',N'Closed'))
);
