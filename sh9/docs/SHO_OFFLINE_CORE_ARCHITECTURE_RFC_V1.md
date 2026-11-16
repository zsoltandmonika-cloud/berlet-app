# SHO Offline Core • Architecture RFC v1.0 (DRAFT)
**Dátum:** 2026-11-16  
**Státusz:** Kizárólag tervezés. Éles rendszerhez NEM nyúlunk, amíg a teljes helyreállítható mentés nincs ellenőrizve.  
**Bázis-commit:** `812c23a0cbb124263c9e02836a93f8bf5814191b`  
**Kód mentési ág:** `backup/sho-pre-offline-core-2026-11-16`  
**Tervezési ág:** `design/sho-offline-core-architecture-rfc-2026-11-16`

## 1. Vezetői döntés
A projekt célja nem több, egymástól független offline sziget létrehozása. Egy **központi, modulonként engedélyezhető Offline Core** készülne, amely először a hiteles, frissességi címkével ellátott helyi adatot jeleníti meg; a felhőt aszinkron frissítésre és összefésülésre használja.

**Nincs big-bang átállás.** A jelenlegi live-only mód marad elérhető a feature flag mögött. A telepített Book Studio V21 is működik a maga scope-ján; csak validálás után mérlegeljük a közösítését.

**Meglévő infrastruktúra**: a `sh9/sw.js` network-first shell-je a /sh9/ scope-ban, a `book-studio/offline-reader-sw-v21.js` külön szűk scope-ban dolgozik. A kettő összekötése során nem engedhető meg Service Worker ütközés, cache-szennyeződés vagy régi UI tartós beragadása. **Ne bővítsük át a root Service Worker fetch interceptjét minden modulra!**

## 2. Előfeltétel: visszaállítható Golden Backup, GO/NO-GO kapu

| Mentési réteg | Követelmény | Mostani állapot |
|---|---|---|
| Teljes forráskód | main SHA rögzítése, izolált backup branch; ellenőrzött visszaállítás | **ELKÉSZÜLT** (GitHub branch + commit) |
| GitHub Actions / build | Aktuális munkafolyamatok, telepítési útvonalak, roll-back commit és runbook | **NINCS MÉG HITELT ÉRDEMLŐ RESTORE PRÓBA** |
| Supabase adatbázis | teljes schema + roles + data dump vagy platform backup/PITR; teszt restore **új, izolált** környezetben; RLS/migrációk ellenőrzése | **NINCS ELLENŐRZÖTT EXPORT / RESTORE** |
| Storage | Objektumok tényleges bájtjai + metadata, checksum, visszatöltési próba | **NINCS ELLENŐRZÖTT EXPORT / RESTORE** |
| Edge Functions / config | Verziók és forrás, kapcsolódó konfigurációk; titkok külön titkosított trezorban, **soha GitHubban** | **FELMÉRÉS SZÜKSÉGES** |
| Samsung telefon | mindkét SHO-profil jelenlegi offline IndexedDB, Cache Storage, releváns helyi beállítások visszaállítási tervvel | **FELMÉRÉS SZÜKSÉGES** |
| OneDrive/Outlook | Csatlakozási állapot és referenciafájlok listája, jogosultságok; a fájlokat nem mozgatjuk | **FELMÉRÉS SZÜKSÉGES** |

**Read-only baseline:** HealthHub-Core Supabase aktív. 57 public tábla, 6 Storage bucket, 193 Storage objektum és 23 Edge Function szerepel a 2026-11-16-i leltárban. Ezek **csak leltáradatok**, nem jelentenek mentést. A szolgáltatói database backup **nem tartalmazza** a Storage API objektumok tényleges bájtjait. A teljes mentést külön ellenőrizni kell. A tárolási export nem tartalmazhat publikusan hozzáférhető személyes/egészségügyi anyagokat.

**GO kizárólag akkor:**
- dokumentált SHA és kód restore;
- adatbázis backup frissessége, ellenőrzött izolált restore;
- Storage-bájtok és metadata konzisztens export, ellenőrzött minta-restore;
- azonosított titkok és OAuth visszacsatlakoztatás, titkok export nélkül;
- mindkét telefon és profil kritikus adatai: helyreállítási terv;
- alap regressziós / smoke tesztek lefutnak vagy meglévő hibák „ismert baseline”-ként dokumentáltak;
- rollback tulajdonosa, sorrendje és adatvesztési kockázata írásban.

**STOP:** bármelyik kötelező mentési réteg hiányzik; RLS, auth vagy fájlhozzáférés tisztázatlan; a Book Studio V21 repülőmódos próba hibás; vagy nem ismert, hogy a kliens hogyan dolgozza fel a régi cache-adatokat.

## 3. Célarchitektúra

```text
                         SHO Modulok
 Smart Trip | Shopping | Recept | Entertainment | Naptár | ...
                            |
                       Offline Core
   (feature flags, cache interface, index, TTL, profile partition)
               /                      \
  IndexedDB (meta + local ops)      Cache Storage (csak statikus)
               |                      |
      Sync Engine (online, visible, manual, retry, idempotency)
               |
  Supabase / MS Graph / BKK GTFS / más hiteles források
```

### Kötelező interfész és viselkedés
- `getSnapshot(module, profile)`: helyi, biztonságosan címkézett adatot azonnal visszaad; nincs blokkoló OAuth.
- `refresh(module, profile)`: ETag/since/last-modified/időablak alapú delta frissítés a modul képességei szerint.
- `mutate(module, profile, op)`: lokális művelet tranzakcióban + tartós outbox + opcionális optimistic UI; sync után ack.
- `getFreshness(module, resource)`: `live`, `cached`, `stale`, `offline`, `unavailable` állapot, utolsó hiteles frissítés idejével.
- `clearProfile(profile)`: profilhoz tartozó állományok és jogosultsági scope biztonságos leválasztása; szükség szerint outbox védőprompt.
- `inspectStorage()`: kvóta, pinned vs evictable, becsült használat és azonosított mentetlen változások.

### Technikai szabályok
1. **Partition:** fiók + személy/profil + modul + schema-version. Cross-profile adat nem jelenhet meg.
2. **Nincs titok cache-ben:** Graph token, refresh token, signed URL, service_role, egészségügyi irat nem kerülhet közös Service Worker cache-be.
3. **Nincs biztonsági könnyítés:** Supabase RLS és a forrásrendszer auth ellenőrzése változatlan.
4. **Frissesség:** BKK Live, GPS, ár, készlet és napi változó információ jelölve; stale adatból nem képezhető megbízható élő állítás.
5. **Outbox:** stabil operation-id, idempotencia, monotonic version, base revision, konfliktuskezelés; nem lehet kettős vásárlás vagy elveszett könyvjelző.
6. **Web platform:** Background Sync nem garantált Android Samsung Internet/Edge böngészőben. Online + visibility + user-trigger + időzített retry alap, Background Sync csak opcionális.
7. **Korlátok:** részleges letöltés, kvótafigyelés, opcionális Wi-Fi only, pinned adat nem eviktálható az alkalmazás által; a böngésző továbbra is törölheti az oldaladatait.
8. **Verzióváltás:** IDB migráció kompatibilis előző két sémával; csak expand/migrate/contract; soha automatikus delete-all/unregister-all.
9. **Központi SW:** kezdetben nem bolygatjuk `sh9/sw.js`-t vagy a Book Studio külön workerét. Későbbi SW közösítés kizárólag izolált sémával és rollback-ellenőrzéssel.
10. **Telemetria:** P50/P95 megjelenés, local-hit, sync backlog, conflict/error, quota; ne írjon érzékeny payloadot logba.

## 4. Modulonkénti bevezetés

| Hullám | Modul | Offline adat | Marad élő |
|---|---|---|---|
| Pilot A | Smart Trip | kedvenc célpont, mentett séma, előre letöltött offline menetrend | BKK Live késés, valós indulási idő, élő GPS |
| Pilot B | Shopping | bevásárlólista, kedvencek, alap termékkártyák | ár, készlet, valós megrendelés / checkout |
| Bővítés | Entertainment | képek, film/sorozat meta és ajánlók frissességcímkével | új premier/tartalom és streaming elérhetőség |
| Bővítés | Receptek / Interfood | receptek, napló előnézet, képek | friss Interfood étlap / rendelés / előfizetés |
| Később | Naptár | olvasható cache, esetleges outbox külön jóváhagyással | szervezői módosítás, meghívás, szabad/foglalt |
| Külön biztonsági RFC | HealthHub / Smart Valet | **alapból nincs érzékeny offline adattárolás** | egészségügyi iratok, igazolványok, titkosított rekordok |
| Külön | Family Guard | térképcsempe, korábbi ismert állapot frissességi figyelmeztetéssel | élő helyzet, place alerts |

## 5. Teljesítménymérés és elfogadás

A célértékeket a telefonok valódi Samsung Internet és Edge böngészőjében, online, lassú mobilhálózaton, repülőmódban, hideg-meleg cache mellett kell mérni. Minden eredmény P50 és P95 bontásban, modulonként és profilonként.

| KPI | Pilot cél | Stop/rollback |
|---|---|---|
| Helyi polc/lista első hasznos rajz | P50 < 500 ms; P95 < 1.5 s | regresszió > 20% baseline-hoz |
| Offline első hasznos rajz | P95 < 2 s | modul nem nyílik repülőmódban |
| Mutáció / helyi ack | < 150 ms | elveszett művelet |
| Felhő szinkron | kapcsolat visszatértével automatikus, állapotlátható | duplikált rendelés/törlés |
| Profilizoláció | 0 cross-profile adat, 0 auth bypass | azonnali rollout stop |
| Cache életciklus | update után új assetek; nincs stale UI loop | azonnali flag-off/rollback |

## 6. Végrehajtási hullámok és Go/No-Go

**Fázis 0 – baseline és mentés**: csak felmérés, snapshot és restore-próba. Semmi éles migráció.

**Fázis 1 – core v0 izolált laborban**: verziózott IndexedDB adapter, adapter-API, TTL, outbox, cache policy, profile switch és telemetria; csak fixture-tesztekkel, éles backend write nélkül.

**Fázis 2 – Smart Trip pilot**: csak kedvencek/mentett sémák olvasási cache-e, két telefonnál külön opt-in; utána offline menetrend, BKK Live jelölés. Feature flag kikapcsolható.

**Fázis 3 – Shopping pilot**: lokális lista + sync outbox, konfliktuskezelés; **checkout, rendelés, ár és készlet továbbra is online**, idempotency nélkül nem engedjük az automatikus szinkronos vásárlást.

**Fázis 4 – többi nem érzékeny modul**: modulonként, mért kockázat alapján.

**Fázis 5 – biztonsági RFC**: HealthHub/Smart Valet csak külön adatvédelmi és titkosítási tervvel; Family Guard GPS realtime működés érintetlen.

## 7. Rollback
- Minden modul mögött **független feature flag**: offline read/sync kikapcsolás anélkül, hogy a helyi adatot rögtön törölnénk.
- Visszatérés a bázis-code commitra / ismert működő deploymentre.
- Az outbox és az unsynced műveletek maradnak biztonságosan zárolva, nem vész el a felhasználói módosítás. Szándékos törléshez külön értesítés.
- Adatbázis migráció kizárólag visszafelé kompatibilis; visszaállítást előbb izolált környezetben próbálni.
- Service Worker verzióváltáskor ne töröljünk más modul által tulajdonolt cache-t vagy meglévő OTP/egyéb munkamenetet.

## 8. Döntések / nyitott kockázatok
- **Nem lesz egyetlen mindent cache-elő PWA.** Az egyes modulok adatvédelme és frissessége eltér.
- **Nincs a tervben új fizetős Supabase dev branch** előzetes költségellenőrzés és jóváhagyás nélkül.
- **A jelenlegi Book Studio V21 offline elsőnek még élő repülőmódos QA-t kell teljesítenie**; a GitHub tesztek önmagukban ezt nem igazolják.
- Supabase projekt fizikailag rendelkezésre álló mentésének, letölthetőségének és visszaállítási útjának státusza külön ellenőrizendő.
- PWA CI meglévő, nem Book Studio-specifikus hibáit baseline-ként dokumentálni kell.
- Egészségügyi / személyazonosító adatokhoz nem teszünk offline cleartext gyorsítótárat.

**Aktuális fejlesztési szabály:** Ez a tervezet *nem production-change authorization*. A backup gate és a két S24-es valós teszt nélkül nem indul központi élesítés.
