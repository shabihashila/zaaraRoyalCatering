# Zaara Royal Catering — Development Guideline (Build Prompt)

> **To the agent (Muse Spark 1.3):** You are the lead full-stack engineer for this project. Read this whole document before you write any code. Build it phase by phase (section 12). At the end of each phase the solution must build, the database project must deploy to a clean database, the EF model must be re-scaffolded with no diff, and the phase's acceptance criteria must pass. If something here is ambiguous, pick the simplest option that fits the architecture, write it down in `docs/DECISIONS.md`, and keep going. Do not stop to ask unless you are truly blocked.

---

## 1. Product overview

**Zaara Royal Catering** is a catering business in Bangladesh. It sells **per-head meal packages** for events. Today the business runs from one Excel workbook (`zaara_royal_catering_menu.xlsx`, in the repo root). We are replacing that with an online platform that has three parts:

1. **Public website.** Customers learn about the business, browse packages, and see what each package contains and what it costs per head. It must look premium: animated, modern, and with 3D elements that make people want to stay on the page.
2. **Customer ordering and engagement.** Customers get a quote, place an order (a booking for an event), track its status, and talk to the business through inquiries, reviews, and a contact form.
3. **Internal back-office.** Staff manage the menu, costing, orders, customers, and content. Access is role-based, and the sidebar menu is **dynamic**: it comes from the database and is filtered by the user's permissions.

All money is in **Bangladeshi Taka (৳, BDT)**. Package prices are **per head**.

---

## 2. Business domain (from the Excel workbook)

### 2.1 Concepts

| Concept | Meaning |
|---|---|
| **Category** | An event/meal type: Breakfast, Lunch, Dinner, Milad & Doa Mahfil, Corporate Program, House Party |
| **Package** | A named set of items inside one category, sold at a fixed **sale price per head** |
| **Item** | A dish or component (e.g. *Chicken Roast*, *Borhani*). One item (e.g. *Salad*, *Dal*) can appear in many packages |
| **Package item cost** | What one item in one package costs per head (৳). The **same item can cost different amounts in different packages** because portion and quality differ (e.g. *Egg Curry* is ৳15 in Premium Breakfast but *Beef Bhuna* is ৳50 in Royal Breakfast and ৳60 in Premium Lunch). So cost belongs to the **package–item link**, not to the item |
| **Total cost** | The sum of that package's item costs. Always **calculated**, never typed in |
| **Profit / Margin** | Profit = Sale price − Total cost. Margin = Profit ÷ Sale price. Always **calculated** |
| **Package notes** | Business rules or add-ons attached to a package (see 2.3) |

> ⚠️ **Confidentiality rule:** Item costs, total cost, profit, and margin are **internal only**. They must never appear in a public API response, the public site, customer emails, or invoices. Customers see only the package name, the item list (no costs), the per-head sale price, and notes.

### 2.2 Package catalogue (seed data)

| Category | Package | Sale ৳/head | Cost ৳ | Profit ৳ | Margin |
|---|---|---:|---:|---:|---:|
| Breakfast | Classic Breakfast | 120 | 70 | 50 | 41.7% |
| Breakfast | Premium Breakfast | 180 | 105 | 75 | 41.7% |
| Breakfast | Royal Breakfast | 250 | 145 | 105 | 42.0% |
| Lunch | Standard | 250 | 145 | 105 | 42.0% |
| Lunch | Premium | 350 | 205 | 145 | 41.4% |
| Lunch | Royal Kacchi | 500 | 300 | 200 | 40.0% |
| Dinner | Standard | 280 | 165 | 115 | 41.1% |
| Dinner | Premium | 400 | 235 | 165 | 41.3% |
| Dinner | Royal Dinner | 550 | 320 | 230 | 41.8% |
| Milad & Doa Mahfil | Tabarak Package | 150 | 85 | 65 | 43.3% |
| Milad & Doa Mahfil | Standard Doa Mahfil | 220 | 130 | 90 | 40.9% |
| Milad & Doa Mahfil | Full Meal Package | 320 | 190 | 130 | 40.6% |
| Corporate Program | Snacks / Tea Break Package | 80 | 45 | 35 | 43.8% |
| Corporate Program | Box Lunch | 220 | 130 | 90 | 40.9% |
| Corporate Program | Standard Buffet | 380 | 220 | 160 | 42.1% |
| Corporate Program | Executive Buffet | 550 | 320 | 230 | 41.8% |
| House Party | Snacks Party | 200 | 115 | 85 | 42.5% |
| House Party | Full Dinner Party | 420 | 245 | 175 | 41.7% |
| House Party | BBQ Night | 650 | 380 | 270 | 41.5% |

Overall averages: sale ৳319.47, cost ৳186.84, profit ৳132.63, margin 41.7%. The admin dashboard must reproduce these numbers from the seeded data. Use them as a seed-verification test.

**Item-level seed data:** the sheet **"Item Cost Detail"** in `zaara_royal_catering_menu.xlsx` has 145 item rows (19 packages) of `Category | Package | Item | Item Cost (৳)`. Do **not** hand-type them. Write a one-time **seed importer** (a console command or seeder class that uses ClosedXML) that reads that sheet and upserts Categories, Packages, Items (deduplicated by normalized name), and PackageItems. Sale prices and notes come from the **"Package Summary"** sheet. After the import, assert that every package's computed cost equals the "Total Cost" column. Fail loudly if any package doesn't match. Database-first twist: the importer **does not write to the database directly**. It reads the Excel, validates the totals, and **generates `database/ZRC.Database/Scripts/Seed/Catalogue.sql`** (idempotent `MERGE` statements), which runs as part of the post-deployment script. It also writes `seed/catalogue.json` for reference. Re-run the importer only when the owner sends an updated workbook, then commit the regenerated SQL.

Examples of what the importer must produce (for sanity checks):
- *Classic Breakfast* = Paratha (2 pcs) 20 + Vegetable Bhaji 10 + Scrambled Egg 10 + Chola Dal 10 + Sweet 10 + Black Tea 10 = **৳70**
- *Royal Kacchi* = Kacchi Biryani (Mutton/Chicken) 205 + Borhani 25 + Salad 10 + Egg 15 + Fried Eggplant 10 + Shahi Zarda 20 + Sweet 10 + Paan-Supari 5 = **৳300**
- *BBQ Night* = Chicken/Beef BBQ 180 + Grilled Kebab 110 + Naan 25 + Salad Bar 20 + Dip Sauce 10 + Soft Drink 25 + Dessert 10 = **৳380**

### 2.3 Business rules found in the workbook (model these as data, not hard-coded text)

| Package | Rule | How to model |
|---|---|---|
| Lunch → Royal Kacchi | "Mutton Kacchi carries an extra ৳80/head" | A **package option/variant** (Chicken = +0, Mutton = +৳80/head) that the customer picks when ordering |
| Corporate → Standard Buffet | "Minimum 40 guests" | `Package.MinGuests = 40`, enforced in the quote/order validation on both client and server |
| Corporate → Executive Buffet | "Includes waiter service & cutlery" | A package inclusion note (display only) |
| Milad → Full Meal Package | "Includes packaging & distribution support" | An inclusion note |
| Corporate → Snacks / Tea Break | "Ideal for morning or afternoon meeting breaks" | A marketing tagline |
| House Party → BBQ Night | "Outdoor setup & live chef service available (extra charges apply)" | **Optional add-on services** with an admin-set price (flat or per head) that the customer can add to an order |

Generalise these ideas: every package can have `MinGuests`, `MaxGuests` (optional), a tagline, inclusion notes, **variants** (a per-head price delta), and **add-ons** (a flat or per-head price). Admins manage all of them.

In the workbook, sale prices are entered by hand and cost is calculated. Keep that split: **sale price is editable, cost is always derived** from package items. When an admin changes an item cost, every affected package's cost, profit, and margin update at once, because they are computed on read or in a view, never stored as independent truth.

---

## 3. Technology stack (fixed; do not substitute)

| Layer | Choice |
|---|---|
| Backend | **.NET 10**, ASP.NET Core **Minimal APIs**, C# latest |
| Database | **Microsoft SQL Server**, **database-first**. The schema lives in an SDK-style SQL Database Project (`Microsoft.Build.Sql`, `.sqlproj`) that builds to a **DACPAC** and is deployed with **SqlPackage** |
| Data access | **EF Core 10**, **scaffolded from the database** (`dotnet ef dbcontext scaffold`). **No EF migrations**: never run `Add-Migration`, `EnsureCreated`, or `Migrate()` |
| Auth | ASP.NET Core Identity + **JWT** access tokens (15 min) + rotating refresh tokens (httpOnly secure cookie) |
| Validation | FluentValidation (endpoint filters) |
| Logging | Serilog (console + rolling file + SQL sink optional), correlation IDs |
| API docs | OpenAPI (built-in `Microsoft.AspNetCore.OpenApi`) + Scalar UI in Development |
| Tests | xUnit, FluentAssertions, Testcontainers for SQL Server (or LocalDB fallback) with the **DACPAC deployed** into the test database, `WebApplicationFactory` integration tests |
| Frontend | **Angular (latest stable, standalone components, signals, new control flow)**, built on the **Sparked – Optimus UI** template: <https://sparked.openng.org> |
| UI kit | The template's stack: **PrimeNG** (design tokens `--p-*`), **Tailwind CSS v4**, Lato font, Font Awesome icons. Reuse its layout, sidebar, topbar, and theming for the **admin area** |
| Public-site motion/3D | **Three.js** (through a thin Angular wrapper component; `angular-three` is fine if you prefer), **GSAP + ScrollTrigger**, **Lenis** smooth scroll |
| FE tests | Jest or Vitest for unit tests, Playwright for E2E |

> **Template note:** Sparked is an Angular admin template built on PrimeNG and Tailwind. Get its source (from the openng/Sparked repository linked from the site) and use it as the Angular workspace base. Keep its layout service, theme configurator, and light/dark mode. Remove the demo pages we don't need. The **public site gets its own layout** (`PublicLayoutComponent`) that shares the design tokens but not the admin chrome.

---

## 4. Architecture — modular monolith

One deployable backend, with the code split into **modules** that have hard boundaries.

```
/database
  /ZRC.Database                  → .sqlproj: the single source of truth for the schema
     /identity /nav /catalog /ordering /customers /engagement /content /reporting
        /Tables /Views /StoredProcedures /Functions      (one object per .sql file)
     /Security                   → schema definitions (CREATE SCHEMA ...)
     /Scripts
        Script.PostDeployment.sql   → calls idempotent MERGE seed scripts (roles, permissions, menu, catalogue, site settings)
        /Seed/*.sql
  /scaffold.ps1                  → re-scaffolds every module's EF model from the database (see section 5.1)
/src
  /Host/ZRC.Api                  → Program.cs, composition root, middleware, module registration
  /BuildingBlocks
     ZRC.SharedKernel            → Entity/AggregateRoot base, Result<T>, Money (BDT), domain events, IClock, paging
     ZRC.Infrastructure.Common   → EF base DbContext, outbox, audit interceptor, soft-delete, email/SMS abstractions
  /Modules
     /Identity      (Api, Application, Domain, Infrastructure)   → users, roles, permissions, refresh tokens
     /Navigation    (…)                                            → dynamic menu
     /Catalog       (…)                                            → categories, items, packages, package items, variants, add-ons, costing
     /Ordering      (…)                                            → quotes, orders, order lines, status workflow, invoices
     /Customers     (…)                                            → customer profiles, addresses
     /Engagement    (…)                                            → inquiries, contact messages, reviews/testimonials, newsletter
     /Content       (…)                                            → CMS-lite: about page, hero, gallery, FAQs, site settings (phone, address, socials)
     /Reporting     (…)                                            → dashboards (read-only, queries across modules through read models/views)
  /Tools/ZRC.SeedImporter        → Excel → DB/JSON importer
/tests
  /Modules.<Name>.Tests, /ZRC.Api.IntegrationTests, /ZRC.ArchitectureTests
/web                             → Angular workspace (Sparked-based)
/docs                            → DECISIONS.md, API.md, RUNBOOK.md
```

**Module rules (enforce them with NetArchTest in `ZRC.ArchitectureTests`):**
- Each module has its **own SQL schema** (`identity`, `nav`, `catalog`, `ordering`, `customers`, `engagement`, `content`, `reporting`) and its **own scaffolded DbContext**, generated only from that schema. All schemas live in one database and are defined in the one `.sqlproj`.
- A cross-schema **foreign key** is allowed only where data integrity really needs it (e.g. `ordering.OrderLines.PackageId → catalog.Packages`). Even then, the Ordering module reads catalog data through the Catalog contract, never through navigation properties. Exclude cross-schema navigations when scaffolding.
- A module never references another module's `Domain`, `Infrastructure`, or `DbContext`. Modules talk to each other only through:
  - a small **public contract** (`ZRC.Modules.Catalog.Contracts`: interfaces + DTOs, e.g. `ICatalogQuery.GetPackageForOrder(id)`), or
  - **integration events** through an in-process bus plus a **transactional outbox** (e.g. `OrderConfirmed` → Engagement sends a thank-you and review request).
- Each module exposes one `IModule` with `RegisterServices(IServiceCollection, IConfiguration)` and `MapEndpoints(IEndpointRouteBuilder)`. `Program.cs` discovers and registers the modules.
- Endpoints are grouped: `/api/public/...` (anonymous or customer) and `/api/admin/...` (staff; permission policy on each endpoint).
- Use **vertical slices** inside `Application` (one folder per use case: request, validator, handler, endpoint mapping). Don't add a generic repository over EF.

---

## 5. Data model (key tables)

### 5.1 Database-first workflow (mandatory)

The database is designed first, and the code follows it. Every schema change follows these steps, in this order:

1. **Change the SQL** in `database/ZRC.Database`: tables, keys, indexes, constraints, views, stored procedures. Use one object per file and explicit names (`PK_Packages`, `FK_PackageItems_Packages`, `IX_Orders_EventDate`, `CK_Packages_SalePrice_Positive`, `DF_Orders_Status`).
2. **Build** the project to a DACPAC (`dotnet build database/ZRC.Database`). The build catches broken references.
3. **Deploy** locally: `SqlPackage /Action:Publish /SourceFile:... /TargetConnectionString:...` (wrap it in `database/deploy.ps1`). Set `BlockOnPossibleDataLoss=true` for every environment except a throwaway local database.
4. **Re-scaffold** by running `database/scaffold.ps1`. For each module it runs `dotnet ef dbcontext scaffold` with `--schema <module>`, `--context <Module>DbContext`, `--output-dir` pointing at the module's `Domain/Entities`, `--context-dir` pointing at its `Infrastructure/Persistence`, `--no-onconfiguring`, `--use-database-names`, and `--force`.
5. **Commit** the SQL change and the regenerated code together.

Rules:
- **Never hand-edit generated files.** Put entity behaviour in `partial` classes next to them (e.g. `Package.Behaviour.cs`) and context customisation in the `OnModelCreatingPartial` partial method. Generated files go in a `Generated/` folder with a header comment saying so.
- **Scaffolded entities have no EF dependency.** They are POCOs in the Domain project, and the architecture tests check this.
- **Business rules that the data itself must obey go in the database too:** CHECK constraints (price > 0, rating 1–5, guests ≥ 1), unique indexes (slugs, OrderNo), and FKs. The same rules are also validated in code, so users get friendly error messages.
- **Views and stored procedures are first-class.** Costing, reporting, the kitchen prep sheet, and the admin dashboard read from **views** (mapped as keyless entities). Multi-row atomic operations such as `ordering.usp_PlaceOrder` (price snapshot + OrderNo generation) may be stored procedures called through `FromSql`/`ExecuteSql`.
- **Seed data lives in post-deployment scripts** as idempotent `MERGE` statements: roles, permissions, role–permission grants, the admin menu, site-setting placeholders, and the catalogue. Deploying twice must change nothing.
- **Drift check in CI:** deploy the DACPAC to a fresh SQL Server container, run `scaffold.ps1`, and fail the build if `git diff` is not empty.
- Put audit columns (`CreatedAt`, `UpdatedAt`) and their `DEFAULT` constraints in the table DDL. `CreatedBy`/`UpdatedBy` are set by a `SaveChanges` interceptor.

### 5.2 Tables

Money columns are `decimal(12,2)`. Every table gets `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`, and a `RowVersion` (rowversion) for optimistic concurrency. Business tables are soft-deleted with `IsDeleted`.

**catalog**
- `Categories` (Id, Name, Slug, Description, ImageUrl, SortOrder, IsActive)
- `Items` (Id, Name, NameBn?, Description, IsVegetarian, Allergens, ImageUrl, IsActive)
- `Packages` (Id, CategoryId, Name, Slug, Tagline, Description, SalePricePerHead, MinGuests, MaxGuests?, HeroImageUrl, Model3DUrl?, SortOrder, IsFeatured, IsActive)
- `PackageItems` (PackageId, ItemId, **CostPerHead**, DisplayName? (e.g. "Paratha (2 pcs)"), SortOrder)
- `PackageInclusions` (PackageId, Text): notes like "Includes waiter service & cutlery"
- `PackageVariants` (Id, PackageId, Name, PriceDeltaPerHead, CostDeltaPerHead, IsDefault): e.g. Royal Kacchi Chicken +0 / Mutton +80
- `AddOns` (Id, Name, Description, PricingType [Flat|PerHead], Price, Cost, IsActive) and `PackageAddOns` (PackageId, AddOnId)
- `PriceHistory` (PackageId, OldPrice, NewPrice, ChangedAt, ChangedBy)
- SQL view `catalog.vw_PackageCosting` → SalePrice, TotalCost, Profit, MarginPct (admin/reporting only)

**ordering**
- `Quotes` (Id, CustomerId?, PackageId, VariantId?, Guests, EventDate, Snapshot JSON, TotalAmount, ExpiresAt)
- `Orders` (Id, OrderNo `ZRC-YYYYMM-####`, CustomerId, EventType, EventDate, EventTime, VenueAddress, Area/District, Guests, Status, SubTotal, AddOnTotal, DeliveryCharge, Discount, Vat?, GrandTotal, AdvancePaid, PaymentStatus, SpecialInstructions, AssignedStaffId?)
- `OrderLines` (OrderId, PackageId, VariantId?, Guests, UnitPricePerHead, **UnitCostPerHead (internal snapshot)**, LineTotal)
- `OrderAddOns` (OrderId, AddOnId, Qty, UnitPrice, LineTotal)
- `OrderStatusHistory` (OrderId, FromStatus, ToStatus, Note, ChangedBy, ChangedAt)
- `Payments` (OrderId, Method [Cash|bKash|Nagad|Bank|Card], Amount, Reference, PaidAt, RecordedBy)

> Orders **snapshot** prices and costs at the moment they are placed. A later menu price change must never alter an existing order.

**Order status workflow:** `Pending → Confirmed → InPreparation → Dispatched → Delivered → Completed`, plus `Cancelled` (from Pending/Confirmed) and `Rejected` (from Pending). Only valid transitions are allowed; every transition is written to `OrderStatusHistory` and raises an integration event.

**customers:** `Customers` (Id, UserId?, FullName, Phone (BD format `01XXXXXXXXX`), Email, Organization?), `CustomerAddresses`.

**engagement:** `Inquiries` (custom/large-event requests), `ContactMessages`, `Reviews` (OrderId, Rating 1–5, Comment, IsApproved, IsFeatured), `NewsletterSubscribers`.

**content:** `SiteSettings` (key/value: Phone, WhatsApp, Email, Address, MapEmbed, Facebook, BusinessHours), `Pages` (About, Terms, Privacy), `HeroSlides`, `GalleryImages`, `Faqs`, `Testimonials` (or reuse approved Reviews).

**identity / nav:** see sections 6 and 7.

---

## 6. Role-based authentication and authorization

**Two kinds of users:**
- **Customers** register or log in with phone or email plus password (phone OTP is an optional phase-5 feature). They can place orders, see their own orders, and write reviews.
- **Staff** use the internal back-office. There is no self-registration: an admin creates staff accounts.

**Permission-based RBAC** (roles are bags of permissions; code checks **permissions**, never role names):

- Tables: `Roles`, `Permissions` (Code e.g. `catalog.package.edit`, Module, Description), `RolePermissions`, `UserRoles`.
- Permissions are **seeded in the database project's post-deployment script** (`Seed/Permissions.sql`, MERGE). Each module also declares matching string constants. At startup the API checks that every constant exists in `identity.Permissions` and **fails fast** if one is missing. The app never writes schema or seed data itself.
- ASP.NET Core Identity tables (users, claims, logins, tokens) are **written as DDL in the `identity` schema** of the database project, matching the Identity store's expected columns. `IdentityDbContext` is mapped onto them; there are no Identity migrations.
- Every admin endpoint uses `.RequirePermission("catalog.package.edit")`, which is implemented with a dynamic `IAuthorizationPolicyProvider` and a permission requirement handler. The JWT carries roles; permissions are resolved server-side and cached (and invalidated when roles change).
- The Angular side uses a `*hasPermission` structural directive and a `permissionGuard` for routes. **The UI hides; the API enforces.**

**Seeded roles:**

| Role | Can do |
|---|---|
| **SuperAdmin** | Everything, including role/permission and menu management |
| **Admin / Owner** | Everything except system settings; sees costing and profit |
| **Manager** | Orders (all statuses), customers, inquiries, reviews, content; sees costing |
| **Kitchen Staff** | View confirmed/in-preparation orders and the prep sheet (items × guest counts); update status to InPreparation/Dispatched; **no prices or costs** |
| **Sales / Support** | Create orders on behalf of customers, manage inquiries and contact messages; sees sale prices, **not costs** |
| **Customer** | Public and customer endpoints only |

Seed one SuperAdmin from configuration (`Seed:SuperAdmin:Email/Password` via user-secrets or environment variables, never committed). Lock the account out after 5 failed logins. Every privileged action is audited to an `AuditLogs` table (who, what, entity, before/after JSON, IP, time).

---

## 7. Dynamic menu

The admin sidebar (and optionally the public header nav) is built **from the database** at runtime.

- Table `nav.MenuItems`: Id, ParentId?, Key, Label, LabelBn?, Icon (Font Awesome or PrimeIcons class), Route, ExternalUrl?, **RequiredPermission?**, SortOrder, IsVisible, MenuArea [Admin|Public].
- `GET /api/admin/navigation/menu` returns the **tree already filtered** to the current user's permissions. A parent with no visible children is left out.
- Admin UI → **Menu Management** screen (SuperAdmin): tree editor with drag-and-drop reorder (PrimeNG `p-tree`/`p-treeTable`), add/edit/hide, icon picker, permission picker.
- Angular: `NavigationService` loads the menu after login and stores it in a signal store. The Sparked layout's menu component renders it, mapping our DTO to PrimeNG `MenuItem`. Route guards still check permissions, so a hidden menu entry is not a security boundary.
- Seed the menu: Dashboard · Orders (All, Calendar, Kitchen Prep Sheet) · Catalog (Categories, Items, Packages, Add-ons, Costing & Margins) · Customers · Engagement (Inquiries, Messages, Reviews, Newsletter) · Content (Pages, Hero, Gallery, FAQs, Site Settings) · Reports · Administration (Users, Roles & Permissions, Menu Management, Audit Log).

---

## 8. Public website — design and experience

Goal: it should feel **royal, warm, and appetising**, like Bangladeshi wedding and feast culture brought up to a modern standard. Suggested palette: deep emerald or royal maroon, antique gold accents, warm cream surfaces, and a dark mode with gold on charcoal. Use a display serif for headings (e.g. *Playfair Display* or *Cormorant*), Lato for body text (matching the template), and a Bangla-ready fallback (*Hind Siliguri*).

### Pages
1. **Home**
   - **3D hero**: a Three.js scene with a slowly rotating ornate serving platter or *handi* (a biryani pot) with steam particles and warm rim lighting. It reacts subtly to the mouse (parallax tilt) and scroll (the camera dollies in). Use a GLB model if one is available, or a procedurally built fallback (lathe geometry for the pot, instanced particles for the steam).
   - Animated headline ("Royal feasts, crafted for your moments") with a staggered letter reveal (GSAP).
   - **Category showcase**: 6 cards with 3D tilt-on-hover (CSS `perspective` plus a GSAP quickTo) and an image parallax layer.
   - "How it works" (Choose package → Tell us guests & date → We cook & deliver), animated in on scroll.
   - Featured packages carousel, animated counters (events served, guests fed), testimonials, gallery teaser, CTA band.
2. **Menu & Packages**: filter by category, guest count, and budget per head. Package cards flip in 3D (front: name, price/head, tagline; back: the item list). Include a compare drawer for 2–3 packages.
3. **Package detail**: hero image or 3D model, item list with icons, inclusions, variants (e.g. Mutton +৳80), add-ons, a **live quote calculator** (guests × (price + variant) + add-ons; enforces MinGuests), and a "Book this package" CTA.
4. **Book / Checkout**: a multi-step form (Package → Event details → Contact → Review → Submit), with an order summary that sticks to the screen.
5. **About us** (story, kitchen, hygiene, team), **Gallery** (masonry plus lightbox), **FAQs**, **Contact** (form, map, WhatsApp click-to-chat, phone), **Custom event inquiry** (for weddings or 500+ guests).
6. **Customer area**: My orders (status timeline), order detail, invoice PDF, write a review, profile.

### Motion and 3D rules
- **Performance budget**: LCP < 2.5 s on 4G mobile; the 3D bundle is **lazy-loaded** after first paint. Show a poster image until WebGL is ready. Cap devicePixelRatio at 1.5–2. Pause rendering when off-screen (IntersectionObserver) or when the tab is hidden.
- **Fallbacks**: without WebGL, or on low-end devices (`navigator.hardwareConcurrency <= 4` plus a mobile UA), use a static image or CSS 3D.
- **Accessibility**: respect `prefers-reduced-motion` (turn off parallax, smooth scroll, and auto-rotation). WCAG 2.2 AA contrast, keyboard navigation, focus rings, alt text.
- Run Three.js outside the Angular zone (or zoneless change detection) so animation frames don't trigger change detection.
- **SEO**: use **Angular SSR / prerendering** for public routes. Add meta and OG tags per package, `Restaurant`/`FoodEstablishment` + `Offer` JSON-LD, a sitemap.xml, and robots.txt.
- **i18n**: English first, but structure the code for **Bangla (bn-BD)** (Angular i18n or Transloco). Show ৳ amounts formatted `৳1,20,000` (en-IN-style grouping is common in BD; make it configurable).

---

## 9. Internal back-office (admin, on the Sparked layout)

- **Dashboard**: orders today/this week, upcoming events calendar, revenue (sale), cost and profit (permission-gated), average margin per category, top packages, pending inquiries. Use PrimeNG charts.
- **Catalog → Packages**: CRUD. The item grid has an inline-editable **cost per head** (like the yellow cells in the Excel) and an editable **sale price** (like the blue cells). **Computed total cost, profit, and margin % update live** as you edit. Highlight packages whose margin falls below a configurable threshold (default 35%). Keep price history.
- **Catalog → Costing & Margins**: a sheet-like table that mirrors "Package Summary", with Excel export (the business owner will want it) and bulk % price adjustment with a preview.
- **Orders**: list with filters (status, date range, category), a calendar view, and a detail page with the status transition buttons allowed for the current status, payments, notes, and a printable invoice.
- **Kitchen prep sheet**: for a date, aggregate confirmed orders → items × total heads (plus variants), printable. It shows **no money**.
- **Customers, Inquiries, Messages, Reviews** (approve/feature), **Content** screens, **Users/Roles/Permissions**, **Menu Management**, **Audit log**.
- All tables: server-side paging, sorting, and filtering (PrimeNG `p-table` lazy mode). Forms: reactive forms plus server validation errors mapped onto the fields.

---

## 10. API conventions

- REST, JSON, camelCase. Versioned under `/api/v1/...`. The `public` and `admin` route groups are separate.
- Errors use **RFC 9457 ProblemDetails**, with validation errors keyed by field.
- Paging: `?page=1&pageSize=20&sort=eventDate:desc&search=...` → `{ items, page, pageSize, totalCount }`.
- Handlers return `Result<T>`; map it to `TypedResults`. No exceptions for control flow.
- Use `ETag`/`RowVersion` for concurrency on admin updates (409 on conflict).
- Rate-limit the public endpoints that write (orders, inquiries, contact, auth) with the built-in `RateLimiter`.
- Configure CORS for the Angular origin only. Use HTTPS, HSTS, and security headers (CSP that allows the Three.js/worker needs).
- Cache public catalog responses (output caching, 5 min, evicted on catalog change).
- Money is always `decimal`, never `double`. Round only for display.

Sample public endpoints:
```
GET  /api/v1/public/categories
GET  /api/v1/public/packages?category=lunch&guests=50&maxPrice=400
GET  /api/v1/public/packages/{slug}              → items (no cost), inclusions, variants, add-ons
POST /api/v1/public/quotes                       → price calculation, server-authoritative
POST /api/v1/public/orders                       (customer auth)
GET  /api/v1/public/me/orders | /{orderNo}
POST /api/v1/public/inquiries | /contact | /reviews | /newsletter
GET  /api/v1/public/site-settings | /faqs | /gallery | /testimonials
POST /api/v1/auth/register | /login | /refresh | /logout
```

---

## 11. Cross-cutting requirements

- **Notifications**: `INotificationSender` abstraction with Email (SMTP/MailKit) and SMS (a BD gateway adapter stub) implementations. Send on order placed, confirmed, status changed, inquiry received (to staff), and review request after completion. Use background processing through the outbox (a hosted service).
- **Payments (phase 5)**: start with **manual payment recording** (cash/bKash/Nagad reference). Put an `IPaymentGateway` abstraction in place for SSLCommerz/bKash later. Support an advance/deposit %, configurable in settings.
- **Files**: `IFileStorage` (local disk in dev; Azure Blob/S3 adapter later). Validate images, store them in WebP, and generate responsive sizes.
- **Config and secrets**: `appsettings.json` plus user-secrets or environment variables. No secrets in git. Provide `appsettings.Development.json.example`.
- **Observability**: Serilog structured logs, `/health` (DB check), request timing.
- **Dev experience**: `docker-compose.yml` with SQL Server 2022+ (the dev machine may also have a local SQL Server; support a connection string override), a `README.md` with one-command startup, and a `.editorconfig`. Nullable enabled, warnings as errors in CI.
- **CI**: a GitHub Actions workflow that builds, tests (backend + frontend), lints, and runs the architecture tests.

---

## 12. Delivery phases (build in this order)

| Phase | Scope | Done when |
|---|---|---|
| **0 – Foundation** | Solution skeleton, modules wiring, SharedKernel, **`ZRC.Database` .sqlproj with all schemas + `deploy.ps1` + `scaffold.ps1`**, scaffolded DbContexts per schema, Serilog, ProblemDetails, OpenAPI/Scalar, docker-compose, Angular workspace from Sparked with admin + public layouts, CI | DACPAC builds and deploys twice to a clean DB with no changes on the second run; scaffold drift check passes; `dotnet build`, `ng build`, and architecture tests pass; an empty admin shell and public shell render |
| **1 – Identity + RBAC + Dynamic menu** | Identity/nav DDL + post-deploy seed (roles, permissions, menu), startup permission check, JWT + refresh, permission policies, audit log, menu tables + API + Menu Management UI, login screens | SuperAdmin logs in, creates a Kitchen user, and the Kitchen user sees only their menu entries; forbidden API calls return 403 |
| **2 – Catalog + Excel import** | Catalog DDL, `vw_PackageCosting`, seed importer → `Catalogue.sql`, admin package/item/add-on screens with live margin calc, Costing & Margins sheet + Excel export | Import reproduces all 19 packages; totals match the workbook exactly; averages equal ৳319.47 / ৳186.84 / ৳132.63 / 41.7%; public API never returns cost fields (integration test proves it) |
| **3 – Public website** | Home with 3D hero, packages listing/detail with quote calculator, about, gallery, FAQ, contact, SSR/SEO, animations, reduced-motion + WebGL fallbacks | Lighthouse (mobile) Performance ≥ 85, Accessibility ≥ 95, SEO ≥ 95 on Home and Package detail |
| **4 – Ordering + Customers** | Registration/login for customers, checkout wizard, orders with snapshots (`ordering.usp_PlaceOrder`), status workflow, admin order management, calendar, kitchen prep sheet, invoices (PDF, QuestPDF) | E2E: customer books Royal Kacchi (Mutton, 60 guests) → total = 60 × (500 + 80) = ৳34,800 plus add-ons; admin confirms; kitchen sees the prep sheet without prices |
| **5 – Engagement + Content + Reports** | Inquiries, contact, reviews moderation, newsletter, CMS-lite, notifications via outbox, dashboards, manual payments | Staff get inquiry notifications; an approved review shows on Home; dashboard figures match SQL |
| **6 – Hardening** | Rate limits, security headers, perf pass, Bangla i18n scaffolding, backups/runbook | `docs/RUNBOOK.md` complete; OWASP top-10 checklist reviewed |

After each phase, update `docs/DECISIONS.md` and `README.md` and write a short changelog entry.

---

## 13. Coding standards

- **C#**: file-scoped namespaces, primary constructors where they read clearly, `record` DTOs, `sealed` by default, async all the way with `CancellationToken`, no `.Result`/`.Wait()`. EF model code is **generated** by scaffolding (section 5.1): don't hand-write `IEntityTypeConfiguration<T>` or add data annotations; extend with partial classes and `OnModelCreatingPartial` only. Use `AsNoTracking` plus projections for reads.
- **Domain**: rich entities that guard their invariants (e.g. `Package.SetSalePrice` rejects ≤ 0; `Order.ChangeStatus` validates transitions). Value objects: `Money`, `PhoneNumber`, `Slug`, `GuestCount`.
- **Angular**: standalone components, `OnPush`/signals, feature folders (`/features/public/...`, `/features/admin/...`), lazy-loaded routes, typed reactive forms, an HTTP interceptor for JWT + refresh + ProblemDetails → toast. No `any`. Keep Three.js code isolated in `/shared/three/`.
- **Tests**: unit tests for domain rules and price calculation; integration tests for every endpoint's auth (401/403/200); a snapshot test that public DTOs contain no cost/profit fields; Playwright happy paths for booking and admin confirmation.
- **Commits**: Conventional Commits. Small, focused PR-sized changes.

---

## 14. Open items (use these defaults and make them easy to change)

| Topic | Default |
|---|---|
| Business phone/address (placeholders in the Excel: "01XXX-XXXXXX", "enter your area name") | Store in `SiteSettings`; seed placeholders; editable in admin |
| Delivery charge | Configurable: flat by area/district, default ৳0 |
| VAT | Off by default; configurable % |
| Advance payment | 30% of the grand total, configurable |
| Minimum lead time for orders | 48 hours before the event, configurable per category |
| Online payment gateway | Out of scope until Phase 5; abstraction only |
| 3D assets | Procedural fallbacks first; `Package.Model3DUrl` allows GLB uploads later |

---

## 15. First response expected from you

Before you write code, reply with:
1. The final solution/folder tree.
2. The module list with each module's public contracts and integration events.
3. The ERD (Mermaid) for all schemas.
4. The **DDL for the Phase 0/1 tables** (`CREATE SCHEMA` + `CREATE TABLE` with keys, constraints, and indexes) exactly as it will go into the `.sqlproj`.
5. The Phase 0 task list.

Then start Phase 0.
