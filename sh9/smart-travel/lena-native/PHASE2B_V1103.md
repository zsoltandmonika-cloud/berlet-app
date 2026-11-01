# SH9 × Léna Native Integration · Phase 2B v1103

**Dátum:** 2026-11-01

## Tényállás

- Az MCP-szolgáltatás kódja és egy **külön előnézeti Edge Function** elkészült.
- Telepített Supabase-funkció: `hh-lena-mcp-preview`, állapot: **ACTIVE v1**.
- Cím: https://vhsrupphzcjkdrusonzh.supabase.co/functions/v1/hh-lena-mcp-preview
- A Supabase Edge function `verify_jwt=false` a nyilvánosan olvasható MCP inicializálás és OAuth discovery miatt; **a `tools/call` POST saját, kötelező JWT + scope + audience + client-id + profiljogosultság ellenőrzést végez**.
- **Nincs OAuth kliens engedélyezve**, és `HH_LENA_MCP_WRITE_ENABLED` alapértelmezés szerint hamis. Éles útiterveket a v1103 nem ment.
- A `sh9.trip-pack/1` validátor és a meglévő `hh_my_trip_packs` RLS-tábla újrahasznosított.
- A `v1100` My Trips frontend érintetlen maradt.

## MCP

- Streamable HTTP JSON-RPC: `initialize`, `ping`, `tools/list`, `tools/call`.
- Egyetlen írási eszköz: `save_trip_pack` (schema: sh9.lena-handover/1; requestId; profile; tripPack).
- `GET /.well-known/oauth-protected-resource`: védett erőforrás metaadatai.
- Jogosulatlan toolhívás: **401** és `WWW-Authenticate: Bearer resource_metadata="..."`.
- Szigorú ellenőrzések: Supabase Auth `getUser`, a JWT `iss`/`sub`/`exp`/`iat`/`aud`/`client_id`/`scope` adatai, `hh_profile_access`, végül a tábla RLS.
- Szerveroldali `HH_LENA_MCP_ALLOWED_CLIENT_IDS` üres → minden írás megtagadva.
- Szerveroldali `HH_LENA_MCP_AUDIENCE` hiányzik → minden írás megtagadva.
- `HH_LENA_MCP_WRITE_ENABLED` hiányzik vagy nem `true` → nincs mentés.
- Idempotens `trip_id`, tartalmi ütközés tiltása, meglévő értékelés és követés védelme.

## Nyitott blokkolók a *valódi*, végponttól végpontig kapcsolathoz

1. **ChatGPT Plus**: az OpenAI 2026-11-01-én ellenőrzött súgója szerint az egyedi, írási jogosultságú MCP-integráció teljes lehetősége Business és Enterprise/Edu felhasználókra korlátozott. Plus-on erre nem lehet építeni.
2. **Supabase OAuth-scope-ok**: a beépített OAuth authorization server egyelőre `openid`, `email`, `profile`, `phone` scope-okat támogat. A kívánt `trip.write` scope nem standard, és kliens-regisztrációt/kiadott tokeneket érintő külön beállítást vagy más OAuth-szervert igényel.
3. **Resource-bound JWT audience**: a MCP szabvány (RFC 8707) erőforráshoz kötött access tokent követel. A Supabase OAuth esetén az `aud` alapértelmezés szerint `authenticated`; a Supabase dokumentál Custom Access Token Hook támogatást a klienshez rendelt `aud` egyedi beállítására. **Ezt a hookot nem telepítettük és nem állítottuk be**.
4. **Felhasználói csatlakoztatás és jóváhagyás**: a ChatGPT app csatlakoztatását a felhasználó/worspace admin végzi; ilyen még nem történt.
5. **Valódi éles hálózati teszt**: csak V8 szimulált tesztek és management API telepítés-/státusz-visszaigazolás történt. Ezt nem helyettesíti élő, OAuth-profilhoz kötött `tools/call` teszt.

**Nem szabad** pusztán `aud=authenticated` és alap household Supabase JWT elfogadásával megkerülni az audience-kötést. Nem kapcsolható be az írás sem azért, hogy „egyszerűen működjön”.

## Tesztek

- V8 izolált MCP teszt: 9/9 sikeres: protocol initialize, tool listing, jogosulatlan HTTP 401, hibás scope/audience elutasítása, száraz futtatás, szintetikus mentés, idempotens retry és profiltiltás.
- Repo QA: `healthhub/tests/sh9-lena-mcp-v1103.test.mjs`
- GitHub Actions: `.github/workflows/sh9-lena-native-v1103-mcp-qa.yml`
- Management API státusz: `ACTIVE` v1; éles, felhasználói OAuth toolhívás nincs ellenőrizve.

## Javasolt Plus-kompatibilis út

**SH9-native Léna AI Search**: az SH9 böngészőben már bejelentkezett Supabase-felhasználóval, kizárólag szerveroldalon tartott OpenAI API-kulccsal keres/tervez, ellenőrzött BKK/MÁV/Volán forrásadatok alapján, és az SH9 belső validátorával egy lépésben menti az eredmény TripPack-et a My Tripsbe. A menetrendi forrás és költségkeret nélkül az AI nem kaphat kitalált indulási időket, és fizetős API-hívások nem aktiválhatók előzetes költségkontroll nélkül.

Ezzel a felhasználói folyamat: **SH9 Search → Léna AI → TripPack → My Trips**. A ChatGPT chatből történő MCP auto-handover ettől elkülönített, későbbi opció.

## Hivatkozások

- https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt
- https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/basic/authorization.mdx
- https://supabase.com/docs/guides/auth/oauth-server/oauth-flows
- https://supabase.com/docs/guides/auth/oauth-server/token-security
- https://github.com/supabase/auth/issues/2610

**Rollback:** a v1103 csak új izolált fájlokat és egy külön Edge Function-t adott hozzá; a meglévő SH9 nincs rákötve. Az írás alapból tiltott.
