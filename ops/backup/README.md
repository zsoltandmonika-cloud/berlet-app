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
