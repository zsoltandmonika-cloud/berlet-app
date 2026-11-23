# SHO Backup: deduplikalt, titkositott inkrementalis staging

Statusz (2026-11-22): kizarolag a GitHub PR #1066 fejlesztesi agan. NEM elesitett, az elo SHO, Supabase, main branch es OTA valtozatlan.

## Mukodes

- A restic kulon OneDrive tarat hasznal: SHO/Backups/restic-staging-v1.
- A ket Dropbox vault es a Supabase Storage objektumai rclone cat alapu, kozvetlen TAR adatfolyamkent mennek a Restic fele; nincs teljes meretu helyi masolat.
- A PostgreSQL 17 custom-format pg_dump szinten streamelt. A ket teljes Git mirror, LFS, Edge Function forrasok es elore titkositott escrow kulon snapshotban vannak.
- Pontosan 5 snapshot kap kozos futoazonosito taget.
- Csak sikeres teljes restic check --read-data, metadata-fajl restic dump visszaallitas es OneDrive status visszaolvasas utan keletkezik staging status:
  STAGING_INCREMENTAL_REPO_DATA_VERIFIED, full_system=false, restore_tested=false.
- Az uj statusz nem keverheto a regi, mas formatumu CLOUD_CORE_VERIFIED jelzessel.

## Inditas es jogok

A workflow neve: .github/workflows/sho-restic-incremental-staging.yml. Csak kezi workflow_dispatch; nincs schedule. Explicit authorize_read_only_capture=true input es staging-read-only futtatoi guard kotelezo.

Hat GitHub Actions secret kell, amelyekrol a ChatGPT csatlakozas nem gondoskodik: SHO_RCLONE_CONFIG_B64, SHO_GITHUB_READ_TOKEN, SHO_SUPABASE_DATABASE_URL, SHO_SUPABASE_MANAGEMENT_TOKEN, SHO_RECOVERY_ESCROW_B64 es az uj SHO_RESTIC_PASSWORD. Titkokat nem szabad csevegésbe vagy Git commitba irni. A visszafejto jelszavat es az escrow helyreallitasi adatait GitHubtol es OneDrive-tol fuggetlenul is biztonsagosan meg kell orizni.

## Ismert korlatok

1. A Restic deduplikal, de az osszes cloud adatot minden run alatt ujra elolvassa. A valos 500 GB kvota-kompatibilitas csak tobb teljes futas adatai alapjan allapithato meg.
2. Git mirror es LFS meg foglalhat 14 GiB-nal tobb helyet. Ha nem fer el, a futas megall. Nem szabad kihagyni fajlokat a siker erdekeben.
3. A kulonbozo felhok adatai nem atomikus pillanatkepek. A streaming szkript ellenorzi az objektumok darabszamat, meretet, a forraslistat ket olvasassal es hibakod alapjan zar; ez nem helyettesit tranzakcios forrasoldali snapshotot.
4. Metadata smoke restore es Restic data read-back NEM teljes rendszer-visszaallitas. Izolalt Supabase adatbazis, Storage, Edge, Dropbox, Git, jogosultsag es telefonos funkcio probak tovabbra is szuksegesek.
5. A jelen stage-ben nincs automatikus torles, restic forget/prune, eles visszaallitas, Supabase telepites, GitHub merge vagy OTA.
6. Elesitesi feltetelek: tartos hitelesites, valos sikeres staging mentes, ket inkrementalis meres, sandbox restore, megorzes es riasztas kiprobalasa.

A fejlesztes nem minositheto eles teljes backupnak, amig az osszes release-kapu nem teljesult.
