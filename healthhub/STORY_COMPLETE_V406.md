# HealthHub v406 · Teljes, kívülálló számára is érthető történet (kísérleti kiadás)

## A felhasználó elfogadási kritériuma
A történeti egészségügyi kérdésre úgy kell válaszolni, hogy **egy előzményeket nem ismerő olvasó** a forrásokból alátámasztott eseménysort elejétől a végéig megérthesse, majd részletesen el tudja mesélni. Ez nem csak több szó és nem csak általános élettani magyarázat. A válasz a konkrét ember és a konkrét esemény elején kezdődjön.

### Mónika Golden Standard kérdése
„Mi történt Mónikával 2024. június 17-én, a rosszulléttől a kórházi hazabocsátásig?”

Az elvárt *tartalmi folyamat*, csak ha a megfelelő források alátámasztják:
1. A kezdet: érintett személy, időpont, körülmények és rosszullét.
2. Az életmentés: segítségnyújtás, újraélesztés és mentők.
3. A kórházi kezelés: felvétel, intenzív ellátás, vizsgálatok, szövődmények.
4. A beavatkozások, köztük a CRT-D, **ha szerepelnek a forrásban**.
5. A hazabocsátás és az addig vezető felépülés dokumentált lezárása.

**Nem** kell minden orvosi kifejezésre önálló fejezet, és nem szabad az emlékezetzavarról hosszasan írni, ha nem kérdezték. A fiziológia rövid, odaillő kiegészítés az adott eseménynél. A ténylegesen hiányzó klinikai adatból tilos történeti jelenetet vagy orvosnevet kitalálni.

## Tervezés: v403 stabil, v406 csak külön preview
- A jelenlegi éles `smooth-endpoint-v395` és az éles felhasználói v403-sztori változatlan.
- Az új, külön `smooth-endpoint-v406-preview` a jelenlegi v405 Preview modell- és bizonyítékellenőrzési folyamatára épül. Egy *forrásalapú Story Contractot* ad az AI-nak, amely konkrét felhasználói kérdést, ellenőrzött idézeteket és a kérdezett eseményfázisokat sorolja fel.
- A modell által előállított, **auditált** történetet a `story-contract-v406.mjs` ellenőrzi: külön a rosszullétet, mentést, kórházi ellátást, beavatkozást, hazabocsátást, ha ezekhez van tényleges eredeti vagy korábbi mentett összefoglalóból szó szerint alátámasztott tény.
- Ha a forrásban megjelenő fontos szakasz hiányzik, rossz az indítás, vagy a személyes történetet általános élettan helyettesíti, **egyszeri** újrafogalmazás indul. A forrásaudit változatlan, nem állíthat a modell új tényt.
- Ha két próbálkozás után sincs egyetlen személyes, auditált bekezdés, de több szó szerint ellenőrzött tény van, egy forrásidézeteken alapuló vázlat léphet életbe. Ezt a vázlatot is átengedi a régi forrásauditon. Ez egy **korlátozott mentőmegoldás**, nem állíthatjuk róla, hogy teljes, szépirodalmi történet.
- A rendszer **nem ígér 100%-os eseménytörténetet hiányos dokumentumokból**; a hitelesség elsőbbséget élvez a kitalált részletekkel szemben.
- Ha nincs megfelelő igazolt forrás, a v406 sem teheti hamisan teljessé a történetet.

## Az új v406 preview aktiválása
`?hhNarrativeQA=v406` URL-paraméterrel, és csak az Ask Léna részletes klinikai kutatásakor. A normál kérdések továbbra is a változatlan v403-ra mennek; a már meglévő `?hhNarrativeQA=v405` kísérlet is működik.
Az élő, belépett és jóváhagyott profilhoz kötött kéréseket a külön preview végpont a szokásos JWT/profil/hozzájárulás-ellenőrzéssel vizsgálja. Nincs egészségügyi adatbázis-módosítás és nincs új privát logtárolás.

## QA
`node supabase/functions/smooth-endpoint-v405-preview/story-contract-v406.test.mjs` (16 szintetikus teszt):
- személyes történet kontra általános magyarázat;
- kezdés a rosszullétnél, nem a közepén;
- végigvezetés az ellenőrzött hazabocsátásig;
- forrásazonosítóval nem egyező állítás nem tölthet ki hiányzó szakaszt;
- a korábban mentett értelmezés `S` és az eredeti PDF `D` továbbra is elkülönül;
- szó szerinti forrásból készült pótvázlat a meglévő auditon is átmegy;
- az I-06 háttérutasítás nem módosíthatja az eredeti kérdés felismerését.

Továbbra is futtatandó 13 v405 + 20 v404 + 18 v403 + 14 I-05/06/07 regressziós teszt (összesen 81). Az automatizált tesztek **nem azonosak** az élő Golden Standard klinikai/narratív elfogadással.

## Élesítési feltétel
A felhasználónak ugyanazzal a konkrét történeti kérdéssel kell a stabil v403-at és a v406 Preview-t összehasonlítania. A preview csak akkor lehet alapértelmezett, ha a történet teljesebben, természetesebben követhető, a kérdezett epizód elején indul, a rendelkezésre álló forrás szerint zárul, és közben nem tartalmaz bizonyítatlan klinikai tényt.

A „100%” az **olvasói érthetőségre és a rendelkezésre álló tények lefedésére** vonatkozó cél, nem állítás arról, hogy a HealthHub birtokolja Mónika minden orvosi dokumentumát.
