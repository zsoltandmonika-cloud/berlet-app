# HealthHub v699 · Ask Léna teljes forráskatalógus és premium UX

**Dátum:** 2026-10-19 · Golden Standard cél: Gondoskodás + Adatismeret + Intelligencia.

## Éles adatbázis alapján körülhatárolt feladat
A korábbi v698-as Ask Léna kizárólag strukturált MKB-tényeket vett alapul (7 tény, 12 bizonyíték). Az aktív, integritásellenőrzött egészségügyi eredeti forrásállomány ezzel szemben:
- **Mónika: 164 dokumentum, 269 feldolgozott oldal**.
- **Zsolt: 43 dokumentum, 68 feldolgozott oldal**.
- A felhasználó által korábban tudatosan kizárt 11 Samsung Watch EKG nem része ennek a kötelező körnek.

## v699 – Teljes, profilhoz kötött katalógus
- A külön `mkb-full-index-v699.js` read-only, azonos profilhoz és privát eredethez kötött PDF-katalógust készít. A dokumentum és MKB-forrás SHA-256 egyezik, mindkét objektum ellenőrzött; a tudatosan kizárt PDF nem kerül a listába.
- **Minden érvényes PDF látható** a saját profilban. Az ötnél megálló korlát kizárólag az AI-nak egyszeri hozzájárulással átadható idézetekre vonatkozik.
- A keresés MKB-oldalszövegeket vizsgál; a legfeljebb öt rövid szövegrészletet **külön, az eredeti oldal tárolt SHA-jával újraellenőrzi**, és a többi oldalszöveget nem adja tovább az AI-nak.
- A forrás metaadatából származó dátumot nem állítja klinikai eseménydátumnak. A forrás-szöveg integritása nem helyettesíti a szakmai tényfelülvizsgálatot.
- A felhasználó által látott előnézet és a pontosan azonos kérdéshez kötött egyszeri jóváhagyás után a `Kutatás indítása a kiválasztott forrásokkal` gomb indítja az AI-kérést. **Nincs alapértelmezetten bekapcsolt, rejtett orvosi adatátadás.**
- `Új kutatás` visszaállítja a kérdés- és ideiglenes forrásállapotot, a valódi egészségügyi leleteket és az előzményeket érintetlenül hagyva.

## v699 – Gyorskérdések és mobil UX
- A korábbi, hosszan széthúzódó Gyorskérdések helyett **152 px magas (mobilon 138 px), függőlegesen görgethető, egysoros választólistát** használunk.
- Profilonként kérdés hozzáadható, szerkeszthető, törölhető, visszaállítható (maximum 18 darab, maximum 230 karakter). A választás csak a kérdésmezőt tölti be, nem indít automatikus AI-kutatást.
- A Gyorskérdések **csak az adott eszköz helyi preferenciái**, nem szinkronizált klinikai adatok. A szerkesztett személyes kérdések másik eszközön nem jelennek meg automatikusan.
- A megemelt 284 px-es kérdéskomponens **190 px-re (S24-mobil: 186 px)** csökkent, a kérdésszöveg belül továbbra is görgethető; a diktálás és az Enter/Kutatás gomb a meglévő helyükön maradnak.

## v699 – Előzménylista villódzásmentesítése
Két külön modul működik az Ask Léna felületén (`live-v342.js` és `live-v364-history.js`). Az előző implementáció mindkettőnél még **azonos tartalom esetén is újragenerálhatta a DOM-ot**. A v699:
- A helyi előzmények tartalmi azonosítója alapján **kihagyja a felesleges „Betöltés…” és teljes sor-újrarajzolást**.
- A felhőalapú lista esetében szétválasztja a státuszfrissítést a teljes listaváltástól. Változatlan előzményeknél megőrzi a görgetési pozíciót, a keresőmező szövegét és a billentyűfókuszt.
- Nem töröl és nem módosít korábbi beszélgetéseket; nem cserél hitelesítést.

## Kiadási kapu
CODED → szintetikus QA → GitHub CI → `main` → **valós S24 Ultra próba** Mónika és Zsolt profilján. LIVE VERIFIED / USER ACCEPTED csak akkor, ha a felhasználó ténylegesen látja Mónika 164 / Zsolt 43 forrását; görgethető listából választ, helyi Gyorskérdést szerkeszt, az Előzmények nem villog, és az Ask Léna kérdését kényelmesen be tudja küldeni.

A fejlesztés nem jogosít fel az eredeti orvosi PDF-ek tömeges feltöltésére, átindexelésére vagy a régebbi személyes előzmények megváltoztatására.
