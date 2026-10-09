# HealthHub · Ask Léna v331 · valódi AI-kutatás és élő terminál
Dátum: 2026-10-09

## Mi volt a probléma?
A v330 „📚 Kutatás” gombja 14 kategóriába rendező helyi, determinisztikus válaszkártyát mutatott, amely a „Léna javaslata” cím ellenére nem volt valódi generatív AI-kutatás. A kártyára automatikus görgetés azt a téves látszatot keltette, hogy a rendszer érdemi, több forrást összegző, szabadon fogalmazó következtetést készített.

## Mit készítettünk a v331-ben?
- A fő Ask Léna gombot az önálló **🧠 AI-kutatás · valódi elemzés** folyamat veszi át. Az eredeti v330 most már külön, becsületesen feliratozott **📊 Csak helyi adatösszesítés (AI nélkül)** opció.
- A tényleges AI-elemzés egyszeri, alapból **nem** engedélyezett hozzájárulás, érvényes központi Health Vault-bejelentkezés és célprofil-hozzáférés nélkül nem indulhat. A profilváltás megszakítja a korábbi folyamatot és eltünteti az előző választ.
- Megmaradt a nyolc HealthHub-adatforrás; kiegészülhet profil alapadatokkal, rögzített tünetnaplóval, vérnyomás/testsúly/pulzustrenddel, legfeljebb 12 alvásszakasszal, 12 napi aktivitási sorral, gyógyszerlistával és relevancia szerint válogatott leletindexekkel / korábban mentett leletmagyarázatokkal. **A dokumentumindex nem egyenlő az eredeti PDF teljes tartalmával.**
- A szerveroldali Supabase Edge function nem sablont ad vissza: a felhasználói kérdésre valódi modellel készíttet magyar összefoglalót, külön kezelve a mért tényt, a bizonytalan összefüggést és a következő lépést.
- Az új, zöld, gépelőszerű terminál az **igazolt eseményeket** írja: kérdés fogadása, források beolvasása, aktív profil ellenőrzése, átadott kategóriák, AI-kapcsolat elfogadása, élő szövegrészletek fogadása. Nem közöl kitalált „belső gondolatokat”.
- Az eredmény **valós idejű SSE szövegfolyamból** épül fel; nem utólag animált, már kész sablonszöveg. Hiba vagy hiányzó szerveroldali függvény esetén tényleges hiba jelenik meg, nincs hamis siker.
- A hálózati adatcsomag korlátozott és profilhoz kötött; a model request `store:false`, a saját Supabase tábla csak az API-hívások mennyiségét követi, és sem a kérdést, sem a személyes válaszokat nem tárolja.

## Deploy: ettől válik ténylegesen használhatóvá az új AI
**Az eddig elvégzett GitHub commitok önmagukban NEM telepítik a Supabase Edge functiont vagy a SQL-migrációt.** Az éles funkcionalitás addig nem igazolt.

1. Supabase projekt: `vhsrupphzcjkdrusonzh`.
2. Futtasd az SQL Editornál: `supabase/migrations/20261009_healthhub_ask_lena_usage.sql`. Ez a külön `hh_ask_lena_usage` limitáló táblát hozza létre.
3. Ellenőrizd a Supabase Function Secrets alatt a `OPENAI_API_KEY` kulcsot, valamint a projekt `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` beállításait. A kulcsok NEM kerülhetnek GitHub Pages, JS vagy kliens kódba.
4. Deploy: `supabase functions deploy healthhub-ask-lena --project-ref vhsrupphzcjkdrusonzh --no-verify-jwt`. Az utóbbi kapcsoló ellenére a függvény saját maga hitelesíti a JWT-t és a profilhozzáférést.
5. Alternatíva: GitHub Actions → **HealthHub Ask Léna Edge deploy (manual)** → Run workflow, miután a repo `SUPABASE_ACCESS_TOKEN` titka be van állítva, és a SQL-migráció már lefutott.
6. Az S24 Ultrán nyisd meg a `healthhub/index.html?hhv=331` oldalt, jelentkezz be a Központi Health Vaultba, adj egyszeri jóváhagyást, és tegyél fel két különböző egészségügyi kérdést. Figyeld a ténylegesen gépelődő zöld konzolsorokat és a folyamatosan érkező választ.

## Acceptance / biztonsági kritériumok
- Külön AI-hozzájárulás nélkül nulla privát adatközlés.
- Sikeres válasz csak akkor, ha a tényleges modellező backend `done` eseményt küldött.
- Véletlen profilkeveredés, feleslegesen korábbi válasz visszaadása vagy megszakadt stream „kész” állapotként való jelzése tilos.
- A személyes adatokat a külső modell feldolgozza, tehát ez nem „csak helyi” kutatás. Az adatcsomagot a rendszer szándékosan korlátozza.
- Mérés vagy original-PDF hiányakor nyíltan jelzi az információhiányt; semmilyen diagnózis nem lehet megalapozatlan.
- A teljes PDF-tartalom automatikus elemzése és az összes lelet tömeges elküldése nem része a v331-nek; ehhez további, dokumentumonkénti forrásbeolvasás és hozzáférés-kezelés szükséges.

## Tesztállapot
- A JS és HTML bootstrap szintaxisát a GitHubon ellenőriztük.
- Élő modellválaszt és S24 Ultra browser acceptance tesztet **még nem** igazoltunk.
- A Supabase migráció / deploy és éles API hitelesítés következő kötelező feladat, nem „késznek” címkézendő.
