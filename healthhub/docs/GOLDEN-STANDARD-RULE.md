# HealthHub · GOLDEN STANDARD RULE 🔩
**Approved visual baseline:** v528.1 Premium Glass and the v530 dark HEALTHHUB boot screen.

## Immutable shell on every HealthHub page
1. **HH ONE service pill:** upper-left, app-relative on desktop (centered 420px app); `6px` left and top inset (plus safe area), desktop top `14px + 6px`. Match the approved Premium Glass navy blue glass for Zsolt and subtle pink-navy glass for Mónika. Button remains clickable and shows *actual* health/connection state, never an invented status.
2. **Selected profile photograph / switch:** upper-right, exactly `45 × 45px`, border `2px`, corner radius `15px`, matching **6px** right/top inset; subtle light ice-blue `#e6f7ff` for Zsolt, soft rose `#ffe5f1` for Mónika; preserve original Home picker photograph bytes and one-tap profile switch. **Both top edges must be level.**
3. **Bottom taskbar:** fixed bottom `0`, horizontal center, width `min(100vw, 420px)`, height `58px` plus preserved OS safe-area padding, Premium Glass navy `rgba(15,30,54,.97)`, thin light-blue top border `rgba(140,198,243,.25)`, nav text `#b9d0e8`. Exactly the five existing Home destinations, not alternate white bars or duplicate controls. Profile-specific active indicator may use the matching accent.
4. **NO JUMPING / NO ANIMATION:** changing profile or page must never move, rescale, fade or animate these three fixed elements. Scrollable module content, dates, stats and highlighted tab may update independently. A full page navigation can load, but positions and dimensions remain identical when the next page paints.
5. **Loading:** approved v530 dark background and short HEALTHHUB text, then the finished Premium Glass Home. No old bright Home or old Léna Hero/icon flash. Respect the existing `?hhpremium=0` emergency classic fallback.

**Never modify** the approved v526.1 Mónika Hero, v527 Zsolt Hero, selected profile photo bytes, main Home layout, family Dropbox owner isolation, measurement histories, health permissions or native Android to achieve visual parity.

## Quiet prestige · the Golden Standard must not advertise itself (2026-10-29)

> **Az igazi prémium minőség nem hirdeti magát. Felismerhető.**
>
> The quality of a bespoke garment is recognized by its fit and finish, not by a large label. HealthHub and SH9 should behave the same way.

**Binding design principle for all new and revised HealthHub / SH9 surfaces:**
- **Golden Standard is an internal engineering, visual and usability specification, never a customer-facing advertising label.** Do not place `Golden Standard`, `Premium`, `Elite`, `Luxury`, `Gold` or equivalent self-congratulatory copy in a page header, hero, navigation button, card, badge, decorative watermark or footer to claim design quality.
- Users should perceive premium craftsmanship through precise spacing, deliberate typography, calm smoked glass, restrained illumination, sharp approved imagery, coherent navigation, fast response, true data, clear status, one-tap ergonomics and reliable behavior.
- The interface must **show what it does**, not announce how prestigious it is. Remove redundant design-standard captions and technical implementation disclaimers from the visible UI; keep legitimate safety, privacy, service-state, source and accessibility information when needed.
- **Allowed exceptions:** internal docs, commit names, QA labels, developer-only diagnostics, or the accurate name of an actual user-relevant product/service plan. Never hide information the user needs solely to achieve aesthetic minimalism.
- Before approving any new or updated screen, ask: **“Would this UI still feel unmistakably premium if we removed every word claiming it was premium?”** The answer must be yes. Visually verify this on S24 Ultra for both profiles; do not treat a passing unit test as photographic proof.

This rule governs future pages and incremental polishing. It is **not** authorization to mass-delete existing functional labels or to alter previously approved imagery without review.

## Implementation references
- Source of truth (baseline): `healthhub/premium-home-compact-v525.css` and `healthhub/premium-glass-home-v520.css`, v528.1.
- Digital Health implementation: `healthhub/digital-health/golden-shell-v531.css` + `healthhub/golden-standard-avatars-v529.js` (byte-identical originals) + `digital-health/index.html` profile-view controller.
- CI: `healthhub/tests/digital-golden-shell-v531.test.cjs` and `.github/workflows/healthhub-digital-golden-shell-v531-qa.yml`.

## Release gate
A page or module is **not Golden Standard compliant** unless a regression test and real Samsung S24 Ultra visual check confirm all three fixed controls, the two profile themes, taps and no legacy flicker. New modules inherit this exact shell, they do not invent a replacement.
