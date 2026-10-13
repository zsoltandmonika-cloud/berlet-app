# HealthHub v427 · Sleep központi integráció · izolált előnézet

## A meglévő rendszer auditjának tényei
- A központi Sleep oldal már létezik: `healthhub/live-v170.js`. Van hero, egykattintásos profilváltás, Health Connect adatforrás, alvásfázis-idővonal és 7/30/90 napos trend.
- A `sleepSessions(profile)` **elsőbbséggel** a `/HealthHub/profiles/<profile>-health-connect.json` kanonikus Dropbox-fájlt olvassa, és a `raw.profile === profile` egyezést ellenőrzi. Ha a fájl hiányzik, csak a kiválasztott profilhoz tartozó korábbi helyi Health Connect-importból használ rekordokat.
- A 2026-10-13-i v422/v426 telefonos eredmények valósak, de a központi Dropboxba **nem kerültek át automatikusan** a különálló Health TEST alkalmazásból; az a pilot offline marad.

## v427 megvalósított, inaktív előnézet
- `sleep-visual-preview-v427.js`: HTML-es, 30 napos napválasztó és valódi, időarányos, színes ébren/könnyű/mély/REM-szakaszok. Minden ébredési nap külön rekordokat listáz, átfedő rekordok összevonása nélkül.
- A meglévő központi Sleep `render()` csak ugyanazokat a kanonikus, profilhoz kötött rekordokat adja át az új nézetnek. A meglévő Sleep-dashboard működését, adatbetöltési és profilváltási útját nem helyettesíti.
- `healthhub/index.html` betölti a modult a Sleep renderer előtt, de a felület **alapértelmezetten kikapcsolt**: csak `?hh_sleep_v427_preview=1` esetén (vagy tudatos `window.HH_SLEEP_VISUAL_V427_ENABLED=true` beállítással) jelenhet meg.
- A kattintási esemény a pillanatnyi profillal egyezteti a kártya `data-hh-sleep-v427-profile` mezőjét; ellenkező profilhoz tartozó, elavult kártyán nem futtat váltást.
- Nincs hálózati hívás, adatfelülírás, export, profilkeverésre való visszaesés, alváspontszám-becslés vagy külön felhőszinkron.

## Még nem bizonyított, ezért nem publikáljuk
- A v427 **nem** egy kész, éles központi Sleep integráció: GitHub előnézeti ág, nem merge-elve mainbe, nem tesztelve Chrome/Edge S24 Ultrán.
- A korábban használt 30 napos HC export *valós szinkronja* és a két felhasználó telefonjának tulajdonosi profilzárja külön ellenőrzendő.
- Az új HTML naptár az Activity elvét követi, de nem az Activity közös komponenséből származik; a vizuális paritás/egységesítés még külön feladat.
- Nem változott a gyártói Samsung Health API, sem a Health TEST APK.

## Manuális tesztkapu egy későbbi, védett előnézeti környezetben
1. Külön preview deploy, a projekt main/jelenlegi HealthHub működése nélkül. Soha ne merge-eljük a még teszteletlen v427-et automatikusan az éles mainbe.
2. Preview oldalon `?hh_sleep_v427_preview=1` hozzáadásával, a Sleep nézetben a kiegészítő kártya megjelenik; alap URL-en változatlan.
3. Zsolt és Mónika profilváltása: mindkét profilon csak a saját, ténylegesen szinkronizált adatok jelenhetnek meg, és rossz/hiányzó forrás esetén nem keveredhetnek.
4. Október 12. két alvásrekordja (ha megérkezett a kanonikus Dropbox-fájlba): két külön fázisdiagramot ad.
5. 24h/havi összevetés, üres napok, oldalgörgetés, készülék teljes szélessége, címzés/hozzáférhetőség.
6. Visszagörgetés nélküli napválasztó és Activity megjelenési paritás felülvizsgálata.
7. Éles release előtt forrászár, teljes regressziós teszt, kiadási stratégia, adatbiztonság és a két felügyelet nélküli szinkronciklus bizonyítása.

**Nincs szükség új Android APK-ra a v427 HTML/JS előnézethez.**
