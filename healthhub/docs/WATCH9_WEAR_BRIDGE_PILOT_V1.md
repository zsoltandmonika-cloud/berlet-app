# Watch9 FIRST · Wear OS bridge pilot v0.1 · 2026-11-03

## Goal and isolation
- **Reference:** Samsung Galaxy Watch9 40 mm LTE (Mónika); **fallback:** Galaxy Watch5 Pro (Zsolt).
- TWO standalone APKs with the **same package ID** (hu.zsoltmonika.watchpilot), but phone APK and watch APK are separate devices. Neither APK has the production HH One ID (hu.zsoltmonika.healthhubbridge).
- Both test APKs MUST be built with the **same signing certificate** to satisfy Wear OS Data Layer security.
- The production module :app, the SH9 app, existing OTA and the Golden Backup are UNCHANGED.
- Read-only, manually initiated pilot; NO health measurements, no continuous sensor service, no GPS and no cloud database.
- Watch9-specific Sensor SDK capabilities (EDA, MF-BIA) remain future, on-device, consented work.

## Implemented v0.1
1. Phone app: owner-selected opt-in (Mónika or Zsolt), disarmed by default.
2. Watch app: one button reads local battery and charge status from Android BatteryManager, current model from Build.MODEL and a timestamp.
3. Watch app sends one small JSON packet on Wear OS MessageClient to the *sole* connected phone node (zero or multiple => do not send).
4. Phone WearableListenerService accepts only exact path and version, bounded data, time skew <= 10 minutes and valid battery %, once manually armed.
5. Phone pins the **first sender node** to this pilot profile. Other node IDs are silently rejected until the user disables/rearms the pilot.
6. Phone saves only private local preferences and sends an acknowledgment after commit() succeeds.
7. Watch reports **confirmed receipt only after matching nonce ACK**. Send success alone is not a delivery claim.
8. Phone displays local receive timestamp; after 15 minutes the snapshot is stale. Timestamp freshness does not claim continuous online status.
9. Owner can erase all pilot data and disarm with one button.

## Build (with Android SDK and supported Gradle toolchain installed)
- From healthhub/android-bridge:
  - ./gradlew :wearpilot-phone:assembleDebug :wearpilot-watch:assembleDebug
- Outputs:
  - wearpilot-phone/build/outputs/apk/debug/wearpilot-phone-debug.apk
  - wearpilot-watch/build/outputs/apk/debug/wearpilot-watch-debug.apk
- Install the phone APK on the matching Galaxy S24 Ultra and the watch APK on the paired Galaxy Watch9 / Watch5 Pro.
- Build BOTH APKs using the SAME debug keystore. Different developers' debug keystores do NOT meet Data Layer signature matching.
- This is not the signed OTA release. Do not replace production HH One.
- On phone, open SH9 Watch Bridge PILOT and arm the appropriate owner. On watch, press ÁLLAPOT KÜLDÉSE.
- On watch, wait for the matching ACK. On phone, tap Legutóbbi órastátusz.
- To reset / rebind, disarm and remove all local pilot data from the phone UI, then arm again.

## Acceptance gates
- [ ] Android Gradle build succeeds for both standalone modules.
- [ ] Both apps install **alongside** production HH One without modifying it.
- [ ] Watch9 reports genuine watch battery %, charging status and timestamp.
- [ ] Phone receiving disarmed => no local snapshot stored and no ACK.
- [ ] After opt-in, phone sends ACK only on authenticated exact-path, versioned, recent message from first pinned node.
- [ ] A different watch is rejected, even if both are paired.
- [ ] Watch reports "delivery confirmed" only on a nonce-matched ACK.
- [ ] Snapshot >15 min appears stale, never "online" solely from last report.
- [ ] Re-arm and disable erase local node binding and measurements.
- [ ] Watch5 Pro fallback tests pass, no Watch9-specific feature suppression.
- [ ] Bluetooth proximity and internet-routed Data Layer paths tested separately.
- [ ] Measured battery cost acceptable before any scheduled reporting.
- [ ] No OTA/production merge until owner permission and independent signed release gate.

## Security and limitations
- Not a medical monitor, emergency alert, or authenticated server data feed. No live pulse/SpO₂ yet.
- The first watch sender is bound only after explicit phone consent; arm when the correct watch is ready. If multiple watch apps can send simultaneously, exercise manual caution.
- Google Data Layer package/signature pairing is a transport protection; do not interpret Bluetooth pairing alone as verified live connection.
- Google Data Layer may relay data over its encrypted cloud service; there is **no SH9/Dropbox/Supabase upload**.
- MessageClient is opportunistic, not a guaranteed offline queue; manual resend if no ACK.
- This v0.1 is intentionally manual-only to minimize energy use; do not claim "continuous live" status.
- No runtime build or real-device validation has been done solely by committing the code.

## Primary docs
- https://developer.android.com/training/wearables/data/overview
- https://developer.android.com/training/wearables/data/events
- https://developers.google.com/android/guides/setup
