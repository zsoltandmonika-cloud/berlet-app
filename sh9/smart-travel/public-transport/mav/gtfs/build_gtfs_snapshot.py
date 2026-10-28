#!/usr/bin/env python3
"""Compile a *licensed* MÁV GTFS ZIP to a compact, local SH9 timetable JSON.

Standard library only. No requests, scraping, Supabase, credentials, or publishing.
Output is created ONLY when --rights-confirmed is explicitly supplied.
Build a focused snapshot for two or more relevant stations, capturing complete
trips touching those stations, including potential transfer stops and services.

Example (after the MÁV grant and license verification):
  python3 build_gtfs_snapshot.py --zip /secure/mav.zip \
    --focus "Budapest-Keleti" --focus "Kazincbarcika" \
    --rights-confirmed --output ./data/rail-schedule.json
Do not commit or publish the output unless the actual MÁV license permits it.
"""
from __future__ import annotations
import argparse
import csv
from datetime import datetime, timezone
import io
import json
from pathlib import Path
import re
import sys
import unicodedata
import zipfile

WEEKDAYS = ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
MAX_ZIP_UNCOMPRESSED = 1_500_000_000
MAX_SELECTED_TRIPS = 25_000
MAX_STOPS = 9_000


def fail(message: str):
    raise ValueError(message)


def norm(value: str) -> str:
    txt = ''.join(x for x in unicodedata.normalize('NFD', value) if unicodedata.category(x) != 'Mn')
    return ' '.join(re.findall(r'[a-z0-9]+', txt.casefold()))


def get_member(z: zipfile.ZipFile, name: str, optional=False) -> str | None:
    matches = [n for n in z.namelist() if n.lower().split('/')[-1] == name and not n.endswith('/')]
    if len(matches) != 1:
        if optional and not matches:
            return None
        fail(f'GTFS ZIP: expected exactly one {name}; found {len(matches)}')
    return matches[0]


def rows(z: zipfile.ZipFile, member: str | None):
    if member is None:
        return
    with z.open(member) as raw:
        with io.TextIOWrapper(raw, encoding='utf-8-sig', errors='strict', newline='') as text:
            reader = csv.DictReader(text)
            for row in reader:
                if None in row:
                    fail('Malformed GTFS CSV row')
                yield row


def minutes(value: str) -> int:
    m = re.fullmatch(r'(\d{1,2}):([0-5]\d):([0-5]\d)', value or '')
    if not m:
        fail(f'Invalid GTFS time: {value!r}')
    h, mi, sec = map(int, m.groups())
    if h > 47:
        fail('GTFS time exceeds supported 47:59:59 range')
    return h * 60 + mi + (sec >= 30)


def parse(z: zipfile.ZipFile, focus: list[str], source: str, output_limit: int) -> dict:
    infos = z.infolist()
    if sum(i.file_size for i in infos) > MAX_ZIP_UNCOMPRESSED:
        fail('Archive too large; use a smaller authorized feed')
    required = {n: get_member(z, n) for n in ('stops.txt','routes.txt','trips.txt','stop_times.txt','calendar_dates.txt') if n != 'calendar_dates.txt'}
    calendar = get_member(z, 'calendar.txt', optional=True)
    exceptions = get_member(z, 'calendar_dates.txt', optional=True)
    if not calendar and not exceptions:
        fail('GTFS must contain calendar.txt and/or calendar_dates.txt')

    stops = {}
    parents = {}
    for row in rows(z, required['stops.txt']):
        sid, name = (row.get('stop_id') or '').strip(), (row.get('stop_name') or '').strip()
        if not sid or not name or len(sid) > 100 or len(name) > 160:
            fail('Invalid stop_id/stop_name')
        stops[sid] = name
        parents[sid] = (row.get('parent_station') or '').strip()
    if len(stops) > 250_000:
        fail('GTFS stops table exceeds safety bound')
    focus_norm = [norm(x) for x in focus]
    if any(len(x) < 3 for x in focus_norm):
        fail('Every --focus needs at least three meaningful characters')
    match = {sid for sid,name in stops.items() if any(f in norm(name) or norm(name) in f for f in focus_norm)}
    # Include platform child stop_ids when a parent station is selected.
    match.update(sid for sid,pid in parents.items() if pid in match)
    if not match:
        fail('No matching stations. Inspect stop names before trying another focus.')
    print(f'Focus stop IDs: {len(match)}',file=sys.stderr)

    routes = {}
    for row in rows(z, required['routes.txt']):
        rid = (row.get('route_id') or '').strip()
        if rid:
            routes[rid] = (row.get('route_short_name') or row.get('route_long_name') or 'Vasút').strip()[:80]
    trips = {}
    for row in rows(z, required['trips.txt']):
        tid = (row.get('trip_id') or '').strip()
        service = (row.get('service_id') or '').strip()
        rid = (row.get('route_id') or '').strip()
        if tid and service and rid in routes:
            trips[tid] = {'id':tid, 'service':service, 'route':routes[rid],
                          'headsign':(row.get('trip_headsign') or '').strip()[:100]}
    if len(trips) > 1_500_000:
        fail('GTFS trips table exceeds safety bound')

    services = {}
    for row in rows(z, calendar):
        service = (row.get('service_id') or '').strip()
        fr, to = (row.get('start_date') or ''), (row.get('end_date') or '')
        if service and re.fullmatch(r'\d{8}',fr) and re.fullmatch(r'\d{8}',to):
            services[service] = {'from':fr,'to':to,'days':''.join('1' if row.get(d)=='1' else '0' for d in WEEKDAYS),'exceptions':{}}
    for row in rows(z, exceptions):
        sid=(row.get('service_id') or '').strip()
        ymd=(row.get('date') or '').strip()
        change=(row.get('exception_type') or '').strip()
        if not sid or not re.fullmatch(r'\d{8}',ymd) or change not in ('1','2'):
            fail('Invalid calendar_dates.txt record')
        if sid not in services:
            services[sid]={'from':ymd,'to':ymd,'days':'0000000','exceptions':{}}
        services[sid]['exceptions'][ymd] = 1 if change=='1' else 2

    selected = set()
    for row in rows(z, required['stop_times.txt']):
        tid = (row.get('trip_id') or '').strip()
        if tid in trips and (row.get('stop_id') or '').strip() in match:
            selected.add(tid)
            if len(selected) > MAX_SELECTED_TRIPS:
                fail('More than 25,000 trips touch focus stations; narrow --focus')
    if not selected:
        fail('No trips at selected stops in the supplied GTFS feed')
    print(f'Selected trips: {len(selected)}',file=sys.stderr)
    times = {tid:[] for tid in selected}
    count = 0
    for row in rows(z, required['stop_times.txt']):
        tid = (row.get('trip_id') or '').strip()
        if tid not in selected:
            continue
        sid = (row.get('stop_id') or '').strip()
        if sid not in stops:
            continue
        arrival, depart = row.get('arrival_time') or row.get('departure_time'), row.get('departure_time') or row.get('arrival_time')
        if not arrival or not depart:
            continue
        seq = int(row.get('stop_sequence') or '0')
        times[tid].append((seq,[sid,minutes(arrival),minutes(depart)]))
        count += 1
        if count > 1_500_000:
            fail('Selected stop times exceed safety bound')
    trip_out=[]
    used_stops=set()
    used_services=set()
    for tid in sorted(selected):
        t=trips[tid]
        if t['service'] not in services:
            continue
        events=[pair for _,pair in sorted(times[tid], key=lambda x:x[0])]
        if len(events)<2 or len(events)>400:
            continue
        if any(events[i][2]>events[i+1][1] for i in range(len(events)-1)):
            continue
        trip_out.append({**t,'stops':events})
        used_stops.update(e[0] for e in events)
        used_services.add(t['service'])
    if not trip_out:
        fail('No complete scheduled trips survived validation')
    if len(used_stops)>MAX_STOPS:
        fail('More than 9,000 stops selected; narrow --focus')
    result={
        'schema':'sh9-mav-gtfs-v1',
        'timezone':'Europe/Budapest',
        'generatedAt':datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z'),
        'rightsConfirmed':True, # operator confirmed legal permission to use the source
        'source':source[:180],
        'focus':focus,
        'stops':[[sid,stops[sid]] for sid in sorted(used_stops)],
        'services':{sid:services[sid] for sid in sorted(used_services)},
        'trips':trip_out,
    }
    raw=json.dumps(result,ensure_ascii=False,separators=(',',':')).encode('utf-8')
    if len(raw)>output_limit:
        fail(f'Compiled data {len(raw):,} B exceeds --max-mb. Narrow --focus.')
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--zip',type=Path,required=True,help='authorized GTFS ZIP on local disk')
    p.add_argument('--focus',action='append',required=True,help='station name substring, repeat for route endpoints')
    p.add_argument('--output',type=Path,required=True)
    p.add_argument('--rights-confirmed',action='store_true',help='I have verified publishing/processing rights for this feed')
    p.add_argument('--source',default='MÁV official GTFS timetable')
    p.add_argument('--max-mb',type=int,default=8)
    p.add_argument('--force',action='store_true',help='replace an existing output file')
    a=p.parse_args()
    if not a.rights_confirmed:
        p.error('Explicit --rights-confirmed is required after the MÁV grant')
    if a.max_mb<1 or a.max_mb>24:
        p.error('--max-mb must be between 1 and 24')
    if not a.zip.is_file():
        p.error('Input GTFS ZIP not found')
    if a.output.exists() and not a.force:
        p.error('Output already exists; choose a new path or --force')
    with zipfile.ZipFile(a.zip,'r') as z:
        data=parse(z,a.focus,a.source,a.max_mb*1024*1024)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(f'Created {a.output}: {len(data["trips"])} trips, {len(data["stops"])} stops; schedule only, NOT live',file=sys.stderr)


if __name__=='__main__':
    try: main()
    except (ValueError,zipfile.BadZipFile,UnicodeError,OSError) as e:
        print(f'GTFS import rejected: {e}',file=sys.stderr)
        sys.exit(2)
