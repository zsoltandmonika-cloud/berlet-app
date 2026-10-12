# HealthHub v405 · Non-regression Narrative Preview

## Kiindulás
A v404 Question Focus kiadás éles használatban az egyetlen általános „nem sikerült ellenőrzött személyes eseményleírást összeállítani” mondatra redukálta a v403-mal korábban már értelmesen elmesélt kórházi történetet. Ez elfogadhatatlan. A v403-at a PR #152 helyreállította, és a `smooth-endpoint-v395` szerver jelenleg v403-as kódot futtat.

## Kísérleti v405: NEM AZ ÉLES AI LEC SERÉLÉSE
- A `smooth-endpoint-v395` (éles) forrása, promptja és route-ja változatlan.
- Egy külön Supabase `smooth-endpoint-v405-preview` végpont futtatja a *v403 eredeti modellhívását, v403 eredeti forrásauditját, v403 egyetlen lehetséges narratív újrapróbálkozását*.
- **Kizárólag az audit UTÁN** próbálkozik az I-06-ból ismerős emlékezet/memória témájú mellékszál rövidítésével, a `focus.mjs` segítségével.
- `focus-guard-v405.mjs`: a v403 eredeti auditált történetet mentésként tartja; a szerkesztett változatot csak akkor használja, ha a forrásazonosítók változatlanok, minden eddig bizonyított nem-memóriaesemény és minden korábbi időrend-fázis megmarad, a történet nem omlik össze, és nem keletkezik új forráshiány.
- Az AI-nak küldött korábbi, hosszú v393/I-06 stílusutasítások csak a *fókuszdetektor bemenetéből* kerülnek leválasztásra. A tényleges v403 modellkérdést **nem módosítjuk**.
- Ha a v405 szerkesztés nem biztonságos, a v403 auditor által már jóváhagyott történetet adja vissza. Külön QA-metaadat: `qaFocusMode`, `qaFocusReason`, megtartott forrásos bekezdések darabszáma.

## Kísérleti aktiválás
Csak a szándékosan hozzáadott `?hhNarrativeQA=v405` URL-paraméterrel; más esetben az Ask Léna a megszokott éles v403 útvonalat használja. A kapcsoló csak **részletes klinikai kutatásnál**, jóváhagyott profillal és engedélyekkel működik. A képernyőn kísérleti jelzés, a válasz alatt visszaállási / fókusz-ellenőrzési QA-státusz látszik. A paraméter eltávolításával ugyanaz a böngésző visszatér a normál v403-ra.

A teszt azonos Supabase projektben, elkülönített function útvonalon fut; nem készül betegadat-migráció, nem módosul a dokumentumtár és nem kerül új személyes naplózásra sor. A meglévő privát AI-kérés és a szolgáltatói API-hívás adatkezelési feltételei változatlanok.

## Kódoldali vizsgálatok
- `focus-guard-v405.test.mjs`: 13 szintetikus biztonsági teszt: az egész klinikai időrend megőrzése; levágott, nem kért memóriaelemzés; téves „nincs adat” fallback; betegszempontból fontos más tartalmak megőrzése; hamis hazabocsátás-forrás hivatkozás; a felhasználói kérdés elkülönítése az AI háttérstílus-utasításaitól.
- `focus-v404.test.mjs`: 20 kérdésfókusz teszt. **A v404-szabályok önmagukban nem jogosítanak fel élesítésre.**
- `storytelling-v403.test.mjs`: 18 klinikai forrás-regresszió.
- `healthhub/tests/intelligence-v402.test.cjs`: 14 kliensoldali minőségvédelmi regresszió.

## Elfogadási feltétel
Az éles v403-at és a külön v405 preview-t ugyanazzal a kérdéssel, ugyanazon aktív profilon, azonos hozzájárulással, a lehetőleg azonos leletállománnyal össze kell vetni. A preview csak akkor tekinthető jobbnak, ha:
1. Megmarad a rosszullét, mentés, kórházi ellátás, beültetés és hazabocsátás azon része, amelyhez tényleges bizonyíték érkezett.
2. A kéretlen memóriaelemzés legfeljebb egy rövid kapcsolódó megjegyzés.
3. Nem jelennek meg új, forrás nélküli klinikai részletek.
4. Az új válasz a v403-hoz képest nem lesz üresebb.
5. A felhasználó ténylegesen jobb, természetesebb történetnek találja.

**A fenti élő próba teljesüléséig a v403 az éles alap, a v405 kizárólag opt-in QA.**
