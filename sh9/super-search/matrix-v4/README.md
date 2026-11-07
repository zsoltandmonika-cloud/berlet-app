# SHO Matrix Search V4 · valódi menetrendi pilot (izolált)

## Elérhető fejlesztési felület
`/sh9/super-search/matrix-v4/live-pilot.html`

- Teljesen különálló oldal, nincs bekötve az éles Smart Trip fő gombjára.
- Saját MÁV GTFS és Volán GTFS **csak az ugyanazon domainen, böngészőben korábban betöltött IndexedDB-ből** olvasható. Nem kér fájlfeltöltést, nem készít új tárolót, nem továbbít nyers menetrendet.
- Hivatalos BKK 17/19/41/260 GTFS-szelet ugyanazon eredetű SHA-256-ellenőrzött snapshotból, meglévő `smart-trip-bkk-v1107.mjs` API-val, read-only.
- MÁV és Volán saját dedikált Web Workerben, BKK párhuzamosan. Korlát 12 s keresőszálanként; hibás forrás nem blokkolja a többit.
- Három önálló megállópár és egy megjelenítendő szolgáltató választható, mert a BKK és a távolsági csomópontok között még nincs igazolt gyalogos gráf. **A három forrás párhuzamos mérését demonstrálja, nem állít valódi háromszolgáltatós ajtótól ajtóig útvonalat.**
- Minden menetrendi megállónevet szigorúan összevet a kiválasztott pár megállóival, azonosított átszállási csomópontok nélkül nincs kombinált útvonal.
- Meglévő `sh9.trip-pack/1` validálás; elkészített útvonal helyben megjelenik a tesztoldalon. A profilfüggő My Tripsbe **nem ír**, és nem indít GPT-6-hívást.
- Rövid lokális, szabályalapú Léna Touch fallback; a valódi AI-ajánlás továbbra is későbbi opcionális fázis.
- A pilot stopper keresési és megjelenítési tesztet szolgál. A 20–30 másodperces **teljes** cél a későbbi hitelesített My Trips mentést és valódi Léna-sztorit is tartalmazza. Ezt most még nem teljesítettük.

## Megőrzött elemek
Az éles `Smart Trip` `index.html`, `smart-trip-ai-v1022.js`, `smart-trip-pack-v1078.js`, `My Trips`, `Tracking`, közös dock és a HealthHub adatbázis nem változott. Nincs Supabase-migráció, sem új API-kulcs.

## BKK lefedettségi korlát
A hivatalos, aktuális pilot snapshot négy vonalra korlátozódik (17, 19, 41, 260). A budapesti pályaudvari kijutás teljes lefedettségét még nem biztosítja. Az előzetesen megadott próba-megállónevek a betöltött GTFS-hez igazítandók; pontos nevek és menetrendi érvényesség szükséges.

## Következő valódi fejlesztés
1. A három szolgáltató **egy** közös kereséshez szükséges, teljes menetrend- és földrajzi lefedettségének rendezése.
2. Igazolt OSM-alapú gyalogos csomópontkapcsolatok (irány, távolság, idő) integrálása, jogi/technikai ellenőrzéssel.
3. Teljes Budapest munkahely → Kazincbarcika célcím teszt 2026-11-27 15:15-re.
4. Meglévő TripPack/Golden UI handoff és hitelesített My Trips mentés ellenőrzött gombbal.
5. Opcionális, aszinkron GPT-6 Léna Touch; mérés gombnyomástól az **utolsó teljesülő feltételig**. A 30 másodperc jelenleg cél, nem bizonyított eredmény.

## Futó tesztek
```sh
node --test healthhub/tests/sho-matrix-search-v4-pilot.test.mjs \
  healthhub/tests/sho-matrix-source-adapters-v4.test.mjs \
  healthhub/tests/sho-matrix-live-pilot-v4.test.mjs
```

Mindhárom tesztcsomag szintetikus menetrendi mintákat használ. A felhasználó privát adatait nem tölti fel a CI.
