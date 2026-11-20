# SHO Smart Shopping · Golden Recovery V3 · QA és átadási kapu
**Dátum:** 2026-11-20 · **Státusz:** fejlesztői **DRAFT**, nem élesített, nem hitelesített pixel-to-pixel egyezés

## Végleges cél
Az utolsó felhasználó által elfogadott, természetesebb színvilágú 941×1670-es referencia:
1. SHO fejléc + alacsony, természetes hero;
2. **eredeti SHO v934 négyzónás Glass Dock** közvetlenül a hero alatt, gradual átmenettel (profil / Feladatok / Wallet / HU–CA nyelv);
3. működő keresés, mikrofon és vonalkód;
4. Smart List + Kosár Match;
5. 6 prémium kategória 3×2-ben;
6. 12 webshop 4×3-ban, **Shoperia is**;
7. az eredeti öt működő alsó navigációs elem.

## A recovery ágon elkészült
- **19 tényleges grafikai asset**, az utolsó jóváhagyott referenciaképből kivágva: 1 hero (941×304), 6 kategória, 12 webshoplogó. Ezeket a `assets/golden-v3/` könyvtárban önálló SVG fájlok tartalmazzák, WebP képadatok beágyazásával. Nincsenek harmadik fél CDN URL-jére utalva.
- `index.html`: a 19 kép bekötése a korábbi 19 helyére. Kategóriák továbbra is valódi buttonok, webshopok továbbra is valódi linkek; nincs képbe égetett, működés nélküli kattintási terület.
- `shopping-golden-recovery-v3.css`: a korábbi V2 és az új V3 Shopping-specifikus stílusok egy rétegbe szervezve. Eredeti hero-photo saturációja nem módosul CSS filterrel, mivel a csökkentett telítettség már az új forrásképen szerepel. A kategória- és boltnevek a képekben vannak, ezért a korábbi szöveges vizuális feliratok elrejtve, a hozzáférhető címkék megtartva.
- `shopping-golden-recovery-v3.js`: a **valódi** `sh9-golden-controls-v1.js` által generált v934 dockot mozgatja a hero alatti slotba. Nincs második, statikus dock.
- A működő search `submit`, hang, scanner, Smart List, Basket Match, Store Connect, katalógus, kedvencek, profil és az öt alsó navigáció eredeti eseménykezelői / adattárolói / áruházi átadásai változatlanul maradtak.
- Előző mentési ág: `backup/shopping-golden-pre-v2-20261120`. Recovery ág: `feature/shopping-golden-recovery-v3-20261120`. **A main ág nem módosult.**

## Forráskód-ellenőrzés
- Hero, 6 kategóriakép és 12 webshop-SVG önálló fájlként szerepel a PR-ben.
- A főoldali 6 `data-category` gomb és 12 `gs-ref-logo` link változatlan, Shoperia meglétével.
- Egyetlen `shoppingGoldenDockSlotV3`; a közös v934 vezérlő használatával.
- A kereső form tényleges submit gombot tartalmaz; a mikrofon és a vonalkód gombja megmaradt.
- A korábbi `shopping.js`, Supabase, merchant adapter, katalógus modulok érintetlenek.

## Még szükséges QA, az élesítés blokkolói
1. **Mobil screenshot összevetés:** ugyanazon megjelenítési skálán a referencia és az új, ténylegesen renderelt oldal overlay vizsgálata. A képi assetek forrásazonossága nem garantál teljes felületi pixelazonosságot.
2. **Éles böngészők:** Samsung S24 Ultra, Samsung Internet és Edge, 360/384/400/412 CSS px nézetek, safe area, bottom taskbar, sorok, képek és szövegek clipping ellenőrzése.
3. **Asset-kompatibilitás:** a WebP-adatot tartalmazó SVG-k megjelenése az éles hostolás és böngésző biztonsági szabályai mellett. Szükség esetén natív képfájlokra cserélendők, a kinézet változtatása nélkül.
4. **Funkcionális E2E:** mindkét profil (Zsolt, Mónika), 4 dock funkció, search/voice/barcode, 6 kategória, 12 webshop, lista/kosár, Store Connect, alsó navigáció.
5. **Végső vizuális javítás:** a referencia geometriai eltéréseit a mért screenshot alapján kell zárni; nem szabad automatikusan "100%" státuszra állítani.

## Rollout
Csak az összes QA PASS és a felhasználói jóváhagyás után `main` merge. Először Zsolt eszköze, majd Mónikáé. OTA nincs indítva. Visszaállás: fejlesztési ág elvetése, élesen csak jóváhagyott változtatás alkalmazható.

**Az assetek ténylegesen integrálva. A V3 jelenleg elkészült fejlesztői jelölt, nem hitelesített/kiadott Golden Standard.**
