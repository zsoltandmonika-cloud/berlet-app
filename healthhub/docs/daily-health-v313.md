# HealthHub v313 – valódi OpenAI-alapú reggeli tartalmak (nyilvános adatokról)

## Három napi briefing, egy titkos API-kulccsal

A felhasználó GitHub Actions repository secret-ként állítja be a `OPENAI_API_KEY` kulcsot.
A secret értéke nem látható a nyilvános forráskódban vagy a GitHub Pages felületen, és
nem kerül naplózásra. OpenAI-hívás csak a GitHub Actions **szerveroldali** runnerén fut.

- **Daily Spark:** 06:00 után ugyanabban a megszokott `daily-spark.json` szerkezetben
  készül napi, új AI-inspiráció a két nyilvánosan használt csillagjegyhez. Csak
  a személynevek és csillagjegyek kerülnek a modell bemenetébe. Ez szórakoztató
  tartalom, nem tudományos előrejelzés.
- **Daily Headline:** 07:00 után az eddigi RSS-címek és kiadók alapján a modell
  magyar nyelvű elemző blokkokat készít. Megmaradnak az eredeti hírlista és
  forráshivatkozások; a modell *nem* olvassa a teljes cikkeket, ezért nem állíthat
  olyan részleteket, amelyek nem következnek a megadott címekből.
- **Daily Health:** 07:15 után az Open-Meteo / CAMS és időbélyegzett NNGYK
  nyilvános környezeti adatokból `daily-health-ai-public.json` generálódik.
  A HealthHub UI egy külön „🧠 Léna AI” kártyán jelzi a valódi modell által
  írt összefoglalót. A főoldali sáv címe csak **Daily Health**.

## Valós vs. tartalék üzemmód

Ha az API-kulcs hiányzik, a modell költségkerete elfogy, forráshiány van,
vagy az API hibaüzenetet ad, a már működő szabályalapú/RSS Daily
Spark, Headline és Health riportok maradnak meg. A Health AI-kártyán az
UI kifejezetten jelzi, ha a mai LLM-szöveg hiányzik; nem címkéz
szabályalapú szöveget AI-nak.

Az API az OpenAI Responses végpont, `store:false` kapcsolóval és
JSON-séma kimenettel. A névleges modell `gpt-4.1-mini`.
Csak adott napra hoz létre riportot, az aznapi, már sikeres AI-riportokat
nem generálja újra. API-hívás csak a belső GitHub Actions futásból történik.

## SZEMÉLYES EGÉSZSÉGÜGYI ADATOK

A GitHub repó **nyilvános**, ezért sem betegséget, diagnózist,
egyéni gyógyszerelést, vizsgálatot, Health Connect mérést, tünetnaplóbejegyzést
vagy Dropbox Vault-adatot **NEM** szabad az AI napi bemeneti
fájljába, a generált JSON-ba vagy a GitHub workflow-k naplójába tenni.

Ez a v313 **nem** ad autonóm hozzáférést az egyéni egészségügyi
profilokhoz. A személyes automatikus AI elemzéshez külön
hitelesített, zárt háttérszolgáltatást kell telepíteni,
személyenkénti, revokálható és naplózott hozzájárulással,
megfelelő adatvédelmi kontrollokkal. Nyilvános repo-hosted,
secret nélküli kliensoldali AI hívás tilos.

## Első telepítési validáció

1. A PR Level 3 Guard sikeresen lefut Python/JavaScript szintaxis-teszttel.
2. A main ág push trigger automatikusan indítja mindkét napi workflow-t.
3. `Actions → HealthHub Daily Free`: keresd az „Generate public AI versions” stepet,
   a logban `genuine OpenAI version generated` / `genuine OpenAI analysis generated` szöveggel.
4. `Actions → HealthHub Daily Health Public`: keresd az „Generate public AI Daily Health”
   stepet, a logban `AI Daily Health generated using OpenAI Responses API` szöveggel.
5. Csak akkor tekinthető aktívnak a valódi AI mindhárom modulban, ha a 3
   valóban AI-generált JSON elkészült, és a Pages telepítés is sikeres.
6. Hibák, hiányzó secret vagy kimerült kredit esetén semmi sem jelenhet meg
   „valódi AI-ként”, ha csak szabályalapú szöveg létezik.
