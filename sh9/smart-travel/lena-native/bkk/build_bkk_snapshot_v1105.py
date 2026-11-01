#!/usr/bin/env python3
"""SH9 v1105 · BKK GTFS → compact *local-only pilot* timetable snapshot.
Official source: https://bkk.hu/gtfs/budapest_gtfs.zip, CC BY 4.0.
No downloads, credentials or paid calls; the operator passes a reviewed ZIP.
The output contains scheduled departures, NOT realtime or verified walking.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import pathlib
import re
import sys
import zipfile

SCHEMA = "sh9.bkk.gtfs/1"
SOURCE = "BKK Zrt., CC BY 4.0"
SOURCE_URL = "https://bkk.hu/gtfs/budapest_gtfs.zip"
REQUIRED = {"agency.txt", "routes.txt", "trips.txt", "stop_times.txt", "stops.txt"}
MAX_ZIP_BYTES = 90 * 1024 * 1024
MAX_OUTPUT = 9 * 1024 * 1024
MAX_STOP_TIMES = 110000
ROUTE_ID = re.compile(r"^[^\x00-\x1f<>]{1,60}$")


def table(zf: zipfile.ZipFile, filename: str):
    match = next((name for name in zf.namelist() if name.split("/")[-1].lower() == filename), None)
    if match is None:
        return []
    info = zf.getinfo(match)
    if info.file_size > 150 * 1024 * 1024:
        raise ValueError(f"{filename}: uncompressed CSV too large")
    with zf.open(match) as stream:
        yield from csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline=""))


def gtfs_date(value: str) -> str:
    if not re.fullmatch(r"\d{8}", value or ""):
        raise ValueError("Invalid GTFS calendar date")
    date = dt.date(int(value[:4]), int(value[4:6]), int(value[6:8]))
    return date.isoformat()


def secs(s: str) -> int:
    if not re.fullmatch(r"\d{1,3}:\d{2}:\d{2}", s or ""):
        raise ValueError("Invalid GTFS time")
    h, m, sec = map(int, s.split(":"))
    if h > 47 or m > 59 or sec > 59:
        raise ValueError("Out-of-range GTFS time")
    return h * 3600 + m * 60 + sec


def build(zip_path: pathlib.Path, route_names: set[str], generated_at: str) -> dict:
    if not route_names or len(route_names) > 24:
        raise ValueError("Choose 1–24 BKK route short names")
    if zip_path.stat().st_size > MAX_ZIP_BYTES:
        raise ValueError("GTFS ZIP too large for pilot")
    with zipfile.ZipFile(zip_path) as zf:
        names = {name.split("/")[-1].lower() for name in zf.namelist()}
        if not REQUIRED.issubset(names):
            raise ValueError("Missing mandatory GTFS CSV files")
        rows = [
            r for r in table(zf, "routes.txt")
            if (r.get("route_short_name") or "").strip() in route_names
        ]
        if not rows:
            raise ValueError("No selected BKK route names found")
        route_ids = {r["route_id"]: (r.get("route_short_name") or "").strip()
                     for r in rows if ROUTE_ID.fullmatch(r.get("route_id") or "")}
        trips = {}
        for row in table(zf, "trips.txt"):
            if row.get("route_id") in route_ids and ROUTE_ID.fullmatch(row.get("trip_id") or ""):
                trips[row["trip_id"]] = {
                    "route": route_ids[row["route_id"]],
                    "service": row.get("service_id", ""),
                    "headsign": (row.get("trip_headsign") or "")[:100],
                    "events": [],
                }
        if not trips:
            raise ValueError("Selected lines contain no trips")
        # stop_times.txt can be >1M rows, but retained rows capped.
        n = 0
        for row in table(zf, "stop_times.txt"):
            trip = trips.get(row.get("trip_id"))
            if trip is None:
                continue
            n += 1
            if n > MAX_STOP_TIMES:
                raise ValueError("Too many selected stop-time rows")
            arr, dep = secs(row.get("arrival_time", "")), secs(row.get("departure_time", ""))
            seq = int(row.get("stop_sequence") or 0)
            if arr > dep or seq <= 0 or not row.get("stop_id"):
                raise ValueError("Invalid stop time/sequence")
            trip["events"].append((seq, row["stop_id"], arr, dep))
        trips = {k: v for k, v in trips.items() if len(v["events"]) >= 2}
        if not trips:
            raise ValueError("No usable scheduled departures")
        referenced_stops = {ev[1] for trip in trips.values() for ev in trip["events"]}
        stops = {}
        for row in table(zf, "stops.txt"):
            stop_id = row.get("stop_id")
            if stop_id not in referenced_stops:
                continue
            name = (row.get("stop_name") or "").strip()
            lat, lon = float(row.get("stop_lat") or "nan"), float(row.get("stop_lon") or "nan")
            if not name or not 45 <= lat <= 49 or not 16 <= lon <= 23:
                raise ValueError("Stop without valid name and Hungarian coordinates")
            stops[stop_id] = [name[:120], round(lat, 6), round(lon, 6)]
        if len(stops) != len(referenced_stops):
            raise ValueError("Missing referenced stops")
        # calendar supports dates + optional exceptions.
        services = {}
        for row in table(zf, "calendar.txt"):
            service = row.get("service_id")
            if not service:
                continue
            services[service] = {
                "start": gtfs_date(row.get("start_date", "")),
                "end": gtfs_date(row.get("end_date", "")),
                "days": [int(row.get(key) or 0) for key in
                         ("monday", "tuesday", "wednesday", "thursday", "friday",
                          "saturday", "sunday")],
                "exceptions": {},
            }
        for row in table(zf, "calendar_dates.txt"):
            service_id = row.get("service_id")
            if not service_id:
                continue
            if service_id not in services:
                # Exception-only GTFS services are legal.
                services[service_id] = {
                    "start": None, "end": None, "days": [0] * 7, "exceptions": {}
                }
            kind = int(row.get("exception_type") or 0)
            if kind not in (1, 2):
                raise ValueError("Invalid GTFS calendar exception")
            services[service_id]["exceptions"][gtfs_date(row.get("date", ""))] = kind == 1
        used = {v["service"] for v in trips.values()}
        if not used.issubset(services):
            raise ValueError("Missing calendar data for selected trips")
        services = {key: services[key] for key in used}
        trip_list = []
        for trip in trips.values():
            events = sorted(trip["events"], key=lambda e: e[0])
            if any(events[i + 1][0] == events[i][0] or
                   events[i + 1][2] < events[i][3] for i in range(len(events) - 1)):
                raise ValueError("Unsorted or overlapping stop sequences")
            trip_list.append([trip["route"], trip["service"], trip["headsign"],
                              [list(e[1:]) for e in events]])
        # Feed validity envelope uses actual service calendars, not build time.
        starts = [v["start"] for v in services.values() if v["start"]]
        ends = [v["end"] for v in services.values() if v["end"]]
        all_ex = [day for v in services.values() for day in v["exceptions"]]
        feed_start = min(starts + all_ex) if starts or all_ex else None
        feed_end = max(ends + all_ex) if ends or all_ex else None
        snapshot = {
            "schema": SCHEMA, "source": SOURCE, "sourceUrl": SOURCE_URL,
            "license": "CC-BY-4.0", "generatedAt": generated_at,
            "coverage": "stop-to-stop", "live": False,
            "feedStart": feed_start, "feedEnd": feed_end,
            "routes": sorted(set(route_ids.values())),
            "stops": stops, "services": services, "trips": trip_list,
        }
        encoded = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        if len(encoded) > MAX_OUTPUT:
            raise ValueError("Filtered GTFS output too large; reduce route names")
        return snapshot


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--zip", type=pathlib.Path, required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--routes", nargs="+", default=["17", "19", "41", "260"])
    args = parser.parse_args()
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    result = build(args.zip, set(args.routes), now)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"BKK CC BY 4.0 snapshot: {len(result['routes'])} routes, "
          f"{len(result['trips'])} trips, {len(result['stops'])} stops -> {args.output}")


if __name__ == "__main__":
    main()
