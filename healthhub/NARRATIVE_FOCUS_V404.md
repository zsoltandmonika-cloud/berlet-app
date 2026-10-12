# HealthHub v404 · Question Intent + Narrative Priority + Context Relevance

## Kiindulás
A v403 már összefüggőbb választ adott Mónika 2024-es kórházi történetére, de a felhasználó nem kért önálló magyarázatot a memóriazavarról. Az esemény történetéhez kapcsolódó rövid említés viszont indokolt lehet. A válasz egyes részei nem követték a kért teljes időtartamot a rosszulléttől a hazabocsátásig.

## Javítások

**A tényleges felhasználói kérdés az elsődleges.** A korábbi v393 és I-06 stílusutasításokat a weboldal korábban hozzátoldotta a modellnek küldött kérdéshez. A részletes klinikai v395 szerver a v404-től a változatlan eredeti kérdést kapja, mert az elemzési utasításokat maga a szerver kezeli. A megjelenített kérdés és a beszélgetési előzmény nem változik.

**Question Intent:** a `focus.mjs` az eredeti, magyar ékezetes vagy ékezet nélküli kérdésből határozza meg, hogy történeti/időrendi kérdésről van-e szó, és a kérés tartalmaz-e kezdő és záró eseményt. A memóriazavar csak akkor kiemelt téma, ha a felhasználó ténylegesen rákérdez.

**Narrative Priority:** a szerver az eredeti és korábbi JSON-feldolgozásból idézett bizonyítékokhoz rendeli az eseményfázisokat (rosszullét, mentés, kórházi ellátás, beavatkozás, hazabocsátás). Nem követel fázist, amelyhez nincs alátámasztott forrásszöveg. Csak ténylegesen releváns idézett forrásazonosítóval ellátott bekezdés jelenti egy fázis lefedését. Ha elegendő idézett tény van, de fontos, forrásban alátámasztott fázis hiányzik, a szerver legfeljebb egyszer újraszerkesztést kér. A hosszabb válasz nem automatikusan jobb: a teljesebb, forráshű időrend előnyt élvez.

**Context Relevance:** az eredeti oldalkivonatokkal vagy korábbi összefoglalók pontos idézetével alátámasztott, de *külön nem kért* memóriaelemzésből nem lesz önálló fejezet. Legfeljebb egy rövid, forrást és bizonyítékosztályt változatlanul megőrző mondat kerül a felépülésről szóló részhez. A vegyes „ébredés és emlékezetzavar” fejezet többi dokumentált eseménye megmarad. Ha a felhasználó célzottan a memóriára kérdez rá, a korlátozás nem lép életbe.

**Clinical Quality Gate változatlan:** D-jelű eredeti PDF-oldalak és S-jelű korábbi JSON-magyarázatok külön bizonyító erővel jelennek meg; kitalált mérési eredményt, dátumot, orvosnevet vagy hivatkozást nem szabad hozzáadni. A v404 relevancia-szerkesztése csak a sikeresen auditált bekezdések *után* következik, új orvosi tényt nem generál.

## Ellenőrzés
`node supabase/functions/smooth-endpoint-v395/focus-v404.test.mjs`

20 szintetikus fókuszteszt, köztük a teljes idősáv felismerése, valóban megkérdezett memóriazavar megőrzése, rövid említés külön kérdés nélkül, vegyes ébredési fejezet nem-memória állításainak megőrzése, az alátámasztott és nem alátámasztott időrendi fázisok, AED és beültetés megkülönböztetése, valamint a helyes forrás-ID-hez kötött záró esemény.

A v403 korábbi 18 klinikai sztoritesztje és a v402/v403 14 Intelligence-tesztje változatlanul szükséges regressziós ellenőrzés.

## Élő Golden Standard elfogadás
Azonos profillal és ugyanazzal a kérdéssel, „Részletes kutatás” módban tesztelni, majd a PDF-válasz alapján vizsgálni:
1. A fő törzs a kért időszakot dolgozza fel, az elérhető források keretein belül.
2. Nincs önálló, többbekezdéses memóriazavar-elemzés, ha a kérdés nem arról szólt.
3. A fontos klinikai szakaszok nem tűnnek el egy kapcsolódó téma miatt.
4. Minden konkrét személyes állítás megőrzi D (eredeti PDF) vagy S (korábbi magyarázat) forrásjelölését.
5. Ha a forrásban nincs mentési vagy hazabocsátási esemény, nem lehet azt elképzelt részletekkel pótolni.
6. Az élő teszt minőségét felhasználói értékelés dönti el; a 20/20 kódteszt önmagában nem bizonyítja a kész, kiváló történetmesélést.

## Telepítés
A GitHub Pages webes `v404` build mellett a `smooth-endpoint-v395` **Supabase Edge Function** is külön frissítendő. Új függősége: `focus.mjs`. A korábbi `verify_jwt=false` beállítás csak azért tartható meg, mert a végpont továbbra is saját maga ellenőrzi a bearer JWT-t, a profilhozzáférést és a hozzájárulást. Betegadat-migráció nincs.
