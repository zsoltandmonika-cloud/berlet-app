# SH9 · SmartHub Nine

Az SH9 a HealthHubtól független gyökérszintű Launchpad. A meglévő `healthhub/` könyvtárat ne módosítsuk.

## Jóváhagyott megjelenés
- Visual Master v2 / Integration v3: SH9 3D üveggömb, Buddy, „Your Life. Smarter Together.”
- 9 modul 3×3-as, külön Premium Glass keretes elrendezésben.
- Samsung Galaxy S24 Ultra, mobile-first; a jóváhagyott látványt nem szabad lecserélni.
- Két navigációs cél: `../healthhub/` és `../healthhub/guardian/`.
- További 7 modul: fejlesztés alatt, egyértelmű visszajelzéssel.

## Telepítési mappa
A jóváhagyott `SH9_Launchpad_Integration_v3.zip` csomag **tartalmát** ide, a `sh9/` könyvtárba kell feltölteni:
```
sh9/
  index.html
  assets/
    SH9_Hero_Approved.png
    buddy-sh9-hd.png
    sh9-icon.png
    HH.png
    FG.png
    ST.png
    SE.png
    SL.png
    SS.png
    SDH.png
    SP.png
    SLS.png
```
A forrásban két README.txt is lehet. Ezek opcionálisak. A `sh9/README.md` és `sh9/assets/README.md` megmaradhat.

## Élesítési feltételek
- `/sh9/` betölt 404 és hiányzó képek nélkül.
- A HealthHub és a Family Guard linkje működik.
- A hét további modul nem ígér nem létező integrációt.
- A `/healthhub/` változatlanul működik.
- S24 Ultra mobil Chrome megjelenés és érintés ellenőrizve.

**Állapot:** mappák előkészítve; az `index.html` és PNG-assetek feltöltésig még nincsenek publikálva.
## Központi visszanavigáció · 2026-10-23
- HealthHub és Family Guard Launchpad-csempék: működő relatív URL-ek.
- Az SH9-re visszalépéshez közös `healthhub/sh9-launchpad-return-v1.js` felel; a HealthHub újraépített HTML-jébe és a Family Guard oldalába be van kötve.
- A navigációs elem diszkrét, érintésbarát, Premium Glass kapszula, a meglévő ötös navigáció/profilváltó érintése nélkül.
- A v1 CSS/mobilos kézi vizuális ellenőrzés még szükséges; nincs igazolt Samsung S24 Ultra valós készülékes teszt.
