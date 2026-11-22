# SHO Backup: egyszeri tulajdonosi jogosultsag-atadas (staging)

**Kiadas:** PR #1066 fejlesztesi ag. **Az elo SHO es Supabase nem modositando.**

## 1. Kulon privát GitHub futtato

1. Hozz letre egy UJ **Private** GitHub repositoryt a `zsoltandmonika-cloud` fiokban, javasolt neve `SHO-Backup-Runner`. A regi `berlet-app` public marad, oda NEM szabad mentési tokeneket berakni.
2. Ebben az uj privát repoban masold be a kovetkezo template teljes tartalmat `.github/workflows/backup-staging.yml` helyre: `https://github.com/zsoltandmonika-cloud/berlet-app/blob/feature/sho-onedrive-nightly-full-backup-20261122/ops/backup/private-runner/backup-staging.template.yml`.
3. Settings > Environments > New environment: `sho-backup-staging`. A hozzaferest korlatozd a `main` agon, es ha elerheto, tegyel ra tulajdonosi jóváhagyást. **Nem szabad PR-bol ismeretlen kodnak titkokat adni**.
4. Settings > Secrets and variables > Actions. A hat erteket KIZAROLAG ott add meg. Soha ne a chatben, Git commitban, Issue kommentben vagy screenshoton.

## 2. Pontosan hat privát runner secret

| GitHub secret neve | Tulajdonosi forras / elvart hatokor |
| --- | --- |
| `SHO_RCLONE_CONFIG_B64` | Base64 kódolt rclone konfigurácio három külön remote-mal: `dropbox` (csak olvasás a két Apps HealthHub vaultból a SHO Health Files fiokkal), `onedrive` (célmappa írása a közös Microsoft OneDrive-on), `supa_s3` (Supabase Storage olvasás). A konfiguracio tartos refresh tokent tartalmazhat, kezelese titok. |
| `SHO_GITHUB_READ_TOKEN` | Fine-grained, readonly repository access: `zsoltandmonika-cloud/berlet-app`, és a privát `MediaRadar`; LFS olvasással. |
| `SHO_SUPABASE_DATABASE_URL` | HealthHub-Core PostgreSQL teljes pg_dump hozzaferes SSL-en; tartalmazhat jelszót. |
| `SHO_SUPABASE_MANAGEMENT_TOKEN` | Edge Functions forrasok lekerdezese a Supabase Management API-val. |
| `SHO_RECOVERY_ESCROW_B64` | Már előre, külön titkosított recovery escrow binaris blob base64-ben. Soha nem nyers kulcs vagy jelszolista. |
| `SHO_RESTIC_PASSWORD` | Egyedi, hosszu Restic titkosítási jelszó (32+ véletlen karakter), amelyet **külön, offline** is meg kell őrizni. Elveszítése esetén a mentés használhatatlanná válhat. |

A ChatGPT Dropbox / OneDrive / Supabase csatlakoztatas **nem** egyenlő a GitHub Actions tartos OAuth engedelyeivel. Ezeket a rendszer nem tudja csevegésből vagy kapcsolt felhőfiókból automatikusan lemásolni.

## 3. Az elso, izolalt próba

- A privát repository default branchén nyisd meg az **Actions > SHO private backup runner - staged first capture** munkafolyamatot.
- Csak akkor pipald be az `authorize_read_only_capture` jelzest, ha mind a hat secret be van állítva, a célmappa jó és a privát repo hozzáférését ellenőrizted.
- A kezdeti ellenorzo szakasz hianyzo secret esetén azonnal megáll. A normál backup forrásai olvasásra korlátozva, a kimenet külön OneDrive staging Restic tárban.
- A kód **rögzített, korábban tesztelt git SHA-ról** töltődik be (nem PR-head-ről). A tényleges mentés előbb minden kötelező forrást ellenőriz, majd Restic titkosított snapshotokat készít.
- `STAGING_INCREMENTAL_REPO_DATA_VERIFIED` csak adatvisszaolvasas és metadatafajl restore próba után keletkezhet. **Ez nem teljes rendszer-visszaállítás.**
- Nem fut automatikus schedule, nem töröl régi mentést és nem ír át éles Supabase adatot, GitHub main-t vagy OTA kiadást.

## 4. Kötelező folytatási ellenőrzések

Első teljes staging futás + még egy inkrementális futás, mentési méret, idő, OneDrive felhasználás és visszaállított adatok összevetése. Ezután teljes izolált restore: Supabase DB + Storage + Edge Functions, Dropbox két vault, Git history, HealthHub modul smoke test és hozzáférésváltozások. A teljes telefonos lokális adatok, Book Studio és külső media még külön lefedettség-ellenőrzést igényelnek.

**Amíg ezek nem teljesülnek:** a PR #1066 DRAFT marad, admin Backup/Restore gomb nem állíthat valódi FULL sikerállapotot, az éles SHO nem módosul.
