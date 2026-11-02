# SH9 Edge telepíthetőség · 2026-10-25

**Cél:** az SH9 a meglévő Edge-böngésző munkamenetében működjön. Az HH One
Android alkalmazás maradjon a natív Health Connect / Dropbox / GPS szolgáltató;
ne épüljön új WebView böngésző az SH9 helyére.

## Webes telepítés
- URL: https://zsoltandmonika-cloud.github.io/berlet-app/sh9/
- Dedikált, stabil alkalmazásazonosító: `/berlet-app/sh9/`.
- Manifest: `sh9/manifest.webmanifest`, `display: standalone`.
- Kezdőcím: `/berlet-app/sh9/?source=installed`.
- Scope: `/berlet-app/`, így a HealthHub, Family Guard, Smart Travel modulok
  ugyanabban a tartományban maradnak a támogatott telepítési módokban.
- **SHO Fancy ikon (2026-11-02):** az eredeti, jóváhagyott
  `sho-preview/favicon.svg` kék–pink fényíves SHO monogramból készült,
  ellenőrzött 192×192 és 512×512 PNG telepítési ikon.
- Az Android külön **512×512 maskable** változatot kap, az iOS
  **180×180 touch ikont**; a favicon ugyanezt a Fancy SHO dizájnt használja.
- A korábbi `assets/sh9-icon.png` megmaradt kompatibilitási célra, de
  a PWA-manifest már nem ezt választja telepítési ikonként.
- A PWA `id=/berlet-app/sh9/`, `start_url` és `scope` változatlan.
  Már telepített Android-parancsikonnál az új ikon nem feltétlenül frissül
  azonnal; az adott SHO parancsikon újbóli felvétele szükséges lehet.
  **Ne töröld a böngészőadatokat vagy a kapcsolt munkameneteket.**
- Telepítéskor **ne töröld** az Edge előzményeit/webhelyadatait, ha a
  korábban kapcsolt munkameneteket meg szeretnéd őrizni.

## Android Edge és Windows Edge különbség
- Windows Edge: ⋯ → Alkalmazások → Webhely telepítése alkalmazásként.
  A telepített alkalmazás az Edge appkezelőből is nyitható.
- Android Edge: a menüben található **Kezdőképernyőhöz adás / Telepítés**
  menüpont pontos neve és képessége verziófüggő. Android Edge egyes verziói
  csak Edge-hez kötött kezdőképernyő-parancsikont hoznak létre, nem külön
  WebAPK-t. Az SH9 manifest nem tudja ezt Android-rendszerszinten kikényszeríteni.
- Az ikon/parancsikon a telefon újraindítása után általában megmarad; ha az
  eltűnik, a launcher, Edge-profil, böngészőadat-törlés és a telepítés módja
  vizsgálandó. A PWA-manifest önmagában nem garantálja a Samsung launcher
  viselkedését.

## Privát adatok és frissítés
- Csak a nyilvános SH9 indítóoldal minimális statikus állománya kap
  **hálózat-első** cache-t a `sh9/sw.js` alatt.
- A service worker kizárólag a `/berlet-app/sh9/` útvonalra regisztrál,
  nem tárol HealthHub betegadatokat, Nutrition-adatokat vagy OAuth-tokeneket.
- Az SH9 HTML és a modulok online maradnak; a háttérfrissítés nem változtat
  a meglévő Dropbox, Microsoft, ChatGPT bejelentkezéseken.
- Felhasználói Edge/Android telepítést és újraindítást a GitHub CI **nem tud**
  bizonyítani; valós S24 Ultra teszt szükséges.

## Elfogadás
1. Edge-ben nyisd meg a fenti címet; telepítsd/app-parancsikont készíts.
2. Koppints az SH9 ikonra. A 3×3 launchpad jelenjen meg.
3. HealthHub nyitásakor ugyanaz az Edge-profil és Dropbox kapcsolat működjön.
4. Indítsd újra a telefont; ellenőrizd, hogy az ikon továbbra is a kezdőlapon
   van, és a helyes SH9 indul.
5. Ne kapj újabb külön Chrome/Edge oldalt pusztán az SH9 indításától.
