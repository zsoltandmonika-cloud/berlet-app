# SH9 Public Transport / Family Guard · Active Transit v862

**Dátum:** 2026-10-26. Webes Family Guard-frissítés. Új APK nem szükséges.
**Vizualitás:** Premium Pastel Glass Zsolt-kék / Mónika-rózsaszín, villamos sárga, busz kék, troli piros, HÉV zöld.

## Két működési mód

**Elsődleges: „Felszálltam”.** Utazó egy koppintásra indítja a GPS-t használó utazási módot. A telefon friss és kellően pontos, már meglévő GPS-jele és hivatalos BKK statikus megállósorrendje alapján közeli *lehetséges* járatokat kínálunk fel. A járatszámot az utazó megerősíti. Lehetséges kézi járatszám és módválasztás, ha nincs GPS-jel. „Másik járatra szálltam” és „Utazás befejezése” gomb.

**Másodlagos: előre kiválasztott útvonal.** Trip Plan Flow ajánlatokon „Kiválasztom ezt az útvonalat” gomb. A tervezett első járat az Active Transitben „tervezett” státuszt kap. A „Felszálltam a 260-ra” gomb egy érintésre „felszálltam” státuszra vált. Átszállást az utazó megerősíti.

## Két nézet

- **Utazó:** a már működő saját telefon GPS-portréja melletti üvegcímke: név, sárga járatszám ha villamos, saját telefon mért sebessége, ha elérhető/friss.
- **Családtag:** a jogosult, friss Family Live GPS-portré mellett ugyanebben a buborékban megjelenhet a tulajdonos által kiválasztott útvonal/járat és a meglévő valódi GPS sebesség. Koppintással rövid magyarázat.
- A „felszálltam” felirat a tulajdonos **saját nyilatkozata**, nem bizonyított járműazonosítás. A GPS-közeli GTFS-megállók jelölése csak javaslat.
- Késés/valódi következő megálló csak konkrét azonosított járathoz kötött, friss hivatalos live feed esetén. Ellenőrzött adat nélkül **nem** mutatunk számot.

## Hozzáférés és adatvédelem

- Supabase hh_guardian_active_transit: személyhez tartozó státusz, járatszám, típus, megerősítés és időbélyegek. **Nincs koordináta, új helyelőzmény, extra GPS-követés vagy rejtett feltöltés.**
- Családi olvasás csak hitelesített RLS családi profilhozzáféréssel. Írás/törlés csak a már aktív, engedélyezett Family Live saját telefon-tulajdonosa alatt.
- Maximum két óra; utána a felület nem mutatja aktív státuszként. Leállításkor saját bejegyzés törlése.
- A portrébuborékban a vonalcímke csak **friss, jogosult GPS-pozícióval** jelenik meg. A böngésző háttérben nem követ.
- Family Live nélkül helyi kézi választás működhet, de családi szinkron nem garantált.

## Telefonos ellenőrzés, még hátravan

1. Mónika S24: Felszálltam → GPS közeli villamos → megerősítés, sárga badge.
2. Zsolt S24: hitelesített Mónika GPS-portré és azonos kiválasztott járat, meglévő sebességbuborék.
3. Leállítás, profilváltás, GPS-pontatlanság, offline helyzet, visszavont jogosultság.
4. Trip Plan Flow 260 → 19: tervezett státusz, utána egygombos Felszálltam megerősítés.
5. S24 mobilvizuális QA szükséges; automatizált kód- és szimulált tesztek mellett még nincs kéttelefonos éles teszt.

## Következő Public Transport, 2026-10-27

- **MÁV:** menetrendi GTFS-igénylés, állomások, Watchlist. MÁVPlusz élő térképes link; natív élő vonatkoordináta csak hivatalos, dokumentált hozzáféréssel.
- **Volán:** buszos GTFS-igénylés ellenőrzése a közös MÁV űrlapon; megállók, menetrend, Watchlist, élő hozzáférési jogok külön.
