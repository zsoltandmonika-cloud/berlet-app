#!/usr/bin/env bash
# Zero external credentials, no network, no production sources. Run under GitHub Actions QA.
set -Eeuo pipefail
for x in restic jq python3 tar; do command -v "$x" >/dev/null; done
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/bin"
cat > "$work/bin/rclone" <<'PY'
#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
if args[0] == 'lsjson':
    wrong = os.getenv('MOCK_BAD') == '1'
    print(json.dumps([{'Path':'one.txt','Size':3,'ModTime':'2026-11-22T00:00:00Z'},
                      {'Path':'two.txt','Size':9 if wrong else 4,'ModTime':'2026-11-22T00:00:00Z'}]))
elif args[0] == 'cat':
    if args[1].endswith('/one.txt'): sys.stdout.buffer.write(b'ONE')
    elif args[1].endswith('/two.txt'): sys.stdout.buffer.write(b'TWO!')
    else: sys.exit(4)
else: sys.exit(5)
PY
chmod 700 "$work/bin/rclone"
export PATH="$work/bin:$PATH"
export RESTIC_REPOSITORY="$work/restic"
export RESTIC_PASSWORD='local-test-only-do-not-reuse'
restic init >/dev/null
restic backup --tag 'sho-stage-smoke' --stdin-filename remote-sample.tar \
  --stdin-from-command -- python3 ops/backup/stream_remote_tar.py 'dropbox:Apps/test' >/dev/null
restic check --read-data >/dev/null
restic snapshots --json --tag sho-stage-smoke > "$work/snapshots.json"
jq -e 'type=="array" and length==1' "$work/snapshots.json" >/dev/null
snap_id="$(jq -r '.[0].id' "$work/snapshots.json")"
restic dump "$snap_id" /remote-sample.tar > "$work/restore.tar"
[[ "$(tar -xOf "$work/restore.tar" payload/one.txt)" == ONE ]]
[[ "$(tar -xOf "$work/restore.tar" payload/two.txt)" == 'TWO!' ]]
# Short-read data MUST propagate a nonzero error from the subprocess through restic.
if MOCK_BAD=1 restic backup --tag 'sho-stage-smoke-broken' --stdin-filename truncated.tar \
     --stdin-from-command -- python3 ops/backup/stream_remote_tar.py 'dropbox:Apps/test' >/dev/null 2>&1; then
  echo '::error::Restic accepted a truncated streaming source' >&2
  exit 1
fi
echo 'SHO Restic streaming save/restore/fail-closed: PASS'
