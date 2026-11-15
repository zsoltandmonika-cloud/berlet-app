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

## Smart Save · felhasználó által jóváhagyott v10 · 2026-11-15
- **Jóváhagyva:** kompakt 58 px terméksorok, változatlan terméknév-betűméret, öt Shopping-főkategória a kért sorrendben: Élelmiszer → Drogéria → Otthon és háztartás → Divat → Elektronika.
- A terméksor jobb oldalán kisméretű, kattintható mennyiség/súly jelzés (`1 db`, `250 g`); külön alsó szerkesztőben mennyiség/súly mód, mértékegység és +/- gomb, felhőmentés.
- Egyetlen közös lista, a megvásárolt tételek felül, zöld pipával és áthúzással. Termékszintű képek/ikonok, egykattintásos műveletek, hang- és haptikus visszajelzés.
- **Visszaállítási referenciakód:** `sh9/shopping/smart-list.html` és `sh9/shopping/smart-list-v1.js` a v10-hez tartozó GitHub `main` állapotban; korábbi elfogadott implementáció commitok: HTML `ccc42b207c3113ad82eb39f1826b1d8664869ff7`, JS `832198441bb52b9413e91f413595e76c9a46b9db`.
- A felhasználó jelezte: **„szuper lett, smart save”** és **„eddig minden super”**. Ez vizuális/UX jóváhagyás; külön kéttelefonos Realtime és mennyiség szerveroldali együttműködési UAT továbbra is nyitott.

## Smart List v11 · kategóriastátusz-panel · 2026-11-15
- A korábbi vízszintes kategória-chip sor helyett **hat függőleges, kompakt státuszsor**: Mind, Élelmiszer, Drogéria, Otthon és háztartás, Divat, Elektronika. A kijelzőn rövid magyar címkék, a tárolt kategóriaazonosítók a Shopping főkategóriáival egyeznek.
- Minden sorban **megvett / összes** számpár és valós adatból számolt zöld progress bar. A `Mind` az összes tételt mutatja, az üres kategóriák `0/0` és 0%-os sáv állapotúak.
- Egy koppintás egy adott kategóriára a **bevásárlólista tételeit és a fejléc hátra/megvéve számlálóját is szűri**, nem csupán a keresési javaslatokat; második koppintás visszaállítja a `Mind` nézetet. A `Mind` sor önállóan is választható.
- A korábbi italok, háztartás, drogéria, kisállat megnevezések továbbra is a megfelelő új fő kategóriába normalizálódnak, meglévő termékek nem vesznek el.
- A 58 px-es terméksorok, a jobb oldali mennyiség/súly gomb, az alsó szerkesztő, a felhőszinkron és a check/uncheck visszajelzés megmarad.
- Technikai verifikáció: kód szintaxis és 10 regressziós feltétel sikeres; nyolc szimulált tétel alapján mind a 6 számpár, sávszázalék, kategóriaszűrés és visszaállítás helyes. **Valós kéttelefonos UAT még szükséges.**
- Implementáció: HTML `sh9/shopping/smart-list.html` v11; JS `sh9/shopping/smart-list-v1.js`. HTML commit: `09ac830af50d8fa77a533fa39eb3a44bb89685e4`; JS commit: `d2bec2e51d77bd178242d68de6d70e09bbb0155c`.

## Smart List v13 · kedvencek és felső navigáció · 2026-11-15
- A felső két redundáns navigációs ikon helyén **♥ Kedvencek** és **🛒 Bevásárlólista** gomb. Ugyanazon Smart List oldalon váltják a nézetet; az alsó SHO navigáció megmarad.
- A Kedvencek végre **független, tartós közös felhős gyűjtemény**: `public.hh_shopping_favorites_v1`; egyedi `(household, name_key)` kulcs, név, mennyiség, mértékegység, kategória, hiteles kép/vonalkód és frissítő profil tárolása.
- Supabase RLS engedélyezve, négy családi jogosultsági politika (SELECT/INSERT/UPDATE/DELETE). `anon` nem rendelkezik SELECT joggal; hitelesített családi profil hozzáférhet. Realtime publikáció engedélyezve.
- Az átálláskor meglévő kedvenc jelöléseket átemeltük a külön táblába, adatok törlése nélkül. A szív most a külön Kedvencek-tábla alapján jelenik meg.
- A listaelem törlése **nem** érinti a Kedvencek-táblát. A Kedvencek nézet kompakt sorokból áll, `＋` gombbal a tárolt mennyiség + mértékegység felhasználásával újra felvehető a bevásárlólistára; `♥` gombbal külön törölhető a Kedvencekből. Nincs zavaró megerősítő prompt.
- Supabase migráció: `sho_shopping_favorites_shared_persistent_v1`. HTML `sh9/shopping/smart-list.html` v13, JS `sh9/shopping/smart-list-v1.js`; commitok: HTML `77957e103da6d69edb45e87cde750bcb926c6159`, JS `103f026c3bdd099c5cd8508b5443da71944b25b3`.
- Ellenőrzés: JS szintaxis, az oldalelemek egyeztetése, RLS/adatjogosultság és Realtime jelenlét; DB módosítások teszttranzakcióval visszagörgetve. **Két mobiltelefonos UAT még szükséges.**
- A régi Shopping főoldali, helyileg tárolt Wishlist továbbra is **külön** gyűjtemény; a most kialakított közös kedvencek ennek nem automatikus migrációja.

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
