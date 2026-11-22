#!/usr/bin/env bash
# MANUAL STAGING ONLY. Reads production sources, writes encrypted snapshots to isolated OneDrive staging.
# NEVER merge as a scheduled prod backup without independent review and a sandbox restore.
set -Eeuo pipefail
umask 077

[[ "${SHO_BACKUP_CAPTURE_AUTHORIZED:-}" == 'staging-read-only' ]] || {
  echo '::error::Explicit staging read-only capture confirmation required' >&2; exit 2;
}
required=(RCLONE_CONFIG_B64 GH_BACKUP_PAT SUPABASE_DB_URL SUPABASE_MANAGEMENT_TOKEN SHO_RECOVERY_ESCROW_B64 RESTIC_PASSWORD)
for key in "${required[@]}"; do
  [[ -n "${!key:-}" ]] || { echo "::error::Missing required staged runner credential: $key" >&2; exit 2; }
done
for cmd in rclone restic git jq docker curl python3 base64 tar sha256sum; do
  command -v "$cmd" >/dev/null || { echo "::error::Missing executable: $cmd" >&2; exit 2; }
done
git lfs version >/dev/null || { echo '::error::git-lfs is required' >&2; exit 2; }

PROJECT_REF='vhsrupphzcjkdrusonzh'
BACKUP_ID="$(date -u +'%Y%m%dT%H%M%SZ')-${GITHUB_RUN_ID:-manual}"
TAG="sho-stage-$BACKUP_ID"
export RESTIC_REPOSITORY='rclone:onedrive:SHO/Backups/restic-staging-v1'
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work"/{stage/github,stage/edge,stage/recovery,restic-cache}
export RESTIC_CACHE_DIR="$work/restic-cache"
printf '%s' "$RCLONE_CONFIG_B64" | base64 -d > "$work/rclone.conf"
chmod 600 "$work/rclone.conf"
export RCLONE_CONFIG="$work/rclone.conf"
printf '%s' "$SHO_RECOVERY_ESCROW_B64" | base64 -d > "$work/stage/recovery/escrow.age"
[[ -s "$work/stage/recovery/escrow.age" ]] || { echo '::error::Empty pre-encrypted escrow' >&2; exit 2; }

for remote in dropbox onedrive supa_s3; do
  rclone listremotes | grep -qx "${remote}:" || { echo "::error::Missing remote $remote" >&2; exit 2; }
done
for src in 'dropbox:Apps/HealthHub Cloud Vault' 'dropbox:Apps/healthhub-vault' 'supa_s3:'; do
  rclone lsjson --recursive --files-only "$src" | jq -e 'type=="array" and length>0' >/dev/null
done

# Only the separate staging repository can be initialized/written. Wrong password or access errors fail.
if ! rclone cat 'onedrive:SHO/Backups/restic-staging-v1/config' >/dev/null 2>&1; then
  if rclone lsf 'onedrive:SHO/Backups/restic-staging-v1' --files-only 2>/dev/null | grep -q .; then
    echo '::error::Restic staging repository looks nonempty but config is not readable' >&2; exit 2
  fi
  restic init
fi
restic cat config >/dev/null

# Restic stdin-from-command propagates the generator's error code (unlike a blind pipe).
# Streaming tar uses only RAM and reads Dropbox/S3 objects directly; no 40 GB local mirror.
restic backup --tag "$TAG" --stdin-filename 'dropbox-cloud-vault.tar' --stdin-from-command -- \
  python3 ops/backup/stream_remote_tar.py 'dropbox:Apps/HealthHub Cloud Vault'
restic backup --tag "$TAG" --stdin-filename 'dropbox-monika-vault.tar' --stdin-from-command -- \
  python3 ops/backup/stream_remote_tar.py 'dropbox:Apps/healthhub-vault'
restic backup --tag "$TAG" --stdin-filename 'supabase-storage.tar' --stdin-from-command -- \
  python3 ops/backup/stream_remote_tar.py 'supa_s3:'

# Custom-format pg_dump is streamed directly; staging does not create a local database.dump file.
restic backup --tag "$TAG" --stdin-filename 'supabase-postgresql17.dump' --stdin-from-command -- \
  docker run --rm -e SUPABASE_DB_URL postgres:17-alpine \
  sh -ec 'pg_dump --format=custom --no-owner --no-acl "$SUPABASE_DB_URL" -f -'

# Both complete Git histories, including branch/tag refs and any LFS objects, plus deployed functions.
cat > "$work/askpass.sh" <<'ASK'
#!/usr/bin/env sh
case "$1" in *Username*) printf 'x-access-token\n';; *) printf '%s\n' "$GH_BACKUP_PAT";; esac
ASK
chmod 700 "$work/askpass.sh"
export GIT_ASKPASS="$work/askpass.sh" GIT_TERMINAL_PROMPT=0
lfs_paths=()
for repo in berlet-app MediaRadar; do
  git clone --mirror --quiet "https://github.com/zsoltandmonika-cloud/$repo.git" "$work/$repo.git"
  git -C "$work/$repo.git" bundle create "$work/stage/github/$repo.bundle" --all
  git -C "$work/$repo.git" bundle verify "$work/stage/github/$repo.bundle" >/dev/null
  git -C "$work/$repo.git" show-ref > "$work/stage/github/$repo.refs.txt"
  if git -C "$work/$repo.git" lfs ls-files 2>/dev/null | grep -q .; then
    git -C "$work/$repo.git" lfs fetch --all --quiet
    test -d "$work/$repo.git/lfs/objects"
    lfs_paths+=("$work/$repo.git/lfs/objects")
  fi
done

api="https://api.supabase.com/v1/projects/$PROJECT_REF/functions"
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
  "$api" > "$work/stage/edge/index.json"
jq -e 'type=="array" and length>0' "$work/stage/edge/index.json" >/dev/null
while IFS= read -r slug; do
  [[ "$slug" =~ ^[A-Za-z0-9_-]+$ ]] || { echo '::error::Unsafe Edge Function slug' >&2; exit 4; }
  curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
    "$api/$slug/body" > "$work/stage/edge/$slug.body"
  [[ -s "$work/stage/edge/$slug.body" ]] || { echo '::error::Edge source empty' >&2; exit 4; }
done < <(jq -r '.[].slug' "$work/stage/edge/index.json")

python3 - "$work/stage" <<'PY'
import hashlib, json, sys
from pathlib import Path
root = Path(sys.argv[1])
items = []
for item in sorted(x for x in root.rglob('*') if x.is_file()):
    if item.name == 'local-inventory.json':
        raise SystemExit('Refusing to hash pre-existing local inventory')
    h = hashlib.sha256()
    with item.open('rb') as stream:
        for block in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            h.update(block)
    items.append({'path': item.relative_to(root).as_posix(), 'bytes': item.stat().st_size, 'sha256': h.hexdigest()})
(root / 'local-inventory.json').write_text(json.dumps({'schema': 'sho-staging-local-inventory/1',
    'file_count': len(items), 'files': items}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
PY
restic backup --tag "$TAG" "$work/stage" "${lfs_paths[@]}"

# Read all encrypted restic pack data back from OneDrive before publishing staging status.
restic snapshots --json --tag "$TAG" > "$work/snapshots.json"
jq -e 'type=="array" and length==5 and all(.[]; .id and (.tags | index($tag)))' \
  --arg tag "$TAG" "$work/snapshots.json" >/dev/null
restic check --read-data
# Prove that at least a small metadata file can be restored, without staging all remote data.
LOCAL_SNAPSHOT_ID="$(jq -er --arg path "$work/stage"   '[.[] | select(.paths | index($path)) | .id] | first' "$work/snapshots.json")"
restic dump "$LOCAL_SNAPSHOT_ID" "$work/stage/local-inventory.json" > "$work/local-inventory-restored.json"
cmp -s "$work/stage/local-inventory.json" "$work/local-inventory-restored.json"
python3 - "$BACKUP_ID" "$TAG" "$work/snapshots.json" "$work/status.json" <<'PY'
import json, sys
run, tag, snaps, dest = sys.argv[1:]
ids = [s['id'] for s in json.load(open(snaps, encoding='utf-8'))]
status = {
  'schema': 'sho-restic-staging-status/1',
  'backup_id': run,
  'tag': tag,
  'status': 'STAGING_INCREMENTAL_REPO_DATA_VERIFIED',
  'snapshot_ids': ids,
  'read_back_verified': True,
  'full_system': False,
  'restore_tested': False,
  'metadata_restore_smoke_tested': True,
  'production_restored': False,
  'components': ['Dropbox vaults x2', 'Supabase Storage bodies', 'PostgreSQL 17 custom dump',
                 'Git full history x2 plus available LFS', 'deployed Edge Functions', 'encrypted recovery escrow'],
}
with open(dest, 'w', encoding='utf-8') as f:
    json.dump(status, f, indent=2, ensure_ascii=False)
    f.write('\n')
PY
DEST="onedrive:SHO/Backups/restic-staging-runs/$BACKUP_ID/status.json"
rclone copyto "$work/status.json" "$DEST" --immutable
rclone cat "$DEST" > "$work/status-readback.json"
cmp -s "$work/status.json" "$work/status-readback.json"
echo "STAGING_INCREMENTAL_REPO_DATA_VERIFIED: $BACKUP_ID (NOT FULL RESTORE)"
