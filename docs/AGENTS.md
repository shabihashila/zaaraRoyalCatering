# Agent Playbook — ZaraRoyalCatering

> Read this before any work in this repo. Source of truth for rules: `DEVELOPMENT_GUIDELINE 1.md`.
> Append-only change log: `docs/DECISIONS.md`. Keep both updated after every phase.

## 1. Project overview

**Zaara Royal Catering** replaces an Excel-run catering business in Bangladesh with an online platform:
e-com style public site (per-head meal packages in BDT ৳), customer ordering/engagement, and a role-based
back-office with a **database-driven sidebar menu**. Architecture: **modular monolith** — one deployable
ASP.NET Core API, code split into hard-bounded modules, **database-first** (SQL project is the schema source
of truth). Built phase by phase (see `DEVELOPMENT_GUIDELINE 1.md` §12); **Phase 0–2 are done**, next is Phase 3.

## 2. What is used in the project (do not substitute)

| Layer | Choice (pinned) |
|---|---|
| Backend | .NET 10, C# latest, Minimal APIs |
| DB | SQL Server 2022 (local Dev, Windows auth; docker override via `ZRC_CONNECTION_STRING`), SDK-style SQL project (`Microsoft.Build.Sql` **2.1.0**) → DACPAC → SqlPackage **162.2.111** |
| Data access | EF Core **10.0.1**, **scaffolded per schema** (`database/scaffold.ps1`); one `*DbContext` per module |
| Auth | ASP.NET Identity + JWT (15 min) + rotating refresh (httpOnly cookie); permission-based RBAC, `MapInboundClaims = false` (see DECISIONS 2026-10-01) |
| Validation / logging / docs | FluentValidation **12.0.0**, Serilog, built-in OpenAPI + Scalar UI |
| Tests | xUnit **2.9.3**, NetArchTest **1.3.2**, `WebApplicationFactory` integration tests (real local DB) |
| Frontend | Angular **21.2.8** (standalone, signals, SSR/prerender), hand-rolled royal SCSS system (`web/src/styles.scss`, `--p-*` token aliases ready for PrimeNG) |
| Seed import | `ZRC.SeedImporter` (ClosedXML **0.105.0**): Excel → `Scripts/Seed/Catalogue.sql` + `seed/catalogue.json` |
| SDK | `global.json` → .NET SDK **10.0.203** (`latestMajor`, prerelease allowed) |
| Run | API `https://localhost:7106` + `http://localhost:5289`; UI `http://localhost:4200`; `run-zrc.cmd` / `run-zrc.ps1` |

Key commands: `dotnet build ZaraRoyalCatering.slnx` · `dotnet test ZaraRoyalCatering.slnx` ·
`.\database\deploy.ps1` (needs local SQL Server) · `.\database\scaffold.ps1 -ConnectionString "<trusted>"` ·
`dotnet run --project src/Tools/ZRC.SeedImporter` · `npm run build` / `npm test` (in `web/`).
Configure development credentials locally using user-secrets or environment variables. Never publish local account passwords.

## 3. What must NOT be used

- **EF migrations** — never `Add-Migration`, `EnsureCreated`, `Migrate()`. Schema changes go: SQL → DACPAC → `deploy.ps1` → `scaffold.ps1` → commit SQL + code together.
- **Hand-editing `Generated/` EF files** — extend via `partial` classes + `OnModelCreatingPartial` only.
- **Generic repository over EF** — vertical slices, `AsNoTracking` + projections for reads.
- **Role-name checks in code** — check **permissions** (`RequirePermission(...)`); UI hides, API enforces.
- **Cost/profit/margin in any public API, public page, email or invoice** — admin/reporting only (there is a snapshot test enforcing this).
- **`any` in Angular**; Three.js only inside `/shared/three/`; animation frames outside the Angular zone.
- **Secrets in git** — user-secrets/env only (`Jwt:Key`, `Seed:SuperAdmin:*`).
- **New stack without a DECISIONS entry** — PrimeNG/Tailwind/Three.js/GSAP are *planned* (Phases 1–3), not yet installed; do not freelance alternatives.
- **Direct DB writes from the importer** — it generates idempotent `MERGE` SQL + JSON, never touches the database.

## 4. Standing conventions (from prior work — keep them)

- `.slnx` startup: `ZRC.Api` carries `DefaultStartup="true"`; never set a class library as startup. Delete stale `.vs/.../.suo` if VS picks the wrong project.
- `Program.cs` middleware order: `UseCors` **before** `HttpsRedirection`; redirection applies **outside Development only** (else CORS preflights/POSTs from `http://localhost:4200` break).
- Public catalog responses are output-cached (5 min, tag `catalog`); every admin catalog write must `EvictByTagAsync("catalog")`.
- Admin/login routes render on the client because JWT sessions use browser storage; public package detail retains SSR and static public routes prerender.
- Money = `decimal`, per-head BDT; sale price editable, cost always derived; price changes write `PriceHistory`.
- Conventional Commits; after each phase update `docs/DECISIONS.md` + `README.md`.

## 5. Progress log (done to date)

- [x] **Solution health** — `ZRC.Api` set as startup (`DefaultStartup="true"`); full build 0 errors. Added `run-zrc.cmd` / `run-zrc.ps1` (API + UI).
- [x] **Phase 0 (Foundation)** — skeleton, schemas, seeds (6 roles, 24 permissions, 75 grants, 16 menu items), scaffold drift check clean, arch 3/3, integration 4/4, `ng build` green.
- [x] **Phase 1 (Identity + RBAC + dynamic menu)** — JWT + refresh, permission policies, audit log, menu CRUD, login UI, dynamic sidebar, menu/user admin screens. Fixed `MapInboundClaims` 401 bug. Verified: SuperAdmin sees 7 menu groups, Kitchen sees 2, forbidden → 403. Tests 12/12.
- [x] **UI visual pass** — royal theme (emerald/maroon/gold), branded header/footer, home (hero, categories, how-it-works, featured), themed admin; fixed stale `app.spec.ts` (vitest 2/2).
- [x] **Phase 2 (Catalog + Excel import)** — 9 tables + `vw_PackageCosting`; importer yields 19 packages / 145 rows / 81 items, averages 319.47/186.84/132.63; business rules as data (Mutton +80 variant, MinGuests 40, inclusions, taglines); public catalog API (cached, cost-free) + admin CRUD/costing; admin UI (package editor with live margins, costing sheet + CSV + bulk adjust). Tests: arch 3/3, integration 26/26.
- [x] **CORS fix** — reorder + dev-only HTTPS redirection; verified `OPTIONS → 204`, `POST login → 200`, no redirects.

## 6. Next up

Public website and planned admin menu workflows are implemented. See `PLANNED-MENUS.md` for current scope and checks. Remaining production extensions include online payment/refund handling, outbound notifications and customer checkout UI; do not treat the broader phase roadmap as fully complete.
