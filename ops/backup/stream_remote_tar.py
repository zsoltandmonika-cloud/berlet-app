#!/usr/bin/env python3
"""Stream one rclone source into a validated uncompressed tar on stdout.

No file bodies are staged to disk. Designed for restic --stdin-from-command.
FAIL CLOSED: a changed listing, short read, invalid path, or rclone error
returns nonzero. Restic snapshots from incomplete runs must never be counted.
"""
import argparse
import io
import json
import re
import subprocess
import sys
import tarfile


def safe_path(path):
    if not isinstance(path, str) or not path or path.startswith("/") or "\\" in path or "\x00" in path:
        raise ValueError("Invalid rclone path")
    parts = path.split("/")
    if any(p in ("", ".", "..") for p in parts) or any(ord(c) < 32 for c in path):
        raise ValueError("Unsafe rclone path")
    return path


def inventory(remote):
    result = subprocess.run(["rclone", "lsjson", "--recursive", "--files-only", remote],
                            check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    raw = json.loads(result.stdout)
    if not isinstance(raw, list) or not raw:
        raise ValueError("Remote has no files")
    output = []
    for item in raw:
        if not isinstance(item, dict) or item.get("IsDir") is True:
            raise ValueError("Unexpected rclone entry")
        path = safe_path(item.get("Path"))
        size = item.get("Size")
        if type(size) is not int or size < 0:
            raise ValueError("Invalid remote object size")
        output.append({"path": path, "size": size, "mod_time": item.get("ModTime") or ""})
    if len({x["path"] for x in output}) != len(output):
        raise ValueError("Duplicate remote object path")
    return sorted(output, key=lambda x: x["path"])


def stream(remote, out):
    before = inventory(remote)
    evidence = {"schema": "sho-rclone-inventory/1", "source": "rclone remote (read-only)",
                "file_count": len(before), "total_bytes": sum(x["size"] for x in before),
                "objects": before}
    with tarfile.open(fileobj=out, mode="w|", format=tarfile.PAX_FORMAT) as tar:
        data = (json.dumps(evidence, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()
        info = tarfile.TarInfo("_sho_inventory.json")
        info.size = len(data)
        info.mode = 0o600
        info.mtime = 0
        tar.addfile(info, io.BytesIO(data))
        for obj in before:
            remote_file = remote.rstrip("/") + "/" + obj["path"]
            proc = subprocess.Popen(["rclone", "cat", remote_file], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            try:
                member = tarfile.TarInfo("payload/" + obj["path"])
                member.size = obj["size"]
                member.mode = 0o600
                member.mtime = 0
                tar.addfile(member, proc.stdout)
                if proc.stdout.read(1):
                    raise RuntimeError("Remote object exceeded its declared size")
                if proc.wait() != 0:
                    raise RuntimeError("Failed to retrieve a remote file")
            finally:
                if proc.stdout is not None:
                    proc.stdout.close()
                if proc.poll() is None:
                    proc.kill()
                    proc.wait()
    if before != inventory(remote):
        raise RuntimeError("Remote content changed during capture: incomplete run")
    return evidence


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("remote", help="Rclone remote:path; never contains credentials")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9_-]+:[^\x00]*", args.remote):
        parser.error("Invalid rclone remote")
    try:
        evidence = stream(args.remote, sys.stdout.buffer)
        print(f"Remote tar stream captured: {evidence['file_count']} files", file=sys.stderr)
    except (ValueError, OSError, subprocess.CalledProcessError, RuntimeError, tarfile.TarError) as exc:
        print(f"::error::Remote capture failed ({type(exc).__name__}); run must not be verified", file=sys.stderr)
        sys.exit(3)


if __name__ == "__main__":
    main()
