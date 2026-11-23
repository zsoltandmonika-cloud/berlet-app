# SHO Életmód · Golden Standard web release candidate (2026-11-23)

## Delivered
- `sh9/lifestyle/` mobile-first launcher: Léna Recept Stúdió, Lakásfizetnivalók, Családi költségvetés (existing expense view), Smart List.
- `sh9/lifestyle/lakas-fizetnivalok/` original HTML-based household expenses logic, editable categories and consolidated Telekom entry.
- Approved Golden hero illustrations embedded as self-contained WebP data URLs in `assets/embedded-golden.css`; no external image host or binary artifact deployment dependency.
- OneDrive web adapter with PKCE, read-first import, local-data backup, manual first upload and optimistic eTag conflict protection.

## Safety / not ready for full activation
- Browser Microsoft OAuth redirect `https://zsoltandmonika-cloud.github.io/berlet-app/sh9/lifestyle/lakas-fizetnivalok/` is NOT yet verified as an authorized **SPA redirect** for client ID `506955c0-a62c-4391-8807-1e7ab2e237fd`.
- The production OneDrive AppFolder/financial data roundtrip and two-phone conflict test have NOT been validated. No personal finance data is committed to this repository.
- Existing Android APK and OneDrive files must remain unchanged. Do not automatically write to the cloud until an explicit tested import succeeds.
- **DO NOT ungray or wire the main SHO Életmód tile** until authentication, real cloud roundtrip and device tests succeed. The isolated web pages may be deployed for HTTPS verification while the main tile remains muted.

## Required checks before activation
1. SPA redirect registered to the exact HTTPS URL, Microsoft personal account sign-in verified.
2. AppFolder resolves to the expected OneDrive `Appok/Lakás Fizetnivalók/lakas_fizetnivalok.json` (or a carefully implemented validated migration).
3. Verified cloud import and roundtrip with non-production synthetic entries; meter photo restore; backup and eTag collision; both S24 Ultra phones.
4. Functional comparison with Android original including prior payment history and category persistence; accessibility and portrait sizing.
5. Only after passing all checks, connect `sh9/index.html` and route in `sh9/sho-preview/sho-wiring-v2.js`; remove only the Életmód item from muted styling.

Testing already performed on local test assets: `node test_dashboard.cjs`, `node test_categories.cjs`, `node test_onedrive_web.cjs` passed (mock/static only, not live cloud).
