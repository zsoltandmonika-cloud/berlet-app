# SHO Smart List Golden v1 · 2026-11-15

## Bevezetett állapot
- Új, külön mobilos felület: `sh9/shopping/smart-list.html`.
- Belépési pont: Shopping hero `Smart List` (a korábbi Kedvenc Listák gomb helyén), a jóváhagyott 2×3 kategóriacsempék, 2×5 bolt-csempék és a katalógusképernyő változatlanok.
- 390+ magyar generikus termékjavaslat, azonnali prediktív keresés, többtermékes magyar beszédbevitel böngésző-támogatás esetén, Open Food Facts eredetiképek a katalógustalálatokban.
- Egyetlen koppintás a termékkártyán vagy pipán: szerveroldali `done` állapotváltás, áthúzás, vásárlóprofil megjelenítése, visszavonható pipálás. Kedvencek és törlés.
- Közös Supabase adatbázis: `public.hh_shopping_list_v1`. Azonos családi Auth, `hh_profile_access` ellenőrzés és négy RLS politika.
- A `supabase_realtime` publikáció változásra frissíti a másik, megnyitott klienst. Újratöltés alkalmazásfókuszra / láthatóvá váláskor. Nem használ 3 mp-es pollingot.
- A meglévő `shopping.js` lokális Smart Basket adatai érintetlenek. Nincs automatikus áttöltés a két tároló között. Nem állítunk valótlan bolti árat vagy készletet.

## Ellenőrzés
- GitHub módosítások és új fájlok a `main` ágon mentve.
- JavaScript szintaxis ellenőrzése sikeres.
- Az adatbázistábla létezik, RLS aktív, 4 politika él, Realtime publikáció megvan.
- Authenticated profiljogosultsággal teszt-INSERT/UPDATE/SELECT sikeres, a teljes teszttranzakció ROLLBACK-kal zárva.
- Két valódi Galaxy S24 Ultra készüléken való UAT **még szükséges**: külön bejelentkezés, A→B és B→A pipálás, felhőmentés, kijelentkezés, gyenge mobilinternet, magyar mikrofonengedély.
- Az esemény megjelenik, ha a másik telefonon az oldal meg van nyitva. OS háttér-push értesítés még nincs; nem szabad ezt állítani.

## Linkek
- SHO: https://zsoltandmonika-cloud.github.io/berlet-app/sh9/
- Smart List: https://zsoltandmonika-cloud.github.io/berlet-app/sh9/shopping/smart-list.html

## Biztonsági megjegyzés
- Az esemény `done_by_profile` mezője az adott eszközön kiválasztott profilt rögzíti, nem önálló fizikai személyazonosság-verifikáció.
- A szolgáltatás `auth.uid()` alapján védi az adatokat. A publikus kliensben csak a Supabase publishable key szerepel.
