# HealthHub v590 · I-08 Sleep × Digital Wellness Intelligence

## Állapot és cél
A HealthHubban **már meglévő két forrást** csatlakoztatja egyetlen közös,
olvasható és újrahasznosítható intelligencia-adatkapcsolaton keresztül:
- **Alvás:** a profilhoz hitelesített Health Context `sleep.recent` alvásszakaszai (v289). Az alvás a v389/v390 mérési és trendmodulban már korábban is szerepelt.
- **Digitális Wellness:** a v507-ben ellenőrzött, profilhoz kötött, legfeljebb 30 napos Android Usage Access / Dropbox `*-digital-wellbeing.json` fájlból a v328 által **már beolvasott** memóriaadatok. A digitális megfigyelések a v328-as képernyőn már korábban is láthatók voltak.

Az I-08 a kettő közötti **óvatos időbeli összevetést** teszi lehetővé. A későbbi Digital Analysis és Sleep Analysis is használhatja a `window.HH_SLEEP_DIGITAL_INTELLIGENCE_V590.enrich` közös read-only API-t, feltéve, hogy azonos engedélyezési és profilkaput alkalmaz.

## Integráció
`v328.run() → v328.getDigital(profile) → v388 I-02/I-03 gate → v590 I-08 enrich → v391 I-04 → v402 I-07/I-06 → eredeti Ask Léna AI`.

- Az adatgyűjtés csak felhasználói Ask Léna-kutatás részeként, a már meglévő hozzájárulással fut.
- **Nem** hoz létre új felhőletöltést, időzítőt, adattárolást, tokent, önálló háttér-AI-kérést vagy adatmegosztási jogosultságot.
- Csak néhány, időpontot és forrást jelölő rövid `extra` tény megy a már engedélyezett AI-válaszba; a nyers digitális órasávok, alkalmazáscsomag-nevek és a teljes alvásidősor nem.
- A profilváltozás, a hibás vagy duplikált órasáv, a nem igazolt forrás, illetve a hozzájárulás hiánya **fail-closed**.
- A hiányzó adatok nem nulla használatot jelentenek. Az alvási rekord egy **mért alvásszakasz**, nem feltétlenül teljes éjszaka.
- Az összevetés csak olyan estéket párosít, ahol van az adott éjszakához tartozó, az alvás kezdete **előtt lezárt** (20:00–24:00, Europe/Budapest) digitális idősáv. Az azonos éjszakai alvástöredékeket nem számolja több éjszakának.
- Nem jelent ok-okozati összefüggést, diagnózist, gyógyszerhatást vagy klinikai kockázati besorolást.
- Frissességnél a legutolsó **mért órasáv**, nem a Dropbox-feltöltés időpontja az irányadó.

## Visszaállítás és ellenőrzés
Az I-08 kihagyásához az `index.html` új v590 scriptbetöltése és a `live-v331.js` `lifestyleEngine`-blokkja visszavonható, a régi I-02/I-03 és a meglévő v328 forrásnézet érintetlenül hagyásával.

Teszt: `node healthhub/tests/intelligence-i08-v590.test.js`, kizárólag szintetikus adatokkal. Ellenőrzi a hozzájárulást, profilkeverést, hiányos digitális idősávokat, elalvás előtti párosítást, frissességet, töredezett alvást, változatlan bemeneti rekordokat.

Még szükséges a valódi S24 Ultra / két profil kézi tesztje: 1) képernyőadatokhoz engedélyezett Dropbox-kapcsolat, 2) profilhoz tartozó Health Context, 3) Ask Léna saját kérdésre indított engedélyezett kutatás, 4) konzolban I-08 visszajelzés és a válasz megfogalmazása. Nem tekintünk éles mobilos adatlefedettséget bizonyítottnak a forráskód- és szintetikus tesztek alapján.
