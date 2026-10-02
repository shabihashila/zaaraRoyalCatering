-- Role -> permission grants. SuperAdmin/Admin get everything; others are scoped.
-- Kitchen sees NO money; Sales sees sale prices only (enforced in API projections, not here).
MERGE INTO [identity].[RolePermissions] AS t
USING (
    SELECT r.[Id] AS RoleId, p.[Id] AS PermissionId
    FROM [identity].[Roles] r CROSS JOIN [identity].[Permissions] p
    WHERE r.[NormalizedName] IN (N'SUPERADMIN', N'ADMIN')
    UNION
    SELECT r.[Id], p.[Id] FROM [identity].[Roles] r
    JOIN [identity].[Permissions] p ON p.[Code] IN (
        N'catalog.category.view', N'catalog.package.view', N'catalog.costing.view',
        N'ordering.order.view', N'ordering.order.manage', N'ordering.pricing.view', N'ordering.kitchen.view',
        N'customers.view', N'customers.manage',
        N'engagement.inquiry.view', N'engagement.inquiry.manage', N'engagement.review.moderate',
        N'content.view', N'content.edit', N'reporting.view', N'nav.menu.view')
    WHERE r.[NormalizedName] = N'MANAGER'
    UNION
    SELECT r.[Id], p.[Id] FROM [identity].[Roles] r
    JOIN [identity].[Permissions] p ON p.[Code] IN (N'ordering.kitchen.view', N'ordering.order.view', N'nav.menu.view')
    WHERE r.[NormalizedName] = N'KITCHEN'
    UNION
    SELECT r.[Id], p.[Id] FROM [identity].[Roles] r
    JOIN [identity].[Permissions] p ON p.[Code] IN (
        N'catalog.category.view', N'catalog.package.view',
        N'ordering.order.view', N'ordering.order.manage', N'ordering.pricing.view',
        N'customers.view', N'customers.manage',
        N'engagement.inquiry.view', N'engagement.inquiry.manage', N'nav.menu.view')
    WHERE r.[NormalizedName] = N'SALES'
) AS s (RoleId, PermissionId)
ON t.[RoleId] = s.[RoleId] AND t.[PermissionId] = s.[PermissionId]
WHEN NOT MATCHED THEN INSERT ([RoleId], [PermissionId]) VALUES (s.[RoleId], s.[PermissionId]);
GO
-- Remove grants that are no longer in the desired set (idempotent re-seed).
DELETE t FROM [identity].[RolePermissions] t
WHERE NOT EXISTS (
    SELECT 1 FROM (
        SELECT r.[Id] AS RoleId, p.[Id] AS PermissionId
        FROM [identity].[Roles] r CROSS JOIN [identity].[Permissions] p
        WHERE r.[NormalizedName] IN (N'SUPERADMIN', N'ADMIN')
        UNION
        SELECT r.[Id], p.[Id] FROM [identity].[Roles] r
        JOIN [identity].[Permissions] p ON p.[Code] IN (
            N'catalog.category.view', N'catalog.package.view', N'catalog.costing.view',
            N'ordering.order.view', N'ordering.order.manage', N'ordering.pricing.view', N'ordering.kitchen.view',
            N'customers.view', N'customers.manage',
            N'engagement.inquiry.view', N'engagement.inquiry.manage', N'engagement.review.moderate',
            N'content.view', N'content.edit', N'reporting.view', N'nav.menu.view')
        WHERE r.[NormalizedName] = N'MANAGER'
        UNION
        SELECT r.[Id], p.[Id] FROM [identity].[Roles] r
        JOIN [identity].[Permissions] p ON p.[Code] IN (N'ordering.kitchen.view', N'ordering.order.view', N'nav.menu.view')
        WHERE r.[NormalizedName] = N'KITCHEN'
        UNION
        SELECT r.[Id], p.[Id] FROM [identity].[Roles] r
        JOIN [identity].[Permissions] p ON p.[Code] IN (
            N'catalog.category.view', N'catalog.package.view',
            N'ordering.order.view', N'ordering.order.manage', N'ordering.pricing.view',
            N'customers.view', N'customers.manage',
            N'engagement.inquiry.view', N'engagement.inquiry.manage', N'nav.menu.view')
        WHERE r.[NormalizedName] = N'SALES'
    ) d WHERE d.RoleId = t.RoleId AND d.PermissionId = t.PermissionId
)
AND EXISTS (SELECT 1 FROM [identity].[Roles] r WHERE r.[Id] = t.RoleId AND r.[NormalizedName] IN (N'MANAGER', N'KITCHEN', N'SALES'));
GO
