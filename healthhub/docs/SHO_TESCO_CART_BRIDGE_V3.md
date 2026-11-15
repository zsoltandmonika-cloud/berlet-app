# SHO / Tesco Bridge v3 — teljes lista + teljes Tesco-keresés
**Dátum:** 2026-11-15
**Állapot:** GitHub főág; 12/12 kiterjesztett DOM/Supabase-mock teszt sikeres. Tesco-éles kosárintegráció nincs.

## Üzleti különbség
- **Teljes Tesco-keresés:** bármilyen beírt termék hivatalos Tesco keresőjébe kerül a `https://bevasarlas.tesco.hu/shop/hu-HU/search?query=...` címen, HTML GET űrlappal, a böngészőben.
- **Teljes Tesco böngészése:** közvetlen link a hivatalos `https://bevasarlas.tesco.hu/shop/hu-HU/landing/groceries` oldalra, ahol az eredeti áruházi kategóriák láthatók.
- **Teljes családi Smart List:** nincs 10 tételes korlát; az aktív `hh_shopping_list_v1` tételeket Supabase `.range()` lapozással kérdezi le, 250-es szakaszokban. Adatbiztonsági határ 10 000 rekord, azon túl kifejezett hibaüzenet, nem hallgatólagosan csonka eredmény.
- **Mobil-UI sebesség:** a lista először 40 sort jelenít meg és egy „További 40 termék” gombbal bővíthető. A kiválasztott tétel és a következő lépés minden betöltött listatételen működik.
- **Mentett Tesco SKU-linkek:** megmaradnak a családi RLS-táblában `hh_shopping_tesco_bridge_v1` és a v2-es böngészőlap-állapot (`sessionStorage`) tovább használható.

## Biztonság és pontos képességhatár
Nem állítjuk, hogy a Tesco teljes 15 000+ termékes katalógusa a SHO belső adatbázisában lenne, vagy a SHO automatikusan lekérne élő árakat, elérhetőséget, Clubcard-kedvezményeket, termékképeket, Tesco kosártartalmat, vagy tömegesen kosárba helyezne / rendelne. A Tesco hivatalos oldalán a vásárló végzi el ezeket. Nyilvánosan dokumentált és erre feljogosító, magyar Tesco-kosár API-t nem igazoltunk. Nem kerül Tesco-hitelesítő adat a SHO-ba; nincs automatizált scraping.

## Fájlok
- `sh9/shopping/tesco-bridge-v3.html` — új UI, 10 alap mintatermékkel és JavaScript nélküli Tesco keresővel.
- `sh9/shopping/tesco-bridge-v3.js` — teljes családi lista lapozása, 40 soros megjelenítés, egykoppintásos Tesco átadás és mentett terméklinkek.
- `sh9/shopping/index.html` — a meglévő Tesco indítógomb már a v3-ra mutat.
- `tesco-bridge-v2.html` és `tesco-pilot.html` megmarad rollback céljára.
- Smart List HTML/JS és családi listaadatok: változatlan.

## QA
12/12 kiterjesztett teszt: 261 listatételből 260 aktív; Supabase lapozás 2 kérésre; 40 sor + további gomb; 80 sorra bővítés; 73. aktív termék kiválasztása; vissza után következő termék; az eredeti 'Megvettem' állapot változatlan; teljes Tesco GET kereső; hivatalos kategórialink; 10 HTML-fallback sor; beépített JavaScript és forrás egyezése; nem keletkezik Tesco kosár-visszaigazolás.

## UAT nyitott
Samsung Internet / Edge teszt a publikus URL-en; Tesco szabad keresés egy tetszőleges termékre; visszalépés a 11. aktív Smart List tételéről; mentett SKU linkek két családi eszközön.
