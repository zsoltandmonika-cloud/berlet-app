# HealthHub Connect · automatikus háttérszinkron E2E audit
**Dátum:** 2026-10-13 · **Állapot:** kód- és kiadásaudit kész, fizikai kéttelefonos E2E-teszt hátravan

## Cél és biztonsági korlát
A HealthHub Sleep v433 éles nézete után igazolni, hogy a két felhasználó telefonján **a kézi SYNC NOW nélkül** frissülő Health Connect-mérések eljutnak a telefon tulajdonosának Dropbox Vault fájljába, majd megjelennek a webes HealthHubban.

**Ezen audit során:** nincs új APK telepítés, nincs engedély-/profilváltoztatás, nincs Dropbox-fájl felülírás, nincs telefonos beavatkozás, nincs a működő HealthHub Connect eltávolítása. A Samsung Thin TEST és a HealthHub Health TEST külön maradnak.

## Forráskódban igazolt architektúra
| Komponens | Forrásfájl | Ellenőrzött működés | Bizonyítási korlát |
| --- | --- | --- | --- |
| Resilient Self-Healing | `ResilientHealthSync.kt` | WorkManager 3 órás periódus, hálózathoz kötött, exponential retry, 20 perces duplikációvédelem, saját telefon-owner profil, Health Connect háttérolvasási engedély és Dropbox refresh token kötelező | Nem igazolt, hogy a két telepített példányon van háttérolvasási engedély, vagy a worker ténylegesen lefutott |
| Scheduled Sync | `SyncScheduler.kt` + `ScheduledSyncWorker.kt` | Opcionálisan kapcsolható be; napi időpontok, 24 órás WorkManager periódus, utolsó `last_auto_sync_ms` és `last_auto_sync_error` | Nem garantál pontos órát. A `scheduleAll` az app indításakor `cancelAllWorkByTag`-et hív és újra létrehozza a munkákat, amely gyakori indítás esetén megváltoztathatja az eredeti időzítést |
| Central Orchestrator | `OrchestratorScheduler.kt` + `OrchestratorWorker.kt` | Kb. 15 perces parancsfigyelés, profilhoz kötött health sync csak megfelelő command scope/owner esetén, Dropbox device heartbeat és parancsstátusz | Ez nem ugyanaz, mint a Self-Healing önálló futása |
| Manual SYNC NOW | `MainActivity.kt` | Health Connect export, Dropbox felülírás, státusz, opcionális böngésző-megnyitás | A kézi siker **nem** bizonyítja az automatikus háttérfutást |
| Canonical Vault | `DropboxVaultClient.kt` | `/HealthHub/profiles/<owner>-health-connect.json`, token refresh, HTTP hibaellenőrzés | A meglévő fájl frissességét élő feltöltés után szükséges bizonyítani |
| Sleep v433 web | `live-v170.js` | A kiválasztott profil kanonikus Dropbox health-connect.json adatait preferálja, elutasítja az eltérő profiljelölést | Webes nézet frissülése és a natív feltöltés két külön ellenőrzési pont |

## Elsődleges auditleletek
1. **Az auto háttérszinkron forráskódja már elkészült**. A hiányzó bizonyíték a két fizikai telefonon mért, különválasztott sikeres háttérfutás.
2. **Futástípus-összemosódás:** `ResilientHealthSync.KEY_LAST_SUCCESS` mezőt a Resilient worker, a kézi `MainActivity.exportAndUpload()` és az Orchestrator health command is frissíti. A `Self-Healing` státusz zöld időpontja önmagában nem bizonyítja a háromórás worker működését.
3. **Külön Scheduled Sync hibaág:** ha nincs rögzített owner vagy refresh token, a `ScheduledSyncWorker` `Result.success()`-szal is kiléphet; hibát csak részben jelöl. Érdemes a futás forrását/eredményét külön naplózni az élesítés előtt.
4. **Háttérengedély kritikus:** a Self-Healing külön ellenőrzi `PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND` jelenlétét. A Scheduled Sync kapcsolóján keresztül kérhető engedély; Self-Healing alapértelmezett BE állapota önmagában nem ad Android engedélyt.
5. **Ütemezés/duplikáció:** Self-Healing és Scheduled Sync külön WorkManager munka, Orchestrator és SYNC NOW is felülírhatja ugyanazt a profilos JSON-t. Ez ellenőrzött státusz- és forrásspecifikus futásnapló nélkül nehezen auditálható.
6. **Kiadási csatorna:** GitHubon van aláírt `HealthHub Connect v0.14.0` OTA és hozzá SHA-256 manifeszt, de a jelenlegi `bridge-ota.json` **csak a zsolt** rolloutProfilt tartalmazza. Ebből **nem** következik, hogy az APK akár Zsolt, akár Mónika telefonján telepítve van.
7. **Samsung direct SDK:** a `SAMSUNG_HEALTH_DATA_SDK.md` alapján a közvetlen Samsung SDK olvasó nem része a produkciós HealthHub Connect APK-nak; a meglévő Health Connect útvonalat nem szabad a Samsung Thin TEST állapotával összekeverni.

## Elfogadási kapuk
### 0. Telefonon, változtatás nélkül
Mindkét készüléken: HealthHub Connect megnyitása, `Telefon tulajdonosa`, `Self-Healing BE/KI` pillanatnyi státusz, `Automatikus sync` státusz/időpontok, `last` és esetleges hibaüzenet leolvasása, valamint alkalmazásverzió megállapítása. A felhasználó csak képernyőképet küld, nem oszt meg Dropbox tokent, Google hozzáférést vagy személyes mérési adatokat.

### 1. Első önálló futás
Kézi `SYNC NOW` és webes manuális feltöltés nélkül: a háttérfutás időpontja és **futástípusa** rögzítve; feltöltési siker ellenőrzött; a feltöltött JSON `profile` és `exportedAt` helyes, és a releváns mért rekordok minősége ellenőrzött. Nem elég a fájl időbélyege vagy egy zöld pipa.

### 2. Második, különálló önálló futás
Újabb, időben elkülönülő sikert kell igazolni ugyanazon a telefonon, kézi indítás nélkül. A WorkManager futtatás csúszhat, ezért a beállított órát nem szabad másodpercpontos garanciaként kezelni.

### 3. Mindkét profil és web
A fenti két futás **külön Zsolt és külön Mónika telefonján** igazolt; mindkét felhasználó csak a saját profilos fájlját írja, a webes Sleep ugyanannak a profilnak az új rekordját jeleníti meg; nincs profilkeresztezés, adatduplikáció vagy null rekorddal történő felülírás.

### 4. Hibatűrés
Elérhetetlen hálózat után WorkManager retry / recovery; lejárt access token után refresh; elutasított háttér Health Connect-engedélynél pontos `needs action` jelzés; korábbi Dropbox-mérés nem veszhet el.

## Következő technikai változtatás javaslata, **nem végrehajtva**
- Append-only, alacsony adatérzékenységű eszközön belüli eseménylista: `startedAt`, `finishedAt`, `source` [manual, self-healing, scheduled, orchestrator], `outcome` [success, retry, user-action], anonim/profilkód, adatnapot jelölő legfrissebb mérési idő és exportrekord-szám. Ne tároljon egészségügyi numerikus értékeket vagy tokeneket a logban.
- A Scheduled Sync újraütemezését idempotenssé tenni: WorkManager KEEP/UPDATE csak indokolt esetben; időzóna- és óraátállítási viselkedés expliciten tesztelve.
- UI diagnosztika: külön `Kézi siker`, `Önálló háttérsiker` és `Utolsó próbálkozás` mezők; az élesítési státusz csak háttérsikerből képezhető.
- Egyszerre **csak pilot Zsolt** natív kódmódosítás; Mónikára terjesztés kizárólag valós fizikai teszt és aláírt APK frissítés visszaigazolása után.

## Következő lépés
Kérjünk egy-egy **HealthHub Connect status képernyőképet** mindkét telefonról, amelyen látszik az `Self-Healing` és az `Automatikus sync` blokk. Kódmódosítást/OTA telepítést csak az állapot és a telefonon ténylegesen futó APK verzió megerősítése után döntsünk el.
