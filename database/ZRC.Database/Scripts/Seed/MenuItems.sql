-- Admin sidebar seed (Phase 0 keys; screens arrive in later phases but keys stay stable).
MERGE INTO [nav].[MenuItems] AS t
USING (VALUES
    (N'dashboard',          NULL,                N'Dashboard',        N'fa-solid fa-gauge',            N'/admin',                              NULL,                            N'Admin', 10, 1),
    (N'orders',             NULL,                N'Orders',           N'fa-solid fa-receipt',           NULL,                                   N'ordering.order.view',        N'Admin', 20, 1),
    (N'orders.all',         N'orders',           N'All Orders',       N'fa-solid fa-list',              N'/admin/orders',                       N'ordering.order.view',        N'Admin', 21, 1),
    (N'orders.calendar',    N'orders',           N'Calendar',         N'fa-solid fa-calendar-days',     N'/admin/orders/calendar',              N'ordering.order.view',        N'Admin', 22, 1),
    (N'orders.kitchen',     N'orders',           N'Kitchen Prep',     N'fa-solid fa-kitchen-set',       N'/admin/orders/kitchen',               N'ordering.kitchen.view',      N'Admin', 23, 1),
    (N'catalog',            NULL,                N'Catalog',          N'fa-solid fa-book-open',         NULL,                                   N'catalog.package.view',       N'Admin', 30, 1),
    (N'catalog.packages',   N'catalog',          N'Packages',         N'fa-solid fa-box-open',          N'/admin/catalog/packages',             N'catalog.package.view',       N'Admin', 31, 1),
    (N'catalog.costing',    N'catalog',          N'Costing & Margins',N'fa-solid fa-calculator',        N'/admin/catalog/costing',              N'catalog.costing.view',       N'Admin', 32, 1),
    (N'customers',          NULL,                N'Customers',        N'fa-solid fa-users',             N'/admin/customers',                    N'customers.view',             N'Admin', 40, 1),
    (N'engagement',         NULL,                N'Engagement',       N'fa-solid fa-comments',          NULL,                                   N'engagement.inquiry.view',    N'Admin', 50, 1),
    (N'engagement.reviews', N'engagement',       N'Reviews',          N'fa-solid fa-star',              N'/admin/engagement/reviews',           N'engagement.review.moderate',N'Admin', 51, 1),
    (N'engagement.inbox',   N'engagement',       N'Customer Inbox',   N'fa-solid fa-comments',          N'/admin/engagement/requests',          N'engagement.inquiry.view',   N'Admin', 52, 1),
    (N'content',            NULL,                N'Website Content',  N'fa-solid fa-pen-to-square',     N'/admin/content',                      N'content.view',               N'Admin', 60, 1),
    (N'reports',            NULL,                N'Reports',          N'fa-solid fa-chart-line',        N'/admin/reports',                      N'reporting.view',             N'Admin', 70, 1),
    (N'admin',              NULL,                N'Administration',   N'fa-solid fa-gear',              NULL,                                   N'identity.user.view',         N'Admin', 80, 1),
    (N'admin.menu',         N'admin',            N'Menu Management',  N'fa-solid fa-bars',              N'/admin/menu',                         N'nav.menu.manage',            N'Admin', 81, 1),
    (N'admin.audit',        N'admin',            N'Audit Log',        N'fa-solid fa-clock-rotate-left', N'/admin/audit',                        N'identity.audit.view',        N'Admin', 82, 1)
) AS s ([Key], [ParentKey], [Label], [Icon], [Route], [RequiredPermission], [MenuArea], [SortOrder], [IsVisible])
ON t.[Key] = s.[Key] AND t.[MenuArea] = s.[MenuArea]
WHEN MATCHED THEN UPDATE SET [Label] = s.[Label], [Icon] = s.[Icon], [Route] = s.[Route],
    [RequiredPermission] = s.[RequiredPermission], [SortOrder] = s.[SortOrder], [IsVisible] = s.[IsVisible], [UpdatedAt] = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT ([Key], [ParentId], [Label], [Icon], [Route], [RequiredPermission], [MenuArea], [SortOrder], [IsVisible])
    VALUES (s.[Key], (SELECT [Id] FROM [nav].[MenuItems] p WHERE p.[Key] = s.[ParentKey] AND p.[MenuArea] = s.[MenuArea]), s.[Label], s.[Icon], s.[Route], s.[RequiredPermission], s.[MenuArea], s.[SortOrder], s.[IsVisible]);
GO
-- Fix parents for rows inserted before their parent existed (idempotent).
UPDATE c SET [ParentId] = p.[Id]
FROM [nav].[MenuItems] c JOIN [nav].[MenuItems] p
  ON ((c.[Key] = N'orders.all' OR c.[Key] = N'orders.calendar' OR c.[Key] = N'orders.kitchen') AND p.[Key] = N'orders'
   OR (c.[Key] = N'catalog.packages' OR c.[Key] = N'catalog.costing') AND p.[Key] = N'catalog'
   OR (c.[Key] IN (N'engagement.reviews',N'engagement.inbox')) AND p.[Key] = N'engagement'
   OR (c.[Key] = N'admin.menu' OR c.[Key] = N'admin.audit') AND p.[Key] = N'admin')
WHERE c.[ParentId] IS NULL AND c.[Key] <> p.[Key];
GO
