# HealthHub v705 · Ask Léna AI-first Sol full-corpus preview

## Tulajdonosi alapelv
**Ami működik, ahhoz nem nyúlunk.** A smooth-endpoint-v395 és a napi Ask Léna változatlan.
Mérce: a Golden Standard Mónika-történet, az eredeti orvosi tényekkel összevetve.

## Működés
- Csak a ?hhSolQA=v1 URL-paraméter és részletes Ask Léna-kérdés mellett kapcsol be.
- Az aktuális kérdés előtt böngészőablakban külön, egyszeri jóváhagyást kér a kiválasztott profil ÖSSZES ellenőrzött szöveges leletének OpenAI API-feldolgozására. Elutasítás esetén nincs adatátadás.
- A Supabase Edge Function csak az azonosított felhasználó és a hh_profile_access jogosultsága után olvas leleteket.
- Forrás: hh_kb_documents és hh_kb_pages, kizárólag complete + verified + nem duplikált sorok. Mindegyik oldal teljes szövege; 650 000 karakter fölött fail closed, nincs rejtett csonkítás.
- Eredeti PDF-bájtok, képek, kizárt EKG-k nincsenek továbbítva.
- Modell: gpt-6.1-sol, OpenAI Responses API, high reasoning, store:false, 25k összesített (gondolkodási + látható) kimeneti token plafon.
- A modell egyetlen nagy kontextusú feldolgozásban készíti el a választ. A D1:p1 formájú idézett oldalkódok létezését a backend ellenőrzi, de ez NEM klinikai szaklektorálás.
- A meglévő hh_ask_lena_usage óránkénti limitet alkalmazza; új klinikai naplót nem készít.

## Első Golden Standard összehasonlítás
1. https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/?hhSolQA=v1
2. Bejelentkezés, Mónika profil, Ask Léna, részletes kutatás.
3. Kérdés: Mi történt Mónikával 2024. június 17-től a kórházi hazabocsátásáig?
4. Külön engedély a teljes ellenőrzött leletszövegre, ha az adatkör és API-költség elfogadható.
5. Ellenőrzés: június 24–28. és július 12–15. iratok, pontos időrend, orvosnevek, intézmények, laborok, források és tényleges eredmény.
6. Ha fontos tény vagy forrás téves, nincs élesítés.

## Állapot és rollback
CODED nem jelent TESTED, DEPLOYED nem jelent LIVE VERIFIED, és ez sem jelent USER ACCEPTED státuszt.
Rollback: URL-paraméter elhagyása; minden korábbi forrás- és modellútvonal változatlan.
Nincs automatikus orvosi szakvélemény, és a modell valós API-elérhetőségét csak hitelesített élő próba bizonyítja.

## Futásidő
A 125 másodperces modellhívási felső korlát figyelembe veszi a Supabase Free 150 másodperces worker-időkorlátját; dokumentumlekérés és hálózati késés is számít. A felhasználónak a külön Sol-útvonal a valós szerverhibakódot mutatja. Ez nem garantálja, hogy egy teljes nagy kontextusú válasz ennyi idő alatt elkészül.
