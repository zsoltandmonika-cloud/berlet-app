#!/usr/bin/env python3
"""Offline recovery validation: fail on missing, extra, or corrupted content."""
import hashlib
import json
import sys
from pathlib import Path
from verify import REQUIRED


def validate(root: Path) -> dict:
    obj = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
    if obj.get('schema') != 'sho-backup-manifest/1':
        raise ValueError('Unsupported recovery manifest version')
    rows = obj.get('files')
    if not isinstance(rows, list) or not rows:
        raise ValueError('Empty recovery inventory')
    seen = set()
    total_bytes = 0
    for row in rows:
        p = Path(row['path'])
        if p.is_absolute() or '..' in p.parts or p.as_posix() in seen:
            raise ValueError('Unsafe/duplicate backup path')
        seen.add(p.as_posix())
        target = root / p
        if target.is_symlink() or not target.is_file():
            raise ValueError('Missing backup file: ' + p.as_posix())
        size = target.stat().st_size
        if size != row['bytes']:
            raise ValueError('File size mismatch: ' + p.as_posix())
        digest = hashlib.sha256()
        with target.open('rb') as f:
            for data in iter(lambda: f.read(4 * 1024 * 1024), b''):
                digest.update(data)
        if digest.hexdigest() != row['sha256']:
            raise ValueError('Checksum mismatch: ' + p.as_posix())
        total_bytes += size
    actual = {p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file()}
    if actual != seen | {'manifest.json'}:
        raise ValueError('Unlisted or missing files in backup')
    if not set(REQUIRED).issubset(seen):
        raise ValueError('Mandatory recovery component not present')
    if len(seen) != obj['file_count'] or total_bytes != obj['total_bytes']:
        raise ValueError('Recovery inventory totals mismatch')
    return {'backup_id': obj['backup_id'], 'files_verified': len(seen), 'bytes_verified': total_bytes}


if __name__ == '__main__':
    print(json.dumps(validate(Path(sys.argv[1]))))
