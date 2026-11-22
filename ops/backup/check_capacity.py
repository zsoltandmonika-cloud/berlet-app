#!/usr/bin/env python3
"""Fail-closed scratch-space preflight from live read-only rclone source sizes."""
import argparse
import shutil

GIB = 1024 ** 3
MULTIPLIER = 4
EXTRA_RESERVE_GIB = 4


def required_bytes(source_bytes: int, extra_reserve_gib: int = EXTRA_RESERVE_GIB) -> int:
    if type(source_bytes) is not int or source_bytes < 0:
        raise ValueError("Source bytes must be a nonnegative integer")
    if type(extra_reserve_gib) is not int or extra_reserve_gib < EXTRA_RESERVE_GIB:
        raise ValueError(f"Safety reserve must be at least {EXTRA_RESERVE_GIB} GiB")
    # Remote payload + staging + compressed archive + encrypted upload read-back.
    # The additional reserve covers Git mirrors, LFS and DB dump until measured.
    return max(5 * GIB, MULTIPLIER * source_bytes + extra_reserve_gib * GIB)


def check_capacity(path: str, source_bytes: int, extra_reserve_gib: int = EXTRA_RESERVE_GIB,
                   disk_usage=shutil.disk_usage):
    required = required_bytes(source_bytes, extra_reserve_gib)
    free = disk_usage(path).free
    if free < required:
        raise RuntimeError(
            f"Backup runner scratch space insufficient: {free / GIB:.1f} GiB free, "
            f"{required / GIB:.1f} GiB required from measured remote sources. "
            "Select a larger isolated runner or use streaming incremental backup."
        )
    return free, required


def main():
    parser = argparse.ArgumentParser(description="Measured SHO backup temporary disk requirement")
    parser.add_argument("path")
    parser.add_argument("--source-bytes", type=int, required=True)
    parser.add_argument("--extra-reserve-gib", type=int, default=EXTRA_RESERVE_GIB)
    args = parser.parse_args()
    free, required = check_capacity(args.path, args.source_bytes, args.extra_reserve_gib)
    print(f"Backup capacity preflight OK: {free/GIB:.1f} GiB free, "
          f"{required/GIB:.1f} GiB required")


if __name__ == "__main__":
    main()
