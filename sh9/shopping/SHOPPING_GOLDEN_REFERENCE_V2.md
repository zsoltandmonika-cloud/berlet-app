# SHO Smart Shopping · Golden Reference V2
Date: 2026-11-20

## Approved user visual reference
Conversation upload: `image(20261119-234632).png` (941 × 1672 portrait).
Hero original: `letöltés.jpg` (1604 × 981 landscape), already represented by the approved `assets/hero-lena-ai-shopping-hub-v1.avif` file. Never crop, retouch or substitute the approved hero without approval.

## Key requirements
- Retain every functional Smart List, Favorites, Basket Match, Search, Voice, Barcode, Store Connect, Tesco V3 / multi-store handoff, local basket, Open Food Facts catalog, and bottom navigation handler.
- Retain 6 categories. Four columns by three rows in merchant overview, **all twelve** current baseline stores, including Shoperia.
- No fabricated merchant product prices, current promotions, stock, order, or API connectivity claims.
- Dark plum / blue Glass styling, discreet pink outlines, a two-shortcut row, and compact visual category/merchant overview.
- Preserve underlying detailed store cards for native Smart Shopping CTAs, management, and merchant-specific workflows.
- Do not alter other SHO modules by editing shared system styles.

## Safe rollback
- Pre-change branch: `backup/shopping-golden-pre-v2-20261120`
- Main visual stylesheet: `shopping-golden-reference-v2.css`
- Main markup: `index.html` (remove only `gs-ref-*` sections/labels and the stylesheet link to restore previous visual layout).
- No JS/data/storage/API modules changed for this visual pass.

## Fidelity limitation
The uploaded AI-generated reference is a flattened composition. The original six individual category renders were not supplied separately. The current version retains the app's existing six local category assets; it is **not a certified pixel-for-pixel copy** of the flattened mockup. Verify mobile screenshots and replace category visual assets only when exact approved stand-alone sources are available.
