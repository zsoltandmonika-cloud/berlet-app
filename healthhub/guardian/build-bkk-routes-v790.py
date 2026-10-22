#!/usr/bin/env python3
"""Generate strictly source-backed route shapes/stops for 260, 17 and 19 from BKK official GTFS.

No coordinates are invented. Fail closed if fresh feed is missing or routes incomplete.
The generated JSON is the only input to the map; no API key or personal data is needed.
"""
from __future__ import annotations
import collections
import csv
import datetime as dt
import io
import json
import os
from pathlib import Path
import tempfile
import urllib.error
import urllib.request
import zipfile

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "bkk-routes-v790.json"
URLS = (
    "https://go.bkk.hu/api/static/v1/public-gtfs/budapest_gtfs.zip",
    "https://bkk.hu/gtfs/budapest_gtfs.zip",
)
NAMES = ("260", "17", "19")
MAX_BYTES = 60 * 1024 * 1024


def fetch() -> bytes:
    override = os.environ.get("BKK_GTFS_LOCAL_ZIP")
    if override:
        return Path(override).read_bytes()
    errors = []
    for url in URLS:
        try:
            request = urllib.request.Request(
                url, headers={"User-Agent": "HealthHubTransit/1.0 (+https://github.com/zsoltandmonika-cloud/berlet-app)",
                              "Accept": "application/zip"})
            with urllib.request.urlopen(request, timeout=70) as response:
                raw = response.read(MAX_BYTES + 1)
                if len(raw) > MAX_BYTES:
                    raise ValueError("GTFS feed too large")
                if len(raw) < 100 or not zipfile.is_zipfile(io.BytesIO(raw)):
                    raise ValueError("Invalid GTFS ZIP")
                return raw
        except Exception as e:
            errors.append(f"{url}: {type(e).__name__}: {e}")
    raise RuntimeError("Failed to fetch official BKK GTFS feed: " + "; ".join(errors))


def rows(archive: zipfile.ZipFile, filename: str):
    names = {n.lower(): n for n in archive.namelist()}
    resolved = names.get(filename.lower())
    if not resolved:
        raise RuntimeError(f"Missing GTFS {filename}")
    with archive.open(resolved) as binary:
        text = io.TextIOWrapper(binary, encoding="utf-8-sig", newline="")
        yield from csv.DictReader(text)


def fixcoord(n: str, maxabs: float) -> float:
    f = float(n)
    if not (-maxabs <= f <= maxabs):
        raise ValueError("Bad coordinate")
    return round(f, 6)


def make_document(raw: bytes):
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        routes = [r for r in rows(z, "routes.txt") if (r.get("route_short_name") or "").strip() in NAMES]
        wanted = {r["route_id"]: r for r in routes}
        if set((r.get("route_short_name") or "").strip() for r in routes) != set(NAMES):
            raise RuntimeError("GTFS missing one or more requested lines")
        counter = collections.Counter()
        trip_details = {}
        for t in rows(z, "trips.txt"):
            rid = t.get("route_id")
            sid = t.get("shape_id")
            if rid not in wanted or not sid:
                continue
            direction = str(t.get("direction_id") or "0")
            key = (rid, direction, sid)
            counter[key] += 1
            if key not in trip_details:
                trip_details[key] = t
        selected = {}
        for rid in wanted:
            bydir = {}
            for (route_id, direction, shape), n in counter.items():
                if route_id == rid:
                    bydir.setdefault(direction, []).append((n, shape))
            picked = []
            for direction, variants in bydir.items():
                # Most-frequent pattern per direction. Deliberately no fake branch geometry.
                n, shape = sorted(variants, key=lambda x: (-x[0], x[1]))[0]
                picked.append((rid, direction, shape, n))
            if not picked:
                raise RuntimeError(f"No shape-equipped trips for route {rid}")
            selected[rid] = picked
        shapes_needed = {key[2] for variants in selected.values() for key in variants}
        geometry = collections.defaultdict(list)
        for p in rows(z, "shapes.txt"):
            sid = p.get("shape_id")
            if sid in shapes_needed:
                try:
                    lon = fixcoord(p["shape_pt_lon"], 180)
                    lat = fixcoord(p["shape_pt_lat"], 90)
                    seq = int(p["shape_pt_sequence"])
                    geometry[sid].append((seq, [lon, lat]))
                except (KeyError, ValueError):
                    continue
        for sid in geometry:
            geometry[sid].sort(key=lambda x: x[0])
        trip_ids = {trip_details[(rid, dir, sid)]["trip_id"] for lines in selected.values()
                    for rid, dir, sid, _n in lines}
        stop_seq = collections.defaultdict(list)
        for r in rows(z, "stop_times.txt"):
            if r.get("trip_id") in trip_ids:
                try:
                    stop_seq[r["trip_id"]].append((int(r["stop_sequence"]), r["stop_id"]))
                except (KeyError, ValueError):
                    continue
        stop_ids = {stop_id for trip in stop_seq.values() for _seq, stop_id in trip}
        stops = {}
        for r in rows(z, "stops.txt"):
            if r.get("stop_id") in stop_ids:
                try:
                    stops[r["stop_id"]] = {
                        "id": r["stop_id"], "name": r.get("stop_name", "").strip()[:90],
                        "lng": fixcoord(r["stop_lon"], 180), "lat": fixcoord(r["stop_lat"], 90)
                    }
                except (KeyError, ValueError):
                    continue
        out = {}
        modes = {"260": "bus", "17": "tram", "19": "tram"}
        for short in NAMES:
            records = [r for r in routes if r.get("route_short_name", "").strip() == short]
            lines = []
            for r in records:
                for rid, direction, shape_id, frequency in selected[r["route_id"]]:
                    coords = [point for _i, point in geometry.get(shape_id, [])]
                    if len(coords) < 2:
                        continue
                    trip = trip_details[(rid, direction, shape_id)]
                    uniq_stops = []
                    seen = set()
                    for seq, stopid in sorted(stop_seq.get(trip["trip_id"], [])):
                        if stopid in stops and (not uniq_stops or uniq_stops[-1]["id"] != stopid):
                            uniq_stops.append(stops[stopid])
                            seen.add(stopid)
                    if not uniq_stops:
                        raise RuntimeError(f"No stops for {short} {shape_id}")
                    # Downsample huge shapes, preserving endpoints, so mobile MapLibre stays responsive.
                    if len(coords) > 1750:
                        stride = (len(coords) + 1748) // 1749
                        coords = coords[::stride] + ([coords[-1]] if coords[-1] != coords[::stride][-1] else [])
                    lines.append({
                        "direction": direction, "headsign": (trip.get("trip_headsign") or r.get("route_long_name") or short)[:100],
                        "shape": coords, "stops": uniq_stops, "tripCountInFeed": frequency
                    })
            if not lines:
                raise RuntimeError(f"No valid coordinates/stops for requested BKK line {short}")
            # Keep major pattern per direction, no synthesized missing direction.
            color = records[0].get("route_color", "").strip().upper()
            if len(color) != 6 or any(c not in "0123456789ABCDEF" for c in color):
                color = "2476C5" if short == "260" else "C99205"
            out[short] = {"name": short, "mode": modes[short],
                          "longName": records[0].get("route_long_name", ""),
                          "color": f"#{color}", "variants": lines}
        return {
            "schemaVersion": 1, "source": "BKK Zrt., CC BY 4.0",
            "sourceUrl": URLS[0], "feedType": "GTFS static timetable (NOT real-time)",
            "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "routes": out
        }


def main():
    doc = make_document(fetch())
    # The script is repeatable with BKK_GTFS_LOCAL_ZIP to support synthetic fixture tests.
    serialized = json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=HERE) as tmp:
        tmp.write(serialized)
        temp_name = tmp.name
    os.replace(temp_name, OUTPUT)
    print(f"Validated official BKK GTFS: {', '.join(NAMES)}; {len(serialized):,} bytes")
    for key, route in doc["routes"].items():
        print(f"  {key}: {len(route['variants'])} directions, " +
              ", ".join(str(len(v["stops"])) + " stops" for v in route["variants"]))


if __name__ == "__main__":
    main()
