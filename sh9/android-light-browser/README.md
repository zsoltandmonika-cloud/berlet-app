# SH9 Light Browser (S24 Ultra test APK)

Dedicated fullscreen Android WebView for the existing SH9 GitHub Pages launchpad.
No browser address bar, search bar, or Android system bars.
Uses the real web app and its own SH9 bottom taskbar. This does NOT modify HH One.

- Input: https://zsoltandmonika-cloud.github.io/berlet-app/sh9/?sh9native=1&v=18
- Orientation: portrait; S24 Ultra physical panel 1440x3120, 9:19.5.
- CSS WebView viewport scales independently from physical pixels: fit uses actual window dimensions and 7px gaps.
- On small viewports, the page scrolls rather than hiding module buttons.
- Does not implement background location or other Family Guard tracking.
- APK is an independently debug-signed test build, NOT an OTA release or Play-distributed app.
- If rebuilding the debug APK, Android may require uninstalling the prior version because runner debug signatures differ.
