# HealthHub · Future Innovation Pipeline / Epic Portfolio
**Dátum:** 2026-10-16  
**Státusz:** felhasználó által kért stratégiai ötletparkoló; **nem fejlesztési jóváhagyás, nem éles funkció**.

## Termékvízió
A HealthHub hosszú távon személyes, moduláris egészségtámogató platform, benne jó minőségű, természetes hangú Ask Léna beszélgetéssel és engedélyezett személyes egészségügyi kontextussal. A lehetőségek közül későbbi validáció alapján választunk; az el nem érhető, nem megbízható vagy nem biztonságos elemeket elvetjük. A meglévő működő HH/Sleep/Activity/Digital Wellbeing/Connect adatfolyam, Golden design, és kétprofilos izoláció érintetlen marad.

### P0 stratégiai álom · Ask Léna Voice / Conversational Health
**Felhasználói cél:** a Léna személyiségéhez illő, természetes, magyarul folyékony és lehetőség szerint anyanyelvi kiejtésű, interaktív hangos beszélgetés, amely érti a folytatólagos kérdéseket, a kontextust és a jóváhagyott személyes egészségügyi dokumentumokat/méréseket. Nem egy régi, mechanikus chatbot hangos felolvasása.
- **HH-VOICE-001** Élő, kétirányú speech pipeline (ASR + reasoning/LLM + TTS vagy validált end-to-end realtime multimodális API); alacsony késleltetés, barge-in, folyamatos beszélgetés, csend/hiba/reconnect kezelés. Válaszokban helyes hangsúly és kiejtés, anyanyelvi tesztekkel.
- **HH-VOICE-002** Evidence-grounded voice Ask Léna: a már működő Intelligence/RAG kontextus, forrásbizonyítékok, eredeti leletek, measurement recency, helyes személyprofil, visszakérdezés és bizonytalanság felolvasva is értelmesen; nem általános „teleorvos” diagnosztikai autonómia.
- **HH-VOICE-003** Voice Golden Acceptance: kifejezetten magyar anyanyelvi teszt, terminológia (pl. gyógyszernevek), érthetőség, gördülékeny turn-taking, latency, beszédszünet, akcentus, adatvédelmi hozzájárulás és külön kétprofilos QA. A konkrét Léna-hang / Sol hang használata kizárólag technikai és jogszerű elérhetőség esetén; **a teljesen akcentusmentes hang nem ígérhető teszt nélkül**.
- **HH-LANG-001** HealthHub globális **HU/EN + bővíthető nyelvváltó**: felület, Ask Léna szöveg, audio input/output, captions, dátum/számformázás és elsősegély-útmutatók lokalizációja; választott nyelv független lehet a profil témaszínétől, opcionálisan profilonként megőrzött. Magyar elsődleges minőségi kapu. Nyelvváltás nem jelent klinikai fordítás jóváhagyását; vészhelyzeti fordítások szakértői ellenőrzést igényelnek.

### HealthHub Guardian · Safety / Emergency
A már létező **HH-EMERG-001/002** Safety Epic **kibővítése, nem helyettesítése**.
- **HH-GUARD-001** Opt-in GPS/SOS, családi értesítés, okosóra/szenzor jelek, vércukor és incidens-eseménynapló, kamerás rögzítés **csak törvényesen és felhasználói kontroll mellett**.
- **HH-GUARD-002** **Offline-first ICE és sürgősségi adatátadás:** releváns gyógyszerek, diagnózisok, allergiák, eszközök, orvosi dokumentumok; felhasználó által áttekinthető, egyszerű, célhoz kötött, visszavonható megosztás a mentőkkel/diszpécserrel, saját kórlapi profilból.
- **HH-GUARD-003** Hitelesített **animált CPR/AED segítség** és szükség esetén kameraalapú felhasználói támogatás tervezése; a 112/911 és az AED/operátor utasításainak elsőbbsége, nem improvizáló AI, végponttól végpontig offline/stresszhelyzeti/szakmai validáció.
- **HH-GUARD-004** Távoli jövőkutatás: strukturált, esetleges gép–gép sürgősségi (AI–AI/GibberLink-szerű) információátadás, csak ha a segélyszolgálati infrastruktúra, hitelesítés, szabványok, engedélyek és a jogi feltételek ezt támogatják. **Sem automatizált segélyhívó-operator helyettesítés, sem gép–gép interop jelenleg nem ígért.**
- **HH-GUARD-005** Redundáns safety gate: megerősítés, hibás vagy késő adat kezelése, nincs önműködő klinikai döntés/gyógyszerváltoztatás; 112 elérésének korlátozása tilos; GPS/permissions/offline/camera/platform/notification QA.

### Mental Wellness · Psychology @ Home
- **HH-MH-001** Önkéntes, privát mood/stressz napló, strukturált pszichoedukáció, CBT-alapú önsegítő gyakorlatok, megfelelő szakemberhez irányítás; nem pszichiátriai diagnózis/gyógyszerfelírás, krízis- és sérülékeny felhasználói biztonsági tervvel.
- **HH-MOOD-001** Léna Mood Booster: felhasználó által választott popkulturális, humoros, zenés, könnyű relaxációs tartalom; hangulati visszajelzéssel, nem erőltetett pozitivitással; nem tekinthető kezelésnek.
- **HH-HYPNO-001** Önkéntes vezetett relaxáció/önhipnózis/képzeletgyakorlatok, hitelesített szakértői programok lehetséges bevonásával; bizonyíték és kockázatok dokumentálása, fájdalom esetén kivizsgálás nem késleltethető, dohányzásról leszokásnál nem szabad garantált hatást ígérni. Nem rejtett szuggesztió vagy tudatbefolyásolás.

### Integrative & Complementary Care
- **HH-COMP-001** Szakértővel együtt gondozható gyógynövény/fitoterápia tudástár, hivatkozásokkal, szakmai jóváhagyás és hozzájárulás után; evidencia-szintek, ellenjavallatok, gyógyszerinterakciók, gyógyszerész/orvos bevonása, különösen kardiológiai gyógyszereknél. A „természetes” nem egyenlő az ártalmatlannal; konvencionális kezelés helyett nem javasolható.

## Közös architektúra és feltételek
- Közös **Léna Intelligence** és forrásbizonyíték-réteg; klinikai források, bizonytalanság és mérési idő elkülönítve az AI-következtetésektől.
- **Explicit consent, offline/minimáladat, kétprofilos izoláció, GDPR, készülékengedélyek, visszavonás, törlés, orvosi/szakértői jóváhagyási kapu** minden érzékeny új funkciónál.
- Régi HealthRadar és minden stabil modul változatlanul működik; nem készül most APK, hangmotor, SOS, AI-terápia vagy alternatív terápiás ajánló.
- **Pipeline státusz:** Idea / Future vagy Backlog / Future, teljesítés 0%. Nem jelenti a kifejlesztést, próbaüzemet, megfelelőséget, szakértői részvételt vagy az ígért funkciók megvalósíthatóságát.

## Elsőbbség, ha a jövőben kiválasztjuk a következő nagy álmot
1. **Első nagy stratégiai álom:** természetes, életszerű, intelligens, magyarul kiválóan beszélő **Ask Léna Voice** és bővíthető HH Language Switch. Ennek a munkának külön fejlesztési döntés/forrás/QA előtt nem kezdünk neki.
2. **Guardian Safety**: már létező Safety Epic kibővítve, a korábbi safety-prioritás megtartásával.
3. **Mental Wellness / Mood Booster / Guided Relaxation** és **Integrative Care**: külön, később mérlegelendő, szakértői és evidenciafüggő ágak.

**Döntési elv:** „A jövő majd megmutatja, mi marad valós álom, és mit kell ledarálni.” A korábbi elfogadott rövid távú release-fókuszt nem írja felül a future portfolio.
