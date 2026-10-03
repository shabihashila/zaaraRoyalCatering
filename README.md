# Zaara Royal Catering

Modular monolith (.NET 10 Minimal APIs + SQL Server database-first + Angular 21).

## One-command startup (Phase 0)

```powershell
# 1. Start SQL Server (docker) or use local SQL Server + override connection string
docker compose up -d sqlserver

# 2. Deploy database (builds DACPAC + SqlPackage publish + idempotent seeds)
$env:ZRC_CONNECTION_STRING = "Server=localhost,1433;Database=ZRC;User Id=sa;Password=ZRC_dev_12345!;TrustServerCertificate=True"
.\database\deploy.ps1

# 3. Run API
dotnet run --project src/Host/ZRC.Api
# Scalar UI (Development): https://localhost:5001/scalar/v1
# Health: /health  Ping: /api/v1/_ping

# 4. Re-scaffold after any SQL change (DB-first, mandatory)
.\database\scaffold.ps1
```

## Structure

- `database/ZRC.Database` — .sqlproj, single source of truth (schemas: identity nav catalog ordering customers engagement content reporting)
- `src/Host/ZRC.Api` — composition root, modules wiring, JWT stub, permission policy
- `src/BuildingBlocks` — SharedKernel (Result, Money BDT, Slug/Phone/Guests, IModule) + Infrastructure.Common (audit, outbox)
- `src/Modules/*` — Identity Navigation Catalog Ordering Customers Engagement Content Reporting (+ Contracts)
- `src/Tools/ZRC.SeedImporter` — Excel -> Catalogue.sql (full logic in Phase 2)
- `tests` — Architecture (NetArchTest) + API integration (WebApplicationFactory)
- `web` — Angular workspace (Phase 0 task pending: Sparked-based shell)
- `docs` — DECISIONS.md / API.md / RUNBOOK.md

## Phase 1 acceptance (done 2026-09-30)

- [x] SuperAdmin logs in (`POST /api/v1/auth/login` + `/login` page), creates a Kitchen user (`POST /api/v1/admin/users`)
- [x] Kitchen user sees only their menu entries (Dashboard + Orders vs SuperAdmin's 7) via permission-filtered `GET /api/v1/admin/navigation/menu`
- [x] Forbidden API calls return 403 (Kitchen `GET /api/v1/admin/users` → 403); anonymous → 401 (8 integration tests)
- [x] Menu Management (`/admin/menu`, `nav.menu.manage`) + Users & roles (`/admin/users`, `identity.user.view`) screens with route guards + `*hasPermission`

## Phase 2 acceptance (done 2026-10-01)

- [x] Import reproduces all 16 packages; computed totals match the workbook exactly (122 item rows, 76 distinct items)
- [x] Averages equal ৳336.25 / ৳196.56 / ৳139.69 / ~41.7% (importer asserts + `CatalogSeedVerificationTests`)
- [x] Public API never returns cost fields (snapshot test on package detail JSON)
- [x] Admin package/item screens with live margin calc, Costing & Margins sheet + CSV export (`/admin/catalog/packages`, `/admin/catalog/costing`)
- [x] DACPAC deployed twice cleanly; catalog context re-scaffolded with no drift

## Phase 3 acceptance (done 2026-10-01)

- [x] Home with lazy 3D hero (procedural handi, poster + reduced-motion/WebGL fallbacks, outside Angular zone)
- [x] Menu (`/menu`: category/guests/budget filters, 3D flip cards, 2–3 compare) + detail (`/packages/:slug`: variants incl. Mutton +৳80, add-ons, live quote with MinGuests enforcement)
- [x] About / Gallery (masonry + lightbox) / FAQs / Contact (BD phone validation, WhatsApp) / Inquiry (wedding/500+ guests)
- [x] SSR/SEO: 7 prerendered routes + SSR package detail, per-page meta/OG/canonical, FoodEstablishment + Offer JSON-LD, robots.txt + sitemap.xml (16 packages)
- [x] No costs in public API/pages (prerendered HTML verified); `ng build` green (initial ~416 kB raw), vitest 8/8

## Phase 0 acceptance

- [x] `dotnet build` passes (API + modules + tools + tests)
- [x] DACPAC builds (`dotnet build database/ZRC.Database` → `bin/Debug/ZRC.Database.dacpac`)
- [ ] DACPAC deploys twice cleanly (needs SQL Server; run `deploy.ps1`)
- [x] `ng build` passes (web workspace Phase 0 shell, 2 prerendered routes)
- [x] Architecture tests pass (3/3) + API integration tests pass (4/4)

## Customer website upgrade (2026-10-02)

Premium food-led public website with responsive photo cards, mobile navigation, improved package detail, gallery keyboard support and optimized local WebP assets. Existing catalog prices, quotes, APIs and admin behavior are preserved. No new application dependencies or database setup. See [the file-by-file review and asset credits](docs/UI-UPGRADE.md). Original brand logo and verified business contact details are still needed before production.

## Admin workspace upgrade (2026-10-03)

Responsive red and warm-neutral workspace with a live catalog dashboard, package filters, category/item/add-on editors, costing, staff access and audit history. Admin screens load on demand. JWT profile lookup and private-route reload issues are fixed. See [the initial workspace upgrade](docs/ADMIN-UPGRADE.md).

## Planned menu completion (2026-10-03)

Admin add/edit actions now open focused, responsive modals with Cancel/Close, Escape dismissal and visible save errors, including catalog/package editors, customers, bookings, payments/status, content/reviews/inbox, staff and navigation.

Orders, booking calendars, kitchen preparation, customers, reviews, contact/inquiry inbox, website content and reporting now have database-backed workflows. Quotes are calculated by the server; bookings retain price snapshots; payments and status changes are audited. Kitchen responses contain no financial amounts. Public contact and inquiry forms now persist requests, and published content appears on the customer website. See [file-by-file changes, API routes, setup and verification](docs/PLANNED-MENUS.md). No new application dependencies; deploy the additive DACPAC before starting the updated API.

## Brand refresh (2026-10-04)

The public website and staff workspace share royal-red theme tokens. The existing serving handi is the main homepage hero visual, with lazy WebGL loading and a static reduced-motion fallback. Photos have explicit content ownership, and the catalogue now contains 16 packages across five categories. The cleaned source workbook, regenerated SQL/JSON and deployed local database agree. See [changes, image ownership and validation](docs/BRAND-REFRESH.md). The official logo attachment is still required to replace the temporary text wordmark.
