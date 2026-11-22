# SHO / HealthHub · OneDrive éjszakai teljes mentés

**Státusz:** implementált, külön PR-ben tesztelt jelölt; **nem élesítve**.


**2026-11-23 · Biztonsági élesítési korlát:** A `berlet-app` GitHub repository **nyilvános**. A PR #1066-ben mindkét hitelesített mentési workflow most már kifejezetten ellenőrzi, hogy a futtató repository **privát** legyen; a public app repóban nem futhat felhőtitkokkal backup, még későbbi merge esetén sem. Az előző leírás „merge után azonnal aktív éjszakai mentés” állítása ezért érvénytelen. A megbízható élesítéshez **külön privát mentésfuttató repository** szükséges, és **az éjszakai schedule továbbra is le van tiltva**. Teljes egyszeri owner setup: [private-runner/OWNER_BOOTSTRAP.md](private-runner/OWNER_BOOTSTRAP.md), biztonságos, rögzített SHA-s minta: [private-runner/backup-staging.template.yml](private-runner/backup-staging.template.yml).

 A GitHub `main` érintetlen, éles forrásból kizárólag olvasunk. A `schedule` csak jóváhagyott merge után aktiválódik. **Az aktuális ChatGPT OneDrive-hozzáférés nem ad automatikus, tartós hozzáférést egy GitHub Actions runnernek.**

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

## Erőforrás és megőrzési kapacitás – forrásméret alapján

- 2026. november 22-én olvasással ellenőrzött méretek: Dropbox HealthHub Cloud Vault **1 245 291 825 byte**, healthhub-vault **100 105 410 byte**; Supabase adatbázis **30 004 915 byte**, Storage metaadatban nyilvántartott objektumméretek **89 135 520 byte**. A GitHub által jelzett repository méretek: berlet-app 182 272 KiB, MediaRadar 1 155 KiB. Ezek **nem** a teljes, garantált visszaállítható SHO mérését jelentik: telefonos, OneDrive Book Studio és egyéb külső adatok külön ellenőrzendők.
- Emiatt a korábbi **200 GiB fix runner-minimum tévesen túlzó** volt. A v1 forrásmentő most közvetlenül az rclone-források összméretéből számolja a szabadhely-követelményt: **4 × összes mért Dropbox/Supabase Storage adat + minimum 4 GiB tartalék**. Ha a futtatón nincs ennyi szabad terület, biztonságosan megáll a nagy letöltések előtt.
- A helyi stagingben további Git mirror, LFS és adatbázis dump keletkezik. A 4 GiB tartalék becslés, nem garantált csúcsterhelési plafon; első valódi backupnál mérni kell a tényleges igényt. Nagy adatnövekedésnél továbbra is külön izolált runner vagy streaming mentés szükséges.
- Az inkrementális Restic-jelölt külön, **csak kézi staging workflow**, részletek: ops/backup/INCREMENTAL_STAGING.md. Nem írja felül a v1-et, és nem kapcsolja be az éles automatikus mentést.
- Az OneDrive szabad helyét az archívum feltöltése előtt ellenőrizzük; az archívum, a SHA-256 és a státuszfájl mind visszaolvasandó. Az ellenőrzött felhőmag-mentés sem azonos a teljes telefonos rendszer helyreállításával.
- A 30 napi + 12 havi megőrzés a **tényleges futásonkénti archívumméret** és a OneDrive felhasználás mérése után véglegesíthető; automatikus törlés jelenleg nincs. A korábbi 45 GB-os teljes példány kizárólag becslési forgatókönyv volt, nem mért tény.

**Élesítés tiltva**, amíg a tartós futtatói titkok, a valódi OneDrive-visszaolvasás és az izolált helyreállítási próba nem sikeres.
