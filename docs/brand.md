# SpaceYew brand assets

The SpaceYew symbol is an original SY monogram drawn as SVG paths on an ink rounded square. The source of truth is `src/app/icon.svg`; the SpaceYew wordmark keeps the website’s editorial serif type. Portfolio illustrations, résumé images, certificates and test screenshots are content, not reusable brand assets.

Run `npm run brand:icons` after changing the SVG. `scripts/brand-icons.mjs` uses Sharp to deterministically generate `src/app/favicon.ico` (16, 32 and 48 px), `src/app/apple-icon.png` (180 px) and `public/brand/spaceyew-icon.png` (512 px). PNG exports include an origin note; no image generation model is involved.

The command also regenerates `src/lib/brand-icon.ts` with `/icon.svg?v=<first 12 characters of the SVG SHA-256>`. `BrandMark` uses this versioned URL so a changed mark receives a new cache key. Regenerate and commit the SVG, exports and URL module together.

The symbol appears at 32 px beside the visible SpaceYew wordmark, reducing to 30 px below 540 px, with a 10 px gap. In this combination, `BrandMark` uses empty `alt` and `aria-hidden="true"`; the surrounding link takes its accessible name from the visible wordmark. If the symbol is ever used alone as a control, that control needs an explicit accessible name.
