# HH One 0.15.7 · Unified signed S24 pilot gate

**Integrated source only**. Inherit Family Guard GPS 2.0 PR #502 and incorporate independent changes from Dropbox credentials PR #503 and SH9/HealthHub browser-session PR #504. All three components are on one branch instead of claiming an incomplete, single-feature signed APK is a full family update.

## Functional contract

- **GPS (#502):** bounded 150s FLP retry, after another 150s native fallback, latest-fix vs active-but-stale receiver status, explicit user START/STOP and separate Family Guard relay consent. Android background scheduling remains best-effort.
- **Native Dropbox (#503):** preserve saved refresh credentials when legacy marker is absent; do not silently reuse mismatched client credentials; single-flight manual/background refresh and compare before committing; validated PKCE callback, owner isolation.
- **Browser-backed SH9 (#504):** optional Android Custom Tab for an existing default browser session; separate opt-in WebView and cancel choices, HTTPS first-party trust boundary, no native token transfer or browser-cookie injection. This is **not** a universal session bridge.
- **No changes to** `healthhub/data/bridge-ota.json`, app package ID, versionCode, live user sessions, website JavaScript, Android account data or Mónika's device.

## Release progress check

- [x] Three branches manually reconciled into one native Android code tree, including the overlapping MainActivity changes
- [x] Targeted Dropbox and browser-session tests registered in unified native CI
- [ ] All integrated Android CI succeeds at final candidate SHA
- [ ] Production OTA keystore / original signed baseline comparison succeeds
- [ ] Newly signed integrated build from **this exact SHA** created and hash recorded (staging artifact, no public production OTA)
- [ ] Verify *installed* S24 signing certificate matches trusted OTA cert, installed versionCode is lower, and Android OS still permits background location
- [ ] User initiates private data-preserving, no-uninstall install and verifies app launches, existing Health Connect data, native Dropbox, profile isolation and reauth behavior
- [ ] S24 checks GPS, screen lock, STOP, offline/reconnect, device registry, Family Guard relay and separate Dropbox upload timestamps; ChatGPT cannot perform real-phone actions
- [ ] Existing Chrome/Edge login in Custom Tab confirmed; Google/Microsoft and web Nutrition independently smoke tested
- [ ] Only after verified S24 acceptance, user may separately opt into production OTA and Mónika rollout. Never silently extend pilots

## Why production OTA is gated

Past HH One 0.15.4 embedded SH9 created distinct, unauthenticated WebView sessions, opening OAuth externally. GitHub CI, source contracts and APK signing cannot confirm the user's actual installed signing key, credential state, or usable background GPS on One UI. A successful APK build cannot justify silently updating both family phones. Production OTA and public GitHub Release are intentionally unchanged by this branch.
