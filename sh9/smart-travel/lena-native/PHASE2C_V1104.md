# SH9 × Léna Native Search · Phase 2C v1104

**Státusz (2026-11-01): tesztelhető, elkülönített és nem fizetős prototípus. Nem éles AI-útvonaltervezés.**

## Most elkészült

- Smart Trip AI keresőmód: **🧪 Léna Native AI · előnézet**, csak külön kiválasztva aktív.
- A meglévő **✨ Léna · ChatGPT** maradt az alapértelmezett.
- Ismételt kézi JSON export helyett előkészített, hitelesített, profilhoz kötött adatátadás a már működő My Trips / TripPack v1 tárolóba.
- Supabase Edge Function: **hh-lena-native-search-preview**.
- Szerveroldali kötelező Supabase Auth getUser + hh_profile_access ellenőrzés, a mentési tábla RLS-jével.
- Csak a Google Routes közlekedési válaszából **szigorúan feldolgozott tényleges járat- és gyalogosszakaszok** léphetnek át a TripPack-be. A modelltől csak létező opció indexének kiválasztását engedjük, sem járatot, sem indulási időt nem generálhat.
- Forrás és szolgáltatói időpont nélküli route elutasítva. A gyaloglás becsült, az élő késés nem igazolt.
- Az automatikus felhőmentés megerősítést kér a DB-től, majd az egyedi útazonosító és TripPack alapján a helyi My Trips tárolót is frissíti és közvetlenül megnyitja a részletes Trip Flow-t.
- Klienskorlát: maximum 3 kézi keresés az adott oldal-munkamenetben, legalább 20 másodperc két kérés között.

## Biztonságos költségstop

A háttérszolgáltatásban jelenleg **ATOMIC_QUOTA_GUARD_READY=false**. Ez nem környezeti változó: a forráskódban rögzített kiadási zárolás.

Ennek következményei:
- A preview az auth- és profilszintű jogosultságot ellenőrzi, majd **source_not_ready** státusszal tér vissza.
- **Nincs tényleges Google Routes-hívás, nincs OpenAI API-hívás és nincs élő útitervmentés.**
- Még ha valaki bekapcsolja a routing- és billing-környezeti kapcsolókat, az engedélyezett atomikus költségkeret-lefoglalás nélkül nem indulhat fizetős hívás.
- Az éles, biztos szolgáltatói menetrendadat még nincs bekötve. A route feldolgozás offline fixtures és szimulált backend alapján ellenőrzött.
- A modell nincs közvetlenül összekötve a felhasználó ChatGPT-előfizetésével. Egy esetleges későbbi natív SH9 AI külön API-felhasználási költséget jelenthet.

## A fejlesztés részei

- **Supabase:** `supabase/functions/hh-lena-native-search-preview/index.ts`
- **Forrásvalidálás / rangsorolás:** `supabase/functions/hh-lena-native-search-preview/lena-native-core.mjs`
- **TripPack validálás:** `supabase/functions/hh-lena-handover-preview/trip-pack-core.mjs`
- **Frontend:** `sh9/smart-travel/public-transport/smart-trip/smart-trip-lena-native-v1104.js`
- **Smart Trip kereső:** `sh9/smart-travel/public-transport/smart-trip/smart-trip-ai-v1022.js`
- **Új keresőmód:** `sh9/smart-travel/public-transport/smart-trip/index.html`
- **QA:** `healthhub/tests/sh9-lena-native-search-v1104.test.mjs`
- **CI:** `.github/workflows/sh9-lena-native-v1104-search-qa.yml`

Tesztelési oldal:
https://zsoltandmonika-cloud.github.io/berlet-app/sh9/smart-travel/public-transport/smart-trip/?v=1104

## Ellenőrzések

- 5/5 offline útvonaladapter- és UI-regressziós teszt.
- 5/5 szimulált backend auth/profile/cost lock/GET security-teszt; nulla fizetős hívás a szimulációban.
- 5/5 ChatGPT-alapértelmezett keresés regressziós teszt.
- 19/19 My Trips archívum/értékelés regressziós teszt.
- Supabase Management API: az Edge Function ACTIVE és verify_jwt=true.

**Nem történt élő, user-JWT-s mobileszközteszt; nem állítható, hogy AI-útvonalat már automatikusan generál és ment.**

## Következő, élesítés előtti feltételek

1. **Forráslicenc és hivatalos menetrend:** a felhasználó által jóváhagyott, ellenőrzött, naprakész BKK/MÁV/Volán/Google Routes forrás(ok) és megfelelő költség-/felhasználási feltételek.
2. **Atomikus, szerveroldali kvóta- és költségkeret:** számlázási limitek, napszintű és személyenkénti keret, tranzakcióban rögzített helyfoglalás és hibás kérésre visszatérítés. A jelenlegi `ATOMIC_QUOTA_GUARD_READY=false` csak tesztelt mechanizmus után cserélhető.
3. API-kulcsok kizárólag Supabase Secretsben, környezethez kötött jogosultságokkal; személyes egészség- és GPS-adatok kizárása.
4. Menetrendi eltérések, éjfél és nyári időszámítás, távolsági átszállás, késések, meghiúsult provider-kérések és hiányos legs ellenőrzése.
5. Elkülönített tesztprofilból pozitív end-to-end teszt, kéttelefonos My Trips ellenőrzés; csak utána fokozatos élesítés.

**Rollback:** a `lena_native` mód választható; a `chatgpt` alapértelmezett, a `google` és `native` keresőfolyamat nem változott. A Supabase preview külön kikapcsolható, a család meglévő útitervei érintetlenek.
