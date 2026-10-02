CREATE TABLE [catalog].[PackageInclusions]
(
    [Id]            UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_PackageInclusions_Id] DEFAULT (NEWID()),
    [PackageId]     UNIQUEIDENTIFIER NOT NULL,
    [Text]          NVARCHAR(512)    NOT NULL, -- display-only note, e.g. "Includes waiter service & cutlery"
    [SortOrder]     INT              NOT NULL CONSTRAINT [DF_PackageInclusions_Sort] DEFAULT (0),
    CONSTRAINT [PK_PackageInclusions] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_PackageInclusions_Packages] FOREIGN KEY ([PackageId]) REFERENCES [catalog].[Packages] ([Id])
);
GO
CREATE INDEX [IX_PackageInclusions_Package] ON [catalog].[PackageInclusions] ([PackageId]);
GO
