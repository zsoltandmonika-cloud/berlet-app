# Cookbook – Puter-független AI pilot

Állapot: forráskód-pilot, NEM élesítve. Az eredeti Cookbook, a mentett receptek és a HealthHub adattár változatlanok.

A Cloudflare Workers AI Free csomagja napi 10 000 Neurons keretet kínál. A teszt kizárólag igazolt Free csomaggal indulhat; fizetős csomag és automatikus fizetős fallback nincs jóváhagyva.

## Szerveroldali előfeltételek
A Cloudflare dashboard Workers AI / Use REST API felületén Account ID és kizárólag a szükséges Workers AI jogosultságú API token. Ezeket a HealthHub-Core Edge Function Secrets felületére kell helyezni COOKBOOK_CF_ACCOUNT_ID és COOKBOOK_CF_API_TOKEN néven. Sem titok a GitHubban, sem böngészőben, sem chatben. A COOKBOOK_AI_PILOT_ENABLED és COOKBOOK_CF_FREE_PLAN_CONFIRMED változók alapértelmezésben ne legyenek true értékűek.

A tesztelés előtt ellenőrizendő: családi JWT és RLS, jogosulatlan kérés elutasítása, tartós kérés- és költségkorlát, szerveroldali titkok, kép-adatvédelem, modell tényleges API válasza, Free csomag. Csak ezután engedélyezhető az elkülönített pilot; a teljes Cookbook élesítése külön jóváhagyás és regressziós teszt után.

## Elfogadási kritériumok
- Receptjavaslat és finomítás: magyar, érvényes recept JSON, pontos hozzávalók és adagok.
- Hűtő- és receptkártyafotó: képelemzés, bizonytalanság jelölése, felhasználói képjóváhagyás.
- Ételfotó és lépésillusztráció: valós képgenerálás és eredeti kártyaformátum.
- Nutri Info, ötletgenerálás, tömeges feldolgozás: külön provider-hívás, nincs Puter login/kvóta kapu.
- Saját tárhely, helyi mentés, meglévő receptek és főzési mód változatlan.
- A régi Puter-adatok olvasási/migrációs útja megmarad, amíg az átvétel nincs teljesen igazolva.
- Ingyenes keret elfogyásakor egyértelmű üzenet, nincs újabb fizetős hívás; helyi receptek továbbra is működnek.
- A pilotban a Cloudflare-válaszok formátumának alaptesztje megtörtént mock adatokkal. Valódi AI-hívás még nem történt.

Hivatalos források:
https://developers.cloudflare.com/workers-ai/get-started/rest-api/
https://developers.cloudflare.com/workers-ai/platform/pricing/
https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/
https://developers.cloudflare.com/workers-ai/models/flux-2-klein-9b/
