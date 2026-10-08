#!/usr/bin/env python3
"""Public NNGYK reports -> HealthHub Infection Watch. Never use unvalidated estimates."""
from __future__ import annotations
import io
import json
import re
import sys
import unicodedata
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import pdfplumber
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"data/infection-watch.json"
HISTORY=ROOT/"data/infection-history.json"
LIST="https://jarvpub.nngyk.gov.hu/hu/fertozo-betegsegek-heti-adatai"
FALLBACK_LIST="https://nngyk.gov.hu/hu/fertozo-betegsegek/fertozo-betegsegek-heti-adatai.html"
ALLOWED={"nngyk.gov.hu","jarvpub.nngyk.gov.hu"}
SESSION=requests.Session()
SESSION.headers.update({"User-Agent":"HealthHubNNGYKWatch/1.0 (+https://github.com/zsoltandmonika-cloud/berlet-app)"})

def get(url):
    if not url.startswith("https://") or urlparse(url).hostname not in ALLOWED:
        raise ValueError("Non-NNGYK URL rejected: "+url)
    result=SESSION.get(url,timeout=40,allow_redirects=True)
    result.raise_for_status()
    if urlparse(result.url).hostname not in ALLOWED or len(result.content)>15_000_000:
        raise ValueError("NNGYK redirect or response size rejected")
    return result

def canonical(text):
    return re.sub(r"\s+"," ",unicodedata.normalize("NFKC",str(text or "")).replace("\u00ad","")).strip()

def week_id(text):
    m=re.search(r"(20\d{2})[\s._-]+(\d{1,2})[\s._-]+h[eé]t\b",text,re.I)
    if not m:return None
    year,week=int(m.group(1)),int(m.group(2))
    return (year,week) if 1<=week<=date(year,12,28).isocalendar().week else None

def latest_pdf():
    found=[]
    for source in (LIST,FALLBACK_LIST):
        try:
            soup=BeautifulSoup(get(source).text,"html.parser")
            for a in soup.select("a[href]"):
                href=urljoin(source,a["href"])
                full=canonical(a.get_text(" ",strip=True))+" "+href
                if ".pdf" not in href.lower() or ("jarvany" not in full.lower() and "j%C3%A1rv" not in full):
                    continue
                key=week_id(full) or week_id(href.replace("_"," "))
                if key and urlparse(href).hostname in ALLOWED:
                    found.append((key,href))
        except (requests.RequestException,ValueError) as e:
            print("NNGYK index unavailable:",source,e,file=sys.stderr)
    if not found:
        raise RuntimeError("No valid weekly NNGYK PDF discovered. Snapshot unchanged.")
    return max(found,key=lambda pair:pair[0])

def number(s):
    s=canonical(s).replace(" ","")
    if s in ("-","–","—"):return 0
    if not s.isdigit():raise ValueError("Non-numeric surveillance value "+repr(s))
    return int(s)

def find_row(tables,target):
    for table in tables:
        for row in table or []:
            if row and canonical(row[0]).casefold()==target.casefold():
                return [canonical(v) for v in row]
    return None

def extract_pdf(blob,key):
    if not blob.startswith(b"%PDF"):raise ValueError("Downloaded report is not a PDF")
    with pdfplumber.open(io.BytesIO(blob)) as pdf:
        if len(pdf.pages)<3:raise ValueError("NNGYK PDF requires three pages")
        if week_id(canonical(pdf.pages[0].extract_text() or ""))!=key:
            raise ValueError("Official report year/week do not match NNGYK index")
        opts={"vertical_strategy":"lines","horizontal_strategy":"lines","intersection_tolerance":5,"snap_tolerance":3}
        spatial=pdf.pages[1].extract_tables(table_settings=opts)
        annual=pdf.pages[2].extract_tables(table_settings=opts)
        b=find_row(spatial,"Budapest")
        n=find_row(spatial,"Összesen (Total)") or find_row(spatial,"Összesen")
        hep=find_row(annual,"Hepatitis A")
        if not b or not n or not hep or len(b)<6 or len(n)<6 or len(hep)<4:
            raise ValueError("NNGYK report required Budapest/total/Hepatitis A cells missing")
        bc=[number(x) for x in b[1:6]]
        nc=[number(x) for x in n[1:6]]
        total,median=number(hep[1]),number(hep[3])
        if total!=nc[4] or any(x>y for x,y in zip(bc,nc)):
            raise ValueError("Official national/Budapest table cross-check failed")
        return {"budapest":{"campylobacteriosis":bc[0],"salmonellosis":bc[1],"rotavirus":bc[2],"hepatitisA":bc[4]},
                "national":{"hepatitisA":total,"hepatitisMedian":median},"week":list(key)}

def respiratory_source(key):
    year,week=key
    root="https://nngyk.gov.hu/hu/integralt-felugyeleti-rendszer-eredmenyei/"
    integrated="integralt-felugyeleti-rendszer-eredmenyei"
    summer="interszezonalis-leguti-figyeloszolgalat-adatai"
    slugs=(integrated,summer) if week>=40 or week<=20 else (summer,integrated)
    for slug in slugs:
        url=root+slug+f"-{year}-{week}-het.html"
        try:res=get(url)
        except requests.RequestException:continue
        soup=BeautifulSoup(res.text,"html.parser")
        title=soup.find("h1")
        if not title or week_id(canonical(title.get_text(" ",strip=True)))!=key:continue
        text=canonical(soup.get_text(" ",strip=True))
        if "SARS-CoV-2" not in text or "RSV" not in text or "influenza" not in text.lower():continue
        return url,text
    raise RuntimeError("Matching NNGYK respiratory report unavailable; last snapshot preserved.")

def topic(text,start,end):
    m=re.search(start,text,re.I)
    if not m:return ""
    part=text[m.end():m.end()+1250]
    stop=re.search(end,part,re.I)
    return part[:stop.start()] if stop else part

def levels(text):
    covid=topic(text,"NNGYK szennyvíz koronavírus korai előrejelző rendszer eredményei",r"[1234]\. ábra")
    influenza=topic(text,"NNGYK szennyvíz influenza A korai előrejelző rendszer eredményei",r"[456]\. ábra")
    rsv=topic(text,"NNGYK szennyvíz RSV korai előrejelző rendszer eredményei",r"[6789]\. ábra")
    if not any((covid,influenza,rsv)):
        raise ValueError("No extractable NNGYK wastewater sections")
    rising=bool(re.search(r"(?<!nem )emelked(?:ik|és|ő|ett)",covid,re.I))
    low_influenza=bool(re.search(r"(egyik|sehol).{0,110}kimutatási határ felett",influenza,re.I))
    low_rsv=bool(re.search(r"alacsony szinten|egyik.{0,110}sem volt kimutatási határ felett",rsv,re.I))
    return {
      "covid":{"level":"watch" if rising else "unknown","label":"Emelkedő szennyvízjelzés" if rising else "Nincs egyértelmű trendjelzés",
        "summary":"Az NNGYK szennyvíz-megfigyelése a víruskoncentráció növekedésére utal." if rising else "A gépi feldolgozás nem azonosított megbízhatóan növekvő szennyvízjelzést."},
      "influenza":{"level":"low" if low_influenza else "unknown","label":"Alacsony szennyvízjelzés" if low_influenza else "Nem besorolható",
        "summary":"A vizsgált mintákban nem találtak kimutatási határ feletti influenza A-koncentrációt." if low_influenza else "Influenza A: nincs automatikusan besorolható hivatalos jelzés."},
      "rsv":{"level":"low" if low_rsv else "unknown","label":"Alacsony szennyvízjelzés" if low_rsv else "Nem besorolható",
        "summary":"A szennyvízjelentés alacsony RSV-aktivitásra utal." if low_rsv else "RSV: nincs automatikusan besorolható hivatalos jelzés."}
    }

def hepatitis_level(count,median):
    # HealthHub informational heuristic, NOT an official NNGYK alert threshold.
    if median<=0:return "unknown","Nincs összevethető medián"
    ratio=count/median
    if ratio>=5 and count>=20:return "high","Legalább ötszörös országos heti medián"
    if ratio>=3 and count>=10:return "elevated","Legalább háromszoros országos heti medián"
    if ratio>=1.5 and count>=10:return "watch","Országosan a heti medián felett"
    return "low","Országos heti medián közelében"

def payload(key,pdf_url,raw,resp_url,signals):
    year,week=key
    start=date.fromisocalendar(year,week,1)
    end=start+timedelta(days=6)
    b=raw["budapest"]
    n=raw["national"]
    hep_level,hep_label=hepatitis_level(n["hepatitisA"],n["hepatitisMedian"])
    items=[]
    for code,title in (("influenza","Influenza A"),("covid","COVID-19 / SARS-CoV-2"),("rsv","RSV")):
        signal=signals[code]
        items.append({"key":code,"name":title,"level":signal["level"],"label":signal["label"],
          "scope":"Országos megfigyelés · Budapest ahol közölt",
          "summary":signal["summary"],
          "detail":"A szennyvízjelzés nem fertőzésszám. Városi mintaterületi részletek a hivatkozott NNGYK jelentésben."})
    items.extend([
      {"key":"gastro","name":"Gyomor-bélrendszeri fertőzések","level":"unknown","label":"Budapesti bejelentések, trend nélkül","scope":"Budapest",
       "summary":f"Campylobacteriosis: {b['campylobacteriosis']}; salmonellosis: {b['salmonellosis']}; rotavírus-gastroenteritis: {b['rotavirus']} heti jelentés.",
       "detail":"A három külön kórkép előzetes bejelentései. Nem adhatók össze egyetlen általános fertőzési indexként."},
      {"key":"hepatitis","name":"Hepatitis A","level":hep_level,"label":hep_label,
       "scope":"Országos összesítés · Budapest külön",
       "summary":f"Országosan {n['hepatitisA']} heti eset; ötéves heti medián {n['hepatitisMedian']}. Budapest: {b['hepatitisA']} bejelentés.",
       "detail":"Országos heti összehasonlítás az NNGYK jelentésében közölt ötéves mediánnal. Előzetes, részben tisztított adatok."}
    ])
    alert_count=sum(x["level"] in ("watch","elevated","high") for x in items)
    return {"schema":"healthhub.infection-watch/1","edition":f"{year}-W{week:02d}-auto",
        "sourceWeek":f"{year}. {week:02d}. hét","periodStart":start.isoformat(),"periodEnd":end.isoformat(),
        "reviewedOn":datetime.now(timezone.utc).date().isoformat(),
        "geography":"Budapest · országos kitekintés",
        "overall":{"level":"watch" if alert_count else "unknown",
            "label":"FIGYELMET ÉRDEMEL" if alert_count else "NINCS KIEMELT JELZÉS",
            "description":f"{alert_count} kiemelt jelzés. Ez nem egyéni fertőzéskockázat és nem hatósági riasztás."},
        "items":items,"sources":{"respiratory":resp_url,"weekly":LIST,"weeklyPdf":pdf_url},
        "methodology":"A HealthHub saját színei NEM NNGYK riasztási fokozatok. Hepatitis A esetek / ötéves heti medián: sárga ≥1,5×, narancs ≥3×, piros ≥5× (utóbbinál legalább 20 eset). A surveillance mutatókat nem adjuk össze. Hiányzó adat nem bizonyít alacsony kockázatot.",
        "raw":raw,"respiratoryWeek":f"{year}. {week:02d}. hét"}

def main():
    key,pdf_url=latest_pdf()
    old=json.loads(OUTPUT.read_text(encoding="utf-8")) if OUTPUT.exists() else None
    prior=week_id(old.get("sourceWeek","")) if old else None
    if prior and key<prior:raise RuntimeError("NNGYK index returned older report; keeping current data")
    raw=extract_pdf(get(pdf_url).content,key)
    resp_url,content=respiratory_source(key)
    data=payload(key,pdf_url,raw,resp_url,levels(content))
    if prior==key:
        print(f"No new NNGYK week: {key[0]} W{key[1]:02d}. Source + PDF validation passed.")
        return 0
    hist=json.loads(HISTORY.read_text(encoding="utf-8")) if HISTORY.exists() else {"schema":"healthhub.infection-history/1","weeks":[]}
    weeks=[x for x in hist.get("weeks",[]) if x.get("sourceWeek")!=data["sourceWeek"]]
    weeks.append({"sourceWeek":data["sourceWeek"],"periodEnd":data["periodEnd"],"raw":raw,
                  "signals":{x["key"]:x["level"] for x in data["items"]}})
    hist["weeks"]=sorted(weeks,key=lambda x:x["periodEnd"])[-12:]
    OUTPUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    HISTORY.write_text(json.dumps(hist,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Published verified NNGYK {key[0]} W{key[1]:02d}.")
    return 0

if __name__=="__main__":
    try:sys.exit(main())
    except Exception as e:
        print("NNGYK UPDATE BLOCKED (last validated data retained):",e,file=sys.stderr)
        sys.exit(1)
