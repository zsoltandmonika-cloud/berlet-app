#!/usr/bin/env python3
"""OpenAI-authored, PUBLIC-only morning HealthHub narrative. Never ingest personal vault data."""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "data" / "daily-health-public.json"
OUTPUT = ROOT / "data" / "daily-health-ai-public.json"
TZ = ZoneInfo("Europe/Budapest")
SCHEMA = {
    "type": "object",
    "properties": {
        "headline": {"type": "string"},
        "overview": {"type": "string"},
        "attention": {"type": "string"},
        "tips": {"type": "array", "items": {"type": "string"}},
        "uncertainty": {"type": "string"}
    },
    "required": ["headline", "overview", "attention", "tips", "uncertainty"],
    "additionalProperties": False
}
INSTRUCTIONS = (
    "Te a HealthHub magyar nyelvű, óvatos környezeti-egészségügyi hírszerkesztője vagy. "
    "Kizárólag a mellékelt, dátumozott NYILVÁNOS környezeti adatokat használd. "
    "Készíts 60-120 másodpercben elolvasható, nem ismétlődő reggeli helyzetképet. "
    "A NNGYK heti járványügyi megfigyelése NEM mai személyes kockázat. "
    "A pollenadat lehet részleges/nem elérhető. Légnyomás és fejfájás között "
    "ne állíts biztos oksági kapcsolatot. NEM ismersz betegségeket, gyógyszereket, "
    "korábbi tüneteket, személyes profilt. NE találj ki betegséget, gyógyszert, adagot, "
    "gyógyszerbevételi tanácsot, diagnózist. "
    "Forrás nélkül ne állíts mai tényt. Ha forrás nem elérhető, világosan jelezd. "
    "Rövid magyar mondatokkal fogalmazz, kerüld a riogatást és a túlzó jóslatokat. "
    "Válaszolj pontosan a megadott JSON-sémában."
)

def local_now():
    return datetime.now(TZ)

def output_text(raw):
    chunks = []
    for item in raw.get("output", []):
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if content.get("type") == "output_text" and isinstance(content.get("text"), str):
                chunks.append(content["text"])
    return "".join(chunks)

def check(content):
    if not isinstance(content, dict) or set(content) != set(SCHEMA["properties"]):
        raise ValueError("Unexpected model field names")
    for key in ("headline", "overview", "attention", "uncertainty"):
        if not isinstance(content[key], str) or not 1 <= len(content[key].strip()) <= 1000:
            raise ValueError("Invalid model string " + key)
    if not isinstance(content["tips"], list) or not 1 <= len(content["tips"]) <= 4:
        raise ValueError("Invalid tips")
    if any(not isinstance(x, str) or not 1 <= len(x.strip()) <= 320 for x in content["tips"]):
        raise ValueError("Invalid tip text")

def main():
    now = local_now()
    today = now.strftime("%Y-%m-%d")
    mode = (sys.argv[1] if len(sys.argv) > 1 else "auto").lower()
    if mode == "auto" and (now.hour < 7 or (now.hour == 7 and now.minute < 15)):
        print("AI Daily Health: not due in Budapest yet.")
        return
    if not INPUT.exists():
        print("AI Daily Health: public snapshot unavailable.", file=sys.stderr)
        return
    snap = json.loads(INPUT.read_text(encoding="utf-8"))
    if snap.get("schema") != "healthhub.daily-health-public/1" or snap.get("date") != today:
        print("AI Daily Health: no fresh public source. Retaining older AI output.")
        return
    if mode == "auto" and OUTPUT.exists():
        try:
            previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
            if previous.get("date") == today and previous.get("schema") == "healthhub.daily-health-ai-public/1":
                print("AI Daily Health: today's genuine AI summary is already present.")
                return
        except (ValueError, OSError):
            pass
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        print("AI Daily Health is safely INACTIVE: configure OPENAI_API_KEY as a GitHub Actions secret.")
        return
    model = os.environ.get("HEALTHHUB_AI_MODEL", "gpt-4.1-mini").strip() or "gpt-4.1-mini"
    # Strict allowlist: public weather/pollen/NNGYK only, not full input file or any profile/vault.
    public_fields = {k: snap.get(k) for k in ("date", "location", "weather", "air", "infection", "alerts", "sources")}
    payload = {
        "model": model,
        "store": False,
        "instructions": INSTRUCTIONS,
        "input": "Hivatalos/nyilvános HealthHub-napi adatok:\n" + json.dumps(public_fields, ensure_ascii=False),
        "max_output_tokens": 1200,
        "text": {"format": {"type": "json_schema", "name": "healthhub_daily_health", "strict": True, "schema": SCHEMA}}
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        method="POST",
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(request, timeout=65) as response:
            body = response.read(100001)
        if len(body) > 100000:
            raise ValueError("Response too large")
        result = json.loads(body)
        if result.get("status") not in (None, "completed"):
            raise ValueError("Model did not complete")
        content = json.loads(output_text(result))
        check(content)
    except urllib.error.HTTPError as e:
        # Never log the response body or request authorization headers.
        try:
            err=json.loads(e.read(8192)).get("error",{})
            code=str(err.get("code") or err.get("type") or "")
        except Exception:
            code=""
        safe=code if code in ("insufficient_quota","rate_limit_exceeded","rate_limit_error","billing_hard_limit_reached","tokens_per_minute","credit_balance_exhausted","organization_usage_limit_exceeded","organization_spend_limit_exceeded","project_spend_limit_exceeded","slow_down") else "unspecified"
        print("AI Daily Health HTTP",e.code,"provider_error_code",safe,"request_id",str(e.headers.get("x-request-id") or "unavailable")[:130],file=sys.stderr)
        org=str(e.headers.get("openai-organization") or "") if e.headers else ""
        org=org if org.startswith(("org_","org-")) and 7<=len(org)<=110 and all(ch.isalnum() or ch in "_-" for ch in org) else "not-in-response"
        print("AI billing org (response header):",org,file=sys.stderr)
        return
    except Exception as e:
        print("AI Daily Health unavailable; safe rule-based fallback remains. Error type:",
              type(e).__name__, file=sys.stderr)
        return
    output = {
        "schema": "healthhub.daily-health-ai-public/1",
        "date": today,
        "generatedAt": local_now().isoformat(timespec="seconds"),
        "model": model,
        "kind": "public-environment-only",
        "containsPersonalHealthData": False,
        "sourceDate": snap.get("date"),
        "sourceGeneratedAt": snap.get("generatedAt"),
        "brief": content
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("AI Daily Health generated using OpenAI Responses API (public context only).", today)

if __name__ == "__main__":
    main()
