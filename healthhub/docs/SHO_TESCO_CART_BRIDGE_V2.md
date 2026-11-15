# SHO · Tesco Smart Cart Bridge v2 — one-tap pilot

**Dátum:** 2026-11-15 · **Állapot:** implementálva, 13/13 DOM/felhőmock ellenőrzés sikeres; Tesco-fiókos és kéttelefonos éles UAT még nem történt meg.

## Miért v2?
A v1 pilotban a felhasználónak minden Tesco-kosárművelet után külön vissza kellett térnie és kézzel „Kosárba tettem” jelölést kellett rögzítenie. Ez plusz adminisztráció volt, ráadásul a SHO semmilyen módon nem látta ténylegesen a Tesco kosarát. V2-ben nincs ilyen követelmény vagy félreérthető kosár-progressz.

## Új felhasználói út
1. SHO → Shopping → Boltok & valódi termékek → **🛒 Tesco Bridge v2**.
2. Választás: **Közös Smart List** (max. 10 tényleges, még nem megvásárolt tétel) vagy **10 mintatermék**.
3. A **MOST KÖVETKEZIK** panelen egyetlen nagy gomb megnyitja a Tesco keresést, illetve egy már mentett hivatalos Tesco-termékoldalt.
4. A Tesco kosárba helyezés a Tesco saját oldalán történik.
5. A böngésző Vissza gombjával visszatérve automatikusan a **következő tétel** kerül a főpanelen előtérbe. Nincs kötelező újabb pipa, végső egyeztetés a Tesco kosarában.
6. **🔗 Terméklink**: első alkalommal opcionálisan elmenthető az ellenőrzött domainű konkrét Tesco-termékoldal a családi `hh_shopping_tesco_bridge_v1` táblába. Ettől kezdve a termék keresés helyett közvetlenül nyílik. A Tesco-domaint és SKU-formátumot validálja, **nem** ellenőrzi automatikusan a SKU termékegyezőségét.
7. **Előző / Következő / Elölről**: manuális felülbírálás; kizárólag böngészőlap-szintű navigációs állapot. Nem vásárlási bizonyíték.

## Biztonság / integritás
- A Smart List `hh_shopping_list_v1` adatait a v2 **csak olvassa**. A `done` mezőt nem írja.
- Terméklinkek a meglévő `hh_shopping_tesco_bridge_v1` RLS-érvényes családi táblába mentődnek, a korábbi kézi kosárjelölést a v2 sem nem használja, sem nem írja felül.
- A soron következő tétel kizárólag `sessionStorage`-ban tárolódik. Két eszközön nem szinkronizált és nem kosárállapot.
- A Tesco oldalát azonos böngészőlapon nyitjuk, így Android WebView / felugróablak-blokkolás esetén is van navigáció. Tesco-fiók, rendelés, fizetés, kosár módosítása a Tesco rendszerében marad.
- A HTML beépített futtatót és 10 **statikus keresőlinket** tartalmaz: ha a felhő vagy egy külön script hibás, az alap Tescore-keresés akkor is használható.
- **v1 megőrizve:** `sh9/shopping/tesco-pilot.html`; rollback teszt számára.
- **v2 fájlok:** `sh9/shopping/tesco-bridge-v2.html`, `sh9/shopping/tesco-bridge-v2.js` (forrás), Shopping indítólink `sh9/shopping/index.html`.
- Megvalósítás commitjai: motor `37ee7de30f7cce29100f9bb56e9febf3cb3627a3`, HTML `4685a682571ba8ce621a97e9915be0760b13ed2b`, Shopping link `e73bf7b5a7849f17192328ae9bce6b7c8f4e5538`.

## Ellenőrzési bizonyíték
13/13 JS-alapú DOM/felhőmock QA: statikus 10 mintatermék; bejelentkezett közös lista betöltés; demo mód; aktív termék; Tesco keresőlink; session „következő” navigáció visszatéréskor; konkrét terméklink családi mentése; közvetlen visszanyitása; Smart List változatlan; beépített JS és forrás szöveges egyezés; nincs új kötelező kosárjelölés.

**Nyitott elfogadási teszt:** Samsung Interneten v2 oldal megnyitása; 10 demo megjelenítése; Tesco felé navigáció; Android Vissza → automatikusan következő termék; terméklink mentése és újramegnyitása; kétprofilos párosítás szinkron a felhőből. A Tesco élő kosarával való integráció **nem** része a v2-nek.
