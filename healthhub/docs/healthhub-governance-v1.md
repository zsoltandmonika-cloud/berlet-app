# HealthHub Governance v1.0 · Három pillér / Engineering Charter

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

**Diagnózis → Bizonyíték → Döntés → Visszaállítási terv → Implementáció → Teszt → Deploy → Utóellenőrzés.**

- Stabil, gyors, egykattintásos mobil UX; prémium sötét glassy téma, egységes profilváltó.
- Nem készül párhuzamos, félkész adattároló vagy duplikált feldolgozó, ha a meglévő réteg továbbfejleszthető.
- Minden jelentős döntést két helyen kell követhetővé tenni: GitHub technikai dokumentációban és HH Admin felületen.
- A zöld állapothoz mért, igazolt eredmény kell; hiányzó adatból nem keletkezik sikerjelzés.

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

## HH Admin implementáció

`healthhub/hh-development-charter-admin-v658.js` csak az `#haOv` adminpanel megnyitásakor helyez el kártyát az `#haBody` elején. Az összesítés a kiválasztott profilra korlátozott, csak felhasználói kattintásra, `HH_DAILY_HEALTH_SYNC_V319` hitelesített REST kapcsolatán keresztül történik. Az Admin-kártya nem ír adatot, nem archivál képeket, nem indít tömeges feldolgozást, és nem küld egészségügyi tartalmat nyilvános végpontra.

**Tényállás a bevezetéskor:** a 2.0 forrásnyilvántartás létezik, ténylegesen feldolgozott orvosi tények és képi bizonyítékok még nincsenek. A kártya nem nevezhet késznek egy szintetikus vagy még nem futtatott tesztet.
