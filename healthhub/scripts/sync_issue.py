#!/usr/bin/env python3
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "healthhub" / "data"
EVENT = Path(os.environ["GITHUB_EVENT_PATH"])

START = "<!-- HEALTHHUB_JSON_START -->"
END = "<!-- HEALTHHUB_JSON_END -->"

def fail(msg):
    raise SystemExit(f"ERROR: {msg}")

def validate_spark(data):
    required_top = {"schemaVersion", "date", "generatedAt", "profiles"}
    if set(data) != required_top:
        fail(f"Spark top-level keys must be {sorted(required_top)}")
    if data["schemaVersion"] != 1:
        fail("Spark schemaVersion must be 1")
    profiles = data["profiles"]
    if set(profiles) != {"zsolt", "monika"}:
        fail("Spark profiles must contain exactly zsolt and monika")
    section_keys = {"focus","workMoney","relationships","energy","evening","lenaThought"}
    for name in ("zsolt","monika"):
        p = profiles[name]
        if set(p) != {"sign","headline","sections"}:
            fail(f"Spark profile {name} has invalid keys")
        if set(p["sections"]) != section_keys:
            fail(f"Spark profile {name} has invalid section keys")
        if not all(isinstance(v, str) and v.strip() for v in p["sections"].values()):
            fail(f"Spark profile {name} contains empty/non-text section")
    if profiles["zsolt"]["sign"] != "Szűz":
        fail("Zsolt sign must be Szűz")
    if profiles["monika"]["sign"] != "Vízöntő":
        fail("Monika sign must be Vízöntő")

def validate_brief(data):
    required_top = {"schemaVersion","date","generatedAt","headline","sections","sources"}
    if set(data) != required_top:
        fail(f"Briefing top-level keys must be {sorted(required_top)}")
    if data["schemaVersion"] != 1:
        fail("Briefing schemaVersion must be 1")
    expected = [
        "executive","overnight","geopolitics","hungary",
        "economy","technology","risks","watch"
    ]
    sections = data["sections"]
    if not isinstance(sections, list) or [s.get("id") for s in sections] != expected:
        fail("Briefing sections/order are invalid")
    for s in sections:
        if set(s) != {"id","title","items"}:
            fail(f"Briefing section {s.get('id')} has invalid keys")
        if not isinstance(s["items"], list) or not all(isinstance(x,str) and x.strip() for x in s["items"]):
            fail(f"Briefing section {s['id']} has invalid items")
    if not isinstance(data["sources"], list):
        fail("Briefing sources must be a list")
    for src in data["sources"]:
        if not {"title","publisher","url","publishedAt"}.issubset(src):
            fail("Briefing source missing required field")
        if not str(src["url"]).startswith(("http://","https://")):
            fail("Briefing source URL must be http/https")

def main():
    event = json.loads(EVENT.read_text(encoding="utf-8"))
    issue = event["issue"]
    title = issue["title"]
    body = issue.get("body") or ""

    m = re.fullmatch(r"\[HealthHub Sync\] (SPARK|BRIEFING) (\d{4}-\d{2}-\d{2})", title)
    if not m:
        fail("Unexpected issue title")
    kind, title_date = m.groups()

    if START not in body or END not in body:
        fail("JSON markers missing")
    payload = body.split(START,1)[1].split(END,1)[0].strip()
    try:
        data = json.loads(payload)
    except json.JSONDecodeError as e:
        fail(f"Invalid JSON: {e}")

    if data.get("date") != title_date:
        fail(f"Payload date {data.get('date')} does not match title date {title_date}")

    if kind == "SPARK":
        validate_spark(data)
        target = DATA / "daily-spark.json"
    else:
        validate_brief(data)
        target = DATA / "daily-briefing.json"

    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(f"kind={kind.lower()}\n")
            f.write(f"date={title_date}\n")
            f.write(f"path={target.relative_to(ROOT).as_posix()}\n")
    print(f"Validated {kind} {title_date} -> {target}")

if __name__ == "__main__":
    main()
