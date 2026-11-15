# SHO Smart List Golden v1 · 2026-11-15

## Bevezetett állapot
- Új, külön mobilos felület: `sh9/shopping/smart-list.html`.
- Belépési pont: Shopping hero `Smart List` (a korábbi Kedvenc Listák gomb helyén), a jóváhagyott 2×3 kategóriacsempék, 2×5 bolt-csempék és a katalógusképernyő változatlanok.
- 390+ magyar generikus termékjavaslat, azonnali prediktív keresés, többtermékes magyar beszédbevitel böngésző-támogatás esetén, Open Food Facts eredetiképek a katalógustalálatokban.
- Egyetlen koppintás a termékkártyán vagy pipán: szerveroldali `done` állapotváltás, áthúzás, vásárlóprofil megjelenítése, visszavonható pipálás. Kedvencek és törlés.
- Közös Supabase adatbázis: `public.hh_shopping_list_v1`. Azonos családi Auth, `hh_profile_access` ellenőrzés és négy RLS politika.
- A `supabase_realtime` publikáció változásra frissíti a másik, megnyitott klienst. Újratöltés alkalmazásfókuszra / láthatóvá váláskor. Nem használ 3 mp-es pollingot.
- A meglévő `shopping.js` lokális Smart Basket adatai érintetlenek. Nincs automatikus áttöltés a két tároló között. Nem állítunk valótlan bolti árat vagy készletet.

## Workflow frissítés · 2026-11-15
- Egyetlen közös `shopping-board` csempe tartalmazza a megvásárolt és még megvásárolandó termékeket.
- A megvásároltak legfelül szerepelnek (legutóbbi pipálás elöl), zöld pipa + áthúzott terméknév + zöld jelölés.
- A még szükséges termékek alattuk következnek, külön szekció és lenyíló lista nélkül.
- A fejléc összesítése: `X hátra · Y megvéve`. Egy koppintással visszaállítható az aktív állapot.
- A külön lista megszüntetése nem érinti a felhős státuszmentést, Realtime szinkront, kedvenceket és termékkeresést.
- A GitHub-kód és a JavaScript szintaxisa ellenőrizve; valódi kéttelefonos UAT továbbra is szükséges.

## Termékszintű ikonfelismerés · 2026-11-15
- Intelligens magyar terméknév-felismerés: **112 ikon-szabálycsoport, 409 névalias** (ékezetfüggetlen, teljes szó/kifejezés egyezés).
- Példa: `banán`, `bio banán`, `2 kg banán` → 🍌; `alma` → 🍎; `kávé` → ☕; `kutyatáp` → 🐶.
- Megjelenítési prioritás: **valódi termékfotó → specifikus emoji → kategóriaikon**. Hibás/kieső fotónál is automatikus ikon-visszaesés.
- Ugyanaz a szabály működik a prediktív találatokban és a már mentett közös lista elemein; nincs adatbázis-migráció.
- 25 névfelismerési teszt sikeres, a beépített 392 különböző terméknévből 354 felismerhető termékszinten (kb. 90%), a többi kategóriaikont kap.
- A felhasználói készüléken a natív emoji megjelenés eltérhet. Kéttelefonos vizuális UAT még szükséges.

## Shopping fő kategóriák egységesítése · 2026-11-15
- A Smart List pontosan öt fő kategóriát kínál: **Élelmiszer, Elektronika, Divat & Stílus, Drogéria & Szépség, Otthon & Háztartás**, a Shopping főmodul azonos azonosítóival.
- Kompakt gombfeliratok: Élelmiszer, Elektronika, Divat, Drogéria, Otthon & Háztartás.
- A korábbi különálló Mind, Italok és Kisállat gomb megszűnt; kezdetben minden termék kereshető, a kiválasztott kategória szűr, ismételt koppintás eltávolítja a szűrést.
- A meglévő elemek nem vesznek el: régi Italok → Élelmiszer; Drogéria → Drogéria & Szépség; Háztartás és Kisállat → Otthon & Háztartás. Nincs adatbázis-migráció.
- Elektronika, Divat, Otthon és további drogéria-szócikkek bővítve; a prediktív kereső **593 különböző terméket** javasolhat (a lokális gyűjtemény alapján), továbbra is fogad tetszőleges saját terméknevet.
- Open Food Facts távoli képes keresés továbbra is csak élelmiszerhez használható (és szűrő nélküli keresésnél), nem ígér nem létező elektronikai vagy ruházati katalógust.
- GitHub JavaScript szintaxisellenőrzés sikeres; éles S24 Ultra képernyőteszt és kategóriaszűrés UAT szükséges.

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
