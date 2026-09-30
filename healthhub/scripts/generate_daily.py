#!/usr/bin/env python3
import json
import os
import sys
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "healthhub" / "data"
TZ = ZoneInfo("Europe/Budapest")
MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.6-luna")
API_KEY = os.environ.get("OPENAI_API_KEY")

if not API_KEY:
    raise SystemExit("OPENAI_API_KEY secret is missing.")

def now_budapest():
    return datetime.now(TZ)

def response_text(payload):
    req = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"OpenAI API HTTP {e.code}: {body[:2000]}") from e

    if data.get("output_text"):
        return data["output_text"]

    chunks = []
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in ("output_text", "text") and content.get("text"):
                chunks.append(content["text"])
    if not chunks:
        raise RuntimeError("No text output returned by OpenAI Responses API.")
    return "".join(chunks)

def call_openai(prompt, schema_name, schema, use_web=False):
    payload = {
        "model": MODEL,
        "input": prompt,
        "reasoning": {"effort": "low"},
        "text": {
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "schema": schema,
                "strict": True,
            }
        },
    }
    if use_web:
        payload["tools"] = [{"type": "web_search", "search_context_size": "high"}]
    raw = response_text(payload)
    return json.loads(raw)

SPARK_PROFILE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "sign": {"type": "string"},
        "headline": {"type": "string"},
        "sections": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "focus": {"type": "string"},
                "workMoney": {"type": "string"},
                "relationships": {"type": "string"},
                "energy": {"type": "string"},
                "evening": {"type": "string"},
                "lenaThought": {"type": "string"},
            },
            "required": ["focus", "workMoney", "relationships", "energy", "evening", "lenaThought"],
        },
    },
    "required": ["sign", "headline", "sections"],
}

SPARK_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "profiles": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "zsolt": SPARK_PROFILE_SCHEMA,
                "monika": SPARK_PROFILE_SCHEMA,
            },
            "required": ["zsolt", "monika"],
        }
    },
    "required": ["profiles"],
}

BRIEF_ITEM_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "id": {"type": "string"},
        "title": {"type": "string"},
        "items": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["id", "title", "items"],
}

SOURCE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string"},
        "publisher": {"type": "string"},
        "url": {"type": "string"},
        "publishedAt": {"type": "string"},
    },
    "required": ["title", "publisher", "url", "publishedAt"],
}

BRIEF_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "headline": {"type": "string"},
        "sections": {"type": "array", "items": BRIEF_ITEM_SCHEMA},
        "sources": {"type": "array", "items": SOURCE_SCHEMA},
    },
    "required": ["headline", "sections", "sources"],
}

def generate_spark():
    now = now_budapest()
    prompt = f"""
Ma {now.strftime('%Y-%m-%d')} van Europe/Budapest idő szerint.
Készíts magyar nyelvű Daily Spark tartalmat Zsoltnak és Mónikának.
Zsolt csillagjegye Szűz, Mónikáé Vízöntő.

Ez könnyed, szórakoztató asztrológiai/lifestyle tartalom, nem bizonyított előrejelzés.
Ne adj diagnózist, egészségügyi vagy pénzügyi jóslatot. Legyen személyes, elegáns,
röviden olvasható, praktikus, ne legyen bazári vagy túl misztikus.
Mindkét profilhoz legyen:
- 1-2 mondatos headline
- Mai fókusz
- Munka és pénzügy
- Kapcsolatok
- Energia és közérzet
- Este
- Léna gondolata
A sign mező pontosan „Szűz” illetve „Vízöntő” legyen.
"""
    content = call_openai(prompt, "healthhub_daily_spark", SPARK_SCHEMA, use_web=False)
    out = {
        "schemaVersion": 1,
        "date": now.strftime("%Y-%m-%d"),
        "generatedAt": now.isoformat(timespec="seconds"),
        "profiles": content["profiles"],
    }
    (DATA / "daily-spark.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Daily Spark generated for {out['date']}")

def generate_brief():
    now = now_budapest()
    prompt = f"""
Ma {now.strftime('%Y-%m-%d')} van Europe/Budapest idő szerint.
Webes kereséssel készíts magyar nyelvű reggeli vezetői hírbriefinget kizárólag
az elmúlt 24 óra valóban új, ellenőrizhető fejleményeiből.

Fókusz:
1. Vezetői összefoglaló
2. Éjszakai fejlemények
3. Külpolitika / Geopolitika
4. Magyarország
5. Gazdaság / Piacok
6. Technológia / AI
7. Mai kockázatok
8. Mi számít igazán / Figyelmi szint

Követelmények:
- Elsődlegesen megbízható, friss forrásokat használj, lehetőleg Reuters/AP/BBC,
  hivatalos intézmények és elsődleges források; magyar ügyeknél több hiteles forrást.
- Régi hírszálat új fejlemény nélkül ne vigyél tovább.
- Politikai témákban legyél semleges és tényszerű. Vitatott állítást tulajdoníts forráshoz.
- Ne rangsorolj politikai szereplőket, ne adj választási ajánlást vagy választási előrejelzést.
- Különítsd el a tényt és az elemzést.
- A headline egyetlen rövid mondat legyen a HealthHub Home oldalra.
- A sections pontosan nyolc elem legyen a fenti sorrendben, id-k:
  executive, overnight, geopolitics, hungary, economy, technology, risks, watch.
- Minden items elem rövid, tényszerű magyar mondat legyen.
- A sources listában csak ténylegesen felhasznált forrás legyen, közvetlen HTTP/HTTPS URL-lel.
- publishedAt YYYY-MM-DD legyen; ha a forrás ideje nem ellenőrizhető, inkább ne használd.
"""
    content = call_openai(prompt, "healthhub_daily_briefing", BRIEF_SCHEMA, use_web=True)
    expected = [
        ("executive", "Vezetői összefoglaló"),
        ("overnight", "Éjszakai fejlemények"),
        ("geopolitics", "Külpolitika / Geopolitika"),
        ("hungary", "Magyarország"),
        ("economy", "Gazdaság / Piacok"),
        ("technology", "Technológia / AI"),
        ("risks", "Mai kockázatok"),
        ("watch", "Mi számít igazán / Figyelmi szint"),
    ]
    sections = content.get("sections", [])
    if [s.get("id") for s in sections] != [x[0] for x in expected]:
        raise RuntimeError("Briefing section IDs/order do not match HealthHub schema.")
    for section, (_, title) in zip(sections, expected):
        section["title"] = title

    out = {
        "schemaVersion": 1,
        "date": now.strftime("%Y-%m-%d"),
        "generatedAt": now.isoformat(timespec="seconds"),
        "headline": content["headline"],
        "sections": sections,
        "sources": content["sources"],
    }
    (DATA / "daily-briefing.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Daily briefing generated for {out['date']}")

def main():
    mode = (sys.argv[1] if len(sys.argv) > 1 else "both").lower()
    if mode not in {"spark", "briefing", "both"}:
        raise SystemExit("Usage: generate_daily.py [spark|briefing|both]")
    if mode in {"spark", "both"}:
        generate_spark()
    if mode in {"briefing", "both"}:
        generate_brief()

if __name__ == "__main__":
    main()
