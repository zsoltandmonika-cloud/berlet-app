# SH9 · Smart Travel · Golden Standard v3

## Purpose and compatibility
- Central SH9 Launchpad Smart Travel tile → `/sh9/smart-travel/`.
- Existing Golden Standard **3×3 Premium Glass** tiles and **Ask Léna** center remain unchanged.
- The bottom five-button SH9 taskbar and all existing Family Guard / HealthHub features remain unchanged.
- The Smart Travel Hero uses the approved **1402 × 1122 px** `sh9/assets/SH9_Smart_Travel_Hero_1402x1122.png`, already uploaded to main. This page does **not** have a profile-switch button.
- No personal HealthHub data is written or uploaded by the weather display.

## Connected module navigation
- **Trip Planner** → existing Family Guard planner (`#hhSmartHubDestinationV802`), currently GTFS-limited 260/17/19.
- **Public Transport** → existing Family Guard transit UI (`#hhTransitPanel`).
- **My Places** → existing Family Guard favorites (`#hhSmartHubFavoritesV806`).
- **Ask Léna** → existing central ChatGPT project shortcut (`chatgpt-project-shortcut-v712.js`).
- Road Travel, Air Travel, Taxi, Shared Mobility and My Trips are explicitly marked as under development rather than implying live service.

## World clocks
- New York / London / Paris / Budapest, mobile-size 24-hour local clocks based on `Intl.DateTimeFormat`, respecting DST.
- Each city chip is a keyboard-accessible **button**. Tap a chip to select the corresponding weather card city; selection is shown with a subtle glass highlight and `aria-pressed`.
- Budapest is selected when the page first opens.

## Weather widget v3
- Compact transparent dark-glass card at the **Hero's upper left**, with the Smart Travel title **below** it.
- Defaults to **Budapest** as the agreed home-city/local-weather fallback. This is NOT the device's GPS location; no geolocation permission is requested.
- Selected city's public coordinates are fetched from Open-Meteo, using `https://api.open-meteo.com/v1/forecast`, `current=temperature_2m,weather_code,is_day`. No key. Noncommercial Open-Meteo usage, attribution shown in the card.
- Cached ten minutes per city, periodic stale refresh and refresh after tab resume. Valid loading/error states are shown instead of fabricated temperatures.
- Tap the card to open that city's `meteoblue` weekly forecast (desktop new tab, Android WebView same-tab external URL).
- Cities: New York, London, Paris, Budapest. URLs are explicit and verified for each.

## Flight tracker
- The right-side airplane shortcut opens user-selected **https://adsb.lol/**.
- Android WebViews navigate to the URL without relying on unsupported popup handling; desktop uses a standard external link.

## Regression QA
- Test: `node --test healthhub/tests/sh9-smart-travel-golden.test.cjs`.
- The dedicated workflow `.github/workflows/sh9-smart-travel-v3-qa.yml` validates JS syntax and the Golden Standard tests on relevant changes.
