CREATE TABLE [catalog].[PackageAddOns]
(
    [PackageId]     UNIQUEIDENTIFIER NOT NULL,
    [AddOnId]       UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_PackageAddOns] PRIMARY KEY CLUSTERED ([PackageId] ASC, [AddOnId] ASC),
    CONSTRAINT [FK_PackageAddOns_Packages] FOREIGN KEY ([PackageId]) REFERENCES [catalog].[Packages] ([Id]),
    CONSTRAINT [FK_PackageAddOns_AddOns] FOREIGN KEY ([AddOnId]) REFERENCES [catalog].[AddOns] ([Id])
);
GO
