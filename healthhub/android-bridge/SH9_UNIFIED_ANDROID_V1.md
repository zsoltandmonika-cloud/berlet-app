# HH One + SH9 unified Android shell · implementation draft

## Architecture (single installed package)

**Retain** the already released signed HH One identity `hu.zsoltmonika.healthhubbridge`.
The existing native HH One activity, its Health Connect permissions, Dropbox sync,
central orchestrator and signed OTA checker remain unchanged.

The HH One screen now includes:
- **SH9 Start Page megnyitása**: opens `Sh9WebActivity`, the existing SH9 Golden
  Standard web launcher in a fullscreen address-bar-free WebView.
- **SH9 legyen a kezdőoldal**: optional saved toggle (default OFF) to open the
  SH9 launchpad immediately on the next normal app start. Android Back returns
  to the native HH One settings; the active-GPS notification always opens the
  native settings directly.
- **GPS kapcsolat fenntartása**: an explicit *opt-in* Android location
  foreground service with 15/30/60-second update requests and a persistent
  notification containing **GPS leállítása**.
- The existing **OTA Updates** controls: background version-check through the
  approved signed manifest, SHA-256 verification, and final Android user
  confirmation before installing a higher version of the same signed package.

Web views update from the existing GitHub Pages SH9 site as they are deployed.
A change to compiled native Android logic, manifest, or permissions still
requires a new trusted, signed OTA APK.

## Important authorization and limits
- GPS service defaults to OFF, must be started from the visible Android activity,
  requires precise location permission, and always shows a foreground notification.
- It does **not** automatically restart after a device reboot, restart itself
  after being killed, or request Android `ACCESS_BACKGROUND_LOCATION`.
- The optional GPS foreground service never saves or uploads coordinates or
  travel paths. Only an in-process last-fix timestamp is retained. Separately,
  the SH9 first-party WebView may request an individual position through
  `navigator.geolocation`, after Android location permission; the coordinates
  are then accessible to the trusted SH9 web page for its map. Third-party web
  origins are not granted location through the native permission handler.
- The optional GPS subscription may help keep the receiver active while the
  service is operating, but Android can still interrupt it, hardware can lose
  satellite lock, battery use may rise, and **another app's** location
  permissions cannot be extended by HH One.
- The existing SH9 Calendar in native mode still needs its own OAuth/native
  return-path integration before it can display the private Outlook data;
  ChatGPT's Outlook access never flows into the WebView automatically.
- No insecure WebView JavaScript native bridge is introduced.

## Safe rollout (not performed in this implementation PR)
1. QA: build debug APK and run Android unit tests; manually smoke-test on S24 Ultra.
2. Keep the existing signed OTA `0.14.6` manifest untouched while developing.
3. After an approved release candidate, increment `versionCode` over 26 and
   `versionName`, verify identical certificate against signed OTA baseline.
4. First rollout: Zsolt's device with SH9 WebView and manual GPS on/off,
   permissions, foreground notification and stop-from-notification tested.
5. Validate Android privacy switches, power usage, restoring OTA and Health
   Connect sync; then explicitly approve rollout to Mónika.

**Never publish a new OTA release on every development commit.**
A native update must be explicitly authorized through the release workflow,
and Android's system package installer retains final installation consent.

## Test notes
- `.github/workflows/hh-sh9-unified-android-qa.yml` builds debug on PR (does
  not publish an installer).
- `GPS foregroundServiceType=location` and permissions follow Android 14+
  runtime policy; the user must be in a visible activity when starting it.
- Production signing secrets stay in existing Actions Secrets and are never
  printed or reused by test builds.
