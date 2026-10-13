# HealthHub · Digital Health / Wellbeing · Activation Gate
Date: 2026-10-14

## Goal
Keep the user-approved Golden dashboard under `healthhub/digital-health/` with the finalized Hero composition in a 16:9 image ABOVE the dashboards. The Hero must use the user-approved portrait showing Léna, Zsolt and Mónika, the backlit wireless keyboard, and night Budapest. **Do not regenerate or replace the approved image**.

## This branch does / does not
- Copies the existing responsive Golden preview layout into an independent route; daily/7-day/30-day/profile navigation works.
- Removes **all generated demo numbers** from the activation route. Missing authenticated data shows `—` / `Nincs ellenőrzött adat`, never simulated measurements or zero.
- Preserves blue Zsolt and pink Mónika themes.
- Includes an explicit unresolved Hero asset slot at `healthhub/assets/hero-digital-health-approved .png`.
- Does **not** connect Android private usage data, Dropbox, Sleep Intelligence, Ask Léna, or production HealthHub Connect. No user information or usage measurements are uploaded to the public repository.
- Does **not** yet add the Digital Health tile to production Home, because source authentication and device QA have not passed.

## Release gates (do not declare fully live until satisfied)
1. Verify the already uploaded user-approved image (`Digital Health assistant Léna .png`) as the original **local PNG** `healthhub/assets/hero-digital-health-approved .png` (keep the user-approved pixels and the 16:9 composition; optimize only in a later, separately verified pass). The original uploaded image is already present on main (GitHub upload commit `9712b5b`); the filename contains a space before `.png`. The production page must use URL-encoded `%20` to match the existing asset. Do not generate another image.
2. Confirm the Hero loads on GitHub Pages (mobile Edge / Chrome), no lost faces, and dashboard remains visible under it.
3. Verify profile switching and 1/7/30-day view without synthetic values. Capture screenshot from S24 Ultra.
4. Only after separate opt-in design, authenticated profile-scoped sync and provenance validation: wire the existing private-source adapter, **not** raw GitHub/Pub Pages JSON.
5. Require measured (not inferred) completeness and missing-data handling, no double counting, and compare with Samsung native Digital Wellbeing (different semantics).
6. Add the production HealthHub Home tile routing to the new module after verification of safe navigation and back/return, without touching current Sleep v433, Connect or Home Hero.
7. QA on Zsolt and Mónika profiles. Do not assert Mónika has a live Android collector merely because Zsolt's pilot succeeded.

## Source status
Observed real measurements exist **on Zsolt's S24 only** in offline Android Pilot: permission enabled, WorkManager scheduled, and app-hour local collection started in the device screenshot after midnight. The Pilot deliberately has NO INTERNET permission and cannot sync to cloud by design. The public Golden preview at `/healthhub/digital-wellbeing-preview/` stays a separate, explicitly labeled synthetic demo.

## Security contract
Never put private timestamps, app lists, profiles' health data, exported metrics or tokens in GitHub public files or URL parameters. The static page itself must not query anonymous Dropbox or use hardcoded consent/auth claims.