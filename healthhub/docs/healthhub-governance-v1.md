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

## MKB v670 · Evidence-linked Medical Intelligence pilot (2026-10-18)

Following the user-confirmed **207/207** mandatory PDF/Character Count QA pass, independent Supabase readback showed Mónika 164 verified documents, 269 verified pages, 486,047 original/stored characters; Zsolt 43 verified documents, 68 verified pages, 101,168 original/stored characters. Mónika's eleven intentionally excluded Watch ECG files retain their original and historical failed record status; they are not part of this clinical extraction scope.

**Release**: `healthhub/mkb-fact-rules-v670.js` (pure rule candidates), `healthhub/hh-mkb-facts-admin-v670.js` (authenticated Admin preview + deliberate save + independent readback). Live build `v670-medical-fact-evidence-pipeline`.

**Medical safeguards**:
- Authenticated, selected patient profile is mandatory throughout enumeration and before every write; Supabase RLS still independently guards all rows. No health content leaves the private Vault for GitHub, telemetry, external LLM or local persistent browser storage.
- Only completed, original-SHA-matching, text-integrity-verified, nonduplicate, nondevice/nonsecondary reports from nonexcluded source IDs are candidates. Each eligible source page must contain **embedded** text, have no outstanding image/OCR review, and pass a fresh SHA-256 text checksum.
- Initial deterministic rules are deliberately limited to explicitly date-anchored VF/reanimation history, dated coronarography procedure, dated CRT-D implantation, and single-value dated EF. They do not infer undocumented dates, assume EF ranges, invent diagnoses, or interpret lab results.
- Each source-specific statement has an exact excerpt, page number, source ID, event date and original page SHA. All new facts and evidence remain `review_status=pending`; the pipeline cannot manufacture clinical verification. Existing `verified` or `rejected` facts are never modified; rejected records are preserved.
- First action is **read-only preview**; a separate action and confirmation performs idempotent private insertion using deterministic UUIDs. Partial writes can be safely retried. An independent fresh fact/evidence/page text readback must pass before a completed QA message is shown.
- No general AI answer or clinical inference is automatically enabled by the import. Answer generation needs its own source-grounded retrieval, conflict handling and medical-review protocol; existing Ask Léna behavior remains unchanged.

**Release testing**: JavaScript syntax checks, nine deterministic rules/security smoke scenarios, and static presence of profile/eligibility/privacy/QA gates passed. A new node regression suite is under `healthhub/tests/mkb-v670-fact-pipeline.test.cjs`. S24 Ultra true end-to-end browser/Vault operation requires user test before declaring production fact extraction complete.

## MKB v672 · Narrow laboratory observation coverage (2026-10-19)

The user-visible Medical Intelligence preview successfully enumerated Zsolt's 43 verified PDFs and 38 initially eligible, embedded-text pages, but reported no candidates because the first-pass cardiology rules did not cover laboratory observations. This was a deliberately narrow extraction taxonomy, **not** missing or corrupted PDF data.

Release `v672-lab-culture-evidence` adds `healthhub/mkb-lab-rules-v672.js` as a pure deterministic, local laboratory parser, loaded between the existing v671 cardiology rules and the authenticated v670 admin UI. The admin QA pipeline concatenates both rule sets without modifying the source PDF ingestion or any existing clinical facts.

Initial laboratory scope is intentionally restricted to separately named organisms in a **urine aerobic culture** report with explicit, valid sample-collection date, urine specimen, culture label, result field and colony-count notation on the same verified embedded-text page. The exact text excerpt is stored with original source ID, page number and verified SHA-256. The reported organisms are **not** asserted to prove urinary-tract infection; numerical organism-specific colony counts and antibiotic susceptibilities are **not** inferred when column alignment cannot be independently verified.

Both distinct, archived April 2026 urine culture documents were tested as source text; the candidate parser found three explicitly named organisms per document, each dated to the **specimen collection day**, not the later report validation day. Negative tests for missing culture, wrong specimen, impossible dates and missing growth notation all fail closed. Synthetic regression suite lives in `healthhub/tests/mkb-v672-lab-candidates.test.cjs`; JS syntax, loader ordering, security and provenance gates checked. **This does not imply all 43 PDFs were semantically understood**. Actual mobile preview and deliberate pending-evidence commit still require user testing before claiming clinical intelligence completion.

No raw patient health text, patient identifiers or generated candidate rows were copied into GitHub; all private patient context stays subject to Supabase Health Vault authorization and row-level security.

## MKB v673 · Minimized laboratory evidence excerpt (2026-10-19)

The v672 browser pilot successfully returned **3 pending laboratory observation candidates** from Zsolt's verified 43-PDF archive, drawn from the 2026-03-27 urine-culture specimen (report dated 2026-04-01). All source-document hashes remain independently checked.

The first v672 excerpt was an overly broad continuous quotation from the sample-date row through the microbiology result and unnecessarily included intermediate administrative/personally identifying document fields. **v673 reduces the excerpt to the exact bacteria-identification and growth-evidence row(s)**. The sample collection date is validated independently from the same SHA-verified page and stored in `observed_date`; the original source page, document, patient and SHA remain linked for audit. Text is not normalized, rewritten or sent outside the authorized Health Vault; excerpts must remain verbatim substrings of the page.

Regression checks used **both real source text variants** (separate-line and merged-line results): each produced 3 organism names with exact short quotes (165–168 characters), the collection date 2026-03-27, and no unrelated patient demographics or administrative field text. Original lab values, bacterial counts by column and antibiotic sensitivities are deliberately not interpreted. These are source-reported laboratory observations pending review, **not confirmed infection diagnoses**.

User-visible preview does not write records. Persisting new facts requires an explicit confirmation; final independent fact-to-evidence QA and mobile trial remain separately required before declaring the clinical intelligence layer complete.

## MKB v674 · Source-grounded medical timeline (2026-10-19)

After real device confirmation of Mónika's pending cardiology event import, independent live Supabase verification found exactly **Mónika 4 facts, 6 evidence records; Zsolt 3 facts, 6 evidence records; 12/12 evidence excerpts present on verified original document pages and 12/12 fact-to-source references consistent**. All stored clinical facts remain `pending`; none are represented as clinician-approved.

Live build `v674-source-grounded-timeline` adds the pure view-layer grouping `healthhub/mkb-timeline-v674.js` and a **read-only "🕒 Forrásolt orvosi idővonal" button** under the existing Admin Medical Intelligence panel. Queries use the authenticated Health Vault service and profile-scoped Supabase RLS. Grouped summaries present original fact labels and source evidence, and never update, delete or recreate any fact, page or source.

Rules:
- Same-patient, same-date, same-normalized clinical event label and same `fact_type` group for display, regardless of date notation in the title, with **every individual evidence reference retained**.
- A urine-culture group may combine different identified organisms only if the **original source ID and collection date are also identical**; same-day but independent specimens are not silently merged.
- Distinct EF numeric values or units remain separate. Cross-profile events never merge. Rejected clinical facts do not appear as active events. Refuting or mismatched-source evidence is never counted as supporting evidence.
- All groups carry pending/verified statuses explicitly, state that display grouping is not proof of clinical identity, and show the original file name, page and exact source quote. Identical quotes may be visually collapsed only after retaining the original evidence count.
- A read-only timeline is *not* yet the production Ask Léna Medical RAG reasoning pipeline or clinical diagnosis. Additional time series, conflict resolution, medications and laboratory numeric extraction will require separate safety gates.

Regression: `healthhub/tests/mkb-v674-timeline.test.cjs` covers same-day grouped clinical reports, same-source culture organisms, cross-profile separation, distinct specimen sources and EF values, and evidence source consistency. **Real live database data checked** by running the pure grouping function over the 7 persisted facts and 12 evidence links: Mónika's VF/resuscitation and coronarography each group 2 records/3 supporting evidence; Zsolt's urine culture groups 3 records/6 supporting evidence. No record or evidence lost in grouped output. Mobile Admin visual verification remains to be completed by a user device refresh.

## MKB v675 · Drill-down evidence timeline with fresh SHA attestation (2026-10-19)

The read-only Admin timeline now has a compact **expandable per-event source view**. The `🕒 Forrásolt orvosi idővonal` action reads original per-profile MKB facts/evidence plus corresponding non-duplicate documents, original PDF source metadata and page text via the authenticated Health Vault and Supabase row-level security.

A new pure validator, `healthhub/mkb-evidence-audit-v675.js`, checks each evidence against: same patient profile, fact/source identity, `supports` evidence role, source not excluded, `parse_status=complete`, original PDF SHA equality to its canonical verified document, all document pages verified, source page present, **verbatim quote substring in the source page**, and **fresh SHA-256 computed from the independently re-read original page text**. Unknown, mismatched, excluded or duplicated source records fail closed. Every result is labelled **text integrity**, never medical truth.

Each event group shows the ratio of technically verified supporting excerpts. The user can expand an event to inspect the original file name, PDF page number, original excerpt, and evidence warning or verification message. Unverified groups automatically open their detailed failure list. The user-selected profile is checked before and after each asynchronous Vault query. No status is altered and no PDF, fact or evidence is updated or deleted. No raw clinical record is committed to public source code.

**Live data validation:** A separate independent SQL SHA-256 calculation against the stored page-text copies verified **6/6 Mónika and 6/6 Zsolt evidence links**, matching both original-file SHA-256 metadata and exact original page excerpt substrings. Additional adversarial synthetic scenarios covering other patient profiles, wrong sources, excluded originals, mismatched page SHA, missing pages and ambiguous canonical copies were rejected.

Release `v675-independent-evidence-audit`, tests `healthhub/tests/mkb-v675-source-audit.test.cjs`. Mobile visual acceptance remains a device-side test; do not label the interface end-to-end verified solely from source/schema inspection.

## MKB v676 · Ask Léna private provenance lens (2026-10-19)

The user completed the v675 source-grounded timeline mobile verification and reported that it worked well. A new **read-only, click-to-load** `📚 Forrásolt orvosi tudás` panel has been added directly below the Ask Léna composer in `healthhub/ask-lena-mkb-v676.js` (build `v676-ask-lena-evidence-lens`).

The panel requires explicit user click and a live **Vault-authorized active profile**. It retrieves only matching-profile facts, evidence, source metadata, canonical verified PDF documents, and original page text through existing Supabase RLS. The same v674 timeline grouping and v675 SHA-256/quote/source attestation functions are reused. The rendered cards explicitly retain `pending` status and disclose that technical source integrity **is not** clinical truth. On profile/auth change the preview clears, the generation number invalidates all in-flight async requests, and no information is persisted in browser storage.

**Safety boundary:** this release makes the verified medical history **visible next to Ask Léna**, but does **not** append pending fact payloads to the existing AI request, alter prompts, grant original-document consent, request AI model calls, create embeddings or transfer extracted evidence to a third-party service. The existing v331 → I-04/v391 → I-05/v402 consent and clinical quality chain stays intact. A future controlled inclusion of structured events in AI research must include explicit per-session consent, case-aware conflict and historical context handling, and additional clinical quality gates. The 207 original PDF archive and all 7 current facts/12 evidence references remain unchanged.

Verification: source-JS syntax checks, v676 plugin structure/authorization/write-prohibition tests, and a synthetic in-memory DOM/Vault mock where **zero requests** occur until explicit click; click makes 5 profile-authorized GET requests; one valid synthetic event attests **1/1** exact source SHA and renders its expandable evidence; a profile-change event clears the full preview. **Real mobile Ask Léna visual verification remains a separate user acceptance step**.

## MKB v677 · One-use, explicitly approved Ask Léna knowledge context (2026-10-19)

Release `v677-one-shot-mkb-ai-consent` integrates the user-accepted v676 evidence lens with a tightly controlled **one-time** knowledge-context transfer into Ask Léna's already authorized AI request. The source-lens loader **does not** send medical records to AI by opening a panel, and the user may continue Ask Léna research with the new approval checkbox unchecked.

Flow:
1. The user clicks the existing `📚 Forrásolt orvosi tudás` panel. All facts/evidence are read from the profile-authorized Vault and checked with `HH_MKB_EVIDENCE_AUDIT_V675`: original source SHA, document/page hash, page quote, active patient, non-excluded source, no rejected fact.
2. Only evidence with a valid **100% group-level source attestation** qualifies for a short candidate summary (max five groups); `pending` clinical review labels remain explicit. Nothing is persisted to browser storage.
3. A visible, initially disabled and unchecked consent checkbox permits **one next research action only** to send short profile/source/date/page-qualified notes to the already-consented AI provider. Approval expires after five minutes, after an authorization or profile change, after re-reading the sources, or immediately after one consumption, even if the AI request later fails.
4. The Ask Léna v331 controller consumes the approval only in its user-initiated research action, and `HH_MKB_AI_CONTEXT_V677.pack` validates the existing `healthhub.ask-lena/1` schema, profile match, consent, calendar dates, review statuses and fixed budgets. The cap is five small source notes, each max 235 characters, and 72 total context entries plus the established request-size ceiling. Without full fit, MKB adds **zero**, not a partially cropped hidden set.
5. The short `documents`-domain *reported observation* notes carry `I-09 · Orvosi forrástény (PDF-eredet, nem önálló diagnózis)` and source page/date. Original PDF bodies are **not** sent by this new pathway; the existing separately consented original-document retrieval remains unchanged.
6. The existing I-04 source gate, I-07 reasoning and I-05 final clinical preflight stay in force. The source facts are **not clinician-verified** merely because the SHA and exact quote match. No database inserts, hidden logs, embeddings, daily monitoring or automated background AI calls were added.

Testing: static syntax and pipeline-order checks, 18 pure/adversarial context packing checks, synthetic DOM/Vault exercises of the user approval showing **zero** MKB data without a checked box, **single use** after checking, and immediate invalidation after profile switch. New test suite: `healthhub/tests/mkb-v677-one-shot-consent.test.cjs`. **Real-user phone research and remote AI response remain unverified until separately tested.** This is deliberately not a statement that the general Medical Intelligence reasoning layer is clinically validated.

## MKB v679 · Golden Standard storyteller derived only from audited evidence (2026-10-19)

The user requested that **every personal medical/lelet response**, without repeated prompting, first present a warm, attractive, chronological **storytelling narrative**, and only then show **(1) Dokumentált tények** and **(2) Orvosi értelmezés**. These latter two source/interpretation layers must underlie the initial story rather than add claims outside the evidence.

The default Ask Léna client now chooses the clinical two-pass verifier for health/lelet questions, even when the user did not manually select Detailed Research (nonmedical and photo questions keep the prior route). `live-v393-research.js` recognizes lab/urine/culture questions, `live-v331.js` reports the separately approved I-09 MKB evidence transfer and does **not** silently downgrade an unsupported clinical response into a generic AI reply.

Clinical endpoint `smooth-endpoint-v395` **deployed ACTIVE version 8** with unchanged internal JWT/profile authorization and consent checks. Its clinical and non-clinical system prompts default to this three-layer format, and `audit.mjs` now deterministically renders:
- **A leletek története:** source-audited `documented`/explicitly attributed `reported` paragraphs, enriched only with qualified and already-audited `general`/`possible` clinical interpretation. Unsupported patient claims/citations are not added. No source-backed personal history results in an honest limitation, not fabricated storytelling.
- **Dokumentált tények:** exact original PDF quote text rechecked against the matching submitted original excerpt, the document name and page, with document date explicitly distinguished from sampling/event date; earlier JSON/AI summaries appear with lower evidence status, never as original PDF facts.
- **Orvosi értelmezés:** only clinically qualified, separately audited explanations; no diagnosis or treatment is inferred from a list of urine-culture organism names.

The v677/678 temporary source transfer must have a fresh patient-scoped Vault SHA audit and explicit one-use consent. It now conveys only approved short original excerpt(s) with their original MKB source UUID and page, prioritizes them ahead of any previously selected original excerpts, and caps evidence to 12 verified excerpts to match the deployed server's original-page capacity. Full PDF bodies are never transmitted via I-09. No health data is persisted in the browser by this addition, and no MKB facts/PDFs were rewritten during deployment.

**Accuracy clarification:** SHA-256 and word-for-word citation matching give exact *text/provenance* integrity, not a mathematical guarantee of 100% medical accuracy. The app abstains where support is inadequate and keeps any pending clinical-review status; it never markets an AI-only diagnosis as clinically verified.

Regression: `healthhub/tests/mkb-v679-story-facts-interpretation.test.cjs` tests the three mandatory sections in order, literal original evidence and source page, both layers contributing only with appropriate qualifications, refusal of unsupported personal claims, and secondary source distinctions. Synthetic runtime smoke checks passed. Real mobile AI answer acceptance is still pending; testers should explicitly verify all three sections, I-09 provenance, and no unsupported UTI diagnosis. The 207 original source documents, 7 facts and 12 evidence rows were not modified by this release.

## v681 · Google Drive csatlakozási állapot (2026-10-19)

The existing Google Identity Services browser **token model** issues a short-lived access token using a user-triggered popup, verified as the dedicated shared Google account. The Google authorization grant is remembered in `AUTH_KEY`, but the sensitive **Drive access token remains strictly in sessionStorage**; neither the cached grant flag nor a previously successful Drive mirror is evidence of a presently valid access token.

Therefore, the v681 Admin MKB connector now displays distinct states:
- **Green** only if a currently unexpired, matching-account Google Drive token exists.
- **Amber** if previous OAuth permission exists but the browser access token is expired or unavailable; the existing button switches to `🔄 Drive megújítás`. Its user click requests Google's `prompt:''` token UI for the shared account and verifies the returned account identity before green.
- **Locked** if the user has never authorized this browser.

The same distinction appears in the legacy Drive mirror status. The app receives a private status-change event after successfully verified OAuth or token revocation and refreshes only the visible UI on focus/visibility/one-minute local check. No timer, page refresh, or background upload invokes a Google OAuth popup, and no Drive tokens or medical records are placed in localStorage or GitHub. There was **no extra Google scope** or database modification.

**Important limitation:** Google specifically does **not support automatic access-token refresh for the browser GIS token flow**; it requires user interaction for a new token. A genuinely persistent Drive connection across expired browser tokens and browser restarts requires a dedicated Google **authorization-code flow** and securely stored server-side refresh token. That migration needs configuration of a confidential Google OAuth client, approved redirect/consent flow, and server-held credentials in Supabase secrets, with patient-specific auth/RLS. Do not promise perpetual green or implement insecure token persistence on the client. Google may still require reauthorization if the user revokes access or the refresh token is invalidated. Reference: Google Identity Services `use-token-model` and `choose-authorization-model` official docs.

Release `v681-google-drive-authorization-status`, test `healthhub/tests/drive-v681-connection-status.test.cjs`. Synthetic OAuth mocks verified no OAuth popup without click, previously authorized amber badge, account-checked manual renewal → green, expiry and wrong account never green. Real S24 Ultra visual acceptance remains pending.

## HH Admin implementáció

`healthhub/hh-development-charter-admin-v658.js` csak az `#haOv` adminpanel megnyitásakor helyez el kártyát az `#haBody` elején. Az összesítés a kiválasztott profilra korlátozott, csak felhasználói kattintásra, `HH_DAILY_HEALTH_SYNC_V319` hitelesített REST kapcsolatán keresztül történik. Az Admin-kártya nem ír adatot, nem archivál képeket, nem indít tömeges feldolgozást, és nem küld egészségügyi tartalmat nyilvános végpontra.

**Tényállás a bevezetéskor:** a 2.0 forrásnyilvántartás létezik, ténylegesen feldolgozott orvosi tények és képi bizonyítékok még nincsenek. A kártya nem nevezhet késznek egy szintetikus vagy még nem futtatott tesztet.
