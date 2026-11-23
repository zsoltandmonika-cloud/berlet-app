# SHO Private Backup Runner · egyszeri tulajdonosi beállítás

**Állapot: még nincs privát futtató, nincs élesített automatikus mentés.**

A cél a **mindennap 00:15 + tetszőleges kézi/pre-development** mentés ugyanazzal a Restic motorral, külön manuális belépés vagy ismételt jóváhagyás nélkül. A privát runner **nem** változtatja meg az éles SHO működését.

## 1. Privát GitHub repository

A `zsoltandmonika-cloud` fiókban kell egy **Private** `SHO-Backup-Runner` repository. A publikus `berlet-app` repo marad publikus, oda semmilyen tartós backup-credential nem kerülhet.

A privát repo `main` ágára pontosan az `ops/backup/private-runner/sho-backup-unified.template.yml` tartalmát kell elhelyezni `.github/workflows/sho-backup-unified.yml` néven. A workflow egy rögzített, ellenőrizhető SHO-forrás SHA-t használ, nem fut PR-head kódot titkokkal. A `sho-backup-staging` environmentben csak a tényleges privát default branch férjen a secret-hez, a backup read-only műveletéhez **ne** legyen minden alkalommal plusz kézi approval.

A központi workflow-t **csak az első manuális staging/restore validáció után** szabad automatikus napi futásra engedni. A template önmagában nem élesítés.

## 2. Hat runner secret, csak a GitHub privát Actions settings felületén

| Név | Cél |
| --- | --- |
| `SHO_RCLONE_CONFIG_B64` | Delegált három rclone remote: `dropbox` csak forrásolvasás, `onedrive` mentési tár írható, `supa_s3` Storage objektumolvasás |
| `SHO_GITHUB_READ_TOKEN` | Csak `berlet-app` és privát `MediaRadar` read-only + LFS |
| `SHO_SUPABASE_DATABASE_URL` | PostgreSQL 17 mentési hozzáférés SSL-en |
| `SHO_SUPABASE_MANAGEMENT_TOKEN` | Deployment Edge Function források olvasása |
| `SHO_RECOVERY_ESCROW_B64` | Eleve titkosított konfigurációs recovery escrow |
| `SHO_RESTIC_PASSWORD` | Egyedi, hosszú Restic helyreállító titok, biztonságos offline másolattal |

Nem kell `age` második titkosítási réteg a kanonikus Restic-folyamathoz. A privát repohoz kapcsolt OAuth/token nem hozható át automatikusan a ChatGPT fiók kapcsolataiból. Az értékeket **ne** add meg chatben és ne tárold kódban.

## 3. Admin kézi indítás a központi Sessionből

A `hh-backup-control-v1` Supabase Edge Functionnek a következő szerveroldali beállítások kellenek (külön a fenti hat runner secrettől):

- `SHO_BACKUP_GITHUB_DISPATCH_TOKEN`: fine-grained GitHub Actions dispatch csak `SHO-Backup-Runner` privát repohoz.
- `SHO_BACKUP_OWNER_USER_IDS`: a tényleges HealthHub Central Vault tulajdonosi Auth UUID-k.
- `SHO_BACKUP_RUNNER_CONFIRMED=true`: csak a ténylegesen ellenőrzött privát runner után.

A böngésző sem GitHub-tokent, sem Restic-jelszót nem kap. Az adminban a **Full Backup Now** és **Fejlesztés előtti teljes mentés** ugyanarra a privát workflow-ra küld egy kérést a `backup_kind` paraméterrel.

## 4. Elfogadási teszt az éles automatikus bevezetés előtt

1. Manuális staging futás: minden kötelező külső forrás valóban olvasható; futás ID megjelenik OneDrive-on.
2. Külön, célba olvasott Restic teljes adatintegritás: `restic check --read-data`.
3. Izolált helyreállítás: új Supabase projekt, DB/Auth, Storage objektumok, Edge Functions és forrás repo helyreállítva, valamint Dropbox fájlok összehasonlítva.
4. Telefonos offline/lokális, Book Studio/OneDrive media, OTA signer/Samsung SDK és külső rendszerkonfiguráció felmérve; ami nem menthető, az expliciten kizáró feltétel.
5. Megismételt inkrementális mentés, run-id-k, snapshot címkék, státuszkijelzés és retention kézi ellenőrzése.
6. **Csak ezután** engedélyezhető a 00:15-ös napi automatikus futás.

Nincs automatikus régi backup törlés, `forget` vagy `prune`, production restore vagy OTA. A rendszer ne jelentsen 100%-ot, amíg ezt a független teljes restore-teszt nem igazolja.
