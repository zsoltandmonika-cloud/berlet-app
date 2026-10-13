# HealthHub Screen Time Collector · isolated Android pilot v0.1.0

**State: TECHNICAL PILOT ONLY. NOT INSTALLED / NOT LIVE. Stage 2 = opt-in detailed app-hour diagnostics.** Built separately from the production HealthHub Connect v0.14.0; app ID: `hu.zsoltmonika.healthhub.screentimepilot`.

## Objective
Test the Android usage-events source on an S24 Ultra before touching production Connect or moving anything into a shared Sleep / Digital Wellbeing source store.

- Automatic, local-only observation of Android app **foreground intervals**, including the ChatGPT Android app (`com.openai.chatgpt`), with real event timestamps.
- On-device **explicit owner binding**, Zsolt OR Mónika. There is no silently selected profile and no cross-profile uploads.
- Android **Usage Access** special permission, which each phone owner explicitly enables under Android Settings. Permission can be revoked.
- Collection OFF by default. Only after user enables it, WorkManager polls on an inexact ~6h periodic schedule; first collection scheduled immediately; a manual diagnostic button is optional.
- Each run reads the previous 48 **completed UTC hours**, with 12h extra query lookback for sessions overlapping the start. Only **closed** observed sessions count. Missing hours are **unknown**, never fabricated zero.
- Persist per-hour counts in private application storage, replace-by-hour to avoid double-counting; 90-day rolling retention, explicit stop + delete.
- Without the **second, separate app-detail opt-in**, save just `hourStartMs`, `observedForegroundMs`, `chatGptForegroundMs`, `sessionFragments`, profile ID and last collection status (90-day local retention).
- With **an additional explicit confirmation**: retain package identifiers and observed per-app durations in a **separate on-device 30-day detail ledger**. Switching detailed logging OFF immediately erases this file. Raw events, messages, third-party conversation content, other tokens, and browser URLs are never stored. No internet permission or cloud upload are present.
- Shared closed-event interval reducer produces coarse and detailed totals, and a reobserved hour replaces its previous app mix. This avoids double-counting during six-hour resampling.

## Not equivalent to Samsung Digital Wellbeing's authoritative screen-time total
UsageEvents foreground intervals are **an approximation of observed app engagement**, not a pixel-on or screen-unlock tracker. Android multi-window, launcher, missing transition events, battery restrictions, app standby or device manufacturer behavior can yield differences from Samsung Digital Wellbeing. We will compare the prototype's numbers with Samsung's visible daily total before claiming parity.

`UsageStatsManager` cannot read messages or individual ChatGPT conversation timestamps; this pilot only measures Android ChatGPT *app foreground time*. Desktop/browser ChatGPT sessions are not measured. Ask Léna first-party request timestamps and any future synced private event store are **not yet implemented** in this app.

## Workflow / testing
`healthhub-screen-time-pilot.yml` runs Android JUnit tests and compiles the debug APK in PRs. CI checks that the packaged APK requests **NO INTERNET permission**. Debug artifacts have ephemeral CI signing keys; do **not** install over production Connect (different package ID, but do not assume debug upgrades are possible across CI jobs).

**No OTA release workflow is triggered**, because the pilot code is not inside `healthhub/android-bridge/`. Never merge changes into the production bridge just to run this pilot.

Manual phone acceptance requires separate approval and user action:
1. Build passes, test results checked, and a separate pilot APK is available.
2. User explicitly chooses to install **HH Screen Time PILOT** (not HealthHub Connect). Do not uninstall/replace production APK.
3. Bind the correct owner; the app opens Android's **Usage Access** Settings where the user can independently grant permission to the pilot.
4. Explicitly enable coarse collection. For app-by-app ranking **separately** review and approve detailed collection; otherwise it remains OFF. Inspect after a few hours / overnight; compare foreground observation with Samsung Digital Wellbeing and check ChatGPT app timing, absence of cross-profile data, zero/missing distinction, permission revocation behavior, 90-day coarse and 30-day detailed retention.
5. Only **after** acceptance: plan a separately consented, least-privilege integration into the HealthHub private events vault, and let Sleep Intelligence and HealthHub Digital Wellbeing read that single source; this release does none of that.

## Safety guarantees / limits
- Health Connect, Dropbox, Samsung SDK, Ask Léna, the v433 Sleep UI and existing OTA manifests are untouched.
- Every logged hour may include background collection delay; “last run” is not proof of a new verified screen session.
- Users can revoke special access via Android settings, disable collection or delete all local pilot entries from the pilot interface. No covert/background collection without user opt-in.
- No request to enable Accessibility, notification access, VPN, overlay or microphone. No need for root or Samsung partnership.

**Next phase after actual S24 pilot acceptance:** shared, profile-scoped event schema (including provenance and consent) and integrations; not approved for automatic rollout.

## Stage 2 · source integration gate
- `UsageIntervals.kt` contains the **one shared** closed-only event stream; `UsageSessionizer.kt` and `AppUsageAggregator.kt` derive coarse and detailed hours from that same input.
- `AppUsageMerger.kt` performs idempotent **full resampled-hour replacement** to remove obsolete applications within that hour (rather than double-counting repeated scans).
- `AppDetailLedger.kt` saves optional per-app data under `detailed-usage-{owner}.json`; Android application sandbox only, separate 30-day retention, explicit on/off and erase. No Samsung proprietary API claims.
- The unrelated public preview remains demo-only. `healthhub/digital-wellbeing-preview/private-source-adapter.js` is **staging code, not included in the public HTML**, which rejects wrong profile/source, malformed duration, missing consent and impossible totals. It groups results by **Budapest local calendar** including DST.
- This is **NOT private cloud sync**. Before uploading or exposing app-identifying data to web or Ask Léna, require a reviewed authenticated private vault endpoint, enforced profile authorization/RLS, new data-transfer consent, retention and an explicit device/OTA rollout.
- Pilot acceptance must demonstrate **two distinct successful automatic collection cycles** without diagnostics button, reconcile per-app hour totals with aggregate on the phone, and cross-check against Samsung Digital Wellbeing. A compiled APK alone cannot establish that.
