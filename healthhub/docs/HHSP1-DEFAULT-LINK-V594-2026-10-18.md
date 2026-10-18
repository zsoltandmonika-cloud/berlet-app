# HHSP1 v594 · Régi mobil-link -> új Leletek/Gyógyszerek + Buddy alapból

**Dátum:** 2026-10-18  
**PR:** https://github.com/zsoltandmonika-cloud/berlet-app/pull/347  
**Éles SHA:** `839c450cef0ba9e56680f64ab14dff6802bbdaa6`  
**Kód-visszaállítás:** `backup/hh-pre-default-scroll-buddy-20261018` @ `a5f2c39194f8470288347c34c6f76b681d3845f0`

## Igény
A régi S24 Ultra HealthHub-parancsikon változtatás nélkül töltse be a már jóváhagyott v593 Leletek/Gyógyszerek Premium scroll-select és Buddy megoldást. Ne kelljen új `?hhscrollselect=1` linket menteni vagy használni.

## Véglegesítés
- `health-scroll-select-v592.js` és `hh-buddy-scroll-companion-v593.js`: normal/default esetben automatikusan aktív, **kizárólag** az explicit `?hhscrollselect=0` vagy `?hhpremium=0` kapcsolja ki.
- `healthhub/index.html`: mind a látható build marker, mind az eredeti navigációs `hhv`-normalizáló verzió v594-re frissült. Megmaradt a korábbi `history.replaceState` URL-normalizálás. Az eredeti, elmentett `?hhv=591-health-measurements-hero` könyvjelző továbbra is működik, és az első frissített betöltés után a böngésző az új v594 buildre normalizál.
- Külön cache-busting query kapta a scroll-select és Buddy JS modult, hogy az S24 Ultra ne egy korábbi fájlverziót használjon.
- Az eredeti Leletek/PDF/Léna, gyógyszer-bevitel, Dropbox, Activity/Sleep és az esetleges OAuth-folyamat változatlan.
- Visszaállítás: `https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/index.html?hhscrollselect=0`. A korábbi klasszikus Home mód `hhpremium=0` változatlan.
- Nincs személyes egészségügyi adat vagy gyógyszerbejegyzés publikus fájlban.

## Ellenőrzés
- PR #347: 8/8 ellenőrzés sikeres, köztük Android-fordítás, QA, Guard, privát gyógyszerregresszió és a régi v591-es linket tesztelő új `hhsp1-default-link-v594.test.cjs`.
- `main` összevonás után **GitHub Pages build és deploy SUCCESS**; minden újraindult post-merge ellenőrzés SUCCESS.
- Régi link: `https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/index.html?hhv=591-health-measurements-hero`.
- A valódi telefonos Chrome/PWA frissülés és cache-viselkedés ellenőrzése továbbra is felhasználói acceptance teszt.
