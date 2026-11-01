# SH9 × ChatGPT Léna · Native Integration

## Phase 1 / v1101 · validált, izolált adatátadási alap

**Státusz 2026-11-01:** a TripPack-handover szerződés és az offline biztonsági tesztek elkészültek. Az éles SH9 v1100-at ez a fázis nem módosítja.

**Nem éles:** jelenleg nincs hitelesített, telepített MCP-szerver és nincs ChatGPT-plugin összekapcsolás. A JSON nélküli natív adatküldés még nem aktív.

### Felhasználói cél

1. SH9-ben útvonal keresése.
2. Léna ellenőrzött menetrendi források alapján összeállítja az útitervet, és az eredeti sh9.trip-pack/1 objektumot.
3. A csatlakoztatott, hitelesített SH9 MCP-tool közvetlenül elküldi a TripPack-et az engedélyezett családi profil privát felhőarchívumába.
4. A My Trips oldalt megnyitva a meglévő Supabase-sync letölti az új utat. Nincs fájlletöltés, másolás, kézi JSON-import.
5. Jegyek, útiterv, követés, értékelés és archívum változatlanul a meglévő SH9-ban maradnak.

Az **első plugin-telepítés és OAuth-hozzáférési engedély** a felhasználó művelete. Később is előfordulhat ChatGPT tool-híváshoz kapcsolódó jóváhagyás. A zero-click követelmény az ismétlődő manuális JSON-kezelés megszüntetését jelenti.

### Élő rendszer ellenőrzése

- public.hh_my_trip_packs: a létező mentett útitervtábla.
- trip_data: JSONB, RLS aktív, 4 authenticated jogosultsági policy.
- Auth-mapping: public.hh_profile_access családi profil-jogosultság.
- SH9 kliens: my-trips-cloud-v1086.js; adatvalidálás: smart-trip-pack-v1078.js.
- A v1101 alatt nem történt adatbázis-írás, migráció, új Edge Function deploy vagy éles kliensbekötés.

### ChatGPT MCP tool (terv): save_trip_pack

Bemenet: {schema: "sh9.lena-handover/1", requestId: "UUID", profile: "m" vagy "z", tripPack: {schema: "sh9.trip-pack/1", ...}}.

A requestId egyszer használatos UUID. Az összes bemeneti adat legfeljebb 64 KB. Az SH9 meglévő normalizálója ellenőrzi a valódi TripPack tartalmat. A profile mező **csak a kért cél**: a szerver önállóan köteles ellenőrizni, hogy a bejelentkezett családtag írhat-e arra a profilra.

### Kötelező élesítési védelmek

1. ChatGPT egyedi távoli MCP-plugin OAuth 2.1 authorization-code + PKCE hitelesítéssel és jogosultsági scope-pal (trip.write). Token ellenőrzés minden hívásnál: issuer, audience, expiry, scopes. Használjunk bevált OAuth-szolgáltatót, ne barkácsoljunk jelszókezelést.
2. A szerveren a tokenhez kötött felhasználói identitás azonosítása és explicit hozzáférésellenőrzés a hh_profile_access táblában. A modell által küldött profil nem tekinthető engedélynek.
3. Nem kerül admin/service-role kulcs GitHub Pages-be, ChatGPT promptba vagy kliensoldali JS-be. A backend szükséges jogosultságait csak szigorú tagságellenőrzés után alkalmazzuk.
4. Azonos kérés azonos útitervvel idempotens: trip_id = tp-lena-{UUID-kötőjelek-nélkül}. Ugyanaz az UUID és eltérő útvonal esetén 409 Conflict; retry nem írhatja felül a későbbi jegy-, követés- vagy rating-metaadatokat.
5. Limits: méret, rate limit, tulajdonos, teljes validáció, strukturált audit, fail closed és visszagörgethetőség.
6. Az eredeti, AI által megadott status=timetable csak AI-állítás, önmagában nem ellenőrzött menetrend. Járatokat, időpontokat és követési URL-t nem találgatunk.
7. Csak trip.write MVP scope. GPS, egészségügyi leletek, jegyfájlok, törlés és family-admin hozzáférés nem része ennek a toolnak.

### Fejlesztési fájlok / ellenőrzés

- handover-contract-v1101.js: független szerződésvalidálás, profile authorization guard és idempotencia.
- healthhub/tests/sh9-lena-native-contract-v1101.test.cjs: 7 off-line teszt.
- .github/workflows/sh9-lena-native-v1101-qa.yml: külön GitHub CI a szerződéshez.

### Következő mérföldkövek

**Phase 2:** védett OAuth-támogatású MCP backend, egyszeri felhasználói plugin-csatlakoztatás, próbaútvonal hozzáadása valós menetrend állítása nélkül. Az adat automatikus megjelenése a My Tripsben, jogosulatlan profilírás elutasítása, retry és rollback tesztje.

**Phase 3:** AI Search élő menetrendi ellenőrzéssel, beérkezési értesítés, kétirányú lekérdezés. Ezek nem készek.

### Ellenőrzött dokumentáció (2026-11-01)

- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/quickstart
- https://supabase.com/docs/guides/api/securing-your-api

**Rollback:** a v1101 csak új, izolált forrásokat tartalmaz. Éles SH9 / My Trips és Supabase-változtatás nincs.
