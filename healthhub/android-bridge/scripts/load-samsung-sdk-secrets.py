#!/usr/bin/env python3
"""Reconstruct the vendor AAR from owner-managed encrypted GitHub Actions secrets.

This is the private CI path when Samsung's licensed download endpoint won't
return a ZIP to anonymous GitHub runners. No vendor bytes enter Git history,
workflow logs or public artifacts. No fallback to an SDK-less release.
"""
from __future__ import annotations

import base64
import hashlib
import io
import os
import pathlib
import re
import sys
import zipfile

EXPECTED_SHA256 = "f5d3d83cf00b97d0bb1b1db4da076e861eb1c3e6e704d89a34e68909d2f38654"
EXPECTED_SIZE = 501608
CHUNK_SIZE = 40000
CHUNK_COUNT = 17
OUTPUT = (
    pathlib.Path(__file__).resolve().parents[1]
    / "app/private-samsung-sdk/samsung-health-data-api.aar"
)


def load() -> None:
    chunks = []
    for i in range(CHUNK_COUNT):
        value = os.getenv(f"HH_SAMSUNG_SDK_AAR_B64_{i:02d}", "").strip()
        if not value:
            raise ValueError(
                "Samsung private SDK encrypted secrets are incomplete; "
                f"expected {CHUNK_COUNT}, missing slot {i:02d}. "
                "No candidate can be built."
            )
        if len(value) > CHUNK_SIZE or not re.fullmatch(r"[A-Za-z0-9+/=]+", value):
            raise ValueError(f"Invalid secure SDK segment at slot {i:02d}")
        chunks.append(value.strip())

    payload = "".join(chunks)
    sdk = base64.b64decode(payload, validate=True)
    digest = hashlib.sha256(sdk).hexdigest()
    if len(sdk) != EXPECTED_SIZE or digest != EXPECTED_SHA256:
        raise ValueError(
            "Samsung SDK binary SHA-256/size mismatch with user-supplied "
            "and previously verified vendor v1.1.0. Build blocked."
        )
    if not zipfile.is_zipfile(io.BytesIO(sdk)):
        raise ValueError("Samsung vendor AAR is not a valid Android archive.")
    with zipfile.ZipFile(io.BytesIO(sdk)) as archive:
        names = set(archive.namelist())
        if "classes.jar" not in names or "AndroidManifest.xml" not in names:
            raise ValueError("Samsung SDK AAR has missing required entries.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(OUTPUT), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "wb") as handle:
        handle.write(sdk)
    print("PASS: SDK 1.1.0 loaded from encrypted CI secrets; checksum verified.")
    print("SDK bytes were not committed, uploaded publicly, or printed.")


if __name__ == "__main__":
    try:
        load()
    except Exception as exc:
        print("PRIVATE SDK INPUT BLOCKED:", exc, file=sys.stderr)
        sys.exit(2)
