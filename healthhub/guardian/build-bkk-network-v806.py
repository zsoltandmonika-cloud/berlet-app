#!/usr/bin/env python3
"""Build BKK's complete searchable route/stop network from ONE official GTFS ZIP.

Static stop sequence graph, not a real-time or scheduled journey plan.
No guessed stops, coordinates, routes or personal data. One representative
frequency-ranked trip for each route_id/direction; alternate patterns may be missing.
"""
from __future__ import annotations
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
import csv
import io
import json
import math
import tempfile
import os
import zipfile

OUTPUT=Path(__file__).with_name("bkk-network-v806.json")
SOURCE="BKK Zrt., CC BY 4.0"
NON_ROUTABLE={"960"}  # nighttime, advance-request Telebusz; no verified operating time / booking in pilot
MODES={"0":"tram","1":"metro","2":"rail","3":"bus","11":"trolley",
       "100":"rail","109":"hev","400":"metro","700":"bus","800":"trolley"}

def rows(z,filename):
    matched=[n for n in z.namelist() if n.lower().split("/")[-1]==filename]
    if len(matched)!=1:raise ValueError("Missing or ambiguous "+filename)
    with z.open(matched[0]) as raw:
        yield from csv.DictReader(io.TextIOWrapper(raw,encoding="utf-8-sig",newline=""))

def getmode(r):
    short=(r.get("route_short_name") or "").strip().upper()
    mode=MODES.get((r.get("route_type") or "").strip(),"other")
    if short.startswith("H") and short[1:].isdigit() and mode in ("rail","hev"):return "hev"
    if short.startswith("M") and short[1:].isdigit() and mode in ("rail","metro"):return "metro"
    return mode

def make_network(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        routes={}
        for r in rows(z,"routes.txt"):
            rid=(r.get("route_id") or "").strip()
            short=(r.get("route_short_name") or "").strip().upper()
            if not rid or not short or len(short)>16 or short in NON_ROUTABLE:continue
            routes[rid]=(short,getmode(r))
        if not routes:raise ValueError("BKK GTFS has no routes")
        counters=Counter()
        representatives={}
        for t in rows(z,"trips.txt"):
            rid=t.get("route_id")
            if rid not in routes:continue
            trip=t.get("trip_id")
            if not trip:continue
            key=(rid,str(t.get("direction_id") or "0"),t.get("shape_id") or "")
            counters[key]+=1
            representatives.setdefault(key,(trip,(t.get("trip_headsign") or "")[:100]))
        selected={}
        for key,count in counters.items():
            rid,direction,_shape=key
            k=(rid,direction)
            if k not in selected or count>selected[k][0]:
                selected[k]=(count,representatives[key])
        trips={}
        for (rid,direction),(_count,(trip,headsign)) in selected.items():
            trips[trip]=(rid,direction,headsign)
        if not trips:raise ValueError("BKK GTFS missing representative trips")
        stopseq=defaultdict(list)
        for st in rows(z,"stop_times.txt"):
            trip=st.get("trip_id")
            if trip not in trips:continue
            try:
                seq=int(st["stop_sequence"])
                stopid=st["stop_id"]
                if not stopid:continue
                stopseq[trip].append((seq,stopid))
            except (KeyError,ValueError):pass
        wanted={id for entries in stopseq.values() for _,id in entries}
        stops={}
        for st in rows(z,"stops.txt"):
            sid=st.get("stop_id")
            if sid not in wanted:continue
            try:
                lat=float(st["stop_lat"]);lng=float(st["stop_lon"])
                if not math.isfinite(lat) or not math.isfinite(lng) or not (45<=lat<=49 and 16<=lng<=23):continue
                stops[sid]=[sid,(st.get("stop_name") or "")[:90],round(lat,6),round(lng,6)]
            except (KeyError,ValueError):continue
        output=[]
        for trip,(rid,direction,headsign) in trips.items():
            seq=sorted(stopseq.get(trip,()))
            ordered=[]
            for _,sid in seq:
                if sid in stops and (not ordered or ordered[-1][0]!=sid):
                    ordered.append(stops[sid])
            if len(ordered)<2:continue
            short,mode=routes[rid]
            output.append({"id":short,"mode":mode,"direction":direction,
                "headsign":headsign,"stops":ordered})
        if len(output)<100:raise ValueError("Unexpectedly sparse full BKK network")
        present={x["id"] for x in output}
        if not {"260","17","19"}.issubset(present):raise ValueError("Missing baseline BKK routes")
        if len(output)>8000:raise ValueError("Unexpected full BKK network size")
        output.sort(key=lambda r:(r["mode"],r["id"],r["direction"],r["headsign"]))
        return {"schemaVersion":1,"source":SOURCE,
            "feedType":"BKK GTFS static route/stop patterns; NOT time-aware / real-time",
            "generatedAt":datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "limitations":"One most-frequent stop pattern per GTFS route/direction; no exact operating times, road/pathway walking, live transfers, or guaranteed service.",
            "routes":output}

def save_network(raw):
    doc=make_network(raw)
    serialized=json.dumps(doc,ensure_ascii=False,separators=(",",":"))+"\n"
    with tempfile.NamedTemporaryFile("w",encoding="utf-8",delete=False,dir=OUTPUT.parent) as temp:
        temp.write(serialized)
        name=temp.name
    os.replace(name,OUTPUT)
    print(f"v806 source-backed BKK network: {len(doc['routes'])} directed patterns / {len({(r['mode'],r['id']) for r in doc['routes']})} named routes / {len(serialized):,} bytes")
    return doc
