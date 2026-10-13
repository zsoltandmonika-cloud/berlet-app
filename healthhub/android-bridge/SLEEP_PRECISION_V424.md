# v424 · alvásfázisok időpontossága és képernyő-elrendezés

**Forrás**: 2026.10.13-án a Samsung Health és a HealthHub v423 valódi telefonos képernyőinek összevetése.

## Egyezés
2026-10-13: 03:26–06:00, 154 perces alvásidőszak; Samsung Health szerint tényleges alvás 142 perc, ébrenlét 12 perc, könnyű 71 perc, mély 39 perc, REM 32 perc. A v423 ugyanazt a kezdést és végét látta, ám minden rövid Health Connect fázisszakasz percét **külön-külön lefelé kerekítette**. Ez jelentős eltérést okozhatott.

## v424 megvalósítás
- Először teljes másodpercben adja össze a nyers fázisszakaszokat azonos Health Connect fáziskódonként, csak ezután egész percre kerekít.
- Külön mutatja a teljes `SleepSessionRecord` időintervallumot és a rögzített könnyű+mély+REM (4,5,6) alvásidőt; az ébrenlét 1-es fáziskód.
- Hiányzó fázis nem nulla, ismeretlen kód `Egyéb`, és az összesítés nem generál új Samsung Sleep Score pontszámot.
- A nyers fázisszakaszok összege és a teljes alvásidőszak eltérhet. Eltérés esetén figyelmeztetés; nincs agresszív automatikus korrekció és nincs átfedő rekordok összeadása.
- Android 15+ status/navigation insets explicit kezelése `WindowCompat`/`ViewCompat` segítségével; valódi S24 Ultra teszt még szükséges.
- A teszt továbbra is izolált, offline `.hcpilot`; a prod HealthHub Connect, Samsung Beta és Thin Collector nem változik.

## Telefonos elfogadás
1. Windows `:app:assembleHcpilot` sikeres.
2. `verify-hc-pilot.ps1` **két PASS** + a helyes `.hcpilot` package + SHA.
3. S24 Ultra: nem lóg a fejléc a státuszsávba.
4. 30 nap / részletes rekordok: 2026-10-13 03:26–06:00 és másodperc-alapú, kerekített 1/4/5/6 szakaszértékek összevetése Samsung Health 12/71/39/32 perc értékeivel.
5. Külön jelezni, ha a fázisforrás-különbség miatt marad eltérés. A személyes egészségügyi adatot nem küldi felhőbe.
