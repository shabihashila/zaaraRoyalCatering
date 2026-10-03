
# Decisions (append-only; simplest option that fits the architecture)

## 2026-09-30 — Phase 0 bootstrap
- One assembly per module for Phase 0 (folders Api/Application/Domain/Infrastructure inside it). Split into 4 assemblies per module only when a module outgrows a single project. NetArchTest enforces namespace boundaries either way.
- `Microsoft.Build.Sql` SDK 2.1.1 for `ZRC.Database`. One object per .sql file, explicit constraint names.
- Reporting has no tables in Phase 0 (views only, added Phase 5). Schema still created so contracts are stable.
- `identity.OutboxMessages` is the single transactional outbox table (all modules share one DB).
- Permission check is deny-by-default stub in Phase 0; Phase 1 wires JWT roles -> server-side permission resolution + cache.
- Angular: Sparked template integration starts from a fresh Angular 21 workspace; Sparked layout service/theme tokens copied in next (Sparked site fetch returned no repo URL; will resolve source in Phase 0 web task).
- Excel workbook `zaara_royal_catering_menu.xlsx` not yet in repo; SeedImporter is a stub until Phase 2.
- `Microsoft.Build.Sql` 2.1.1 does not exist on NuGet (nearest was 2.2.0-preview.1); pinned `ZRC.Database` to stable **2.1.0** — DACPAC builds.
- Web Phase 0: fresh Angular 21 SSR workspace (`web/`, standalone + signals + prerendered 2 routes, `npm run build` passes). Sparked/PrimeNG/Tailwind/Three.js deferred to Phase 1/3.
- Local dev DB is SQL Server 2022 Developer (default instance, Windows auth). Default connection string is trusted local; docker-compose keeps sa-based string as override. SqlPackage pinned to **162.2.111** (.NET 8 LTS) because 170.x demands .NET 10.0.11 runtime which is not installed; dotnet-ef updated to **10.0.1**.
- Workbook lives at `docs/zaara_royal_catering_menu.xlsx` (not repo root). Verified: 145 item rows, 19 packages, all computed totals match Package Summary; averages 319.47/186.84/132.63.
- `scaffold.ps1` now builds the solution first (EF tool needs fresh binaries). Empty-schema contexts get a hand-written `GeneratedNamespace.cs` stub (scaffold emits a dangling `using` when a schema has no tables yet); stubs are replaced by real entities as tables land. Never hand-edit generated files.

## 2026-09-30 — Phase 1 (Identity + RBAC + Dynamic menu) — done
- Backend was already complete (JWT + rotating refresh via httpOnly cookie, server-side permission resolution + 5-min cache, audit log, menu CRUD + reorder, startup permission check). One load-bearing bug found live: `JwtBearer.MapInboundClaims` renamed `sub` → NameIdentifier, so `MyMenu` returned 401 on valid tokens; fixed with `MapInboundClaims = false` in `JwtSetup`.
- Role names are `Kitchen`/`Sales` (not "Kitchen Staff"); UI defaults and docs use the seed names.
- Web Phase 1 without new dependencies (PrimeNG tree deferred): `AuthService` (signals + localStorage guarded for SSR), `authInterceptor` (Bearer + single refresh retry), `authGuard`/`permissionGuard`, `*hasPermission` directive (UI hides; API enforces), `NavigationService` signal store, `/login`, dynamic admin sidebar, Menu Management (`nav.menu.manage`) and Users & roles (`identity.user.view`) screens.
- Verified live: SuperAdmin sees 7 top-level menu entries; created Kitchen user `phase1.kitchen@zrc.local` sees only Dashboard + Orders; Kitchen `GET /api/v1/admin/users` → 403.
- Tests: arch 3/3, API integration 12/12 (4 ping + 8 Phase-1 auth 401s), `ng build` passes (5 prerendered routes).

## 2026-10-01 — UI visual pass (royal theme, no UI-kit dependency yet)
- Royal design system in `web/src/styles.scss`: emerald/maroon/gold/cream tokens (+ `--p-*` aliases for future PrimeNG), Playfair Display + Lato + Hind Siliguri, light/dark via `data-theme`, reduced-motion support.
- Public chrome: branded sticky header, footer, home hero ("Royal feasts, crafted for your moments"), 6 category cards, how-it-works, featured packages (sale prices only — no costs, per confidentiality rule), CTA band. Verified via served HTML (all sections present).
- Admin chrome: emerald sidebar with dynamic permission-filtered menu, themed tables/forms/buttons; dashboard cards gated by `*hasPermission`; fixed stale `app.spec.ts` (2/2 vitest pass).

## 2026-10-01 — Phase 2 (Catalog + Excel import) — done
- DDL: `catalog` schema now has Categories, Items, Packages, PackageItems (cost on the link), PackageInclusions, PackageVariants, AddOns, PackageAddOns, PriceHistory + `vw_PackageCosting` (admin/reporting only). New `scaffold.ps1` hardening: dotnet stderr warnings no longer abort the script.
- `ZRC.SeedImporter` reads `docs/zaara_royal_catering_menu.xlsx` (Item Cost Detail + Package Summary), validates every package total, and generates `Scripts/Seed/Catalogue.sql` (idempotent MERGEs + full-replace link tables) + `seed/catalogue.json`. Result: 19 packages, 145 item rows, 81 distinct items; averages 319.47/186.84/132.63.
- Workbook rules modeled as data: Royal Kacchi Chicken +0 (default) / Mutton +80 variant; Standard Buffet MinGuests 40; Executive Buffet + Full Meal inclusions; Snacks/Tea-Break + BBQ taglines; 2 inactive placeholder add-ons (Outdoor Setup, Live Chef Service) linked to BBQ Night (price 0 — admin must price them).
- Module: public `GET /api/v1/public/catalog` (categories, packages with category/guests/maxPrice filters, detail by slug) with 5-min output cache + tag eviction on admin writes; admin CRUD (categories/items/add-ons/packages/costs/links, price history on sale change, RowVersion 409s). Contracts: public DTOs carry no cost fields by construction.
- Verified live: SuperAdmin costing 19 rows; sale 650→660→650 round-trip wrote PriceHistory and public cache showed 650 immediately after eviction.
- Tests: arch 3/3, API integration 26/26 (incl. public-DTO no-cost snapshot + seed verification: counts, averages, spot totals, business rules); `ng build` passes; admin UI has package list/editor with live margins (<35% highlight), costing sheet with averages + CSV export + bulk % adjust with preview, routes `/admin/catalog/packages[/:id]`, `/admin/catalog/costing` (admin/** renders server-side, not prerendered).

## 2026-10-01 — Phase 3 (Public website) — done
- Stack additions (planned in guideline §3, now installed): `three` + `@types/three`, `gsap`, `lenis`. Three/GSAP/Lenis are all lazy-loaded (`import()` after first paint / on use) so the initial bundle stays 416 kB raw / ~108 kB transfer; `handi-scene` + `lenis` + `gsap` ship as separate lazy chunks. All Three.js code lives in `web/src/app/shared/three/` (`handi-scene.ts` wrapper + `three-hero.component.ts`); animation frames run outside the Angular zone.
- 3D hero: procedural royal handi (lathe pot + rim + lid + steam particles) with mouse parallax tilt + scroll dolly, DPR capped at 2, pauses off-screen (`IntersectionObserver`) / on tab hide. Poster (CSS + emoji) shows until WebGL is ready; static fallback on `prefers-reduced-motion`, low-end devices (`hardwareConcurrency <= 4` + mobile UA), no WebGL, or load failure.
- Pages (all prerendered except dynamic detail): Home (live categories/featured from public catalog API, staggered headline, tilt cards, counters, testimonials, gallery teaser, CTA), `/menu` (category/guests/maxPrice filters, 3D flip cards front/back, 2–3 package compare drawer), `/packages/:slug` (SSR on demand; items, inclusions, variant radios incl. Mutton +৳80, add-ons, live quote `guests × (price + variant) + add-ons` with Min/MaxGuests enforcement, Book → `/contact`, Custom → `/inquiry`), `/about`, `/gallery` (masonry + keyboard-navigable lightbox), `/faqs`, `/contact` (BD phone validation, package/guests prefill, WhatsApp click-to-chat, map placeholder), `/inquiry` (wedding/500+ guest form + summary). No backend change — Content/Engagement CMS endpoints stay Phase 5; `site-content.ts` is the single swap point; catalog service falls back to static sale-price-only data so prerender works with no API.
- Confidentiality: public DTOs carry no cost fields by construction; prerendered HTML verified to contain no `TotalCost/profit/marginPct/CostPerHead`; public pages only show sale prices + item names.
- SEO/SSR: per-page Title + description/OG/Twitter/canonical via `SeoService`; `FoodEstablishment` + `Offer` JSON-LD on detail, `FoodEstablishment` on home; static `robots.txt` + `sitemap.xml` (7 static + 19 package URLs) shipped in `web/public` (copied to dist); skip link, focus rings, AA-contrast royal palette, `prefers-reduced-motion` disables parallax/smooth-scroll/auto-rotation.
- Money display: `formatBDT` (`en-IN`-style grouping, configurable locale; `৳1,20,000` verified in test).
- Verified: `ng build` green (7 prerendered routes, initial 416 kB raw), vitest 8/8 (`quote-calc` incl. Royal Kacchi Mutton 60 guests = ৳34,800 + MinGuests/MaxGuests cases; `bdt` grouping; `app`), `dotnet build` 0 errors, no `any` in Angular.

## 2026-09-30 — Phase 0 acceptance (local SQL Server)
- DACPAC deployed twice to `ZRC` on localhost; second run clean (idempotent MERGE seeds: 6 roles, 24 permissions, 75 grants, 16 menu items).
- Re-scaffolded all 8 DbContexts; drift check (hash before/after) passes with no diff.
- `dotnet build`, arch tests 3/3, API integration 4/4, `ng build` (2 prerendered routes) all pass.

## 2026-10-02 - Customer website visual upgrade
- Retain the existing custom SCSS architecture and editable emerald/gold/cream brand variables. No original logo asset is present; a provisional SVG chef-cap accent is explicitly documented pending the real logo.
- Serve optimized food photography locally (640/1280 WebP), prefer existing catalog image URLs, and retain required Wikimedia attribution/license metadata with a public credits page. Stock images are illustrative.
- Make the food photograph the home hero; instantiate the existing lazy Three.js serving handi only when its optional preview opens. Public content remains visible without reveal animation.
- Improve mobile navigation, package cards/detail, category query filtering and keyboard access for gallery/flip faces. Preserve routes, sale prices, variants, add-ons and backend contracts.
- Correct public form copy to describe existing local request preparation honestly; persistence remains a future engagement/ordering phase. No schema, generated EF or seed changes.
- Review and verification details: docs/UI-UPGRADE.md.

## 2026-10-03 - Admin workspace upgrade
- Lazy-load admin screens and use a scoped emerald/gold theme; reuse local photography and provisional chef-cap artwork.
- Complete UI workflows supported by existing catalog, Identity and Navigation APIs. Mark future seeded destinations Planned; do not present fictional orders or revenue.
- Render private admin/login routes on the client because JWT sessions live in browser storage. Public package SSR and static prerendering are preserved.
- Align Identity UserIdClaimType with unmapped JWT sub; retain the loaded profile on access-token refresh without detached recursive /me requests.
- Preserve existing API contracts, data and database schemas. Verification and file details: docs/ADMIN-UPGRADE.md.

## 2026-10-03 - Planned menu workflows
- Implement the seeded Orders, Calendar, Kitchen, Customers, Reviews, Content and Reports destinations and add a staff request inbox. Retain modular boundaries through Catalog/Customers/Identity contracts.
- Add SQL-first tables and read models, publish with data-loss protection, then scaffold contexts/models. Drift hashes match across 44 generated files. Repeat DACPAC deployment succeeds but may normalize check constraints.
- Keep authoritative quotes and immutable booking price snapshots; audit business writes in the same transaction. Enforce rowversion conflicts and payment/status limits.
- Separate ordering.pricing.view from operational order access. Kitchen list/detail/calendar/preparation responses omit financial values; public/customer DTOs never contain costs.
- Persist public contact/inquiry requests and render published CMS entries and approved featured reviews with static fallbacks. No runtime dependencies added.
- Use a separately deployed ZRC_OperationsTests database for mutation tests and browser QA. Details and current production boundaries: docs/PLANNED-MENUS.md.

## 2026-10-03 - Admin modal editors and GitHub publication
- Move catalog, package details/costs, bulk pricing, customer, booking, status/payment, review/content/inbox, staff and navigation add/edit forms into one native-dialog component. Keep API routes and save payloads intact.
- Native dialogs isolate background controls and trap focus; explicitly restore focus to the opener. Prevent Escape/Close while saving, retain errors in the dialog and constrain dimensions for mobile scrolling.
- Exclude build outputs, local configuration, environment files and temporary conversion scripts from Git. Remove local account passwords from repository documentation before publishing to the user-specified GitHub repository.

## 2026-10-04 — Brand refresh and catalogue cleanup

- Shared semantic red theme tokens replace the independent customer and admin green palettes. The supplied reference colors are used provisionally because no official logo attachment or repository asset was available.
- The existing Three.js handi implementation moves into the main hero. Warm metal, deep-red enamel and limited brass details use environment reflections and soft shadows; motion is bounded and pauses when hidden. Reduced-motion and unsupported devices retain a static SVG vessel. No dependencies were added.
- Local photographs have explicit owners: three homepage signature cards and four gallery entries. Package/category listings and admin screens use typography rather than repeated or unrelated photographs. Managed gallery URLs are deduplicated against reserved and gallery images.
- The retired service is removed from the source workbook, fallback catalogue, form options, sitemap and generated seed. An idempotent post-deployment cleanup identifies its legacy category using a stable fingerprint, removes its packages and orphaned links/items, and refuses to erase historical bookings. No local bookings existed and the cleanup was deployed.
- Current catalogue: 5 categories, 16 packages, 122 item links, 76 items; mean sale 336.25, cost 196.56, profit 139.69 BDT. No schema or generated EF changes were required.
- Development CORS explicitly permits 127.0.0.1:4200; other environments retain their configured origin allowlist.
