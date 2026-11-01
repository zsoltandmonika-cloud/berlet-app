# SH9 × Léna Native Integration · Phase 2A v1102

**Állapot:** izolált, Supabase-en aktív Edge Function; minden adatírás alapértelmezés szerint **KIKAPCSOLVA**. A ChatGPT OAuth-os MCP-kapcsolat még **NEM** készült el. A v1100, a My Trips UI és a beállított családi adatok nem módosultak.

## Telepített szolgáltatás

- Projekt: HealthHub-Core, project id: vhsrupphzcjkdrusonzh
- Function: hh-lena-handover-preview
- HTTPS: https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-lena-handover-preview
- Edge Function status: ACTIVE, version 1, verify_jwt=true (Supabase management API ellenőrizte)
- Szerveroldali írásflag: HH_LENA_HANDOVER_PREVIEW_WRITE_ENABLED, alapértelmezés: false
- Kód: supabase/functions/hh-lena-handover-preview/index.ts
- Pure validator modules: trip-pack-core.mjs és handover-core.mjs
- QA: healthhub/tests/sh9-lena-handover-preview-v1102.test.mjs és a saját GitHub Actions workflow

## API

Az API belső tesztelésre való, **nem** MCP-végpont, és egyelőre kizárólag érvényes Supabase Auth **user JWT**-t fogad el. Másfajta token, anon-, admin- vagy ChatGPT-token nem kerül elfogadásra. A gateway és a kiszolgáló is ellenőriz.

- GET: bejelentkezett státusz: preview_ready / dry_run / mcpOAuth=false
- POST JSON: sh9.lena-handover/1 envelope: schema, requestId UUID, profile m vagy z, tripPack sh9.trip-pack/1
- Az importellenőrzés az eredeti SH9 TripPack v1078 normalizáló parserének változatát használja.
- Jogosultság: auth.getUser(jwt) + hh_profile_access.user_id=auth.uid() + megfelelő profil; írás esetén a hh_my_trip_packs RLS is kötelező.
- Ha az írásflag hamis, a válasz validated_dry_run / saved=false, adatbázis-írás nincs.
- Ha egyszer bekapcsolják, az első mentés saved; ugyanazon requestId és útvonal újrahívása already_saved; ugyanazon requestId mellett módosított útvonal 409 Conflict. Korábbi rating és tracking metaadatot retry nem töröl.
- Minden hiba esetén fail closed; nem írhat profilt hozzáférés nélkül.

## Biztonsági tiltások

- Nem tárolunk service_role kulcsot vagy OpenAI API-kulcsot a frontendben.
- Nincs anonim mentés, profilváltással történő jogosultságkikerülés, háttérírás, időzített polling vagy privát jegyfájlokhoz való hozzáférés.
- A JSON max. 64 KB, és csak a megengedett envelope mezők fogadhatók el.
- A CORS az eredeti SH9 GitHub Pages origint engedi.
- A POST-nak érvényes user JWT szükséges, nem elég a frontend publishable API key.
- Az adatírás kapcsolót **nem** szabad OAuth és végponttól-végpontig QA nélkül bekapcsolni.

## QA és verifikáció

- 9/9 lokális, függőség nélküli integrációs próbateszt a beépített API-logikával: auth elutasítás, profiltévesztés, dry-run, 201 mentés, retry, ütközés 409, invalid route 422, státusz.
- Az aktív Edge Function telepítés tényét a Supabase management API igazolja (version 1, verify_jwt true).
- Hálózatról való valódi, érvényes felhasználói tokenes HTTP-teszt **még nincs elvégezve**; ezt nem szabad késznek jelenteni. Nem helyettesíthető a szintetikus teszttel.

## Következő lépés: Phase 2B

1. OAuth 2.1 + PKCE authorization server (client identity, audience, scopes, issuer, token endpoint, well-known metadata, RFC 9728 protected resource metadata).
2. Távoli **Streamable HTTP MCP** tool server: save_trip_pack. Jól definiált bemenet, visszajelzés, hibák; ChatGPT csatlakoztatás és felhasználói hozzáférés-jóváhagyás.
3. OAuth subject ↔ Supabase Auth user_id ellenőrzött összerendelése. A MCP gateway csak a ténylegesen engedélyezett profilt írhatja, nem adhat át pusztán admin-kulcsot.
4. End-to-end teszt valódi ChatGPT Léna tool-callból a My Trips archívumig, JSON letöltése nélkül. Pozitív és negatív tesztek, menetrendi forrásellenőrzéssel.
5. Csak sikeres tesztek után a fokozatos, rollbackképes élesítés.

**Források:**
- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/build/auth
- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/api/securing-your-api

**Rollback:** az izolált hh-lena-handover-preview Edge Function bármikor letiltható; a v1100 UI és meglévő útitervek nem függnek tőle.
