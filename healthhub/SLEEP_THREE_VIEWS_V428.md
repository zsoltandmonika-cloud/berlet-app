# HealthHub Sleep v428 · három elsődleges alvásnézet

## Felhasználói sorrend, mobilon legfelül

1. **Utolsó alvás:** a legutóbb befejezett Health Connect alvásrekord, nappali szunyókálás is lehet.
2. **Éjjeli alvás:** a legutóbbi, éjszakai időponthoz illeszkedő 90+ perces mért alvás. Az éjszakai besorolás az időbélyeg alapján történik (budapesti 21:00–09:00 ablak többsége), nem a Samsung szabadalmazott sleep score vagy hivatalos „main sleep” jelölése.
3. **Elmúlt 24 óra:** gördülő, az aktuális perctől visszaszámított 24 óra, minden mért alvásszakasz uniójával. Átfedő Health Connect rekordokat nem számol kétszer, a 24 órás ablak határán levágja őket. Ha nincs szakaszadat, nem tekinti a teljes ágyban töltött időt alvásnak.

A három mobilkártya után egy teljes szélességű, négy fázissávos **24 órás idővonal** következik, a meglévő részletes „Alvási tényezők” előtt. A fejléc a legutóbbi *alvásról* tájékoztat, nem feltétlenül az éjjeli alvásról.

## Harmincnapos naptár

A különálló előnézeti naptár kártyái letisztultak, a legfrissebb napok görgetés nélkül előtérbe kerülnek. A napváltás a betöltött rekordokkal lokálisan történik, **nem indít új Dropbox-letöltést**. Az ugyanazon napon végződő alvások egymás alatt, külön grafikonokkal jelennek meg. A napok a **Europe/Budapest** ébredési dátumhoz kötődnek.

## Biztonság és kiadás

- Célzott webes HTML/CSS/JS módosítás, Android APK és Health Connect engedélyek változatlanok.
- A v428 kizárólag `?hh_sleep_v428_preview=1` query paraméterrel aktív. A stabil Sleep képernyő alapértelmezetten változatlan.
- Az éles oldal Sleep lapjának alján egy visszafogott, **összecsukott „🧪 Sleep · fejlesztői előnézet”** hivatkozás nyitja a v428-at, illetve visszavezet a stabil változathoz. A link az adatokat nem módosítja.
- Az új nézet kizárólag a meglévő Sleep adatút által a kiválasztott profillal ellenőrzött rekordokat olvassa. Nincs új backend, Dropbox-írás, egészségügyi adatfeltöltés vagy automatikus szinkron.
- A kódbeli adatok tájékoztató jellegű mérési eredmények, nem diagnózisok. Hiányos Health Connect szakaszadat esetén az összeg lehet hiányos, **nem becsüljük fel a teljes időszakra**.
- Kiépített Golden Backup/napló és kizárólag kézi rollback. Az S24 Ultra telefonos valós tesztje továbbra is szükséges.

## Offline regressziós ellenőrzés

`node healthhub/tests/sleep-v428.test.js`: legutóbbi nappali alvás, éjjeli fő alvás megőrzése, nappali alvás hozzáadása az elmúlt 24 órához, átfedések duplázásmentessége, határlevágás, hiányzó fázisadat, profil elkülönítés és default-off flag.
