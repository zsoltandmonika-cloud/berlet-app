#!/usr/bin/env python3
"""Derive searchable HealthHub v801 line catalog only from official BKK static GTFS.
No synthetic route entries, vehicle locations, estimates, personal data or API key.
"""
from __future__ import annotations
import csv
import datetime as dt
import io
import json
import re
import zipfile
from pathlib import Path

OUTPUT = Path(__file__).with_name("bkk-catalog-v801.json")
SOURCE = "BKK Zrt., CC BY 4.0"
ROUTE_TYPES = {"0":"tram","1":"metro","2":"rail","3":"bus","11":"trolley",
               "100":"rail","109":"hev","400":"metro","700":"bus","800":"trolley"}

def source_rows(z:zipfile.ZipFile, filename:str):
    matches=[n for n in z.namelist() if n.split("/")[-1].lower()==filename.lower()]
    if len(matches)!=1:raise ValueError(f"Missing or duplicate official GTFS {filename}")
    with z.open(matches[0]) as raw:
        yield from csv.DictReader(io.TextIOWrapper(raw,encoding="utf-8-sig",newline=""))

def make_catalog(raw:bytes):
    grouped={}
    by_route_id={}
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        for row in source_rows(z,"routes.txt"):
            short=(row.get("route_short_name") or "").strip().upper()
            route_id=(row.get("route_id") or "").strip()
            typ=(row.get("route_type") or "").strip()
            if not short or not route_id or len(short)>16 or not re.fullmatch(r"[\wÀ-ž-]+",short):continue
            mode=ROUTE_TYPES.get(typ,"other")
            if short.startswith("H") and short[1:].isdigit() and mode in ("rail","hev"):mode="hev"
            if short.startswith("M") and short[1:].isdigit() and mode in ("rail","metro"):mode="metro"
            key=(mode,short)
            item=grouped.setdefault(key,{"id":short,"mode":mode,
                "name":(row.get("route_long_name") or "").strip()[:120],
                "gtfsRouteIds":[],"directions":[]})
            if route_id not in item["gtfsRouteIds"]:item["gtfsRouteIds"].append(route_id)
            by_route_id[route_id]=key
        if not grouped or not all(any(k[1]==n for k in grouped) for n in ("260","17","19")):
            raise ValueError("Official BKK route catalogue is empty or missing baseline routes")
        directions={}
        for row in source_rows(z,"trips.txt"):
            key=by_route_id.get((row.get("route_id") or "").strip())
            if not key:continue
            headsign=(row.get("trip_headsign") or "").strip()[:100]
            if headsign and len(directions.setdefault(key,set()))<10:directions[key].add(headsign)
    if len(grouped)>3000:raise ValueError("Unexpectedly large BKK route catalog")
    for key,route in grouped.items():
        route["gtfsRouteIds"].sort()
        route["directions"]=sorted(directions.get(key,set()),key=str.casefold)
    lines=sorted(grouped.values(),key=lambda r:(r["mode"],r["id"]))
    return {"schemaVersion":1,"source":SOURCE,"feedType":"GTFS static route catalog (NOT real-time)",
        "sourceUrl":"https://opendata.bkk.hu/data-sources",
        "generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "routes":lines}

def save_catalog(raw:bytes):
    doc=make_catalog(raw)
    OUTPUT.write_text(json.dumps(doc,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print(f"BKK v801 official line catalog: {len(doc['routes'])} lines, {OUTPUT.stat().st_size:,} bytes")
    return doc
