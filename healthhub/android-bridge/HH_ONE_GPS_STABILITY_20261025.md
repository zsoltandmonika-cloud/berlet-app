# HH One GPS Stability · investigation and release gate (2026-10-25)

## Confirmed implementation facts
- `Sh9GpsService.kt` requests GPS_PROVIDER updates while an opt-in Android foreground service is running. It stores only `lastFixAtMillis` in process memory. **It does not send coordinates to SH9 / Family Guard, and it does not upload positions.**
- `guardian/guardian.js` uses browser `navigator.geolocation.watchPosition`. Its visibility handler calls `stop(true)` when the document is hidden. The browser GPS watcher is therefore deliberately stopped when SH9 is backgrounded.
- `guardian-live-v785.js` also suspends browser polling on hidden pages. The live map must not label old coordinates as live.
- `Sh9GpsService` returns `START_NOT_STICKY`, does not restart after process kill / device reboot and stops on provider disable. This is a privacy-preserving restriction, not proof of a crash.
- `SH9_V0150_PILOT_RELEASE.md` records v0.15.0 build 27 as signed and made eligible for both profiles. Installed APK version / state on the physical phones are **not verified** via GitHub.

## Root-cause hypothesis
The user-visible 'GPS kapcsolat fenntartása' is presently a native GPS subscription, **not** a background Family Guard location publisher. Keeping the receiver requested does not keep a separate browser watcher alive. A 'GPS signal pending' message might indicate a browser stale/error condition, missing permission, or absent transmission, not necessarily satellite signal loss.

## Required diagnostics before change
1. On each phone record: HH One versionCode/versionName, selected owner/device ID, native service active, Android precise location permission, last native GPS fix age, Family Guard browser running/hidden, browser last GPS fix age, Supabase last published fix age, network/auth/heartbeat timestamp. Never put coordinates in diagnostic logs.
2. Test outdoors while Family Guard is visible, then screen locked and app switched; test Wi-Fi to mobile data and return to app. Distinguish GPS provider, browser watcher, upload/auth, and server read-path.
3. Confirm whether the intended product is 'GPS receiver kept active' or truly continuous **consented live location sharing**. Native publishing of background locations requires separate reviewed architecture, explicit owner consent, Android policy/permission design, security and RLS review.
4. Keep last known location marked stale with timestamp; never silently imply tracking while the browser is hidden. Do not auto-enable tracking, bypass Android power policies, or silently persist coordinate history.

## Delivery stages
- Phase 1: expose separate **Native GPS**, **Browser GPS**, **Family Live upload**, **Peer sync**, **Device heartbeat** status/age and explicit troubleshooting instructions in the existing Admin Center.
- Phase 2: after consent/security review, implement the chosen native-to-Family-Guard data path or document that foreground-only Family Live is the supported mode. Add reconnect for transient network/auth errors without attempting unauthorized restart of location services.
- Phase 3: test Zsolt's S24 Ultra, then Mónika's phone, preserving Health Connect, Dropbox, registered owner bindings and OTA identity. No production or OTA publish before verified QA and user's explicit release approval.

## Acceptance conditions
- 'Native GPS active' never masquerades as 'Family Live shared'.
- Every unknown/stale state identifies which layer is waiting and last successful timestamp.
- Switching apps and returning consistently restores foreground Family Live after user consent (without recording background movement unless specifically authorized and implemented).
- A signed OTA is only issued after automated Android tests, on-phone verification and reviewed rollout approval.
