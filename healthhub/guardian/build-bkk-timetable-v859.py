#!/usr/bin/env python3
"""HealthHub v859: compact verified timetable for route-planner pilot.
Uses the SAME official BKK GTFS archive as build-bkk-routes-v790.py.
Only timetable stop times for 260, 17, 19, 1, 41. Not live arrivals.
No user data, Google APIs or API keys.
"""
from __future__ import annotations
from collections import defaultdict
from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo
from pathlib import Path
import csv, io, json, tempfile, os, zipfile

HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"bkk-timetable-v859.json"
SOURCE="BKK Zrt., CC BY 4.0"
LINES={"260","17","19","1","41"}
LOCAL=ZoneInfo("Europe/Budapest")
DAYS=4

def rows(z,name):
    paths=[x for x in z.namelist() if x.lower().split("/")[-1]==name]
    if len(paths)!=1:raise ValueError("Missing or ambiguous GTFS "+name)
    with z.open(paths[0]) as fp:
        yield from csv.DictReader(io.TextIOWrapper(fp,encoding="utf-8-sig",newline=""))

def minute(value):
    try:
        fields=value.split(":")
        if len(fields)!=3:return None
        hh,mm,ss=map(int,fields)
        if hh<0 or hh>47 or mm not in range(60) or ss not in range(60):return None
        return hh*60+mm+(1 if ss>=30 else 0)
    except (AttributeError,TypeError,ValueError):return None

def ymd(s):
    try:return datetime.strptime(s,"%Y%m%d").date()
    except (TypeError,ValueError):return None

def make_schedule(raw,today=None,now=None):
    local_today=today or datetime.now(LOCAL).date()
    stamp=now or datetime.now(timezone.utc)
    days=[local_today+timedelta(days=i) for i in range(DAYS)]
    with zipfile.ZipFile(io.BytesIO(raw)) as zipf:
        lines={}
        for row in rows(zipf,"routes.txt"):
            short=str(row.get("route_short_name") or "").strip().upper()
            if short in LINES:
                if short in {"1","17","19","41"} and str(row.get("route_type"))!="0":
                    continue
                lines[row["route_id"]]=short
        if not {"260","17","19"}.issubset(set(lines.values())):
            raise ValueError("Required BKK lines absent from official feed")
        # Calendar is optional when every exception is in calendar_dates.
        calendar={}
        try:
            for row in rows(zipf,"calendar.txt"):
                begin=ymd(row.get("start_date"));end=ymd(row.get("end_date"))
                if begin and end:
                    calendar[row["service_id"]]=(begin,end,[row.get(day)=="1"
                        for day in ("monday","tuesday","wednesday","thursday",
                                    "friday","saturday","sunday")])
        except ValueError:
            pass
        except KeyError:
            pass
        exceptions=defaultdict(dict)
        for row in rows(zipf,"calendar_dates.txt"):
            when=ymd(row.get("date"))
            if when in days and row.get("exception_type") in ("1","2"):
                exceptions[row["service_id"]][when]=row["exception_type"]=="1"
        def active(service,day):
            overrides=exceptions.get(service,{})
            if day in overrides:return overrides[day]
            record=calendar.get(service)
            return bool(record and record[0]<=day<=record[1] and record[2][day.weekday()])
        trips={}
        for row in rows(zipf,"trips.txt"):
            rid=row.get("route_id")
            if rid not in lines:continue
            service=row.get("service_id")
            active_days=[day for day in days if active(service,day)]
            if not active_days:continue
            trip=str(row.get("trip_id") or "")
            if not trip or len(trip)>100:continue
            trips[trip]=(lines[rid],active_days)
        if not trips:raise ValueError("No active scheduled BKK trips for coming days")
        timetable=defaultdict(list)
        for row in rows(zipf,"stop_times.txt"):
            tid=row.get("trip_id")
            if tid not in trips:continue
            stop=str(row.get("stop_id") or "")
            arrive=minute(row.get("arrival_time"))
            depart=minute(row.get("departure_time"))
            if not stop or arrive is None or depart is None:continue
            if depart<arrive:continue
            try:seq=int(row["stop_sequence"])
            except (ValueError,KeyError):continue
            timetable[tid].append((seq,stop,arrive,depart))
        output=[]
        for trip,(line,active_days) in trips.items():
            stops=sorted(timetable.get(trip,()))
            if len(stops)<2:continue
            for day in active_days:
                midnight=datetime.combine(day,time(0,0),tzinfo=LOCAL)
                record=[]
                for _,stop,arrive,depart in stops:
                    local_arrive=midnight+timedelta(minutes=arrive)
                    local_depart=midnight+timedelta(minutes=depart)
                    utc_arrive=int(local_arrive.timestamp()//60)
                    utc_depart=int(local_depart.timestamp()//60)
                    record.append([stop,utc_arrive,utc_depart])
                output.append([line,trip,record])
        if len(output)<50:raise ValueError("BKK GTFS schedule unexpectedly sparse")
        return {"schemaVersion":1,"source":SOURCE,
         "feedType":"BKK GTFS schedule - planned departures, NOT realtime",
         "generatedAt":stamp.astimezone(timezone.utc).isoformat(timespec="seconds"),
         "timezone":"Europe/Budapest","days":[d.isoformat() for d in days],
         "routes":sorted(set(lines.values())),
         "trips":output}

def save_schedule(raw):
    doc=make_schedule(raw)
    serialized=json.dumps(doc,ensure_ascii=False,separators=(",",":"))+"\n"
    if len(serialized.encode("utf-8"))>20_000_000:
        raise ValueError("Too many active trips for mobile: >20MB")
    with tempfile.NamedTemporaryFile("w",encoding="utf-8",delete=False,dir=OUTPUT.parent) as f:
        f.write(serialized)
        tmp=f.name
    os.replace(tmp,OUTPUT)
    print("v859 BKK verified timetable:",len(doc["trips"]),"daily trip instances",
          len(serialized.encode("utf-8")),"bytes",doc["days"])
    return doc
