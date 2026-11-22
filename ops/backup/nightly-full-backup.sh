#!/usr/bin/env bash
# SHO full recovery archive to personal OneDrive. READ-ONLY towards every source.
set -Eeuo pipefail
umask 077

required=(RCLONE_CONFIG_B64 SUPABASE_DB_URL SUPABASE_MANAGEMENT_TOKEN BACKUP_AGE_RECIPIENT SHO_RECOVERY_ESCROW_B64 GH_BACKUP_PAT)
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then echo "::error::Backup blocked: missing configured credential $key" >&2; exit 2; fi
done
for tool in rclone python3 git curl jq docker age tar zstd sha256sum; do
  command -v "$tool" >/dev/null || { echo "::error::Required tool missing: $tool" >&2; exit 2; }
done

PROJECT_REF="vhsrupphzcjkdrusonzh"
BACKUP_ID="$(date -u +'%Y%m%dT%H%M%SZ')-${GITHUB_RUN_ID:-manual}"
DEST="onedrive:SHO/Backups/$BACKUP_ID"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
stage="$work/stage"
out="$work/output"
mkdir -p "$stage"/{github,supabase/edge-functions,supabase/storage,dropbox,recovery} "$out"
printf '%s' "$RCLONE_CONFIG_B64" | base64 -d > "$work/rclone.conf"
chmod 600 "$work/rclone.conf"
export RCLONE_CONFIG="$work/rclone.conf"
printf '%s' "$SHO_RECOVERY_ESCROW_B64" | base64 -d > "$stage/recovery/escrow.age"
[[ -s "$stage/recovery/escrow.age" ]] || { echo '::error::Empty recovery escrow' >&2; exit 2; }

# A ChatGPT connector does not grant long-lived credentials to a GitHub runner.
for remote in dropbox onedrive supa_s3; do
  rclone listremotes | grep -qx "${remote}:" || { echo "::error::Missing rclone remote: $remote" >&2; exit 2; }
done

# Mirror complete Git history; GitHub private repo uses a read-only owner grant.
cat > "$work/askpass.sh" <<'ASK'
#!/usr/bin/env sh
case "$1" in *Username*) printf 'x-access-token\n';; *) printf '%s\n' "$GH_BACKUP_PAT";; esac
ASK
chmod 700 "$work/askpass.sh"
export GIT_ASKPASS="$work/askpass.sh" GIT_TERMINAL_PROMPT=0
for repo in berlet-app MediaRadar; do
  echo "Capturing full Git history for $repo"
  git clone --mirror --quiet "https://github.com/zsoltandmonika-cloud/$repo.git" "$work/$repo.git"
  git -C "$work/$repo.git" bundle create "$stage/github/$repo.bundle" --all
  git -C "$work/$repo.git" bundle verify "$stage/github/$repo.bundle" >/dev/null
  git -C "$work/$repo.git" show-ref > "$stage/github/$repo.refs.txt"
  if git -C "$work/$repo.git" lfs ls-files 2>/dev/null | grep -q .; then
    git -C "$work/$repo.git" lfs fetch --all --quiet
    tar -czf "$stage/github/$repo-lfs.tar.gz" -C "$work/$repo.git" lfs/objects
  fi
done

# Both HealthHub vaults. Never delete, move, rotate or overwrite source files.
for vault in 'HealthHub Cloud Vault' 'healthhub-vault'; do
  src="dropbox:Apps/$vault"
  target="$stage/dropbox/$vault"
  rclone lsf "$src" >/dev/null
  mkdir -p "$target"
  echo "Copying Dropbox vault $vault (read-only)"
  rclone copy "$src" "$target" --checkers 8 --transfers 6 --retries 3 --quiet
  rclone check "$src" "$target" --one-way --quiet
  test -n "$(find "$target" -type f -print -quit)" || { echo '::error::Empty Dropbox vault' >&2; exit 3; }
done

# PostgreSQL 17 dump includes auth/storage metadata and live database content.
# Unlike a Supabase CLI schema-only export, this is a full custom-format dump.
echo 'Capturing PostgreSQL 17 database'
docker run --rm -e SUPABASE_DB_URL -v "$stage/supabase:/backup" postgres:17-alpine \
  sh -ec 'pg_dump --format=custom --no-owner --no-acl "$SUPABASE_DB_URL" -f /backup/database.dump && pg_restore --list /backup/database.dump > /backup/database.toc'
test -s "$stage/supabase/database.toc"

# Actual Storage object BODIES are mandatory: SQL storage.objects alone is not backup.
echo 'Capturing Supabase Storage objects'
rclone lsf 'supa_s3:' --dirs-only > "$stage/supabase/storage-buckets.txt"
test -s "$stage/supabase/storage-buckets.txt"
rclone copy 'supa_s3:' "$stage/supabase/storage" --checkers 8 --transfers 6 --retries 3 --quiet
rclone check 'supa_s3:' "$stage/supabase/storage" --one-way --quiet
python3 - "$stage/supabase/storage" "$stage/supabase/storage-index.json" <<'PY'
import json,sys
from pathlib import Path
root=Path(sys.argv[1])
entries=[{'path':x.relative_to(root).as_posix(),'size':x.stat().st_size} for x in sorted(root.rglob('*')) if x.is_file()]
if not entries: raise SystemExit('No Supabase Storage bodies downloaded')
Path(sys.argv[2]).write_text(json.dumps({'count':len(entries),'objects':entries},indent=2)+'\n')
PY

# Capture all deployed Edge Function code bundles, not just repository sources.
echo 'Capturing Supabase Edge Functions'
api="https://api.supabase.com/v1/projects/$PROJECT_REF/functions"
curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" "$api" > "$stage/supabase/edge-functions/index.json"
jq -e 'type=="array" and length>0' "$stage/supabase/edge-functions/index.json" >/dev/null
while IFS= read -r slug; do
  [[ "$slug" =~ ^[a-zA-Z0-9_-]+$ ]] || { echo '::error::Invalid function slug' >&2; exit 4; }
  curl --fail --silent --show-error --retry 3 -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
    "$api/$slug/body" > "$stage/supabase/edge-functions/$slug.body"
  test -s "$stage/supabase/edge-functions/$slug.body"
done < <(jq -r '.[].slug' "$stage/supabase/edge-functions/index.json")

# File inventory and integrity record INSIDE the encrypted recovery package.
python3 ops/backup/verify.py "$stage" "$BACKUP_ID"
tar -I 'zstd -T0 -5' -cf "$out/$BACKUP_ID.tar.zst" -C "$stage" .
tar -I zstd -tf "$out/$BACKUP_ID.tar.zst" >/dev/null
age -r "$BACKUP_AGE_RECIPIENT" -o "$out/backup.tar.zst.age" "$out/$BACKUP_ID.tar.zst"
test -s "$out/backup.tar.zst.age"

# An immutable OneDrive directory per run. Old backups NEVER automatically deleted.
# Read-back proves the exact ciphertext bytes arrived at the destination.
echo 'Uploading encrypted recovery bundle to OneDrive'
rclone copyto "$out/backup.tar.zst.age" "$DEST/backup.tar.zst.age" --immutable --retries 3 --quiet
rclone copyto "$DEST/backup.tar.zst.age" "$out/remote-verified.tar.zst.age" --quiet
cmp --silent "$out/backup.tar.zst.age" "$out/remote-verified.tar.zst.age"
sha256sum "$out/backup.tar.zst.age" | awk '{print $1}' > "$out/sha256.txt"
sha="$(cat "$out/sha256.txt")"
printf '{"schema":"sho-backup-status/1","backup_id":"%s","status":"FULL_BACKUP_VERIFIED","encrypted_archive_sha256":"%s","project_ref":"%s","read_back_verified":true}\n' \
  "$BACKUP_ID" "$sha" "$PROJECT_REF" > "$out/status.json"
rclone copyto "$out/sha256.txt" "$DEST/sha256.txt" --immutable --quiet
rclone copyto "$out/status.json" "$DEST/status.json" --immutable --quiet
printf 'FULL_BACKUP_VERIFIED: %s\n' "$DEST"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  { echo '### SHO OneDrive FULL BACKUP VERIFIED'; echo "- Backup: $BACKUP_ID";
    echo '- Destination: SHO/Backups'; echo '- GitHub, Dropbox, Supabase DB/Storage/Edge Functions included';
    echo '- Encrypted archive read back from OneDrive byte-for-byte';
    echo '- No production source mutation and no automatic deletion'; } >> "$GITHUB_STEP_SUMMARY"
fi
