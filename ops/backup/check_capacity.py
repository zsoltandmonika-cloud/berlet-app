#!/usr/bin/env python3
"""Fail closed before staging a large disaster-recovery archive on a small runner."""
import argparse
import shutil

GIB = 1024 ** 3
DEFAULT_MIN_FREE_GIB = 200  # Conservative planning floor for ~40-45 GB cloud snapshots.


def check_capacity(path: str, minimum_gib: int = DEFAULT_MIN_FREE_GIB, disk_usage=shutil.disk_usage):
    if minimum_gib < DEFAULT_MIN_FREE_GIB:
        raise ValueError(f"Minimum free disk cannot be below {DEFAULT_MIN_FREE_GIB} GiB")
    free_bytes = disk_usage(path).free
    required_bytes = minimum_gib * GIB
    if free_bytes < required_bytes:
        raise RuntimeError(
            f"Backup runner has {free_bytes / GIB:.1f} GiB free at {path}; "
            f"requires at least {minimum_gib} GiB free. "
            "Default GitHub-hosted runners are too small; use an approved isolated larger runner."
        )
    return free_bytes


def main():
    parser = argparse.ArgumentParser(description="Check SHO temporary backup capacity")
    parser.add_argument("path")
    parser.add_argument("--minimum-free-gib", type=int, default=DEFAULT_MIN_FREE_GIB)
    args = parser.parse_args()
    free = check_capacity(args.path, args.minimum_free_gib)
    print(f"Capacity preflight OK: {free / GIB:.1f} GiB free")


if __name__ == "__main__":
    main()
