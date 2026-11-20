# SHO Smart Shopping Golden Recovery V3
**Dátum:** 2026-11-20 · **Státusz:** fejlesztői / draft, nem élesíthető végellenőrzés nélkül

## Jóváhagyott vizuális cél
A beszélgetés legutolsó, természetesebb színezésű 941×1670-es Smart Shopping referencia-képe az elsődleges összehasonlítási alap. Nem az előző, túlszaturált terv.

A cél sorrendje:
1. SHO fejléc és természetesebb tónusú, kompakt hero
2. Az **eredeti, működő v934 Unified Glass Dock** közvetlenül a hero alatt, **fokozatos átmenettel**: profil / Feladatok / Wallet / HU-CA nyelv
3. Működő keresés + hang + vonalkód
4. Smart List / Kosár Match két kiemelt kártya
5. Hat prémium kategória 3×2 elrendezésben
6. Tizenkét webshop 4×3 elrendezésben, Shoperia is
7. Az eredeti öt funkcionális alsó navigációs elem

## Elkészült ebben az iterációban
- `shopping-golden-recovery-v3.css`: 2.67:1 keskenyebb, kevésbé telített hero, blur/gradient átmenet, natív dock slot, kereső, shortcut, kategória- és üzletrács, alsó taskbar.
- `shopping-golden-recovery-v3.js`: a közös SHO v934 dock **mozgatása** a hero alá (nem statikus makett).
- `index.html`: a közös vezérlő stílus/script bekötése, egy dock slot, valódi kattintható keresés.
- A korábbi, már működő shopping JS, merchant flow, adat és Supabase modulok érintetlenek.
- Előző mentés: `backup/shopping-golden-pre-v2-20261120`; ez a branch nem írja át a `main` állapotát.

## Nem teljes / élesítés előtti blokkolók
1. **Pixelazonos 3D kategóriaképek és brandgrafikák:** a végleges UI-makett raszterizált, az egyes forrásgrafikák külön nem elérhetők a repositoryban. A jelenlegi kategóriaképek az eredetiek új stílusbeállításokkal, tehát a vizuális egyezés még nem 100%.
2. **Természetes hero:** a jelenlegi jóváhagyott hero AVIF-en CSS tónuskorrekció és új kivágás van, nem a friss referencia új, külön feltöltött hero-assetje.
3. **Mobil screenshot QA:** nincs bizonyítva a referencia pixeles egyezése valós Galaxy S24 Ultra-n.
4. **E2E:** v934 dock mind a 4 akciója Zsolt és Mónika profilban; hat kategória; 12 webshop; keresés, scanner, hang, Smart List és Basket Match; bármely alsó navigációs akció.
5. **Responsivitás:** 360px/384px/400px/412px és mobil Samsung Internet + Edge.
6. Nincs autorizált OTA/deploy. Csak jóváhagyás után merge.

## Elfogadási kapu
- Friss mobil képernyőkép összevetése az elfogadott 941×1670 referenciával.
- Előnézeti és funkcionális QA PASS.
- Nem lehet duplán megjelenített dock vagy kategóriafelirat.
- Nem lehet kattinthatatlan elem, kilógás, hibás webshopátadás vagy adatvesztés.
- Csak Zsolt jóváhagyása után merge / éles rollout.

**A kód jelenleg egy recovery alap, nem lezárt Golden Standard.**
