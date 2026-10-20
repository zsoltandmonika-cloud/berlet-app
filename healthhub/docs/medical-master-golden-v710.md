# HealthHub v710 · Ask Léna: Medical Master Golden Standard próba

## Architektúra és cél
A 7. `/HealthHub/master/medical-master.json` már a privát Dropboxban van. A v710 kizárólag kifejezett teszt kapcsolóval működik. A böngésző a Dropbox-fiókból olvassa a mentett Mastert, helyben kizárólag az aktív Mónika vagy Zsolt profilt választja ki, majd egy új, azonosítást és profilhozzáférést ellenőrző Supabase Edge Functionnek adja át a felhasználó minden kérdésnél megismételt kifejezett engedélye után. A szerveroldali OpenAI-kulcs sosem kerül kliensre.

## Teszt URL
https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/?hhMasterQA=v1

## Első két Golden Standard teszt
1. Meséld el részletesen, időrendben, mi történt Mónikával 2024. június 17-től a kórházi hazabocsátásáig. Térj ki az újraélesztésre, a felébresztésre, az intenzív kezelésre, a laboreredményekre, az orvosokra, a vizsgálatokra és a felépülésre. Minden állítást támassz alá a Medical Masterben található adatokkal és forrásokkal.
2. Volt Mónikának valaha hormonvizsgálata? Melyek voltak a konkrét eredmények, mikor készültek? A nem dokumentált női hormonokról is szólj külön.

## Biztonság és hatókör
- Normál Ask Léna / v706 Sol teszt: változatlan, query-paraméterrel teljesen külön.
- A hat strukturált Dropbox JSON: sosem íródik át ezen az útvonalon.
- A hetedik Master: kizárólag olvasás a felhasználó bejelentkezett Dropbox böngészőjéből.
- Csak a kiválasztott profil adatcsomagja kerülhet a szerverre. Teljes, kétprofilos Master nem.
- Egy kérdéshez egyszeri, konkrét OpenAI-feldolgozási hozzájárulás. A beszélgetés további kérdéseire nem érvényes automatikusan.
- Edge: CORS, JWT-validálás, `hh_profile_access`, óránkénti használati limit és request-size védelmek.
- API: `store:false`, szerveroldali kulcs, hiányos vagy túlméretes corpusra fail closed.
- Az eredeti PDF nincs bekötve; a Medical Masterben található Léna-magyarázatok másodlagos klinikai adatforrások, ellenőrizetlen szakmai pontossággal.
- Hivatkozásoknak a küldött dokumentum-azonosítóhoz kell kapcsolódniuk, klinikai szaklektorálás még nincs.

## Megfelelési határ
CODED ≠ TESTED ≠ EDGE DEPLOYED ≠ LIVE OPENAI ANSWER VERIFIED ≠ USER ACCEPTED. A működő appot csak a két Golden Standard teszt után lehet módosítani. Nincs automatikus 6+1 frissítés a v710-ben.