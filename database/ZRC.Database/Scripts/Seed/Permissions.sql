-- Permission catalogue. Each module declares matching string constants.
-- Startup check fails fast if a constant is missing here.
MERGE INTO [identity].[Permissions] AS t
USING (VALUES
    (N'identity.user.view',    N'identity',   N'View users'),
    (N'identity.user.manage',  N'identity',   N'Create/edit staff users'),
    (N'identity.role.view',    N'identity',   N'View roles'),
    (N'identity.role.manage',  N'identity',   N'Manage roles & grants'),
    (N'identity.audit.view',   N'identity',   N'View audit log'),
    (N'nav.menu.view',         N'nav',        N'View menus'),
    (N'nav.menu.manage',       N'nav',        N'Manage dynamic menus'),
    (N'catalog.category.view', N'catalog',    N'View categories'),
    (N'catalog.category.edit', N'catalog',    N'Edit categories'),
    (N'catalog.package.view',  N'catalog',    N'View packages'),
    (N'catalog.package.edit',  N'catalog',    N'Edit packages/items/prices'),
    (N'catalog.costing.view',  N'catalog',    N'View costs & margins'),
    (N'ordering.order.view',   N'ordering',   N'View orders'),
    (N'ordering.pricing.view', N'ordering',   N'View booking sale amounts and payments'),
    (N'ordering.order.manage', N'ordering',   N'Create/confirm/cancel orders'),
    (N'ordering.kitchen.view', N'ordering',   N'Kitchen prep sheet (no money)'),
    (N'ordering.payment.record', N'ordering', N'Record manual payments'),
    (N'customers.view',        N'customers',  N'View customers'),
    (N'customers.manage',      N'customers',  N'Manage customers'),
    (N'engagement.inquiry.view', N'engagement', N'View inquiries/messages'),
    (N'engagement.inquiry.manage', N'engagement', N'Handle inquiries/messages'),
    (N'engagement.review.moderate', N'engagement', N'Approve/feature reviews'),
    (N'content.view',          N'content',    N'View CMS content'),
    (N'content.edit',          N'content',    N'Edit CMS content'),
    (N'reporting.view',        N'reporting',  N'View dashboards & reports')
) AS s ([Code], [Module], [Description])
ON t.[Code] = s.[Code]
WHEN MATCHED THEN UPDATE SET [Module] = s.[Module], [Description] = s.[Description]
WHEN NOT MATCHED THEN INSERT ([Code], [Module], [Description]) VALUES (s.[Code], s.[Module], s.[Description]);
GO
