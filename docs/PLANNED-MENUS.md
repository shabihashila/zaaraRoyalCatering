# Planned menu completion — 2026-10-03

Previously disabled sidebar destinations now open working, permission-protected screens. Existing catalog routes and sale pricing remain intact. The interface reuses the emerald/gold theme and local assets with responsive tables, accessible inline editors, clear feedback and printable booking/kitchen views.

## Delivered workflows

- Orders: search, status/date filters, paging, customer/package/variant/service selection, authoritative quote preview, booking creation, detail, printable sale invoice, status history and manual payments.
- Calendar: monthly booking schedule with date navigation and mobile layout.
- Kitchen: date-based dish and variant preparation totals. Kitchen order list, calendar and details omit all monetary amounts.
- Customers: search, paging, create and edit with Bangladesh phone validation, duplicate protection and optimistic concurrency.
- Reviews: create, moderate and feature approved reviews; only approved featured reviews appear publicly.
- Inbox: persisted public contact/inquiry/newsletter requests; staff status and notes.
- Website Content: draft/published pages, hero, gallery, FAQs and settings. `Hero/home` and `Page/about` supply home/about copy; settings keys are `phone`, `whatsapp`, `email`, `address`, `hours`. Plain text is escaped; image URLs allow local assets or HTTPS. Published FAQs/gallery entries extend existing content.
- Reports: event-date range, status counts, confirmed booking sales, collection/balance and package performance. Cost/profit fields require the costing permission. Profit represents package contribution before operating expenses, not accounting net profit.

## File-by-file change map

| Files | Change |
|---|---|
| `database/ZRC.Database/customers/Tables/Customers.sql` | Customer records, active-phone uniqueness, audit and rowversion fields. |
| `database/ZRC.Database/ordering/Tables/Orders.sql` | Bookings and immutable catalog/price JSON snapshots. |
| `database/ZRC.Database/ordering/Tables/OrderStatusHistory.sql` | Booking transition history. |
| `database/ZRC.Database/ordering/Tables/Payments.sql` | Payment records. |
| `database/ZRC.Database/ordering/Views/vw_KitchenPrep.sql` | Money-free preparation aggregation. |
| `database/ZRC.Database/engagement/Tables/Reviews.sql` | Review moderation and featured state. |
| `database/ZRC.Database/engagement/Tables/Requests.sql` | Contact, inquiry and newsletter inbox. |
| `database/ZRC.Database/content/Tables/Entries.sql` | Typed content records and publication state. |
| `database/ZRC.Database/reporting/Views/vw_OrderSummary.sql` | Cross-schema reporting read model. |
| `database/ZRC.Database/Scripts/Seed/MenuItems.sql`, `Permissions.sql`, `RolePermissions.sql` | Content/inbox navigation and separate `ordering.pricing.view` permission. |
| `database/scaffold.ps1` | Optional `-SkipBuild` for drift verification and explicit command failure checks. |
| Generated EF models and contexts in Customers, Ordering, Engagement, Content and Reporting | Regenerated from SQL; no hand editing. |
| `src/BuildingBlocks/ZRC.Infrastructure.Common/OperationsInput.cs`, `OperationsAudit.cs` | Shared validation, rowversion handling and transactional audit inserts. |
| `src/Modules/Customers/ZRC.Modules.Customers.Contracts/*`, `ZaraRoyalCatering.slnx` | Customer contact lookup contract and solution registration. |
| `src/Modules/Catalog/ZRC.Modules.Catalog.Contracts/*`, Catalog `Application/CatalogQuery.cs` | Internal ordering catalog/cost lookup; public catalog remains cost-free. |
| Ordering `Application/OrderPricing.cs`, `Api/OrderEndpoints.cs`, `OrderingModule.cs` | Quotes, snapshots, ownership, status/payment rules, calendar and kitchen endpoints. |
| Customers `Api/CustomerEndpoints.cs`, `CustomersModule.cs` | Customer CRUD and contact lookup implementation. |
| Engagement `Api/EngagementEndpoints.cs`, `EngagementModule.cs` | Review moderation and public/staff request handling. |
| Content `Api/ContentEndpoints.cs`, `ContentModule.cs` | Draft/public content CRUD. |
| Reporting `Api/ReportEndpoints.cs`, `ReportingModule.cs` | Permission-filtered business reports. |
| Module `.csproj` files | Common infrastructure and module-contract references. |
| `web/src/app/features/admin/operations/operations.models.ts` | Typed shared DTOs, API helpers and editor focus. |
| `orders.component.ts`, `orders.component.html` | Booking, invoice, payment and transition UI. |
| `event-board.component.ts` | Calendar and kitchen screens. |
| `customers.component.ts` | Customer editor and paged list. |
| `records.component.ts`, `records.component.html` | Reviews, inbox and content editors. |
| `reports.component.ts` | Metrics, package tables and safely escaped CSV export. |
| `web/src/app/app.routes.ts` | Lazy-loaded routes and permission guards. |
| `web/src/app/layouts/admin-layout/admin-workspace.component.ts`, `admin-theme.scss` | Enabled menu destinations, responsive forms/tables and print layouts. |
| `web/src/app/features/admin/dashboard/dashboard-overview.component.ts` | Actual monthly operational totals for authorized staff. |
| `web/src/app/features/public/managed-content.service.ts` | Published CMS/review/settings integration with existing static fallbacks. |
| Public home, about, FAQ, gallery, contact, inquiry and public layout components | Published content rendering and real form persistence with success/error feedback. |
| `web/src/app/features/public/food-images.ts` | Responsive image variants only for known optimized local assets. |
| `tests/ZRC.Api.IntegrationTests/OperationsTests.cs` | Isolated database workflow, concurrency, pricing and permissions tests. |
| `web/src/app/features/admin/operations/orders.component.spec.ts` | Payment limits and conflict retention tests. |
| `tests/browser/admin-operations.cjs` | Desktop/mobile and end-to-end workflow checks against the isolated test API. |

## API surface

All routes begin `/api/v1`. Admin APIs require authentication and the relevant permission; the backend enforces authorization independently of the UI.

| Routes | Purpose / permission |
|---|---|
| `admin/orders`, `admin/orders/{id}`, `admin/orders/calendar` | Read bookings: `ordering.order.view`; sale amounts additionally require `ordering.pricing.view`. |
| POST `admin/orders`, PUT `admin/orders/{id}/status` | `ordering.order.manage` and `ordering.pricing.view`. |
| POST `admin/orders/{id}/payments` | `ordering.payment.record` and `ordering.pricing.view`. |
| `admin/orders/kitchen` | `ordering.kitchen.view`; no money. |
| `admin/customers` | `customers.view` for reads; `customers.manage` for writes. |
| `admin/engagement/reviews`, `admin/engagement/requests` | Reviews: `engagement.review.moderate`; requests: `engagement.inquiry.view` / `engagement.inquiry.manage`. |
| `admin/content` | `content.view` for reads; `content.edit` for writes. |
| `admin/reports` | `reporting.view`; cost fields separately require `catalog.costing.view`. |
| POST `public/quotes` | Anonymous, rate-limited authoritative quote. |
| POST `public/orders`, GET `public/me/orders` | Authenticated customer-owned bookings; no costs. |
| `public/content`, `public/testimonials` | Published content and approved featured reviews only. |
| POST `public/contact`, `public/inquiries`, `public/newsletter` | Rate-limited persisted requests. |

Status/payment writes use transactions, audit records and rowversion conflict responses. Bookings require 48-hour lead time in Bangladesh time and package guest limits. Payments cannot exceed the outstanding balance; non-cash methods require references. Paid bookings cannot be cancelled/rejected without a future refund workflow.

## Setup and verification

No new application runtime dependencies or image assets were added. Browser QA uses a temporary Playwright installation and installed Edge; it is not shipped.

1. Build the SQL project and deploy its DACPAC using the existing database deployment workflow. Keep `BlockOnPossibleDataLoss=true` and `DropObjectsNotInSource=false`. The local working database has already been updated. Repeated deployment succeeded; DacFx may recreate normalized IN-list check constraints, so a repeat deployment is not necessarily an empty plan.
2. Scaffold with `database/scaffold.ps1` using the trusted connection. Generated/context hash verification checked 44 files with zero changes.
3. Run the API with the existing HTTPS launch profile and Angular on port 4200. Open `/admin` using an authorized staff account.
4. Integration/browser mutations use a separate DACPAC-deployed `ZRC_OperationsTests` database. Never point the browser test API at business data. Start that API on 5290 with `ConnectionStrings__Default` set to the isolated database. Set `ZRC_PLAYWRIGHT_MODULE` if Playwright is external, and `ZRC_TEST_PASSWORD` from local secrets before running `node tests/browser/admin-operations.cjs`.

Validation: API suite 43 passed; architecture suite 3 passed; Angular suite 16 passed; production build passed with seven public pages prerendered. Browser checks cover eight routes at 1440/390px, booking/confirmation/payment, invoice printing, kitchen privacy, content publication, contact delivery and denied report access. Review artifacts live in `admin-review`.

Manual payment recording does not charge a payment gateway. The public inquiry is a staff request, not a confirmed booking. Online checkout UI, automated outbound notifications and refunds remain production extensions. The CMS supports the described existing sections rather than arbitrary HTML page creation. Existing dependency advisories are unchanged.
