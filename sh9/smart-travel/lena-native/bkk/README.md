# SH9 × Léna · BKK GTFS pilot v1105

**Státusz (2026-11-01): a valódi hivatalos BKK GTFS feldolgozás és SH9 TripPack-validálás SIKERES, éles felhasználói keresésbe még NINCS bekötve.** A BKK-fájl alapján 4 járat, 7 107 járatpéldány és 153 megálló került az ellenőrzött csomagba. A menetrendi időszak 2026-10-30–2026-12-01. A v1104 Native előnézet továbbra is költségzár alatt, adatmentés nélkül működik.

## Hiteles, költségmentes forrás

- BKK Zrt. menetrendi GTFS: https://go.bkk.hu/api/static/v1/public-gtfs/budapest_gtfs.zip
- Hivatalos második cím: https://bkk.hu/gtfs/budapest_gtfs.zip
- Nyílt licenc és attribúció: https://opendata.bkk.hu/data-sources
- **Kötelező forrásmegjelölés:** BKK Zrt., CC BY 4.0
- **Nincs élő késés, járműpozíció vagy terelésadat.** A valós idejű BKK-adatokhoz külön API-kulcs kell.

## Kész fejlesztési elemek

1. \`build_bkk_snapshot_v1105.py\`: csak helyi / GitHub Actionsből letöltött hivatalos GTFS ZIP-et olvas, és szűrt, forrással ellátott JSON-t készít. Nincs benne hálózati API-hívás, licenc nélküli MÁV-másolás, sem AI-költség.
2. \`bkk-gtfs-core-v1105.mjs\`: GTFS naptár, kivételes nap, budapesti időzóna, pontos megállónevek és hivatalos \`route_type\` szerinti busz/villamos besorolás. Nem találgatja a járattípust a járatszám alapján.
3. \`healthhub/tests/sh9-lena-bkk-v1105.test.mjs\`: 8 szimulált adatminőségi és TripPack-kompatibilitási ellenőrzés, sikeresen lefuttatva.
4. \`healthhub/tests/test_sh9_bkk_gtfs_v1105.py\`: 6 Python ZIP-importálóteszt; éles GitHub CI-ben sikeres.
5. \`.github/workflows/sh9-lena-bkk-v1105-gtfs-qa.yml\`: minden releváns kódmódosításkor teszt, majd **kizárólag belső GitHub Actions artifactként** hivatalos BKK ZIP letöltése és szűrése. Kézzel is indítható a GitHub Actionsben. Az artifact nem települ automatikusan GitHub Pagesre vagy Supabase-re.

## Valódi menetrendi teszt, 2026. november 1.

- [Sikeres GitHub Actions adatellenőrzés](https://github.com/zsoltandmonika-cloud/berlet-app/actions/runs/41324955928).
- Hivatalos BKK ZIP sikeresen letöltve, ellenőrizve és szűrve.
- A 17, 19, 41 és 260-as vonalakhoz 7 107 járatpéldány, 153 megálló; menetrendi érvényesség 2026-10-30–2026-12-01.
- **Valódi SH9 TripPack-kompatibilitási teszt:** 260-as busz, Citronella utca → Óbudai rendelőintézet, 2026-11-01, 17:22–17:34 (szigorúan menetrend szerinti, nem élő indulás).
- Ugyanaz a nyilvános járatszám hivatalos villamos- és pótlóbusz-tripeket is tartalmazhat; a járműtípust a GTFS egyedi route_id-ja alapján tartjuk nyilván.
- Az eredmény GitHub Actions belső, 7 napig megőrzött melléklete; nem kerül automatikusan éles útvonaltervezésbe vagy a családi My Tripsbe.

## Miért korlátozott a pilot?

- Kizárólag a 17, 19, 41 villamos és a 260-as busz szűrt hivatalos menetrendjére terveztük, a BKK feedben ténylegesen szereplő és igazolt járatokhoz.
- **Csak megállótól megállóig** tervez. Otthoni cím, gyaloglás, 2+ szolgáltató, vasúti csatlakozás, élő késés és alternatív országos útvonal nincs lefedve.
- Pontos megállónév szükséges, nem kerül véletlenszerű hozzárendelés „Bécsi út”-szerű általános címekhez.
- A JSON-data biztonsági validáláson és maximum 14 napos generálási frissességellenőrzésen megy át. Egy régies feedet a friss konvertálás nem tehet menetrendileg aktuálissá: szolgáltatási dátumok ellenőrzése kötelező.

## Kézi ellenőrzési folyamat GitHubban

1. GitHub → \`zsoltandmonika-cloud/berlet-app\` → **Actions**.
2. Workflow: **SH9 Lena BKK GTFS Data Quality v1105**.
3. **Run workflow** → \`check_live_feed=true\`.
4. Az automatikus \`code-qa\` és \`official-feed-review\` lépések futnak.
5. Ha mindkettő sikeres, \`sh9-bkk-v1105-qa-only\` artifact tölthető le. Az adatot a nyilvános helyre nem tesszük ki ellenőrzés és engedélyezés nélkül.

## Következő fejlesztési kapu

A GitHub Actionsből származó valós BKK snapshot teljes, sikeres verifikációja; megállók, járatok, szolgáltatási naptár és frissesség kontrollja; csak utána külön pilot bekötés a natív keresőbe. Egy későbbi verzió használhatja az \`hh_my_trip_packs\` meglévő Supabase-RLS mentését, de a jelenlegi állapotban **nincs éles automatikus mentés**.

A v1104 költségzár, a v1100 My Trips és az alapértelmezett ChatGPT-keresés érintetlen.
