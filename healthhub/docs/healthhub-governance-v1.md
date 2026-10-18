# HealthHub Governance v1.1 · Három pillér / Engineering Charter

**Érvényes:** 2026-10-18 · **Felületek:** GitHub dokumentáció + élő HH Admin → Fejlesztési Iránytű.

## Küldetés

A HealthHub személyes egészségtámogató rendszerének három egyenrangú pillére:

1. **Gondoskodás:** személyes kontextus, emberi kímélet, biztonság, egyértelmű kommunikáció.
2. **Adatismeret:** ellenőrzött és naprakész, megfelelő személyhez rendelt, forrásolt adatok.
3. **Intelligencia:** a forrásokból megalapozott következtetés, bizonytalanság felismerése, dokumentált folyamatos javítás.

A minőségi cél nem egy magabiztosabban beszélő AI, hanem *bizonyíthatóan jobb* elemzés és felhasználói döntéstámogatás.

## Döntési felhatalmazás, biztonsági határok

A technikai/UX/architekturális optimalizálásokat az asszisztens összevonva, önállóan megtervezheti és implementálhatja, a változtatást követő ellenőrzéssel. A felhatalmazás nem helyettesíti:
- új, tartós gyűjtésre vagy érzékeny adatok megosztására adott kifejezett hozzájárulást;
- visszafordíthatatlan törléshez, jogosultságbővítéshez, új fizetős szolgáltatáshoz kapcsolódó jóváhagyást;
- orvos által meghozandó diagnosztikai/terápiás döntést.

Nem tárolunk titkos pszichológiai profilokat, rejtett klinikai következtetéseket vagy megfigyelési naplókat. Admin- és klinikai auditok legyenek láthatók és ellenőrizhetők. Az Ask Léna képek archiválásához tartalomspecifikus hozzájárulás szükséges.

## Fejlesztési protokoll

**Diagnózis → Bizonyíték → Döntés → Visszaállítási terv → Implementáció → Automatizált teszt → Deploy → Éles smoke test → Valós felhasználói teszt → Elfogadás / javítás / rollback.**

- Stabil, gyors, egykattintásos mobil UX; prémium sötét glassy téma, egységes profilváltó.
- Nem készül párhuzamos, félkész adattároló vagy duplikált feldolgozó, ha a meglévő réteg továbbfejleszthető.
- Minden jelentős döntést két helyen kell követhetővé tenni: GitHub technikai dokumentációban és HH Admin felületen.
- A zöld állapothoz mért, igazolt eredmény kell; hiányzó adatból nem keletkezik sikerjelzés.

## Agile Delivery · no micromanagement / goal-oriented deployment

**Végrehajtási irányelv:** a célzott, önálló műszaki döntéseket nem akasztjuk meg folyamatos jóváhagyáskéréssel. A fejlesztés gyors, kockázatarányos, visszaállítható iterációkban halad: **build → test → deploy → valódi felhasználói próba → hiba javítása → újratesztelés**. A trial-and-error a technikai megoldások tesztelésére vonatkozik, nem a privát klinikai adatokon történő ellenőrizetlen kísérletezésre.

**Definition of Done (kötelező állapotkülönbség):**
- **CODED:** a javítás kódban és dokumentációban megtalálható.
- **TESTED:** célzott automatizált/szimulációs ellenőrzések sikeresek.
- **DEPLOYED:** a megfelelő commit éles szolgáltatásban ellenőrzötten betöltődik.
- **LIVE VERIFIED:** működik valódi böngészőn/telefonon, tényleges jogosultságokkal és megengedett valós adatokkal; nem szimuláció.
- **USER ACCEPTED:** Zsolt/Mónika a valós felhasználói próbát visszaigazolta, vagy egy előre rögzített objektív használati elfogadási kritérium teljesült és annak bizonyítéka elérhető.

**Nem kész:** kizárólag GitHub-commit, zöld unit test, előnézet, vagy a teszt nélküli deployment. A fejlesztő nem minősíthet USER ACCEPTED-nek olyan eredményt, amit a felhasználó nem tesztelt és nem igazolt. A *DONE* státuszt csak a ténylegesen igazolt legmagasabb kapu szerint adjuk meg.

**Hibakezelés:** a hibát reprodukáljuk, feljegyezzük az okát és a teszt eredményét, javítjuk, újra deployoljuk; súlyos regressziónál visszaállítunk. Nem takarjuk el a hibát vagy találunk ki teljesítési százalékot.

**Ütem:** önálló kóddöntések és tesztek, kevés kérdés; a felhasználói teszt egyetlen konkrét, rövid forgatókönyvvel történjen, ne mikromenedzsmenttel. A működés és az adatbiztonság igazolásához szükséges visszajelzést továbbra is kérni kell.

## Medical Knowledge Base 2.0 · adatminőség

- Az eredeti Google Drive/Dropbox lelet, PDF és képi tartalom változatlan marad. Nyilvános repo nem tartalmaz privát dokumentumot vagy egészségügyi adatot.
- Az azonos nevű dokumentum nem feltétlenül azonos tartalmú. Tartalmi deduplikáció **SHA-256** szerint, a forráskapcsolatok megőrzésével; automatikus törlés nincs.
- Eredeti vizsgálati dátum, mértékegység, szöveg és dokumentumverzió megőrzendő; fájlmódosítás dátuma nem orvosi eseménydátum.
- Az OCR és AI által kinyert adatok jelölése *candidate / needs review*; a megerősített klinikai tényeket és az AI értelmezést külön kell kezelni.
- Állításhoz 1..N bizonyíték, forrásdokumentum, oldal/JSON pointer, eredeti kivonat, bizonytalanság és review-status tartozik.
- A v407 böngészőoldali PDF feldolgozó létezik, és a 2.0 táblákhoz kapcsolás **nem tekinthető késznek**; a frontenden látható statisztikák hitelesített, profilhoz kötött lekérdezésekből jönnek.
- Profilközi adatolvasást csak a kimondott jogosultság engedélyezheti; sem UI mező, sem kliensoldali flag nem pótolja a backend RLS szabályokat.

## Következő kapuk

1. Egy kiválasztott forrásfájl teljes SHA-256, PDF oldalak, OCR és képek ellenőrzése a privát adatútvonalon.
2. v407 és MKB 2.0 kapcsolat: `hh_mkb_sources` → `hh_kb_documents` → `hh_kb_pages` / `hh_kb_visuals` → `hh_mkb_facts` / `hh_mkb_evidence`, kétszeres feldolgozás nélküli retry-vel.
3. 4–5 különböző típust lefedő dokumentum tesztje, forráshelyesség, két profil RLS, megőrzött eredetik és kereshetőség.
4. Csak ezután teljes backfill; végül Ask Léna tény- és oldalhivatkozásos, jogosultságszűrt kérdésválasz.

## Első valódi adatminőségi pilot (2026-10-18)

- Egy Mónika-profilhoz tartozó eredeti Drive PDF byte-szintű ellenőrzése megtörtént: érvényes PDF, fájlméret és beágyazott szöveg ellenőrizve, SHA-256 mentve a `hh_mkb_sources` táblába.
- Két különálló Google Drive PDF azonos fájlnévvel és mérettel rendelkezett. Mindkét eredeti teljes fájl SHA-256 ellenőrzése megtörtént: bizonyítottan azonos tartalom. A profilhoz kötött `duplicate_of` hivatkozás rögzítve, az eredetik érintetlenek.
- Mindhárom `parse_status` megmaradt `discovered` értéken. A hash-ellenőrzés nem egyenlő az oldalszintű orvosi tudás feldolgozásával.
- A HH Admin élő, hitelesített profilaggregációban külön megkülönbözteti a fájlnév-egyezést és a bizonyított tartalmi duplikációt. Nem kerül személyes azonosító, leletérték, diagnózis vagy magán PDF-tartalom a GitHubra.

**A pilot státusza:** valódi forrásbyte és éles adatbázis-metaadat ellenőrzés sikeres, de teljes PDF → oldal → klinikai tény → Ask Léna lánc még nem LIVE VERIFIED, felhasználói elfogadás még nem történt.

## MKB 2.0 · PDF batch és Character Count QA (v663)

**Kivitelezve, de a teljes archívum még nem futott végig:**

- Az eredeti archívummappát aktív Health Vault- és Google Drive-hitelesítéssel, az engedélyezett profilhoz kötve olvassa a v407/v662 feldolgozó.
- Az ismert forrásrekordot `hh_mkb_sources` alapján azonosítja, validálja a változatot, méretet, módosítási időt és SHA-256-ot; a `hh_kb_documents.mkb_source_id` kapcsolatot menti. Különféle forrásverziókat nem mos össze.
- A PDF szövegét teljes oldalakra bontva tárolja. OCR/feldolgozási hiány, képfeltöltési hiba vagy részleges mentés esetén nem lehet teljes állapot.
- **Adat-integritási audit:** minden feldolgozott PDF után az oldalszövegek visszaolvasása privát Supabase-ből; minden oldalon tényleges mentett UTF-8 tartalomból új SHA-256 és Unicode kódpontszám képződik. A forrásoldali számokkal és oldalszámokkal tételesen egyeztetjük.
- `hh_kb_documents` négy új mezője: `extracted_characters`, `stored_characters`, `pages_verified`, `text_integrity_status`, valamint `text_verified_at`; az adatbázismigráció élesben alkalmazva és verziókezelve.
- HH Admin új **Medical Knowledge Base 2.0 · Feldolgozás és adatminőség** kártyája indítja az éppen aktív profil hitelesített archívumának teljes, szekvenciális beolvasását. A böngészőlapot nyitva kell tartani; a következő indítás a már teljes, hitelesített tételeket kihagyja. Zsolt és Mónika külön profilban indítható, így a profilszeparáció nem sérül.
- **Character Count QA:** egyszerre összesíti az engedélyezett profilok ténylegesen indexelt és visszaellenőrzött dokumentumait, az eredeti (PDF-ből kinyert) és a Supabase-ben tárolt Unicode karaktereket; külön mutatja Mónika, Zsolt és az összesített adatok különbségét.
- Azonos bináris tartalmú duplikátumoknál az első kanonikus forrás oldalszövegét számolja, de a többi eredeti archív fájl továbbra is létezik. A kimutatás elkülöníti a fájlszámot és az egyedi szövegtartalmat.
- Az elfogadási feltétel nemcsak közel nulla karakterkülönbség: egyező dokumentum- és oldallefedettség, tételes SHA-256-visszaellenőrzés, nulla kezeletlen adatvesztés és OCR/képek külön vizsgálata is kell.
- **Release gate:** Githubban CODED és forráskódos szimulációban TESTED; a publikus Pages tényleges betöltése, a két profil 218 eredetijének teljes futása és a valós felhasználói teszt még nincs igazolva. Nem DONE és nem USER ACCEPTED.

**2026-10-18 aktuális tényszámok:** 218 PDF regisztrálva (Mónika 175, Zsolt 43), 3 fájl SHA-256-ellenőrzött, 1 igazolt duplikátumpár; oldalszintű MKB-index a teljes futás előtt üres. Nincs 218/218 feldolgozási sikerjelzés.

## HH Admin · v664 bejelentkezési helyreállítás

Valós Galaxy S24 Ultra / Chrome felhasználói próba során a `Health Vault hitelesített kapcsolata szükséges` jelzés megjelent. Ez a PDF-feldolgozás elindítását blokkolta, de a PDF-ek nem sérültek és nem indult el rejtett import.

- Közvetlen **Vault belépés** gomb: a már létező `HH_DAILY_HEALTH_SYNC_V319.openLogin()` hitelesítési képernyőt nyitja. Soha nem tárol jelszót az új admin komponens.
- Közvetlen **Drive csatlakozás** gomb: a meglévő `hhGetGoogleDriveToken292(true)` Google OAuth-folyamatot használja, nem hoz létre új fiókot vagy tokentárolót.
- A panel aktív profilra külön ellenőrzi a Health Vault-jogosultságot; jelszó nélküli feladatindításkor először a bejelentkezés nyílik meg.
- A PDF-import továbbra is kézi, külön kattintással indul, kizárólag két hitelesített adatforrással. A **Character Count QA**-nak csak a Health Vault szükséges, a Drive-token nem.
- Az Admin csak a hozzáférés engedélyezett/hiányzó állapotát mutatja, titkot vagy lelettartalmat nem naplóz.

**Állapot:** GitHubba mentve, izolált hitelesítési/UI-szimulációban ellenőrizve. A tényleges mobilos bejelentkezés és a teljes PDF-feldolgozás még valódi felhasználói elfogadásra vár. A bejelentkezés után a felhasználó külön indítja a feldolgozást.

## HH Admin · v665 profiljogosultság-helyreállítás

Valós S24 Ultra teszt (2026-10-18): a Vault-ablak aktív sessiont mutatott, de „Hozzáférhető profilok: jogosultság-ellenőrzés alatt” állapotban maradt, mert az eredeti jogosultság-lekérés csak a Daily Health `mount(host)` hívásakor futott.

- A meglévő `openLogin()` most aktív session + hiányzó profiladat esetén **automatikusan, csak olvasással** meghívja a `fetchCloud()` profiljogosultság-ellenőrzést.
- Az overlay megkülönbözteti a folyamatban lévő lekérést és a sikertelen ellenőrzést, az eredeti fiókot használja.
- „**Jogosultságok frissítése**” gomb újrapróbálható, és egyetlen futó hozzáférés-ellenőrzésre korlátozódik.
- Sikertelen lekérésnél a kliens a profillistát nullára állítja (fail closed), nem engedi elindítani a privát PDF-beolvasást; nincs jogosultság-felülírás, automatikus feltöltés vagy jelszótárolás.
- Sikernél `healthhub:central-auth-changed` esemény frissíti a kapcsolati állapotot a PDF-panelen.
- Reprodukált 503 válasz → magyar hibaüzenet → kézi retry → két profil hiteles megjelenítése: **szimulációban sikeres**. Mobilos valós elfogadás még hátra van.

## MKB v666 · Watch EKG PDF célzott javítás (2026-10-18)

**Valódi állapot az első Mónika-feldolgozás után:** 175/175 eredeti SHA-256 ellenőrzött; 164/175 PDF teljesként jelölt és SHA-256 / oldal / Unicode visszaellenőrzéssel igazolt; 11/175 PDF egyoldalas, sikertelen grafikus oldalfeldolgozás; 269/280 oldal ellenőrzött, 486047/486047 karakter a **sikeres** forrásokon, eltérés 0. A 11 hiányzó oldal miatt a teljes archívumra nincs integritási igazolás. Zsolt 43 PDF-je még feldolgozásra vár.

**Root cause triage:** a 11 sikertelen forrás mind Samsung Watch EKG PDF. Egy eredeti fájl önálló PDF-vizsgálatánál 1 oldal, olvasható beágyazott szöveg, beágyazott kép és nagyszámú vektoros grafikus elem volt található. A távoli böngészőben fellépő konkrét kivételt még nem állítottuk elő, ezért a grafikus renderelési teljesítményhiba erős hipotézis, nem bizonyított diagnózis.

**A v666 kódjavítás:**
- Képi PDF-oldal renderelése fokozatos canvas-felbontással: legfeljebb 2.4×, majd 1.65× és 1.15×. Sikertelen próbánál a canvas felszabadul.
- A már kiolvasható PDF-oldalszöveg nem veszik el, ha a képrenderelés nem sikerül; az oldal tárolása és karakter-/SHA-visszaellenőrzése független a grafikától.
- Elveszett grafika, grafikus operátorhiba vagy 1.6× alatti vészmegőrzés esetén a minőségi státusz **nem lehet COMPLETE**: manuális képi review szükséges. Az eredeti Drive PDF változatlan marad.
- A korábban teljesen ellenőrzött 164 PDF ismételt feldolgozása nélkül a hibás elemek célzottan újraindíthatók az Adminból, a profilon belüli SHA-alapú ellenőrzéssel.
- **Release gate:** kód GitHubban és lokális funkcionális render-fallback szimulációban tesztelve, újabb S24 Ultra valós feldolgozási próba még nem igazolt. Nem jelölhető 175/175-ként, amíg a 11 grafikus elem feldolgozása és mentési ellenőrzése meg nem történt.

## MKB v667 · explicit patient-approved descope (2026-10-18)

The user intentionally excluded exactly 11 non-diagnostic Samsung Watch ECG PDFs from the **mandatory** medical PDF ingestion, while preserving all original Google Drive files and historical processing results. Exclusion is a *scope decision*, not a successful clinical extraction, and not deletion.

- All 11 sources were positively matched to Mónika's previous failed Samsung Watch EKG PDF rows, then updated in private `hh_mkb_sources.source_metadata` to `{"ingest_scope":"excluded","scope_reason":"user_deprioritized_watch_ecg"}`. The other 164 Mónika sources were not changed. The SHA-256 checksums are retained.
- The authenticated browser ingester now reads the authorized source inventory and filters by **original Google Drive ID** before downloading or retrying. A mismatch, empty source response or missing Vault authorization fails closed.
- The Admin Forrásaudit and Character Count QA report total originals, intentional exclusions and mandatory in-scope documents separately. Exclusions are not counted as completed, nor as ingestion defects in the mandatory scope.
- Current accepted scope: Mónika **164/164 mandatory** sources text-verified, with **269/269 stored pages, 486047/486047 Unicode characters**, zero storage text mismatch. Eleven optional sources remain in the original archive with historically failed processing state.
- Zsolt's 43 mandatory PDF sources remain **0/43** at this milestone; combined mandatory goal **207** sources. Full project status remains incomplete until these run and are independently verified.
- No additional clinical validation is inferred from character integrity alone. Images, OCR and medically meaningful fact extraction require distinct quality gates.
- Build `v667-mkb-descope-11-watch-ecg` published to GitHub, runtime syntax/regression simulation checked. Actual S24 Ultra refresh and Zsolt profile execution still require real-world user test.

## MKB v669 · Verified empty source pages (2026-10-18)

After Zsolt's first browser import completed 42/43, the remaining PDF was an April 2026 laboratory document with three source pages. Two related archived laboratory PDFs were independently downloaded and inspected, without moving patient data into source code. The blocked three-page PDF has genuine embedded text on pages 1 and 3; page 2 has no text, raster images, drawings, annotations, or widget objects. Its PDF content stream consists only of graphics-state save/restore operators. The older pipeline incorrectly flagged page 2 as illegible / needing OCR and therefore marked the source partial.

v669 permits zero-character pages only if PDF.js confirms an operator list containing **exclusively** graphics-state save/restore operations and the page has zero display annotations. Failure of any condition retains previous strict OCR/review behavior. The original PDF byte sequence and SHA-256 remain unchanged; a blank page is separately recorded in document notes as an authenticated structural fact, and a zero-character page is still stored and covered by the page-count integrity audit. No information-bearing page is silently skipped.

Browser import remains profile scoped and idempotent: completed documents are skipped by matching metadata, and the partial document is retried on the user's explicit action. Browser execution and final 43/43 integrity results require re-verification on the actual device. Do not interpret successful text-level QA as clinical content review.

## HH Admin implementáció

`healthhub/hh-development-charter-admin-v658.js` csak az `#haOv` adminpanel megnyitásakor helyez el kártyát az `#haBody` elején. Az összesítés a kiválasztott profilra korlátozott, csak felhasználói kattintásra, `HH_DAILY_HEALTH_SYNC_V319` hitelesített REST kapcsolatán keresztül történik. Az Admin-kártya nem ír adatot, nem archivál képeket, nem indít tömeges feldolgozást, és nem küld egészségügyi tartalmat nyilvános végpontra.

**Tényállás a bevezetéskor:** a 2.0 forrásnyilvántartás létezik, ténylegesen feldolgozott orvosi tények és képi bizonyítékok még nincsenek. A kártya nem nevezhet késznek egy szintetikus vagy még nem futtatott tesztet.
