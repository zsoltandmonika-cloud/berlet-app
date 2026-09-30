#!/usr/bin/env python3
import json, random, re, sys, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "healthhub" / "data"
TZ = ZoneInfo("Europe/Budapest")
UA = "HealthHub/1.0 (+https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/)"

def now_local():
    return datetime.now(TZ)

def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def pick(seed, items):
    r = random.Random(seed)
    return r.choice(items)

SPARK = {
    "focus": [
        "Válassz ki egyetlen ügyet, amely ma valóban számít, és vidd el egy konkrét következő lépésig.",
        "A mai nap akkor lesz könnyebb, ha a három fontos feladatból először a legkisebb bizonytalanságút zárod le.",
        "Ne próbálj mindent egyszerre optimalizálni. Egy jól befejezett dolog ma többet ér három félkésznél.",
        "Egy rövid rendrakás a teendők között meglepően sok mentális helyet szabadíthat fel.",
        "A fókusz ma nem több erőfeszítést jelent, hanem kevesebb felesleges váltást."
    ],
    "workMoney": [
        "A részletek ma segítenek. Egy rövid ellenőrzés vagy pontosítás megelőzhet egy fölösleges kört.",
        "Az egyszerű, jól ellenőrizhető megoldás ma erősebb, mint a túl sok feltételre épített terv.",
        "Egy kis adminisztratív rendrakás később időt és idegeskedést spórolhat.",
        "A mai döntéseknél különítsd el azt, ami sürgős attól, ami csak hangos.",
        "A jó kompromisszum ma az, amelyik később is könnyen visszaellenőrizhető."
    ],
    "relationships": [
        "A tömör, egyenes kommunikáció most könnyebben célba ér, mint a túlmagyarázás.",
        "Egy spontán beszélgetés könnyen közelebb hozhat valakit, ha nem akarod előre irányítani.",
        "Ma érdemes egy fél mondattal többet kérdezni, mielőtt következtetsz.",
        "A figyelem most többet adhat a másiknak, mint bármilyen nagy gesztus.",
        "Egy kisebb félreértést érdemes gyorsan tisztázni, mielőtt önálló életet kezd."
    ],
    "energy": [
        "Dolgozz rövidebb, fókuszált blokkokban, majd válts környezetet vagy mozogj pár percet.",
        "A változatosság segít. Egy másik környezet vagy rövid séta gyorsan visszahozhatja a lendületet.",
        "A nap közepén egy rövid szünet többet érhet, mint még egy erőből végigvitt óra.",
        "Ne várd meg, amíg teljesen elfogy a lendület. Egy kis váltás időben sokat számít.",
        "A tempó ma fontosabb, mint a sebesség: legyen benne ritmus és pihenő is."
    ],
    "evening": [
        "Az este akkor lesz igazán pihentető, ha egy lezárt nap érzésével érkezel meg hozzá.",
        "Valami könnyű és inspiráló program jobban feltölt, mint még egy feladat kipipálása.",
        "Az esti órákban hagyj egy kis helyet valaminek, aminek semmi haszna nincs, csak jólesik.",
        "Egy nyugodtabb este ma többet adhat, mint egy utolsó nagy nekifutás.",
        "Zárd le a napot egyetlen rövid holnapi jegyzettel, aztán hagyd békén a teendőlistát."
    ],
    "lenaThought": [
        "A haladás néha nem látványos. Néha csak annyi, hogy eggyel kevesebb nyitott szál marad.",
        "A jó ötletek ritkán kérnek engedélyt. Érdemes észrevenni őket, mielőtt továbbmennek.",
        "Nem minden problémának kell ma teljes megoldás. Néha a következő jó lépés bőven elég.",
        "A tisztább döntés gyakran abból születik, amit kihagysz, nem abból, amit még hozzáadsz.",
        "A nap végén az számít, mi lett egyszerűbb, nem az, hány dolgot mozgattál meg."
    ],
}

def spark_profile(date, name, sign):
    base = f"{date}:{name}"
    s = {k: pick(base + ":" + k, v) for k, v in SPARK.items()}
    headline = pick(base + ":headline", [
        "Ma a tiszta prioritás és egy jól időzített döntés hozhat nyugodtabb ritmust.",
        "Egy egyszerűbb megközelítés ma többet érhet, mint egy túlkomplikált terv.",
        "A mai nap akkor működik jól, ha a fontos dolgoknak valódi helyet hagysz.",
        "Egy kis rend, egy őszinte mondat és egy lezárt feladat meglepően sokat adhat a naphoz."
    ])
    return {"sign": sign, "headline": headline, "sections": s}

def generate_spark():
    now = now_local()
    date = now.strftime("%Y-%m-%d")
    out = {
        "schemaVersion": 1,
        "date": date,
        "generatedAt": now.isoformat(timespec="seconds"),
        "profiles": {
            "zsolt": spark_profile(date, "zsolt", "Szűz"),
            "monika": spark_profile(date, "monika", "Vízöntő"),
        }
    }
    write_json(DATA / "daily-spark.json", out)
    print("Generated Daily Spark", date)

def strip_html(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", unescape(s)).strip()

def fetch_rss(label, url, limit=15):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=25) as r:
        raw = r.read()
    root = ET.fromstring(raw)
    items = []
    for item in root.findall(".//item")[:limit]:
        title = strip_html(item.findtext("title"))
        link = strip_html(item.findtext("link"))
        pub = strip_html(item.findtext("pubDate"))
        source_el = item.find("source")
        publisher = strip_html(source_el.text) if source_el is not None and source_el.text else label
        try:
            dt = parsedate_to_datetime(pub)
            if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            dt = None
        if title and link:
            items.append({"title": title, "url": link, "publisher": publisher or label, "dt": dt})
    return items

def fresh(items, now, hours=30):
    cutoff = now.astimezone(timezone.utc) - timedelta(hours=hours)
    out = []
    for x in items:
        if x["dt"] is None or x["dt"].astimezone(timezone.utc) >= cutoff:
            out.append(x)
    return out

def dedupe(items):
    seen=set(); out=[]
    for x in items:
        key=re.sub(r"\W+"," ",x["title"].lower()).strip()
        if key in seen: continue
        seen.add(key); out.append(x)
    return out

def sentence(x):
    return f"{x['publisher']}: {x['title']}"

def generate_brief():
    now = now_local()
    date = now.strftime("%Y-%m-%d")
    feeds = {
        "world": [
            ("BBC World","https://feeds.bbci.co.uk/news/world/rss.xml"),
            ("Reuters World","https://www.reutersagency.com/feed/?best-regions=world&post_type=best"),
        ],
        "economy": [("BBC Business","https://feeds.bbci.co.uk/news/business/rss.xml")],
        "technology": [("BBC Technology","https://feeds.bbci.co.uk/news/technology/rss.xml")],
        "hungary": [("Google News HU","https://news.google.com/rss/search?q="+urllib.parse.quote("Magyarország when:1d")+"&hl=hu&gl=HU&ceid=HU:hu")],
    }
    buckets={}
    for key, srcs in feeds.items():
        gathered=[]
        for label,url in srcs:
            try: gathered.extend(fetch_rss(label,url))
            except Exception as e: print("RSS warning",label,e)
        buckets[key]=dedupe(fresh(gathered,now))[:8]

    all_items=dedupe(buckets["world"]+buckets["hungary"]+buckets["economy"]+buckets["technology"])
    executive=all_items[:4]
    overnight=[x for x in buckets["world"] if x["dt"] and (now.astimezone(timezone.utc)-x["dt"].astimezone(timezone.utc)).total_seconds()<12*3600][:3]
    if not overnight: overnight=buckets["world"][:3]

    risk_words=("war","attack","strike","sanction","oil","inflation","rate","cyber","crisis","conflict","hábor","támad","szankció","infláció","kamat","olaj")
    risks=[x for x in all_items if any(w in x["title"].lower() for w in risk_words)][:3]
    if not risks: risks=all_items[:2]

    sections=[
        {"id":"executive","title":"Vezetői összefoglaló","items":[sentence(x) for x in executive]},
        {"id":"overnight","title":"Éjszakai fejlemények","items":[sentence(x) for x in overnight]},
        {"id":"geopolitics","title":"Külpolitika / Geopolitika","items":[sentence(x) for x in buckets["world"][:3]]},
        {"id":"hungary","title":"Magyarország","items":[sentence(x) for x in buckets["hungary"][:3]]},
        {"id":"economy","title":"Gazdaság / Piacok","items":[sentence(x) for x in buckets["economy"][:3]]},
        {"id":"technology","title":"Technológia / AI","items":[sentence(x) for x in buckets["technology"][:3]]},
        {"id":"risks","title":"Mai kockázatok","items":[f"Figyelmi pont: {x['title']} ({x['publisher']})." for x in risks]},
        {"id":"watch","title":"Mi számít igazán / Figyelmi szint","items":[sentence(x) for x in all_items[:2]]},
    ]
    headline = "A reggel fő témái: " + "; ".join(x["title"] for x in executive[:2]) if executive else "A friss hírforrások átmenetileg nem adtak feldolgozható találatot."
    sources=[]
    for x in all_items[:24]:
        sources.append({
            "title":x["title"],
            "publisher":x["publisher"],
            "url":x["url"],
            "publishedAt":(x["dt"].astimezone(TZ).strftime("%Y-%m-%d") if x["dt"] else date)
        })
    out={
        "schemaVersion":1,
        "date":date,
        "generatedAt":now.isoformat(timespec="seconds"),
        "headline":headline,
        "sections":sections,
        "sources":sources,
    }
    write_json(DATA / "daily-briefing.json", out)
    print("Generated Daily Headline", date)

def main():
    mode=(sys.argv[1] if len(sys.argv)>1 else "auto").lower()
    hour=now_local().hour
    if mode=="auto":
        if hour==6: mode="spark"
        elif hour==7: mode="briefing"
        else:
            print("No HealthHub generation scheduled for local hour",hour)
            return
    if mode in ("spark","both"): generate_spark()
    if mode in ("briefing","both"): generate_brief()

if __name__=="__main__":
    main()
