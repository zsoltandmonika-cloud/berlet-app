# SH9 Smart Trip AI v1073 – multimodális teljes lefedettség, üzemeltetési kapuk

## Készen: díjmentes, valós, külső teljes útvonal-keresési fallback
- Smart Trip AI → „Útvonal keresése” → ha nincs SH9-ban hiteles helyi találat, **„🗺️ Teljes útvonal Google Térképen · BKK / MÁV / Volán + séta”** kézi gomb.
- Google Maps Directions URL (`api=1`, `travelmode=transit`) Google kulcs és SH9-billing nélkül, kizárólag felhasználói érintésre. Nem vált oldalt automatikusan.
- Ha a kiinduló/célhely a kiválasztott családi mentett hellyel egyezik, ellenőrzött koordinátáit átadja; máskülönben a szöveget.
- A Google Maps URL **nem viszi át a dátumot, az indulási/érkezési módot, a prioritást**, ezeket a külső oldalon kell választani. A találatok lefedettsége a Google Maps és szolgáltatók adataitól függ.

## Készen: az SH9 natív, egykártyás multimodális útiterv-adaptere
- A Google Routes API `computeRoutes` válaszát külön **BKK/MÁV/Volán + gyalog** ellenőrzött szakaszokra bontja.
- `BUS`, `SUBWAY`, `TRAIN`, `LIGHT_RAIL`, `computeAlternativeRoutes:true`.
- Gyalogos szakaszokat **kizárólag** szolgáltatói `distanceMeters` és `staticDuration` alapján fogad el; a hozzájuk tartozó időpont becsült, a valódi járat indulási idejéhez igazított. Nem élő ETA és nem térképes GPS-pozíció.
- Egyetlen fő találat, további alternatívák sorban, a meglévő v1072 teljes képernyős grafikus útitervben.
- © Google Maps forrás és sétaidő-becslés megjelölése kötelező.
- Forrás- és adathiba → nincs kitalált találat.

## Miért nincs még bekapcsolva a natív full coverage?
A fizetős Google Routes API-hoz nem elég a jelenlegi SH9 GitHub Pages frontend. A következők **egyike sincs igazoltan jóváhagyva/élesítve**:
1. Google Maps Platform projekt, szerződéses/EGT-feltételek áttekintése.
2. Google Cloud **kemény API-kvóta**, minimális jóváhagyott költségkeret, riasztás. Fontos: a cloud billing budget alert önmagában **nem kemény számlázási plafon**.
3. Supabase Edge szerveroldali `/functions/v1/hh-smart-trip-routes-v1` implementálása és üzemeltetési tesztje. Kizárólag szerveren tárolt kulcs, felhasználóazonosítás és családi jogosultságellenőrzés.
4. Kulcsok, CORS, hitelesítés, rate-limit, naplózás, menetrendforrás-attribúció és valós Android S24 Ultra teszt.
5. A v1073 config `enabled`, `billingApproved`, `termsApproved`, `endpoint` kapcsolók jóváhagyás utáni frissítése.

Az alapkonfiguráció **0 fizetős hívás**, `enabled:false`, `billingApproved:false`, `termsApproved:false`, `endpoint:''`. NEM megoldás Google API-kulcsot GitHub Pagesbe vagy böngészőbe helyezni.

## BKK és MÁV hivatalos adatok
- BKK static GTFS (CC BY 4.0; forrás: BKK Zrt., CC BY 4.0): https://opendata.bkk.hu/data-sources
- MÁV-csoport GTFS igénylő: https://www.mavcsoport.hu/gtfs-igenybejelento
- Google Routes transit: https://developers.google.com/maps/documentation/routes/transit-route
- Google Maps URL: https://developers.google.com/maps/documentation/urls/get-started
- A meglévő SH9 BKK táblák jelenleg csak néhány vonalra tartalmaznak útvonaltervezéshez felhasználható megállóidőket, a Volán és MÁV pedig külön helyi, jogosultság szerint betöltött menetrendekkel dolgozik. Ezek **nem egyenértékűek** egy kész, országos, gyalogos kapcsolatokkal bíró multimodális graph routing motorral.

## További v1074 cél
- Hiteles közös útvonal kiszolgáló bekötése, jóváhagyott költségplafonnal, majd a v1073 adapter aktiválása és valós útvonal UAT.
- Szolgáltatói autó/taxi adapterek (Főtaxi, Uber, közösségi autó) külön később; Wolt **kiszállítás**, nem személyfuvar.
