# SH9 · S24 Ultra immersive light browser layout contract (v14)
Date: 2026-10-23

## Purpose
The SH9 launchscreen is designed for a future **dedicated, full-screen, chrome-free lightweight display container**, not for Samsung Internet or Chrome with address bars and browser toolbars. No Android APK development/release is part of v14.

## Geometry
- Reference native panel: 1440 x 3120 px, ratio 13:6 (height / width 2.1667).
- CSS target A: 384 x 832 px.
- CSS target B: 400 x 867 px.
- Use **actual CSS viewport size**; do not equate device pixels with CSS pixels or hardcode a global 1440 x 3120 web viewport.
- CSS `100dvh` controls layout in supported mobile WebViews. Fallback is `100vh`.
- Honor the device cutout/safe-area insets where reported.
- Never depend on browser URL/nav controls being present. The shell itself must not add an address bar or its own browser toolbar.
- **Preserve the five-button SH9 bottom taskbar.** Browser controls and SH9's application navigation are different things.

## Fixed layout order
1. Approved SH9 Hero, exact existing user asset, unchanged.
2. Date + Nameday / Weather / Calendar compact glass strip, unchanged.
3. Remaining flexible whitespace.
4. Compact 3x3 **1:1 square** module grid, bottom anchored.
5. Existing fixed SH9 bottom application taskbar.

## Diagnostics
Open `/berlet-app/sh9/?sh9layout=measure` to show the actual CSS viewport dimensions and free gap above the module grid. Remove this parameter for normal use. Do not use Chrome toolbar-adjusted measurements as final release benchmarks.

## Ship gate
- Visual comparison of full-screen 384x832 and 400x867 against screenshots of the approved asset.
- No overlapping or clipped cells; taps and focus work.
- No module/title/footer interfering with bottom app nav.
- Real S24 Ultra fullscreen wrapper test BEFORE any APK packaging.
- Keep GitHub Pages browser test available until signed off by Zsolt and Mónika.
