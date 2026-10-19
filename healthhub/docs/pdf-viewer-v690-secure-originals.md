# HealthHub v690 · Eredeti PDF-olvasó, biztonságos Drive-fallback

Állapot: **CODED**, **TESTED (szintetikus CI)**. A valós telefonon történő **LIVE VERIFIED / USER ACCEPTED** még külön igazolandó.

## Hiba és cél
A v689-es PDF-olvasó a `documents` metaadatot és a `documentBlobs` helyi bájtokat kizárólag az aktív telefon IndexedDB adatbázisából olvasta. A felületen megjelenő leletrekordhoz másik készüléken nem feltétlenül volt helyi PDF. Ekkor a dokumentumnéző hibásan a helyi tárhely hiányát jelezte, miközben a privát szerveroldali Drive-leltár és egy eredeti fájl olvasása is működött.

## v690 adatfolyam
1. Kiválasztott profil + helyi `documents.id` rekord: profilazonosság ellenőrzése.
2. Ha van `documentBlobs` eredeti fájl: megnyitás helyben, változatlanul.
3. Ha hiányzik, és a rekord PDF: hitelesített Health Vault `stream` hívás az `hh-drive-oauth-v682` végponthoz, `action=archive_document`, pontos `documentId`, aktív profil.
4. A szerver újra ellenőrzi a Supabase felhasználót, profiljogosultságot, a Google-fiókot, a beteg privát Drive-mappáját, a fájlmappa szülőjét, a MIME-t és a pontos `appProperties.profile/documentId` egyezést. Egyértelműen egyetlen címkézett példány szükséges.
5. A böngésző PDF-aláírást és 15 MB korlátot ellenőriz; ha a helyi indexben van ellenőrzőösszeg, a SHA-256 egyezés kötelező.
6. A PDF csak memóriában él a dokumentumnéző lezárásáig. Nem történik háttér-import, fájlmódosítás vagy automatikus naplózás.
7. Profilváltás vagy bezárás érvényteleníti a folyamatban lévő megnyitási eredményt.

Nincs fájlnév-alapú találgatás, nincs Google OAuth token a kliensben, és nincs kijelzett PASS, ha nem sikerült egyértelműen feloldani az eredeti dokumentumot.

## QA
- GitHub Actions: `healthhub-original-pdf-v690-qa.yml`
- Teszt: `healthhub/tests/pdf-viewer-v690.test.cjs`
- Éles teszt Android/Samsung Chrome: két profil, azonos profilhoz tartozó helyi és Drive PDF-ek; lapozás; zoom; újranyitás; felhasználói profilváltás félbeszakított betöltésnél; hiányzó címkézett archívum esetén egyértelmű figyelmeztetés.

## Elfogadási feltételek
- Szerveroldali és kliensoldali profilvédelem zöld.
- A hiányzó helyi bájtokkal rendelkező *konkrét* lelethez megtalálható az egyetlen, pontos `documentId` címkéjű eredeti Drive-fájl.
- Eredeti PDF az egészségügyi leletlapról megnyílik, minden oldala olvasható.
- Mónika és Zsolt profiljai között nincs jogosulatlan adatátcsúszás.
- Nincs dokumentum felülírása és nincs adatvesztés.
- Kizárólag **valós készülékes próba és felhasználói visszaigazolás** után lehet LIVE VERIFIED / USER ACCEPTED.

## Rollback
A `healthhub/index.html` build/tag és `live-v201.js` kód visszaállítása a v689 jóváhagyott commitra. A privát Drive eredeti fájljai és a központi adatbázis érintetlenek.

## Nyitott korlát
A címke nélküli vagy korábbi, a Léna-archívumon kívül található PDF-et a biztonság kedvéért nem próbáljuk pusztán név vagy dátum alapján kitalálni. Ha az éles teszt ilyen dokumentumot talál, külön, jogosultságellenőrzött forrásazonosító-migráció szükséges, az eredeti állomány módosítása nélkül.
