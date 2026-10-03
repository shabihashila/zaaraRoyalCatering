# Brand refresh — 2026-10-04

The customer website and staff workspace now share the same red palette. The homepage uses the existing procedural serving handi as its main visual. The official logo attachment was unavailable; the header currently uses a text wordmark, and the provided color references guide the palette provisionally.

## Theme and hero

`web/src/styles.scss` defines semantic primary, hover, active, background, surface, text, border, accent and section-gradient tokens. Primary actions use accessible red `#E32119` with white text. `#FF0100` remains the bright brand reference; `#8F1A0A` and `#600B01` establish deeper reds. White and warm-neutral surfaces keep the pages light. Gold is limited to small decorative details.

`admin-theme.scss` consumes the shared palette across navigation, panels, dialogs, forms, calendar, statuses and tables. The HTML browser theme color and photo-credit page also use the red brand.

`home.component.ts` contains one `zrc-three-hero` in the main hero; the old expandable placement is removed. `three-hero.component.ts` supplies a static vessel fallback and guards asynchronous loading after component destruction. `handi-scene.ts` retains the original procedural geometry with smoother contours, warm metal, deep-red enamel, environment reflections, soft shadows and bounded motion. Rendering runs outside Angular, caps pixel density, pauses off-screen or when hidden, and disposes scene resources. No new dependencies were added.

## Image ownership

| Photograph | Content owner |
| --- | --- |
| Biryani | Homepage Royal Kacchi card |
| Roast | Homepage Royal Dinner card |
| BBQ | Homepage BBQ Night card |
| Rice spread | Gallery |
| Breakfast | Gallery |
| Borhani | Gallery |
| Firni | Gallery |

`food-images.ts` replaces name-based image guessing with explicit ownership. Category cards, menu listings, package detail and admin screens use clean text layouts. The homepage gallery invitation links to the collection without repeating its photographs. Responsive `-small` files are variants of the same photograph. The gallery lightbox displays the selected content item rather than assigning its image to another section. `managed-content.service.ts` deduplicates gallery URLs, including responsive variants, and excludes the reserved homepage images.

## Catalogue and backend

The retired category and its three packages are removed from the source workbook, public fallback, inquiry options, About copy, gallery/testimonial examples, sitemap and generated seeds. The importer publishes only the five current source categories. `RetireService.sql`, included before the catalogue seed in post-deployment, removes the legacy category, related packages and links, and five orphaned items. Its stable slug fingerprint works across independently seeded databases without keeping the retired service name in application data. It refuses to remove historical bookings; the local database had none.

The deployed local database contains 5 categories, 16 packages, 122 package-item links and 76 items. Mean sale price is 336.25 BDT, cost 196.56 BDT and profit 139.69 BDT. Public prices and surviving package business rules are unchanged. No schema changes, EF migrations or generated model edits were needed. CORS permits the loopback frontend origin in Development, with regression tests for allowed and unconfigured origins.

## Files changed

- Global styles, admin theme, public/admin layouts, browser theme color and photography credit page; obsolete chef-cap asset removed.
- Homepage, Three.js scene/wrapper, food-image map, managed-content gallery, menu/detail/gallery layouts, About, inquiry, contact and sign-in styling.
- Fallback catalogue, site content and sitemap.
- Source workbook, catalogue SQL/JSON, importer, retirement/post-deployment scripts and catalogue/CORS integration tests.
- README, development guideline and decision log.

## Validation

Angular production build and 16 frontend tests pass. The database project builds and publishes locally. All 46 API integration tests pass, including public cost confidentiality, catalogue totals, package rules and CORS. Workbook totals are recalculated and visually reviewed; its original native styles, row heights and extensions are preserved. Browser verification covers responsive layouts, image ownership, the main hero canvas, navigation, menu filtering, quotes, gallery controls and staff sign-in.

The official logo file is still needed for visual comparison and installation of the actual brand mark. Existing placeholder business contact details remain unchanged.
