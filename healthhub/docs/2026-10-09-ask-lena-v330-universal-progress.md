# HealthHub v330 · Universal Ask Léna + élő folyamatjelző
Dátum: 2026-10-09

## Felhasználói hiba
A v329 fejfájásra elkészítette a helyi „Léna javaslata” kártyát, de más kérdéseknél az általános válasz túl sablonosnak tűnt, és az opcionális kórlap-RAG háttérkérései miatt a fő Kutatás funkció válasza elakadhatott. A felhasználó kérte, hogy várakozás közben mindig legyen jól látható feldolgozásjelző.

## Megvalósítás
- A meglévő `📚 Kutatás` kizárólag a nyolc meglévő HealthHub-adatforrásból kiolvasható, az aktív profilhoz tartozó tényekkel készíti el a helyi válaszkártyát. **Nem vár Drive-ra, nem feltételez releváns PDF-et.**
- Új `live-v330.js`: kérdésszöveg alapján 14 témakör (fejfájás, alvás/fáradtság, keringési mérések, testsúly, mozgás, időjárás/pollen, fertőzések, gyógyszerek, kórlapok, tünetek, táplálkozás, digitális jóllét, kognitív, általános). A fejfájásra megmarad a v329 már kipróbált saját válasza.
- A tényleges forrásértékek és forrásdátumok jelennek meg, a kéréstől eltérő naplókat nem kell felhasználni; az összesítőnél a `Health Context` adatait veszi alapul. Hiányzó jövőbeli moduloknál nem talál ki étkezési, képernyőidő- vagy kognitív adatokat.
- `❤️ Léna javaslata` továbbra is az eredeti prémium válaszkártyában jelenik meg. **A kártya és a motor ma még helyi, szabályalapú; nem generatív AI.** Ez önálló későbbi feladat.
- A korábbi eredeti Drive-kórlap-RAG külön, kifejezetten opcionális `📁 Opcionális mélykutatás eredeti kórlapokkal` gombra került. Itt továbbra is szükséges a meglévő Drive-hozzájárulás; a kórlap nélküli kutatás nem mutatja a régi lelethiányos leállást.
- Közvetlenül a `📚 Kutatás` alatt egy mobilbarát, animált, lépésekre bontott állapotjelző jelenik meg, amely másodpercenként mutatja az eltelt időt, ténylegesen befejezett feldolgozási fázisokkal: források, értelmezés, válasz; mélykutatásnál PDF-források. A jelző egyértelmű sikeres vagy sikertelen állapottal zár, nem ragad végtelen spinnerben.
- A megkezdett régi kérdés válaszát új futásnál törli, és az új futás hibáját nem állítja be korábbi válasz alapján sikerként.
- A módosítás nem érinti a HealthHub mérési adatbázisát, naplóíróit, profilkezelését, Dropbox/Supabase/Health Connect szinkronját vagy a napi AI-híreket.

## QA
- Ellenőriztük a módosított JS-ek és az HTML bootstrap szintaxisát, v330 cache-regisztrációját, a Kutatás RAG előtti lezárását, külön dokumentummélykutatás-gombot, profilszűrést és a feldolgozásjelző időzítőjét.
- Szintetikus adatokkal 14 kérdést futtattunk memória-környezetben: mindegyik kapott önálló témakörű elemzést, és nem történt privát adatok feltöltése.
- Regressziós Node-teszt: `node healthhub/scripts/ask-lena-universal-v330.test.cjs`.
- **Tényleges S24 Ultra böngészőteszt még hátra van.**

## Felhasználói ellenőrzés
1. `healthhub/index.html?hhv=330` megnyitása, Ask Léna oldal.
2. „Léna, miért fáj a fejem?”: a korábbi fejfájás-elemzés megmarad, a zöld haladásjelző lezár.
3. Második kérdés: „Hogy aludtam az elmúlt három napban?”: friss kérdésre külön alvás-/regenerációs javaslat, konkrét mérési értékekkel vagy pontos hiányjelzéssel.
4. „Milyen a vérnyomásom?” és „Milyen a pollenhelyzet?”: új tartalmú, forrásdátumos válasz, nem a fejfájás-kártya ismétlése.
5. Kórlap nélkül is sikeres kutatás; az eredeti PDF mélykutatás csak a külön gombbal indulhat.
6. Mónika profilra váltás: nem jelenhet meg Zsolt mérése/gyógyszere/tünete.
