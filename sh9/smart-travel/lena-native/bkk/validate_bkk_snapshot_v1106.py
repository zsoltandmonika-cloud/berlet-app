#!/usr/bin/env python3
"""SH9 v1106 BKK GTFS publication gate and SHA256 manifest.
Official planned times only. Never publishes bad, stale, or partial data.
Offline validator: no network, no secrets, no GitHub or Supabase writes.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import pathlib
import sys
from collections import Counter
from zoneinfo import ZoneInfo

LICENSE = "CC-BY-4.0"
SOURCE = "BKK Zrt., CC BY 4.0"
URL = "https://bkk.hu/gtfs/budapest_gtfs.zip"
LINES = ("17", "19", "41", "260")
MAX_BYTES = 9 * 1024 * 1024
MAX_AGE = dt.timedelta(days=14)
TZ = ZoneInfo("Europe/Budapest")
FIELDS = ("routes", "stops", "trips", "services")


def parse_utc(value: str) -> dt.datetime:
    if not isinstance(value, str):
        raise ValueError("Missing timestamp")
    parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include timezone")
    return parsed.astimezone(dt.timezone.utc)


def service_active(info: dict, day: dt.date) -> bool:
    key = day.isoformat()
    exceptions = info.get("exceptions") or {}
    if key in exceptions:
        return exceptions[key] is True
    start, end, days = info.get("start"), info.get("end"), info.get("days")
    return (isinstance(start, str) and isinstance(end, str)
            and start <= key <= end and isinstance(days, list)
            and len(days) == 7 and days[day.weekday()] == 1)


def check_data(data: dict, now: dt.datetime, previous: dict | None = None) -> dict:
    if now.tzinfo is None:
        raise ValueError("UTC time required")
    now = now.astimezone(dt.timezone.utc)
    today = now.astimezone(TZ).date()
    needed = set(LINES)
    if not isinstance(data, dict) or data.get("schema") != "sh9.bkk.gtfs/1":
        raise ValueError("Unknown BKK snapshot schema")
    if (data.get("source") != SOURCE or data.get("license") != LICENSE
            or data.get("sourceUrl") != URL or data.get("live") is not False
            or data.get("coverage") != "stop-to-stop"):
        raise ValueError("Official BKK license, attribution or coverage missing")
    generated = parse_utc(data.get("generatedAt"))
    if generated > now + dt.timedelta(minutes=3) or now - generated > MAX_AGE:
        raise ValueError("Snapshot processing timestamp stale")
    try:
        first = dt.date.fromisoformat(data["feedStart"])
        last = dt.date.fromisoformat(data["feedEnd"])
    except (KeyError, ValueError, TypeError) as error:
        raise ValueError("No valid GTFS calendar coverage") from error
    if first > today or last < today + dt.timedelta(days=2):
        raise ValueError("GTFS feed does not cover today and next two days")
    routes = data.get("routes")
    if not isinstance(routes, list) or set(routes) != needed:
        raise ValueError("Wrong SH9 family route set")
    if any(field not in data for field in FIELDS):
        raise ValueError("Missing timetable sections")
    stops, trips, services = data["stops"], data["trips"], data["services"]
    if not isinstance(stops, dict) or not isinstance(trips, list) or not isinstance(services, dict):
        raise ValueError("Invalid timetable record collections")
    if len(stops) < 40 or len(stops) > 2000 or len(trips) < 1000 or len(trips) > 20000:
        raise ValueError("Unexpected timetable size / possible partial download")
    for stop_id, stop in stops.items():
        if (not isinstance(stop_id, str) or not stop_id or not isinstance(stop, list)
                or len(stop) != 3 or not isinstance(stop[0], str) or not stop[0]
                or not all(isinstance(n, (float, int)) for n in stop[1:])
                or not 45 <= stop[1] <= 49 or not 16 <= stop[2] <= 23):
            raise ValueError("Invalid stop coordinate")
    modes = {"bus", "tram", "metro", "train"}
    by_line = Counter()
    future_service = set()
    for trip in trips:
        if not isinstance(trip, list) or len(trip) != 5:
            raise ValueError("Invalid GTFS trip record format")
        line, service, headsign, sequence, mode = trip
        if (line not in needed or not isinstance(service, str) or service not in services
                or mode not in modes or not isinstance(headsign, str)
                or not isinstance(sequence, list) or not 2 <= len(sequence) <= 500):
            raise ValueError("Invalid trip/service/vehicle class")
        by_line[line] += 1
        earlier = -1
        for event in sequence:
            if (not isinstance(event, list) or len(event) != 3 or event[0] not in stops
                    or not isinstance(event[1], int) or not isinstance(event[2], int)
                    or event[1] < earlier or not 0 <= event[1] <= event[2] < 48*3600):
                raise ValueError("Corrupt GTFS stop-time order")
            earlier = event[2]
        for delta in range(7):
            day = today + dt.timedelta(days=delta)
            if day <= last and service_active(services[service], day):
                future_service.add(line)
                break
    if any(by_line[line] == 0 for line in LINES):
        raise ValueError("At least one SH9 family line has no trips")
    if future_service != needed:
        raise ValueError("A family line has no scheduled service in the coming week")
    if previous:
        if previous.get("schema") == "sh9.bkk.gtfs/1":
            old = previous.get("trips") or []
            old_stops = previous.get("stops") or {}
            if len(trips) < len(old) * 0.55 or len(stops) < len(old_stops) * 0.55:
                raise ValueError("New official snapshot lost more than 45% of coverage")
    return {
        "source": SOURCE, "license": LICENSE,
        "routes": list(LINES), "lineTripCounts": dict(sorted(by_line.items())),
        "stopCount": len(stops), "tripCount": len(trips),
        "feedStart": first.isoformat(), "feedEnd": last.isoformat(),
        "generatedAt": data["generatedAt"], "coverage": "stop-to-stop",
        "live": False,
    }


def validate_file(file: pathlib.Path, now: dt.datetime, previous_file: pathlib.Path | None = None, source_sha256: str | None = None) -> dict:
    if not isinstance(source_sha256, str) or len(source_sha256) != 64 or not all(ch in '0123456789abcdef' for ch in source_sha256):
        raise ValueError('Missing official BKK ZIP SHA256 provenance')
    if not file.is_file() or file.stat().st_size > MAX_BYTES:
        raise ValueError("Missing or oversized BKK JSON")
    content = file.read_bytes()
    data = json.loads(content)
    previous = json.loads(previous_file.read_text(encoding="utf-8")) if previous_file and previous_file.is_file() else None
    info = check_data(data, now, previous)
    return {
        "schema": "sh9.bkk.feed-manifest/1",
        "filename": "bkk-selected-routes-v1106.json",
        "sha256": hashlib.sha256(content).hexdigest(),
        "sourceSha256": source_sha256,
        "bytes": len(content),
        "validatedAt": now.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        **info,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", required=True, type=pathlib.Path)
    parser.add_argument("--manifest", required=True, type=pathlib.Path)
    parser.add_argument("--previous", type=pathlib.Path)
    parser.add_argument("--source-sha256", required=True)
    args = parser.parse_args()
    now = dt.datetime.now(dt.timezone.utc)
    manifest = validate_file(args.snapshot, now, args.previous, args.source_sha256)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("BKK publication gate PASS:", manifest["tripCount"], "trips;",
          manifest["stopCount"], "stops; feed", manifest["feedStart"],
          "to", manifest["feedEnd"], "; SHA256", manifest["sha256"][:12])


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
        print(f"BKK publication REJECTED: {exc}", file=sys.stderr)
        raise SystemExit(2)
