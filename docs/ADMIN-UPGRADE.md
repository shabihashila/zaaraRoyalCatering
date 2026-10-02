# Admin workspace upgrade

The previous admin area was a basic shell with a placeholder dashboard. Catalog pricing, staff and navigation APIs already existed, but categories, menu items, add-ons and audit history lacked usable screens. Ordering, customer operations, engagement and reporting remain backend scaffolds.

The upgraded workspace uses an emerald sidebar, gold accents, clear typography, responsive cards, food photography, searchable tables and a mobile drawer. Theme rules are isolated in `admin-theme.scss`. The existing provisional chef-cap asset and optimized local food photographs are reused. The original logo is still needed to confirm exact brand colors.

## Working features

- Dashboard shows actual package counts, category distribution, average prices, costs, profits and margins. These are catalog economics, not booked revenue. Loading and failed pricing requests show unavailable values rather than zero figures.
- Package search, category/status filtering, photo thumbnails and permission-controlled costing export.
- Package pricing and item editing with immediate reactive profit/margin updates.
- Category, menu-item and add-on list/create/edit screens using existing API contracts; category and item updates preserve concurrency tokens.
- Costing sheet and bulk price adjustment, staff/role administration, navigation editing and paginated audit history.
- Permission-filtered navigation and actions. Seeded future destinations are clearly marked Planned instead of linking to nonexistent screens.
- Direct admin URLs retain browser sessions. Private routes render on the client because authentication uses browser storage; public package SSR and seven prerendered public pages are retained.

## File-by-file changes

Paths below are relative to the repository root.

| File | Change |
| --- | --- |
| `web/src/app/layouts/admin-layout/admin-workspace.component.ts` | Replaces the old layout with sidebar, permission-aware links, mobile drawer, search, profile and sign-out. |
| `web/src/app/layouts/admin-layout/admin-theme.scss` | Responsive admin theme, cards, controls, tables, badges and editor layouts. |
| `web/src/app/features/admin/admin-icon.component.ts` | Local inline SVG icon component; no icon-library dependency. |
| `web/src/app/features/admin/dashboard/dashboard-overview.component.ts` | Replaces the placeholder dashboard with API-backed metrics, occasion bars, pricing health and package tiles. |
| `web/src/app/features/admin/catalog/package-list.component.ts` | Search/filter state, query-string search, reload and costing CSV export. |
| `web/src/app/features/admin/catalog/package-list.component.html` | Package photography, formatted pricing, status/margin badges and responsive table. |
| `web/src/app/features/admin/catalog/package-detail.component.ts` | Reactive price-to-margin calculation, edit permission checks and responsive tables. |
| `web/src/app/features/admin/catalog/catalog-resource.component.ts` | Shared category, item and add-on management with validation, pagination, API saves and concurrency errors. |
| `web/src/app/features/admin/catalog/costing-sheet.component.ts` | Responsive table and permission-controlled bulk price changes. |
| `web/src/app/features/admin/audit/audit-log.component.ts` | Paginated audit viewer, actor/date fields and expandable JSON changes. |
| `web/src/app/features/admin/menu/menu-management.component.ts` | Responsive table; preserves hidden source fields when editing and refreshes sidebar after saves. |
| `web/src/app/features/admin/users/user-admin.component.ts` | Team/access presentation, feedback, responsive roles/table and permission-controlled actions. |
| `web/src/app/app.routes.ts` | Lazy-loads admin screens and registers categories/items/add-ons/audit routes with permission guards. |
| `web/src/app/app.routes.server.ts` | Client-renders private admin/login routes to avoid server-side session redirects. |
| `web/angular.json` | Registers the scoped admin theme after shared styles. |
| `web/src/app/core/auth/auth.service.ts` | Refresh renews the token while retaining the loaded profile; removes recursive background profile reload. |
| `src/Modules/Identity/ZRC.Modules.Identity/IdentityModule.cs` | Aligns Identity's user-ID claim with unmapped JWT `sub`; fixes authenticated `/auth/me` returning 401. |
| `tests/ZRC.Api.IntegrationTests/Phase1AuthTests.cs` | Regression check for resolving JWT subjects through UserManager. |
| `web/src/app/core/auth/auth.service.spec.ts` | Regression check for refresh retaining profile and avoiding recursive profile requests. |
| `web/src/app/features/admin/dashboard/dashboard-overview.component.spec.ts` | Live catalog aggregates and restricted-account request checks. |
| `web/src/app/features/admin/catalog/catalog-resource.component.spec.ts` | Update payload/concurrency handling checks. |
| `web/src/app/features/admin/catalog/package-detail.component.spec.ts` | Sale-price changes immediately recalculate economics. |

Unused `admin-layout.component.ts` and `admin-dashboard.component.ts` were removed after their imports were replaced. Database schemas, generated EF models, seed data and existing API request/response shapes are unchanged.

## Assets, dependencies and setup

No new runtime dependencies or database deployment are required. Food photography and chef-cap artwork reuse the public upgrade assets; see [asset provenance and licenses](UI-UPGRADE.md). Browser verification uses a temporary Playwright installation outside the project. Review screenshots live in `docs/admin-review/` and do not ship in the frontend.

Run the API using `dotnet run --project src/Host/ZRC.Api --launch-profile https` and the frontend using `npm start` inside `web`. Open http://localhost:4200/admin and use an existing authorized staff account. Both development services were left running after verification.

## Validation

- Angular production build passes: initial bundle 448.25 kB raw / 119.90 kB estimated transfer, below the existing 500 kB warning budget; seven public pages prerendered.
- Frontend suite: 14 tests pass across seven files.
- API integration suite: 27 tests pass, including the new JWT subject regression. Architecture suite previously passed all three tests during this upgrade.
- Headless Edge checks nine admin routes at 1440px and 390px, package search, local live-margin editing, invalid editor save state and mobile drawer navigation. Catalog data was not changed during browser QA.
- Actual owner sign-in/reload and restricted kitchen-account checks pass: financial metrics are hidden, denied costing URLs return to the dashboard and no catalog API is requested for that account.
- See [route/interaction results](admin-review/admin-results.json), [session/access results](admin-review/admin-session-results.json), [desktop dashboard](admin-review/admin-1440-dashboard.webp) and [mobile dashboard](admin-review/admin-390-dashboard.webp).

The subsequently completed ordering, calendar, kitchen, customer, engagement, content and reporting workflows are documented in [Planned menu completion](PLANNED-MENUS.md). The validation above describes the initial workspace upgrade. Existing dependency advisories documented in UI-UPGRADE.md remain unresolved.
