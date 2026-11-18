#!/usr/bin/env python3
"""Fetch *official* Samsung Health Data SDK 1.1.0 into a temporary CI folder.

Never add a proprietary ZIP/AAR to the repository. No third-party mirror.
Optional HH_SAMSUNG_SDK_ZIP_URL points to the official SDK ZIP only.
A nonexistent download fails the build closed, never emits a Samsung-less APK.
"""
from __future__ import annotations

import io
import os
import pathlib
import re
import sys
import urllib.parse
import urllib.request
import zipfile
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "app/private-samsung-sdk/samsung-health-data-api.aar"
PAGE = "https://developer.samsung.com/health/data/overview.html"
HOSTS = {"developer.samsung.com", "images.samsung.com", "d3unf4s5rp9dfh.cloudfront.net"}
USER_AGENT = "Mozilla/5.0 (compatible; HH-One-Private-SDK-Builder/1.0)"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.candidates = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and key in {"href", "data-url", "data-download-url", "onclick"}:
                self.candidates.append(value)


def validated_url(url: str) -> str:
    url = urllib.parse.urljoin(PAGE, url.strip())
    parts = urllib.parse.urlparse(url)
    if parts.scheme != "https" or parts.hostname not in HOSTS:
        raise ValueError("SDK source is not an allowlisted official Samsung host")
    if parts.username or parts.password:
        raise ValueError("Unexpected credentials in SDK download URL")
    return url


def fetch(url: str, limit=12_000_000) -> bytes:
    url = validated_url(url)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=25) as response:
        validated_url(response.geturl())
        body = response.read(limit + 1)
    if len(body) > limit:
        raise ValueError("SDK file larger than safe bound")
    return body


def candidates_from_official_page() -> list[str]:
    html = fetch(PAGE, limit=5_000_000).decode("utf-8", errors="replace")
    parser = Links()
    parser.feed(html)
    values = parser.candidates + re.findall(
        r"""(?:https?:)?//[^"'<> ]+?\.zip(?:\?[^"'<> ]*)?""", html, flags=re.I
    ) + re.findall(r"""["']([^"']+?\.zip(?:\?[^"']*)?)["']""", html, flags=re.I)
    found = []
    for val in values:
        # Samsung uses a license-gated /SHealth/file/<uuid> endpoint,
        # not a visible .zip URL; only follow the path observed on its
        # official SDK v1.1.0 download page.
        official_file = val.startswith("/SHealth/file/") or "/SHealth/file/" in val
        if not official_file and ("1.1.0" not in val or "zip" not in val.lower()):
            continue
        # An onclick handler is not itself a URL.
        if val.lstrip().lower().startswith(("javascript:", "function", "download(")):
            continue
        try:
            url = validated_url(val)
        except ValueError:
            continue
        if url not in found:
            found.append(url)
    return found


def install_sdk(data: bytes) -> None:
    if not zipfile.is_zipfile(io.BytesIO(data)):
        raise ValueError("Official download was not a ZIP file")
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        matches = [
            name for name in z.namelist()
            if name.split("/")[-1] == "samsung-health-data-api-1.1.0.aar"
        ]
        if len(matches) != 1:
            raise ValueError("ZIP does not include exactly one official Samsung SDK 1.1.0 AAR")
        content = z.read(matches[0])
        if not zipfile.is_zipfile(io.BytesIO(content)) or len(content) > 15_000_000:
            raise ValueError("SDK AAR archive is corrupt or oversized")
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_bytes(content)
        OUTPUT.chmod(0o600)
    print("Samsung Health Data SDK 1.1.0 AAR loaded locally for candidate compilation.")
    print("AAR is not added to git, not included as a standalone artifact.")


def main():
    url = os.environ.get("HH_SAMSUNG_SDK_ZIP_URL", "").strip()
    sources = [validated_url(url)] if url else candidates_from_official_page()
    if not sources:
        raise RuntimeError("No official Samsung SDK download endpoint found on Samsung Developer.")
    errors = []
    for source in sources[:8]:
        try:
            install_sdk(fetch(source))
            return
        except Exception as exc:
            errors.append(type(exc).__name__ + ": " + str(exc)[:160])
    raise RuntimeError(
        "Samsung SDK could not be obtained securely (" + ",".join(errors) +
        "). APK candidate blocked, existing release unaffected."
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("Private Samsung APK build blocked:", str(exc), file=sys.stderr)
        sys.exit(2)
