# HealthHub v696 · Ask Léna Intelligence: kötelező forráskör, kizárások és célzott hibaelemzés

**Dátum:** 2026-10-19

## Éles, read-only audit eredménye

Az aktív Supabase projektből profilokra összesített, **egészségügyi szöveget és betegazonosítót nem továbbító** lekérdezéssel:

| Kategória | Mónika | Zsolt | Összesen |
| --- | ---: | ---: | ---: |
| Regisztrált PDF-forrás | 175 | 43 | 218 |
| Aktív / kötelező PDF-forrás, ellenőrzött oldalszöveg | 164 | 43 | **207/207** |
| Korábban tudatosan kizárt Watch EKG | 11 | 0 | **11** |
| Technikailag forráshoz és oldalszöveghez illeszthető bizonyíték | 6 | 6 | **12/12** |
| Kézi, szakmai felülvizsgálatra váró állítás | 4 | 3 | **7** |
| Kézi, szakmai felülvizsgálatra váró bizonyíték | 6 | 6 | **12** |
| Szakmailag jóváhagyott tény | 0 | 0 | **0** |

Mind a 11 hibának jelölt PDF **egyoldalas** (0 tárolt oldal, 0 karakter), és ugyanazzal a generikus feldolgozási üzenettel került az indexbe. Az éles `hh_mkb_sources.source_metadata` mindegyiknél `ingest_scope=excluded`, `scope_reason=user_deprioritized_watch_ecg`, amit korábban a felhasználó jóváhagyott. **Nem szabad újra automatikusan feldolgozni** vagy a 207/207 kötelező lefedettségben hibaként számolni.

A 12 bizonyítékhoz tartozó fact/source/document/profile/page és szó szerinti idézet minden esetben egyezik a privát indexben. Ez a szerkezeti és szöveges ellenőrzés **nem helyettesíti a klinikai szakvéleményt**; az állapotuk helyesen `pending`.

## Milyen hiba valódi és milyen nem?

**Nem aktív hiba:** a 11 Watch EKG feldolgozási státusza. Megőrzött, szándékosan kívül helyezett források.
**Valódi, nyitott minőségi feladat:** 7 strukturált tény és 12 bizonyíték szakmai ellenőrzési folyamata, konfliktuskezelés és az Ask Léna élő válaszainak forráshűsége. A rendszernek a szakmai review hiányát láthatóan jeleznie kell.
**Külön, változatlanul blokkolt témakör:** a v694 privát PDF-archívum írásra képes új funkcióját a telepítési biztonsági kapu nem engedte. Ezt a v696 **nem hívja és nem helyettesíti**.

## v696 beavatkozás (csak olvasás)

Az Admin Medical Knowledge Base 2.0 panelre kerül egy kézzel indítható **„Sikertelen PDF-ek · diagnózis”** gomb. A modul:

1. Az aktív Health Vault profil jogosultságát, az engedélyezett privát Drive-mappát és a dokumentumok SHA-ját tiszteletben tartja.
2. A `hh_mkb_sources` eredeti Drive-ID-hez kötött kizárásait **először** figyelembe veszi; a 11 Watch EKG esetében várható eredmény: kötelező hibák **0**, tulajdonosi kizárás **11**.
3. Ha **új, valóban kötelező körbe tartozó** hibás dokumentum keletkezik, csak annak első oldalát ellenőrzi a meglévő, hitelesített read-only forrásútvonalon. Legfeljebb 11 dokumentum egy gombnyomásra.
4. Külön kategóriát ad Drive-elérésre, fájl-SHA eltérésre, PDF-feldolgozásra, szövegkinyerésre, tiltott Unicode-ra és OCR/képi továbblépésre. Az olvasható szöveget csak **feltételezett tárolási úthibának**, nem sikeres adatbázismentésnek jelöli.
5. Nem ment PDF-bájtokat, szöveget, idézetet vagy betegazonosítót a jelentésbe; nem indít utólagos szinkront, nem ír át tényt és nem módosítja a korábbi kizárásokat.

## Kiadási és elfogadási kapu

- Szintetikus tesztek (NUL, hibás Unicode, kizárt EKG, másik profil, PDF parser hiba, 11-es plafon).
- Meglévő MKB és Ask Léna klinikai, profil- és PDF-visszaállítási regreszsziók.
- Github `main` után az Admin valódi ellenőrzése: **11 kihagyott és 0 aktív feldolgozási hiba**, a felhasználó engedélyezett profiljában.
- A 12 bizonyíték technikai párosítása külön SQL-auditból ismert, de **nem állítunk LIVE VERIFIED Ask Léna-válaszminőséget** valós kérdés-válasz ellenőrzés nélkül.

## Következő fejlesztési prioritás

Ask Léna IQ: kérdéshez való tényleges forrásrelevancia, az érvényes oldalszöveg kizárólag engedélyezett felhasználása, az `pending` vs `verified` státuszok külön kezelése, értelmezési bizonytalanság és arányos klinikai óvatosság. A 7 tény szakmai validálása külön döntési kapu; **nem kapcsoljuk át automatikusan `verified` állapotra**.
