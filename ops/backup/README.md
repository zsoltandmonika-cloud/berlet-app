# SHO / HealthHub · OneDrive éjszakai teljes mentés

**Státusz:** implementált, külön PR-ben tesztelt jelölt; **nem élesítve**. A GitHub `main` érintetlen, éles forrásból kizárólag olvasunk. A `schedule` csak jóváhagyott merge után aktiválódik. **Az aktuális ChatGPT OneDrive-hozzáférés nem ad automatikus, tartós hozzáférést egy GitHub Actions runnernek.**

## Időpont és cél
- Minden nap **00:15 Europe/Budapest** (téli/nyári időszámítás szerint).
- Személyes OneDrive: `zsolt.monika@outlook.com`, drive ID `BC1FF24AF37EA2B0`.
- Gyökér: `OneDrive/SHO/Backups/<UTC_ID>-<run_id>/`.
- Minden futás **új mappát** készít, a korábbi backup sosem íródik felül, és nincs automatikus törlés.

## Kötelező komponensek
1. `berlet-app` és a **privát MediaRadar** Git-tárak teljes előzménye, branch-ei és tagjei, ellenőrizhető `git bundle` csomagokban, szükség esetén Git LFS-objektumokkal.
2. Két Dropbox-tár: `Apps/HealthHub Cloud Vault` és `Apps/healthhub-vault`, az összes HealthHub-profillal, dokumentummal, napi adattal, Family Guard- és eszközadatokkal.
3. A **HealthHub-Core** Supabase PostgreSQL 17 adatbázis teljes, saját formátumú `pg_dump` mentése, Auth és Storage metaadatokkal.
4. Supabase Storage **tényleges objektumtartalmak**, nem csupán adatbázisbeli fájljegyzék.
5. Valamennyi telepített Supabase Edge Function aktuális forrása a Management API-ból.
6. Külön, előre titkosított, tulajdonos által biztosított **recovery escrow** a felhőszolgáltatók külső beállításainak és a visszaállításhoz szükséges hozzáféréseknek.
7. SHA-256 fájljegyzék, `age` titkosított archívum, OneDrive feltöltés és **teljes távoli visszaolvasás, byte-by-byte összehasonlítással**. Csak ezután kerül fel a `CLOUD_CORE_VERIFIED` státusz.

## Egyszeri, külön delegálandó futtatói jogosultságok

A workflow az alábbi Github Actions secret/variable értékeket követeli meg; hiányuk esetén hibaállapottal megáll:

| Név | Funkció |
|---|---|
| `SHO_RCLONE_CONFIG_B64` | Három külön, tulajdonos által delegált rclone remote: `dropbox` (olvasás mindkét Apps-vaultból), `onedrive` (mentési célhoz írás), `supa_s3` (Supabase Storage olvasás). Base64 kódolt rclone.conf; önálló OAuth refresh, tokenrotáció/megújítás kezelése szükséges. |
| `SHO_GITHUB_READ_TOKEN` | Fine-grained **read-only** engedély a berlet-app és a privát MediaRadar repohoz. |
| `SHO_SUPABASE_DATABASE_URL` | A PG17 adatbázis mentéséhez szükséges SSL-kapcsolat (adatolvasás/séma dump). |
| `SHO_SUPABASE_MANAGEMENT_TOKEN` | A telepített Edge Function-kódok olvasási joga. |
| `SHO_BACKUP_AGE_RECIPIENT` (variable) | A helyreállító titkosítás nyilvános `age1...` kulcsa; a privát dekódoló kulcsot a tulajdonos **GitHubon és OneDrive-on kívül** tárolja. |
| `SHO_RECOVERY_ESCROW_B64` | Előzetesen titkosított konfiguráció/credential-recovery archívum; soha nem nyers jelszó vagy token. |

**Ne oszd meg a titkokat chatben, ne commitold őket GitHubba.** A rendszer biztonságosan *megtagadja* a teljesnek nevezett mentést, amíg bármely alapfeltétel hiányzik.

## Mit jelent a CLOUD_CORE_VERIFIED?

A kötelező adatforrásokat sikerült beolvasni, archiválni, hash-elni, titkosítani, OneDrive-ra feltölteni és újra letölteni. **Nem jelenti**, hogy egy teljes produkciós helyreállítás már sikeresen lezajlott. A Supabase szolgáltatáskonfigurációk, OAuth-engedélyek, titkosítási kulcsok, telefonon lévő engedélyek és alkalmazáspárosítások külön helyreállítást igényelnek. A különböző felhőszolgáltatások olvasása nem tranzakcionálisan atomikus.

## Visszaállítás (csak izolált környezetben)

1. OneDrive-ból töltsd le a kijelölt `backup.tar.zst.age`, `sha256.txt`, `status.json` fájlokat.
2. Ellenőrizd a SHA-256 azonosítót; a magán `age` kulccsal dekódold az archívumot: `age -d -i <private-key> -o backup.tar.zst backup.tar.zst.age`.
3. `tar -I zstd -xf backup.tar.zst`, majd a `manifest.json` összes fájljának SHA-256 ellenőrzése.
4. A `.bundle` Git-mentéseket helyreállíthatod külön Git-repókba; Supabase DB, Storage és Edge Functions visszaállítása **külön tesztprojektbe**, sémakompatibilitási ellenőrzés után.
5. Ellenőrizd a HealthHub/SHO funkciókat, dokumentumokat, zárt jogosultságokat, telefonpárosításokat és Family Guardot; csak igazolt próbavisszaállítás után beszélhetünk teljesen bizonyított disaster recovery-ről.
6. Éles rendszer visszaállítása soha nem indul külön tulajdonosi jóváhagyás nélkül.

**Kezdeti élesítés:** külön teszt + PR review, éjszakai futtatóhoz önálló, tartós OAuth-engedélyek, első kézi, *read-only source* ellenőrzött backup; majd minden éjjel automatikusan. A `HealthHub Level 3 Guard` Git-tagje önmagában NEM teljes backup.

## Határok / teljes rendszer helyreállítás

Az automatikusan ellenőrzött **CLOUD_CORE_VERIFIED** azt jelenti, hogy a felhőmag adatforrásai megvannak, titkosítva és OneDrive-ról visszaolvasva. **Nem** jelenti, hogy a teljes SHO telefonos rendszer egyetlen gombbal visszaállítható. A telefonokon esetleg még csak lokálisan tárolt Health Connect/IndexedDB módosítások, Book Studio OneDrive-könyvek és külső Home Media forrásfájlok önálló archiválása, a licencelt Samsung SDK és aláírókulcsok biztonságos megőrzése, valamint a valódi próbavisszaállítás külön kötelező feltételek a teljes rendszermentésre történő minősítéshez.

A 30 napi + 12 havi visszaállítási pont kiválasztását az `ops/backup/retention_plan.py` végzi. Régi mentések automatikus törlése **nincs engedélyezve**, amíg az első független helyreállítási teszt sikeresen le nem futott és a tulajdonos azt külön jóvá nem hagyja. A tárhelyfigyelő 80%-os foglaltságnál figyelmeztet; a forrásoldali tárhelytelítettség nem blokkolhatja a csak olvasási mentést.


## Adminból közvetlen kézi mentésindítás (staging)

A \`healthhub/admin-backup/\` panelen a **„Admin mentési hozzáférés ellenőrzése”** után, csak zöld szerveroldali előfeltételekkel, egy **„▶ Kézi teljes mentés indítása”** gomb látható. A Google/Dropbox/OneDrive tárolási jogosultság **SOHA** nem kerül a weboldal JavaScript-kódjába. Az admin a meglévő HealthHub Central Vault bejelentkezését használja, a szerver \`auth/v1/user\` JWT-ellenőrzés és előre konfigurált owner UUID-engedélyezési lista alapján dönt.

Szerveroldali előkészítés, csak tulajdonosi jóváhagyás és az éles rendszerre történő külön release után:

1. Supabase Edge Function: \`supabase/functions/hh-backup-control-v1/index.ts\`, \`verify_jwt=true\`; a közös \`_shared/backup-control-v1.mjs\` modul ugyanebből a PR-ből kerül fel. **PR-ben nem települ** és nem változtat Supabase táblákat.
2. Az Edge Function privát környezetében \`SHO_BACKUP_GITHUB_DISPATCH_TOKEN\`: fine-grained GitHub PAT, kizárólag a **berlet-app Actions: Read and write** jogkörrel; ne használjunk globális account tokent.  A \`SUPABASE_ANON_KEY\` vagy \`SUPABASE_PUBLISHABLE_KEY\` csak felhasználó-jogosultságellenőrzésre kell, nem service_role.
3. \`SHO_BACKUP_OWNER_USER_IDS\`: előzetesen ellenőrzött, vesszővel elválasztott Supabase Auth felhasználó-UUID-k. **E-mail-cím vagy telefon-profilnév önmagában nem admin jogosultság**.
4. \`SHO_BACKUP_RUNNER_CONFIRMED=true\` csak a GitHub-futtató **összes 6 előfeltételének** tényleges konfigurálása és jogosultságtesztje után. Enélkül a gomb biztonságosan tiltva marad.
5. A workflow csak a \`main\` ágon, aktív \`workflow_dispatch\` eseménnyel hívható; POST előtt kötelező külön kattintás és JS confirm. A szerver csak a \`start_manual_full_backup\` műveletet fogadja el, kizárja az idegen Origin-t, a hiányzó tulajdonosi jogosultságot és a párhuzamos/recent mentésindítást.
6. A 202-es válasz kizárólag **GitHub indítási kérés elfogadva**, sosem kész backup. Az admin külön a legutóbbi futás és OneDrive státusz ellenőrzésével mutat valódi állapotot.

**Restore:** a panel a kiválasztott és igazolt OneDrive-mentésből egyelőre csak **tervet** készít. A valódi restore backendnek az offline integritást, izolált próbavisszaállítást és az éles visszaállításra külön új jóváhagyást kell kikényszerítenie. A jelen PR **nem** készít automatikus éles restore végpontot, és semmilyen éles adatot nem ír.

**Kritikus:** egyetlen ChatGPT-apphoz csatlakozott Microsoft/Dropbox/Supabase-fiók sem elegendő a GitHub Actions és a Supabase Edge Function saját, tartós hozzáféréséhez. A GitHub secret-értékek ma mind hiányoznak; az admin gomb a tényleges konfigurációig letiltott marad.

## Erőforrás és megőrzési kapacitás (kötelező élesítési kapu)

- A standard GitHub Actions `ubuntu-24.04` futtató körülbelül **14 GiB SSD-t** ad, ezért a jelenlegi egész-forrás / tömörített archívum / titkosított archívum / visszaolvasott másolat pipeline **nem használható** 40–45 GB nagyságrendű adatoknál.
- Az `ops/backup/check_capacity.py` már forrásolvasás előtt megkövetel **legalább 200 GiB szabad ideiglenes területet**. Ez konzervatív belépőkapu, **nem garancia**: a tényleges forrásméret és csúcsterhelés első méréséből kell megerősíteni.
- A nagy futtató kiválasztása és biztonságos elkülönítése még nincs elvégezve. Public GitHub-repóhoz **nem szabad tartós, érzékeny hitelesítőadatokat tartalmazó self-hosted gépet önmagában PR-jogosultsággal kitenni**. Előbb külön izoláció vagy jóváhagyott ephemerális futtató szükséges.
- Az OneDrive szabad helyét az archívum feltöltése előtt ellenőrizzük; a titkosított archívum, a `sha256.txt` és a `status.json` mind visszaolvasandó. A 'CLOUD_CORE_VERIFIED' nem állít teljes eszköz-visszaállíthatóságot.
- **Kapacitásellentmondás**: 45 GB-os napi teljes példányból 30 darab **1,35 TB** (a haviak nélkül), tehát 500 GB rendelkezésre álló keret esetén a '30 napi + 12 havi' szabály önmagában nem tartható. Tartós bevezetéshez deduplikált, inkrementális, titkosított tárolási stratégia és helyreállítási próba kell. A jelenlegi retention program csak tervet készít, nem takarít.
- Ezeket a blokkoló feltételeket a staging PR elfogadása előtt meg kell oldani. A szokásos Github-futtatóval az első valódi mentést **nem** szabad teljesnek minősíteni.
