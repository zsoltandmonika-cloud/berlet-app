# HealthHub · GOLDEN STANDARD RULE 🔩
**Approved visual baseline:** v528.1 Premium Glass and the v530 dark HEALTHHUB boot screen.

## Immutable shell on every HealthHub page
1. **HH ONE service pill:** upper-left, app-relative on desktop (centered 420px app); `6px` left and top inset (plus safe area), desktop top `14px + 6px`. Match the approved Premium Glass navy blue glass for Zsolt and subtle pink-navy glass for Mónika. Button remains clickable and shows *actual* health/connection state, never an invented status.
2. **Selected profile photograph / switch:** upper-right, exactly `45 × 45px`, border `2px`, corner radius `15px`, matching **6px** right/top inset; subtle light ice-blue `#e6f7ff` for Zsolt, soft rose `#ffe5f1` for Mónika; preserve original Home picker photograph bytes and one-tap profile switch. **Both top edges must be level.**
3. **Bottom taskbar:** fixed bottom `0`, horizontal center, width `min(100vw, 420px)`, height `58px` plus preserved OS safe-area padding, Premium Glass navy `rgba(15,30,54,.97)`, thin light-blue top border `rgba(140,198,243,.25)`, nav text `#b9d0e8`. Exactly the five existing Home destinations, not alternate white bars or duplicate controls. Profile-specific active indicator may use the matching accent.
4. **NO JUMPING / NO ANIMATION:** changing profile or page must never move, rescale, fade or animate these three fixed elements. Scrollable module content, dates, stats and highlighted tab may update independently. A full page navigation can load, but positions and dimensions remain identical when the next page paints.
5. **Loading:** approved v530 dark background and short HEALTHHUB text, then the finished Premium Glass Home. No old bright Home or old Léna Hero/icon flash. Respect the existing `?hhpremium=0` emergency classic fallback.

**Never modify** the approved v526.1 Mónika Hero, v527 Zsolt Hero, selected profile photo bytes, main Home layout, family Dropbox owner isolation, measurement histories, health permissions or native Android to achieve visual parity.

## Implementation references
- Source of truth (baseline): `healthhub/premium-home-compact-v525.css` and `healthhub/premium-glass-home-v520.css`, v528.1.
- Digital Health implementation: `healthhub/digital-health/golden-shell-v531.css` + `healthhub/golden-standard-avatars-v529.js` (byte-identical originals) + `digital-health/index.html` profile-view controller.
- CI: `healthhub/tests/digital-golden-shell-v531.test.cjs` and `.github/workflows/healthhub-digital-golden-shell-v531-qa.yml`.

## Release gate
A page or module is **not Golden Standard compliant** unless a regression test and real Samsung S24 Ultra visual check confirm all three fixed controls, the two profile themes, taps and no legacy flicker. New modules inherit this exact shell, they do not invent a replacement.
