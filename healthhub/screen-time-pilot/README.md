# HealthHub Screen Time Collector · isolated Android pilot v0.3.0 (source)

**State: TECHNICAL PILOT ONLY.** The prior v0.2.0 was manually tested on physical Samsung phones; v0.3.0 here is source/CI until a signed user-installed update and phone acceptance. Stage 2 remains opt-in detailed app-hour diagnostics. Built separately from the production HealthHub Connect v0.14.0; app ID: `hu.zsoltmonika.healthhub.screentimepilot`.

## Objective
Test the Android usage-events source on an S24 Ultra before touching production Connect or moving anything into a shared Sleep / Digital Wellbeing source store.

- Automatic, local-only observation of Android app **foreground intervals**, including the ChatGPT Android app (`com.openai.chatgpt`), with real event timestamps.
- On-device **explicit owner binding**, Zsolt OR Mónika. There is no silently selected profile and no cross-profile uploads.
- Android **Usage Access** special permission, which each phone owner explicitly enables under Android Settings. Permission can be revoked.
- Collection OFF by default. After explicit local opt-in, WorkManager runs a baseline ~6/12/24h schedule (default six hours) and up to eight user-chosen daily local-time targets. All are approximate, not exact alarms; WorkManager can defer them under battery saver/Doze. First collection is enqueued by WorkManager.
- The foreground Egyszeri mintavétel MOST button launches real local observation off the UI thread and reports actual result/failure; scheduled and foreground collectors serialize writes through one engine. Repeated foreground taps do not start overlapping jobs.
- Each run reads the previous 48 **completed UTC hours**, with 12h extra query lookback for sessions overlapping the start. Only **closed** observed sessions count. Missing hours are **unknown**, never fabricated zero.
- Persist per-hour counts in private application storage, replace-by-hour to avoid double-counting; 90-day rolling retention, explicit stop + delete.
- Without the **second, separate app-detail opt-in**, save just `hourStartMs`, `observedForegroundMs`, `chatGptForegroundMs`, `sessionFragments`, profile ID and last collection status (90-day local retention).
- With **an additional explicit confirmation**: retain **only observations after the consent timestamp**, plus package identifiers and observed per-app durations in a **separate on-device 30-day detail ledger**. Switching detailed logging OFF immediately erases this file. Raw events, messages, third-party conversation content, other tokens, and browser URLs are never stored. No internet permission or cloud upload are present.
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

**Stage 2 privacy check:** The app-level opt-in records its exact consent timestamp; every Android UsageEvents query is clipped at that time for detailed data. The detail ledger fails closed if no consent timestamp exists and erases identities immediately when consent is revoked. A separate Kotlin test verifies that pre-consent foreground use is not backfilled.

## Stage 3 local schedule / immediate collection (v0.3.0)

- The old six-hour recurring WorkManager job remains the default and is preserved when upgrading from v0.2.0.
- UI actions **5/6/7** let the device owner select baseline 6/12/24h, add up to eight daily HH:mm targets using Android TimePicker, and remove individual targets.
- Custom HH:mm targets **supplement** the periodic baseline. A scheduled one-shot chains its next target after completion. DST is resolved in the device-local zone and only one earlier-offset trigger is planned in the autumn repeated hour. They are targets, **not exact executions**.
- All schedule preferences reside in the same app-private owner-bound settings. Deleting app data clears the identity and schedules; turning collection OFF cancels periodic and custom jobs but retains settings for future re-enabling.
- Manual foreground collection does not wait for WorkManager: tapping the button runs immediately on a private executor, displays **FOLYAMATBAN**, then reports completed source-backed counts or a real failure. It never shows a success message just because a job was queued.
- Every successful run stores the collection origin (manual/startup/periodic/custom) with its last completed timestamp, and automatic runs continue to work with app closed.
- STOP + DELETE uses the same collection lock to prevent an in-flight automatic/foreground run from restoring deleted local rows.
- Critical: Android builds published by GitHub Actions are **debug-signed with ephemeral signing keys**. A new CI APK generally cannot update a differently signed installed app without uninstall (which erases local private ledger and device owner binding). Do not promise a drop-in upgrade or instruct users to uninstall before providing a signed migration plan.
- v0.3.0 remains an offline technical pilot with **NO INTERNET permission**, no background server polling, no Dropbox upload and no central remote collection mechanism.

## Separate Stage 4 (not implemented in this APK): central remote collection

The REMOTE-COLLECTION-DESIGN.md document specifies required opt-in, authenticated device/profile authorization, command leasing and acknowledgements. Existing HealthHub Admin/Dropbox orchestration is not a substitute for on-device authenticated delivery to this standalone pilot. Do not expose a pretend remote sync control or accept unauthenticated broadcasts.
