# HealthHub · Nutrition Intelligence · v591 (candidate)

Date: 2026-10-16 · User-requested Nutrition Golden Glass module.

## What is implemented

- Standalone responsive `healthhub/nutrition/` route with Home tile bridge in the feature branch only. The bridge intercepts the Nutrition tile; it leaves the existing HealthHub routing, Sleep, Activity and Home assets unchanged.
- Profile-aware pink Mónika / blue Zsolt Premium Dark Glass, one-tap profile toggle, companion Nutri Buddy (lightweight CSS character), Nutrition-themed header using an existing approved Léna asset with food overlays. A **new bespoke, explicitly approved HD nutrition hero is still required**.
- Morning first-meal quick-setting: cappuccino. Mónika default 1 sugar cube, Zsolt 2. Mónika default milk lactose-free; the other recipe settings can be changed per profile.
- Afternoon quick-setting: light cappuccino, 3 sugar cubes, sugar/cinnamon sprinkle and **4 ladyfingers**, editable by each profile. Recipe editor supports milk volume/type, number and weight of sugar cubes, sugar-cinnamon grams, ladyfinger count and individual mass, meal and time. Defaults are **estimates**, not claimed manufacturer quantities.
- Manual food and drink picker: search, grouped alphabetically by category, amount and unit, meal and time; color icons, snapshot macro/micro nutrient values, custom foods and food-specific custom units, individual entry edit/delete.
- Daily diary, historical date selector, water/beverage volume, optional concealed **Body Balance** elimination diary with urinary/stool timestamps and optional Bristol 1–7.
- Daily calorie dashboard: profile-specific manually entered target, activity energy shown separately (never blindly subtracted or confused with total daily expenditure); green while progressing within target (before 20:00) and at end of day only within chosen target range; red when exceeded; amber when below range at day's end. No automatic weight-loss recommendation.
- 7/30-day Nutrition Insights computed **only** from actually logged days; missing days are explicitly unknown. Future reasoning and Ask Léna integration can consume the same structured data.
- Immediate offline browser save and optional authenticated Dropbox App Folder synchronization at `/HealthHub/profiles/{zsolt|monika}-nutrition.json` using profile-specific IDs, versioned schema, per-entry timestamps/tombstones and conditional Dropbox revision writes with conflict retries. No user health data or Dropbox tokens committed to GitHub.
- Premium button interactions, click/ta-da synthesis, profile-specific settings, disabled camera placeholder reserved in the layout.

## Explicit limitations / QA gates

1. This is **not an active AI vision food scanner**. The camera tile is visually reserved and disabled.
2. Food nutrient values are a small **illustrative/estimated starter catalog**. Before authoritative clinical/nutritional reports, ingest verified EU/Hungarian source foods with date, product and serving references. Unavailable vitamins are shown as unknown, never zero. Nutritional values from manual foods are provided by the owner.
3. Actual bespoke HD Léna Nutrition hero illustration/photo has **not** been authored/approved yet. Current image is a previously approved Léna asset, supplemented with Nutrition imagery. The companion is CSS, not a downloaded HD 3D model.
4. Open-ended longitudinal diary is kept, even though ordinary operational logs may be limited to 30 days. No automatic deletion is performed on this release.
5. Nutrition Insights are local deterministic summaries, **not yet medically interpreted Ask Léna AI answers**. Shared Ask Léna Intelligence connector, Nutrition AI model and nutrient source provenance remain explicit follow-up integration tasks.
6. `activeCaloriesKcal` is displayed only when an optional existing private Health Connect daily record can be read; otherwise show `—`. It is **not** folded into the food target. No fake measurement or activity is inserted.
7. Data lives in browser localStorage for offline use and private Dropbox for family sync. It is **not end-to-end encrypted** by this code. This follows the existing HealthHub pattern; shared browser devices and cloud account access require appropriate trust.
8. This branch has not been tested on a physical Samsung S24 Ultra. Do not merge or advertise as live solely based on code inspection.

## Verified in Code Mode

- JavaScript compiled successfully (ECMAScript / `new Function`).
- All statically referenced DOM element IDs exist, without duplicates.
- Preset fixture: Mónika 1 cube, Zsolt 2 cubes, afternoon 3 cubes + 4 ladyfingers.
- Latest-updated record merge conflict behavior passed an isolated fixture.
- Dropbox first upload and revision-protected subsequent update passed mocked API calls, keeping the new banana + updated coffee entries.

## S24 Ultra acceptance test before production

1. Open the Home Nutrition tile; confirm 1-tap profile toggle changes theme **and** all diary/calorie data.
2. Open morning quick setting: check Zsolt 2 and Mónika 1 sugar cubes. Change cube mass and milk type, save recipe. Reopen and verify persistence.
3. Open afternoon quick setting: verify 3 sugar cubes, cinnamon sugar and 4 ladyfingers; edit individually; save once and confirm correct sum in the diary.
4. Add banana by piece; add water by glass/decileter; check calculated tápanyag values and hydration.
5. Enter a custom food and custom unit, close/reopen; edit and delete entries.
6. Test Body Balance privacy and back navigation.
7. Turn offline: add food; reopen; verify local persistence. Reconnect Dropbox and verify only owner-matched rows are uploaded. Check two devices/cross-tab concurrent edits.
8. Inspect green/amber/red across an actual configured personal target and an end-of-day historical day.
9. Check voice/sound toggles, S24 thumb reach, focus and keyboard, scrolling without lag.
10. Verify original HealthHub Sleep/Activity/Home unaffected; rollback is simply removing the v591 link script and keeping personal data intact.

**Gate:** do not merge to main until physical device and Dropbox checks are confirmed.
