#!/usr/bin/env python3
"""Public-only morning health factors. Never read/publish names, meds, measurements or profiles."""
import json,sys,urllib.parse,urllib.request
from datetime import datetime,date
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"data/daily-health-public.json"
NNGYK=ROOT/"data/infection-watch.json"
NOW=datetime.now(ZoneInfo("Europe/Budapest"))
LOC={"latitude":47.5,"longitude":19.04,"timezone":"Europe/Budapest"}
POLLEN={"alder_pollen":"Éger","birch_pollen":"Nyír","grass_pollen":"Fűfélék","mugwort_pollen":"Üröm","olive_pollen":"Olajfa","ragweed_pollen":"Parlagfű"}
def n(v):
    try:
        if v is None or isinstance(v,bool):return None
        x=float(v)
        return round(x,1) if -100000<x<100000 else None
    except (ValueError,TypeError):return None
def fetch(host,args):
    u=host+"?"+urllib.parse.urlencode({**LOC,**args})
    req=urllib.request.Request(u,headers={"User-Agent":"HealthHub/1.0 (+https://github.com/zsoltandmonika-cloud/berlet-app)"})
    with urllib.request.urlopen(req,timeout=25) as r:content=r.read(1_000_001)
    if len(content)>1_000_000:raise ValueError("oversized source")
    return json.loads(content)
def daytime(times,vals,today):
    if not isinstance(times,list) or not isinstance(vals,list):return []
    out=[]
    for t,v in zip(times,vals):
        if not isinstance(t,str) or not t.startswith(today+"T"):continue
        try:hour=int(t.split("T")[1][:2])
        except (ValueError,IndexError):continue
        num=n(v)
        if 7<=hour<=20 and num is not None:out.append(num)
    return out
def weather(today):
    j=fetch("https://api.open-meteo.com/v1/forecast",{
        "current":"temperature_2m,apparent_temperature,pressure_msl,wind_gusts_10m",
        "hourly":"uv_index,apparent_temperature,pressure_msl","past_hours":"24","forecast_days":"2"})
    c=j.get("current") or {};h=j.get("hourly") or {};ts=h.get("time",[])
    u=daytime(ts,h.get("uv_index",[]),today)
    feel=daytime(ts,h.get("apparent_temperature",[]),today)
    past=h.get("pressure_msl",[])
    d=None
    if isinstance(ts,list) and isinstance(past,list):
        i=next((i for i,x in enumerate(ts) if isinstance(x,str) and x[:13]==str(c.get("time",""))[:13]),-1)
        if i>=6 and i<len(past) and n(past[i]) is not None and n(past[i-6]) is not None:
            d=round(float(past[i])-float(past[i-6]),1)
    return {"available":True,"observedAt":c.get("time"),"temperature":n(c.get("temperature_2m")),
        "apparentTemperature":n(c.get("apparent_temperature")),"daytimeMaxFeelsLike":max(feel) if feel else None,
        "uvMax":max(u) if u else None,"pressureHpa":n(c.get("pressure_msl")),
        "pressureChange6h":d,"windGust":n(c.get("wind_gusts_10m"))}
def air():
    j=fetch("https://air-quality-api.open-meteo.com/v1/air-quality",{
        "current":",".join(["european_aqi","pm2_5","pm10"]+list(POLLEN))})
    c=j.get("current") or {}
    found=[(k,n(c.get(k))) for k in POLLEN if n(c.get(k)) is not None]
    top=max(found,key=lambda x:x[1]) if found else None
    level=None
    if top:
        v=top[1];tree=top[0] in ("alder_pollen","birch_pollen","olive_pollen")
        level=0 if v<=10 else 1 if v<=(100 if tree else 30) else 2 if v<=(500 if tree else 100) else 3
    return {"available":True,"observedAt":c.get("time"),"aqi":n(c.get("european_aqi")),
        "pm25":n(c.get("pm2_5")),"pollen":{"available":bool(top),"name":POLLEN[top[0]] if top else None,
        "value":top[1] if top else None,"level":level}}
def infection(today):
    d=json.loads(NNGYK.read_text(encoding="utf-8"))
    if d.get("schema")!="healthhub.infection-watch/1" or not isinstance(d.get("items"),list):
        raise ValueError("unexpected NNGYK schema")
    stale=(date.fromisoformat(today)-date.fromisoformat(d["periodEnd"])).days>21
    return {"available":True,"stale":stale,"sourceWeek":d["sourceWeek"],"periodEnd":d["periodEnd"],
        "signals":[] if stale else [{"name":v["name"],"level":v["level"]} for v in d["items"] if v.get("level") in ("watch","elevated","high")]}
def signal(key,level,title,explanation):
    return {"key":key,"level":level,"title":title,"explanation":explanation}
def alerts(w,a,infect):
    out=[]
    if w.get("available"):
        feel=w.get("daytimeMaxFeelsLike")
        if feel is not None and feel>=30:out.append(signal("heat","high" if feel>=35 else "watch","Hőterhelés","A mai nappali hőérzet magas. A kinti terhelést érdemes mérsékelni."))
        if feel is not None and feel<=-8:out.append(signal("cold","watch","Erős hideg","Öltözzetek rétegesen."))
        if w.get("uvMax") is not None and w["uvMax"]>=6:out.append(signal("uv","watch","Erős UV","Kültéri programokhoz figyeljetek a napvédelemre."))
        if w.get("pressureChange6h") is not None and abs(w["pressureChange6h"])>=6:
            out.append(signal("pressure","watch","Jelentős légnyomásváltozás","Egyeseknél fejfájással járhat együtt; ez nem bizonyít ok-okozati kapcsolatot."))
        if w.get("windGust") is not None and w["windGust"]>=60:out.append(signal("wind","watch","Erős széllökés","Szabadtéri programoknál legyetek óvatosak."))
    if a.get("available"):
        pollen=a.get("pollen") or {}
        if pollen.get("level") in (2,3):
            out.append(signal("pollen","watch","Magas pollenterhelés","A legfrissebb pollenadat érzékenység esetén panaszt okozhat."))
        aqi=a.get("aqi")
        if aqi is not None and aqi>=60:out.append(signal("air","high" if aqi>=80 else "watch","Kedvezőtlen levegőminőség","Az érzékenyek mérsékeljék az intenzív kültéri terhelést."))
    if infect.get("available") and not infect.get("stale") and infect.get("signals"):
        out.append(signal("infection","watch","NNGYK heti figyelő","A hivatalos jelentés kiemelt jelzéseket tartalmaz; nem napi személyes fertőzési kockázat."))
    return out
def main():
    today=NOW.strftime("%Y-%m-%d")
    mode=(sys.argv[1] if len(sys.argv)>1 else "auto").lower()
    if mode=="auto" and (NOW.hour<7 or NOW.hour==7 and NOW.minute<15):
        print("Morning window not reached in Budapest");return
    if mode=="auto" and OUTPUT.exists():
        try:
            if json.loads(OUTPUT.read_text(encoding="utf-8")).get("date")==today:
                print("Snapshot current");return
        except Exception:pass
    w={"available":False};a={"available":False};i={"available":False,"stale":True}
    try:w=weather(today)
    except Exception as e:print("Weather unavailable:",e,file=sys.stderr)
    try:a=air()
    except Exception as e:print("Air/pollen unavailable:",e,file=sys.stderr)
    try:i=infection(today)
    except Exception as e:print("NNGYK unavailable:",e,file=sys.stderr)
    if not w["available"] and not a["available"] and not i["available"]:
        raise RuntimeError("All official/public sources unavailable; retaining prior snapshot.")
    out={"schema":"healthhub.daily-health-public/1","date":today,"generatedAt":NOW.isoformat(timespec="seconds"),
        "location":"Budapest","weather":w,"air":a,"infection":i,"alerts":alerts(w,a,i),
        "methodology":"Szabályalapú, tájékoztató összefoglaló, nem orvosi diagnózis, AI-modell vagy gyógyszerrendelés.",
        "sources":[{"title":"Open-Meteo Forecast","url":"https://open-meteo.com/en/docs"},
        {"title":"Open-Meteo Air Quality","url":"https://open-meteo.com/en/docs/air-quality-api"},
        {"title":"NNGYK heti járványügy","url":"https://jarvpub.nngyk.gov.hu/hu/fertozo-betegsegek-heti-adatai"}]}
    OUTPUT.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Generated public Daily Health",today,"warnings",len(out["alerts"]))
if __name__=="__main__":main()
