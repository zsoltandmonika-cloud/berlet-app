# SH9 × Léna · v1106 napi hivatalos BKK-menetrendi adatforrás

**Állapot: első publikált adatcsomag és SHA‑256 manifest elkészült; automatikus napi frissítés aktív.** A Smart Trip AI keresőbe és My Trips-mentésbe a feed **még nincs bekötve**. A korábbi Léna · ChatGPT kereső maradt az alapértelmezett.

## Ellenőrzött adatcsomag

- Négy kiválasztott járat: **17, 19, 41, 260**.
- Első valódi snapshot: **7 107 járatpéldány, 153 megálló**, 2026-10-30–2026-12-01 menetrendi lefedettség.
- Felhasználható, nem élő, megállótól megállóig: nincs valós idejű késés, gyalogos szakasz, forgalmi esemény vagy nyomon követés.
- Származás és licenc: **BKK Zrt., CC BY 4.0**, [BKK OpenData](https://opendata.bkk.hu/data-sources), [BKK GTFS](https://go.bkk.hu/api/static/v1/public-gtfs/budapest_gtfs.zip).
- A menetrendi állományban a járatszám nem mindig határozza meg az eszköztípust (pl. pótlóbusz); **a konkrét GTFS route_id/típust** használjuk.

## Tartós GitHub Pages URL-ek

- **Kicsi állapotfájl (manifest):** https://zsoltandmonika-cloud.github.io/berlet-app/sh9/smart-travel/lena-native/bkk/data/bkk-feed-manifest-v1106.json
- **Védett validációval olvasható JSON:** https://zsoltandmonika-cloud.github.io/berlet-app/sh9/smart-travel/lena-native/bkk/data/bkk-selected-routes-v1106.json
- A manifest tartalmazza a SHA‑256 ellenőrzőösszeget, a hivatalos ZIP SHA‑256-ját, a feldolgozás és az utolsó validálás idejét, valamint az adatlefedettséget.

## Automatikus adatfrissítés

- **GitHub Actions:** [SH9 Lena BKK Verified Scheduled Feed v1106](https://github.com/zsoltandmonika-cloud/berlet-app/actions/workflows/sh9-lena-bkk-v1106-feed.yml).
- Időzítés: **naponta 03:23 UTC**, Magyarországon 04:23 télen és 05:23 nyáron. A GitHub Actions ütemezett indítás időnként késhet.
- Újrafuttatható a GitHub Actions **Run workflow** gombjával is.
- A workflow kizárólag két fájlt írhat: az open BKK JSON-t és az ellenőrző manifestet; családi My Trips adatot **nem érint**.
- Naponta ellenőrzi az eredeti hivatalos BKK ZIP-et. **Azonos eredeti ZIP-hash esetén a nagy JSON változatlan marad**, és csak az ellenőrzési manifest újul meg. Ezzel elkerüljük a napi ~5 MB Git történet-növekedést.
- Ha megváltozott a hivatalos ZIP, csak teljes validálás és valódi GTFS → SH9 TripPack teszt után kerül ki új JSON.
- Szigorú megállási feltételek: ismeretlen licenc, más eredet, megváltozott séma, hiányzó kiválasztott vonal, hiányos/jelentősen visszaesett lefedettség, elavult naptár, rossz megálló, hibás időrendi sor, sérült ZIP, SHA-hiba.
- Hibánál az utolsó ellenőrzött fájl megmarad. A böngészős olvasó **36 óránál régebbi validációt** vagy **14 napnál régebbi feldolgozást** nem fogad el; így egy sikeres korábbi adat sem marad használható a végtelenségig.
- A `bkk-feed-client-v1106.mjs` csak igény szerint olvas: 15 perces helyi cache, forrás és SHA‑256 ellenőrzés, kötelező menetrendi validálás, **nincs háttérpolling**.

## Tesztbizonyítékok

- [Első napi automata frissítés](https://github.com/zsoltandmonika-cloud/berlet-app/actions/runs/41326224392): sikeres, publikált teljes JSON, új GitHub Pages build.
- [Második verzió: hivatalos ZIP SHA-provenance](https://github.com/zsoltandmonika-cloud/berlet-app/actions/runs/41326532270): sikeres, manifest tartalmazza a `sourceSha256` mezőt.
- `test_sh9_bkk_publication_v1106.py`: adatfrissesség, időszak, hiányzó vonal, állomány-integritás, sérült adatsor, hash, 14 napos újrafelhasználás.
- `sh9-bkk-feed-client-v1106.test.mjs`: manifestkésés, hash és böngészős integritásellenőrzés.
- Éles telefonos keresés és valós My Trips mentés **még nincs ellenőrizve, tehát nem tekinthető késznek**.

## Következő lépés (v1107)

Az **igény szerint olvasható, validált** BKK-feed egy külön SH9 „Léna Native BKK · próba” keresési módba kapcsolható. Csak pontos BKK-megállópárokon próbáljuk a 17/19/41/260 egyjáratos, menetrendi útvonalakat; a felhasználó megerősítéséig nincs automatikus felhőírás. Az ajtótól ajtóig tartó multimodális országos útiterv külön fejlesztési fázis.
