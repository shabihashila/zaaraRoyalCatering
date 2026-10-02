# Public website review and upgrade - 2026-10-02

Update 2026-10-03: public contact/inquiry forms now persist to the staff inbox, and published CMS content and approved featured reviews appear on the website. The descriptions below record the earlier visual upgrade; see [current workflow details](PLANNED-MENUS.md).

## Repository review

Started with README.md, DEVELOPMENT_GUIDELINE 1.md and ZaraRoyalCatering.slnx, then inspected source recursively under web/src, src, tests, docs, database and seed (generated build outputs and node_modules excluded). There is no Git repository metadata in this workspace, so no commit or Git diff was created.

| Area | Current structure and findings |
| --- | --- |
| Backend | .NET 10 modular monolith: Identity, Navigation, Catalog, Ordering, Customers, Engagement, Content and Reporting. SharedKernel/Infrastructure.Common provide cross-cutting abstractions. Host wires modules, JWT permissions, CORS, output caching and rate limiting. Identity, Navigation and Catalog implement real use cases; the other five modules have largely empty contexts and ping endpoints. |
| Frontend | Angular 21 standalone components and signals; public and admin layouts; existing SSR and seven prerendered routes; public catalog fallback data; isolated lazy Three.js, GSAP and Lenis. Admin remains on the existing custom theme, not a complete Sparked/PrimeNG integration. |
| Database | SQL Server database-first SQL project, named constraints, computed costing view, idempotent seed scripts, deployment and per-schema scaffolding. No schema change was necessary for this design pass. |
| Seed | ClosedXML importer generates Catalogue.sql and catalogue.json from the workbook. 19 packages, 145 package-item links and 81 distinct menu items. Generated catalog data was preserved. |
| Tests | Three architecture checks and 26 database-backed integration checks; eight Angular unit checks for app shell, quotes and BDT formatting. Coverage is strongest around catalog confidentiality, seed accuracy, authentication and quote calculations. |
| Docs | README and decision log describe completed phases; docs/AGENTS.md has older progress/version notes. This report records the actual reviewed state. |

## Problems addressed

- Food and event presentation used emoji placeholders and gradients instead of real photographs.
- The home page made its procedural serving pot the main visual; real food now leads the page.
- Package cards lacked photography, consistent spacing, visual hierarchy and a coherent price/action area.
- Navigation crowded narrow viewports and promoted staff login over an event inquiry.
- Occasion links carried a category query parameter that the menu did not consume.
- `.reveal` hid content until JavaScript ran; About never initialized its reveal observer. Content is now visible by default.
- Gallery keyboard handling had no initial focus, focus containment or return to the opening item; hidden flip-card faces remained keyboard accessible.
- Public copy referenced development phases, internal costing policies and workbook implementation details.
- Contact/inquiry prepared local state but implied that staff would receive a submission. Copy now clearly explains that requests are prepared locally.
- The default SEO social image pointed to a nonexistent poster file.

## File-by-file changes

| File | Change |
| --- | --- |
| web/src/styles.scss | Premium public theme refinements: typography scale, spacing, photo cards, asymmetric photo hero, dark/cream surfaces, responsive header, mobile grids, sticky desktop quote, gallery styling, focus-friendly controls, visible content fallback. Existing CSS brand variables remain the editable palette source. |
| web/src/app/layouts/public-layout/public-layout.component.ts | Chef-cap brand accent, expandable mobile navigation, menu active state, customer inquiry CTA; staff login retained in footer. |
| web/src/app/features/public/home/home.component.ts | Food-led hero, real photos for categories/features/gallery, corrected distinct-item count, clearer customer copy, illustrative story label and optional 3D preview instantiated only when expanded. |
| web/src/app/features/public/menu/menu.component.ts | Photo package fronts, chef-cap title accents, category query handling, keyboard-safe flip-card interactions and inert hidden faces; compare/filter functionality retained. |
| web/src/app/features/public/package-detail/package-detail.component.ts | Responsive photo banner, chef-cap title accent and customer-focused estimate explanation; existing guests/variant/add-on arithmetic retained. |
| web/src/app/features/public/gallery/gallery.component.ts | Real photos, responsive sources, photo credits link, initial focus, Tab containment, Escape and arrow keys, focus returned to opener. |
| web/src/app/features/public/site-content.ts | Typed gallery photo paths and specific roast/borhani/firni entries. Existing CMS swap point retained. |
| web/src/app/features/public/food-images.ts | New centralized stock-photo map, contextual fallback selection and responsive srcset helper. Existing API-supplied package/category image URLs take precedence. |
| web/src/app/features/public/about/about.component.ts | Hospitality-led introductory copy rather than an implementation/workbook story. |
| web/src/app/features/public/contact/contact.component.ts | Request preparation labels and truthful local-only confirmation; validators and route prefilling retained. |
| web/src/app/features/public/inquiry/inquiry.component.ts | Event planning copy and truthful summary-only confirmation; form behavior retained. |
| web/src/app/core/seo.service.ts | Replaced missing default social image with a shipped food asset. Production domain remains an existing deployment setting to address. |
| web/src/index.html | Default Open Graph image uses a shipped asset. |
| web/public/assets/brand/chef-cap.svg | New lightweight, provisional gold chef-cap accent. It is not extracted from the unavailable original logo. |
| web/public/assets/food/*.webp | Eight food photos in 640px and 1280px WebP variants: biryani, feast, BBQ, breakfast, dessert, Bangladeshi roast, borhani and firni. Fixed image dimensions, lazy loading for cards, eager hero, responsive sources. |
| web/public/assets/food/*-credit.json | Source, author, license and transformation metadata for the three Wikimedia photographs. |
| web/public/assets/food/credits.html | Public photo attribution page including CC BY-SA terms for adapted Wikimedia photos. |
| README.md | Upgrade entry and documentation link. |
| docs/DECISIONS.md | Append-only decision entry for this design pass. |
| docs/UI-UPGRADE.md | This review, asset provenance, setup and validation record. |

## Branding and assets

No business logo was found in the workspace (including logo-name search and image inventory). The owner was asked for its location; pending that, the existing emerald #0d3b2e, deep emerald #082820, antique gold #c9a24b, cream #faf5ea and maroon #5c1a24 were retained. Change the `--zrc-*` variables at the beginning of styles.scss to adjust the palette. The chef-cap SVG is a provisional original icon, not a claim to reproduce the actual logo. Replace it with the actual brand mark and sample the logo colors when supplied.

Stock photography illustrates menu styles and is not represented as photos of the business's own events. The main gallery states this. Sources:

- Biryani: https://www.pexels.com/photo/delicious-chicken-biryani-4224314/
- Feast: https://www.pexels.com/photo/top-view-of-a-chicken-biryani-dish-12737817/
- BBQ: https://www.pexels.com/photo/grilled-chicken-skewer-with-herb-garnish-36194798/
- Breakfast: https://www.pexels.com/photo/close-up-of-paratha-in-a-frying-pan-8346891/
- Dessert: https://www.pexels.com/photo/food-healthy-meal-breakfast-116725/
- Bangladeshi roast: https://commons.wikimedia.org/wiki/File:Chicken_roast_in_Bangladesh.jpg
- Borhani: https://commons.wikimedia.org/wiki/File:A_Glass_of_Borhani.jpg
- Firni: https://commons.wikimedia.org/wiki/File:Food-Firni.jpg

Pexels assets use the Pexels license. Wikimedia assets retain their original license as recorded in the public credits and metadata. Images were cropped to 4:3, resized, metadata stripped and encoded as WebP (quality 80). All photos are local assets; there is no runtime image-CDN dependency. The hero uses a larger source and cards use responsive smaller variants. Existing fonts still use Google Fonts with local/system fallbacks. A separate rezala photograph was not added; no roast photograph is mislabeled as rezala.

## Setup

No new application dependency, database deployment, schema migration, seed regeneration or API configuration is required. Run `npm run build` or `npm start` in web as before. Playwright was installed only in the operating system temporary directory for verification and is not added to package.json or the project lockfile.

Before production, replace placeholder phone/WhatsApp/email/address in site-content.ts, the .local SEO origin and sitemap URLs with verified business details. Contact/inquiry backend delivery and order checkout remain pending original development phases; this upgrade does not turn prepared forms into persisted submissions. Existing sample testimonials are explicitly presented as illustrative event stories rather than verified reviews.

## Validation

- Angular production build and seven prerendered public routes verified.
- Angular unit suite: 8/8 passes on isolated rerun. Initial concurrent run timed out in the existing BDT-format test; isolated rerun passed in under two seconds.
- Backend architecture: 3/3 passes; API integration: 26/26 passes, including public cost confidentiality and seed verification.
- Browser QA: see final verification results appended below.
- No database schema or seed files changed; DACPAC deployment/scaffold drift cycle is not applicable to this presentation pass.
- No Lighthouse score is claimed. Layout checks and bundle sizes are not a measured Lighthouse performance/accessibility result.

## Remaining review findings

The backend test build reports existing vulnerable transitive dependencies (including Microsoft.OpenApi 2.0.0 and System.Security.Cryptography.Xml 9.0.0) and a Serilog version-resolution warning. Resolve these in a dedicated dependency update with a fresh restore and regression testing before production. /health currently registers no SQL health probe. Several future modules remain scaffolds. Catalog offline fallback can mask backend failures with static prices; the final quote must remain server-confirmed. Some admin APIs remain large endpoint files and do not implement every planned back-office screen. These are recorded as review findings rather than silently expanding a visual upgrade into new ordering/database architecture.

## Final browser verification

Headless Edge verified Home, Menu, Royal Kacchi detail, Gallery, Contact, About, Inquiry and FAQs at both 1440px and 390px: 16 route/viewport checks, no horizontal overflow, no broken images after image decoding and no JavaScript errors. Mobile menu opens and closes after navigation; lunch query selects lunch and yields three packages; hidden flip faces are inert; the visible flipped-card quote action navigates correctly; 60 guests with the Mutton variant displays BDT 34,800; gallery focus enters the viewer, wraps on Shift+Tab and returns to the opener after Escape. Desktop and mobile screenshots were visually reviewed. Reduced-motion mode was used for deterministic final interaction checks.

Final build: 441.44 kB initial raw / 114.34 kB estimated transfer, below the existing 500 kB warning budget; all seven static routes prerendered. Final frontend rerun: 8/8 passes. Backend tests: 29/29 passes. Evidence: [browser result JSON](ui-review/browser-results.json), [desktop home](ui-review/final-1440-home.webp), [mobile home](ui-review/final-390-home.webp), [desktop menu](ui-review/final-1440-menu.webp), [mobile package](ui-review/final-390-package.webp).
