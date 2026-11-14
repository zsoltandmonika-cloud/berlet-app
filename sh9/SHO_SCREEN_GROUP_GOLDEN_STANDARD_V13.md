# SHO / HealthHub · Screen Group Golden Standard v13

**Jóváhagyva:** 2026-11-14 · S24 Ultra mobilos referencia.

## Kötelező Golden Standard UI szabály

1. **Egy teljes csempecsoport = egy mobilképernyő.** A csoport vége az alsó, rögzített navigáció felett legyen.
2. **Képtorzítás tilos.** A logó, fotó, ikon és felirat megőrzi arányát, olvashatóságát. Ne használj `object-fit:fill` megoldást, se erőltetett kártyamagasságot csak a számolt illesztés kedvéért.
3. **Helyet a sallangból nyerünk, nem a csempékből.** Fejléc, felesleges instrukció, távolság, duplikált kezelősáv csökkenthető. Az érintési felület és az eredeti vizuális minőség marad.
4. **Válaszd szét a képernyőcsoportokat.** Jóváhagyott Shopping V12 referencia: első képernyőn 6 kategóriacsempe (2×3); második képernyőn 10 áruház (2×5), az utolsó Temu + SHEIN; harmadikon kezdődik a Valódi termékkatalógus.
5. **Snap-to-screen, ha a modulban valódi képernyőcsoportok vannak.** Függőleges görgetésnél finom `scroll-snap-type: y proximity` illesztés a csoportkezdeteknél. Hosszú tartalom és interaktív panel szabadon görgethető, tilos kötelező snap-csapdát létrehozni.
6. **Visszajelzés érkezéskor:** csak felhasználó által indított, ténylegesen befejezett képernyőcsoport-váltáskor egy rövid, halk saját kattintás és a támogatott készüléken finom haptika. Ne kattogjon automatikus betöltéskor, minden scroll-pixelre, görgetés közben vagy háttérben. Későbbi moduloknál a hang/haptika legyen opcionális, és akadálymentes hozzáférést ne rontson.
7. **Akadálymentesség:** `prefers-reduced-motion` esetén a snap-effekt és visszajelzés kikapcsolható; az OS hang-/rezgésengedélye és a böngésző támogatása tiszteletben tartandó.
8. **Fix elemek mozdulatlanok.** A globális HealthHub Golden Standardban előírt profil- és alsó navigációs kontrollok nem ugorhatnak, nem méreteződhetnek és nem animálódhatnak. A snap csak a tartalomra vonatkozik.
9. **QA-kapu:** Galaxy S24 Ultra valós eszközön ellenőrizni kell mindkét profilban a képernyőhatárt, 2×3 és 2×5 csempék olvashatóságát, kattintásokat, scroll-snap mozgást, mozgáscsökkentést, a fix navigációt és a harmadik katalógusképernyő szabad görgetését.

## Implementációs referencia

- `sh9/shopping/index.html` – külön kezelt kategória-, áruház- és katalógusblokk.
- `sh9/shopping/shopping.css` – első képernyő, képarányos kártyák és v13 proximity snap.
- `sh9/shopping/visual-cards-v3.css` – a tíz áruház 2×5 rácsa, a második képernyőhöz méretezve.
- `sh9/shopping/shopping-snap-v13.js` – felhasználói scroll után egyetlen finom kattintás és haptika, redukált mozgás tiszteletben tartásával.

**Fontos:** a forráskódba bekerülés nem bizonyít valós eszközös QA-t. A V13 snap/hang/haptika külön mobilos elfogadó tesztet igényel. A Shopping V10/V12 már jóváhagyott csempearányait a snap bevezetése nem változtathatja meg.
