-- Seeded roles (bags of permissions; code checks permissions, never role names).
MERGE INTO [identity].[Roles] AS t
USING (VALUES
    (N'SuperAdmin', N'SUPERADMIN', N'Full system access incl. roles/permissions/menu', 1),
    (N'Admin',      N'ADMIN',      N'Owner: everything except system settings; sees costing', 0),
    (N'Manager',    N'MANAGER',    N'Orders/customers/inquiries/reviews/content; sees costing', 0),
    (N'Kitchen',    N'KITCHEN',    N'Prep sheet + status to InPreparation/Dispatched; no money', 0),
    (N'Sales',      N'SALES',      N'Orders on behalf of customers + inquiries; sale prices only', 0),
    (N'Customer',   N'CUSTOMER',   N'Public + customer endpoints only', 0)
) AS s ([Name], [NormalizedName], [Description], [IsSystem])
ON t.[NormalizedName] = s.[NormalizedName]
WHEN MATCHED THEN UPDATE SET [Name] = s.[Name], [Description] = s.[Description], [IsSystem] = s.[IsSystem], [UpdatedAt] = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT ([Id], [Name], [NormalizedName], [Description], [IsSystem]) VALUES (NEWID(), s.[Name], s.[NormalizedName], s.[Description], s.[IsSystem]);
GO
