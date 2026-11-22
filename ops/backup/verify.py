#!/usr/bin/env python3
"""Generate a deterministic integrity manifest for a private SHO backup bundle."""
import argparse
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone

REQUIRED = (
    'github/berlet-app.bundle',
    'github/MediaRadar.bundle',
    'supabase/database.dump',
    'supabase/database.toc',
    'supabase/edge-functions/index.json',
    'supabase/storage-index.json',
    'dropbox/HealthHub Cloud Vault/HealthHub/manifest.json',
    'dropbox/healthhub-vault/monika-data.json',
    'recovery/escrow.age',
)

def manifest(root: Path, backup_id: str) -> dict:
    absent = [item for item in REQUIRED if not (root / item).is_file()]
    if absent:
        raise ValueError('Missing mandatory backup components: ' + ', '.join(absent))
    if not any(x.is_file() for x in (root / 'supabase' / 'storage').rglob('*')):
        raise ValueError('Supabase Storage is empty; refusing full classification')
    if not any(x.is_file() for x in (root / 'dropbox' / 'HealthHub Cloud Vault').rglob('*')):
        raise ValueError('Dropbox vault is empty; refusing full classification')
    files = []
    for path in sorted(root.rglob('*')):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if rel == 'manifest.json':
            continue
        h = hashlib.sha256()
        with path.open('rb') as handle:
            for buf in iter(lambda: handle.read(4 * 1024 * 1024), b''):
                h.update(buf)
        files.append({'path': rel, 'bytes': path.stat().st_size, 'sha256': h.hexdigest()})
    if any(x['bytes'] == 0 for x in files if x['path'] in REQUIRED):
        raise ValueError('One or more mandatory backup files are empty')
    return {
        'schema': 'sho-backup-manifest/1',
        'backup_id': backup_id,
        'created_utc': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'source': 'read-only snapshot, not transactionally frozen across providers',
        'classification': 'CONTENT_CAPTURED_NOT_YET_REMOTE_VERIFIED',
        'file_count': len(files),
        'total_bytes': sum(i['bytes'] for i in files),
        'files': files,
    }

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('root', type=Path)
    ap.add_argument('backup_id')
    args = ap.parse_args()
    data = manifest(args.root, args.backup_id)
    (args.root / 'manifest.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf8')
    print(f'Inventory verified: {data["file_count"]} files, {data["total_bytes"]} bytes')

if __name__ == '__main__':
    main()
