# SH9 Smart Trip AI v1110 · BKK + MÁV + Volán eredmény-összefésülés

## A helyes megközelítés

**Nem építünk negyedik útvonaltervezőt.** A három már meglévő kereső által **ténylegesen kiszámított** útvonalakat alakítjuk közös formátumra.

1. **BKK:** `healthhub/guardian/guardian-smart-hub-router-v804.js` → útvonaltervek; `guardian-bkk-timetable-v859.js` → ellenőrzött szolgáltatói GTFS-idők. A menetrendi idővel rendelkező, per-leg GTFS matching útvonalak összehasonlíthatók; a csak statikus Trip Plan Flow nem jelent igazolt indulási időpontot.
2. **MÁV:** `sh9/smart-travel/public-transport/mav/rail-journeys-v2.js` és `rail-gtfs-core-v1.js` → már kiszámított `result.journeys[].legs`. Csak a helyben engedélyezett GTFS-forrásból származó találat.
3. **Volán:** `sh9/smart-travel/public-transport/volan/volan-results-v997.js` → `render({list,from,to,stopById,...})` a helyi, jogosult GTFS-ből. A konkrét járatszám, megálló és indulás a kész találatból jön.

## Elkészült a **közös adatadapter** (nem éles kereső)

- **Kód:** `sh9/smart-travel/smart-trip/provider-results-merge-v1110.mjs`.
- Szerződések: `mav(result,...)`, `volan(list,...)`, `bkk(plans,...)`, `combine({bkk,mav,volan},query)`, `rating(itinerary)`, `toTripPack(choice,travelDate)`.
- A BKK meglévő GTFS-matched, valódi leg-idejeit a `guardian-bkk-timetable-v859.js` **új `legTimes` mezője** teszi elérhetővé. A routing nem változott.
- Azonos indulási/célpont és ugyanazon budapesti dátum szükséges a **közvetlenül összehasonlítható** útvonalakhoz.
- Kizárólag menetrendi adatok. Nem talál ki indulást, új vasúti/buszjáratot, gyalogos útvonalat vagy szolgáltatók közti átszállást.
- Az 5 csillag csak akkor járhat, ha a várakozás és a gyaloglás **is ellenőrzött**. Ellenkező esetben előzetes értékelés (legfeljebb 4 csillag).
- SH9 TripPack v1 csak igazolt, konkrét szolgáltatói eredményből készülhet; nem szerkesztjük át a régi felhasználói mentést.
- **27/27 automatikus teszt**: nyolc új aggregator szerződésteszt és 19 meglévő My Trips teszt, [GitHub CI](https://github.com/zsoltandmonika-cloud/berlet-app/actions/runs/41331017097).

## Ami még NINCS összekötve

- A három különálló mobiloldal **automatikus találat-átadása a Smart Trip AI közös eredményoldalára**.
- A három szolgáltatón átmenő **egy teljes ajtótól ajtóig tartó út** létrehozása: ehhez pontos megállókoordináták, bizonyított gyalogos átjárás, GTFS járatnapok és csatlakozásbiztonság szükséges.
- A BKK Guardian Trip Plan Flow pusztán statikus, idő nélküli útvonalai csak „statikus lehetséges útvonal” felirattal jelenhetnek meg; nem szabad automatikusan valós indulássá alakítani.
- Éles SH9 UI / My Trips integráció, családi profiljogosultság, Samsung S24 E2E teszt.

## A következő helyes fejlesztési kapu

A három **meglévő** keresőhöz külön, kis méretű **kimeneti adaptert** kell csatlakoztatni, amely a már kész eredményt egy közös, időbélyeggel és profillal ellátott, hozzáférésvédett átadási csatornára teszi. A Smart Trip AI csak a kéréshez és aktuális profilhoz tartozó eredményeket használhatja. **Nem futtatja újra a BKK/MÁV/Volán útvonaltervező motorját.**

Utána lehet a szigorúan igazolható átszállásokat multimodális útitervvé fűzni, összehasonlítani, felajánlani a legjobbat, és egyetlen jóváhagyott My Trips-mentést készíteni.
