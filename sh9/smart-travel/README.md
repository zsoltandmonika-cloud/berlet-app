# SH9 · Smart Travel · Golden Standard v6

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
- Compact transparent dark-glass weather card at the **Hero's upper right**, without any Smart Travel title plaque on the Hero.
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

## v4 · Hero overlay glass alignment
- Weather and Smart Travel title cards are equal width (220 px regular, 200 px on narrow mobile) with aligned left/right edges and the same border radius.
- Both surfaces use shared `--st-hero-glass-fill`, `--st-hero-glass-border`, and `--st-hero-glass-shadow` variables: cooler dark-blue Premium Glass, moderately increased transparency with `rgba(8,24,48,.46)` → `rgba(20,42,77,.30)`, consistent 12 px blur.
- Only these two hero card styles change. Live weather, city selection, world clocks, tracker and 3×3 Golden Standard tiles are untouched.

## v5 · Top-right weather only
- Weather widget relocated to **top: 10px; right: 10px**, maintaining existing width, colors and forecast interaction.
- On narrow mobile screens: **top: 8px; right: 8px; width: 200px**.
- The Smart Travel title plaque and its subtitle, associated HTML and unused CSS were **removed**, freeing the panorama from an unnecessary overlay. The page's HTML document title and its SH9 tile name remain Smart Travel.
- The previously used v4 matching-pair CSS remains documented as historical development context only.
- Everything below the Hero (world clocks, ADSB.lol, 3×3 tiles, bottom navigation), weather service and API requests are unchanged.

## v6 · Kompakt időjárás-widget
- Jobb felső Hero-időjáráskártya: **196 px** széles (korábban 220 px), keskeny mobilon **184 px** (korábban 200 px).
- Minimum magasság **68 px**, keskeny mobilon **65 px**; enyhén kompaktabb ikonok és betűk a jó olvashatóság megtartásával.
- Glass háttér áttetszőbb: gradient `rgba(8,24,48,.38)` → `rgba(20,42,77,.23)`; egységes lágyabb keret/árnyék.
- Változatlan: jobb felső elhelyezés, Smart Travel Hero-label nélküli háttér, négy világóra, Budapest alapértelmezett időjárás, világóra→weather váltás, előrejelzés-link, ADSB.lol és kilenc csempe.
