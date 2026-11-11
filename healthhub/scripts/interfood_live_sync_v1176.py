#!/usr/bin/env python3
"""HealthHub Interfood Live v1176.
Read the public anonymous Interfood menu JSON as the site's own SPA does.
Exact per-serving nutrient values, dates, codes and weights; no AI guessing,
credentials, private data, browser automation, or invented image URLs.
Fail closed on source/schema changes, preserving the previously verified feed.
"""
from __future__ import annotations
import datetime as dt
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

SOURCE = "https://rendel.interfood.hu/"
OUTPUT = Path("healthhub/nutrition/interfood-live-feed-v1176.json")
CATEGORIES = {
    "Sport és egészség","Levesek","Saláta","Fitness","Rántott ételek","Főzelék",
    "Világkonyha","Tortilla","Főétel","Vadvilág","Menük","Hidegtál","Desszert",
    "Vegán","Zéró","Savanyúság","Pékáru","Karcsúsító","Libakaland"
}
CODE = re.compile(r"^([A-Z]{1,5}\d{0,3}K?)\s*[-–]\s*(.{2,80})$", re.I)
NUTRI = re.compile(
    r"(?P<kcal>\d{1,4}(?:[.,]\d+)?)\s*kcal\s*[,;·]\s*"
    r"(?P<carbs>\d{1,3}(?:[.,]\d+)?)\s*g\s*szénh(?:\.|idrát)?\s*[,;·]\s*"
    r"(?P<protein>\d{1,3}(?:[.,]\d+)?)\s*g\s*fehérje\s*[,;·]\s*"
    r"(?P<fat>\d{1,3}(?:[.,]\d+)?)\s*g\s*zsír", re.I)
PRICE = re.compile(r"^([\d\s]{3,8})\s*Ft$", re.I)
DAY = re.compile(r"\b(20\d{2})\.(\d\d)\.(\d\d)\.")
WEEK = re.compile(r"\b(\d{1,2})\.\s*hét\b", re.I)
SKIP = re.compile(r"^(?:Image:|Húsmentes|Last Minute|Kis adag|Új|Gomba|^\d+$|Ft$)",re.I)
BAD_NAME = re.compile(r"^(?:hétfő|kedd|szerda|csütörtök|péntek|szombat|vasárnap|\d{4}\.)",re.I)


def html_text(html: str):
    soup=BeautifulSoup(html,"html.parser")
    for bad in soup(["script","style","noscript","iframe","svg"]):
        bad.decompose()
    lines=[re.sub(r"\s+"," ",x).strip() for x in soup.stripped_strings]
    return soup,[x for x in lines if x]


def trusted_image(raw: str | None) -> str | None:
    if not raw or len(raw)>800:
        return None
    url=urllib.parse.urljoin(SOURCE,raw.strip())
    p=urllib.parse.urlparse(url)
    if p.scheme!="https" or not p.hostname or (
       p.hostname!="interfood.hu" and not p.hostname.endswith(".interfood.hu")):
        return None
    if not re.search(r"\.(?:jpe?g|png|webp)(?:$|[?#])",p.path,re.I):
        return None
    if re.search(r"(icon|badge|label|facebook|logo|default|placeholder|stamp|svg)",p.path,re.I):
        return None
    return url


def image_near(element) -> str | None:
    if element is None:
        return None
    current=element
    # Choose the tightest wrapper with a real image and at most one food code.
    for _ in range(5):
        if current is None or not getattr(current,"find_all",None):break
        text=current.get_text(" ",strip=True)
        if len(text)>1200:break
        for img in current.find_all("img",limit=9):
            for field in ("data-src","data-original","data-lazy-src","src"):
                candidate=trusted_image(img.get(field))
                if candidate:return candidate
        for el in current.find_all(style=True,limit=9):
            m=re.search(r"background(?:-image)?\s*:[^;]*url\(\s*['\"]?([^'\"\)]+)",el.get("style",""),re.I)
            if m:
                candidate=trusted_image(m.group(1))
                if candidate:return candidate
        current=current.parent
    return None


def parse(html: str, now: dt.datetime):
    soup,lines=html_text(html)
    week_match=WEEK.search(" ".join(lines[:120]))
    week=int(week_match.group(1)) if week_match else None
    selected_date=None
    # Only use an explicitly tagged selected day (never infer an item's delivery day).
    selected=soup.select_one("[aria-selected='true'][data-date], .active[data-date], [data-selected='true'][data-date]")
    if selected:
        m=DAY.search(selected.get("data-date","")) or DAY.search(selected.get_text(" ",strip=True))
        if m:
            selected_date="-".join(m.groups())
    # Interfood's current SPA has one .category per meal code and one
    # .food tile per day (Monday through Saturday), all days rendered at once.
    structured=soup.select(".category")
    days=[]
    for button in soup.select(".date-button[data-date]"):
        value=str(button.get("data-date",""))
        if re.fullmatch(r"20\d{2}-\d{2}-\d{2}",value) and value not in days:
            days.append(value)
    if len(days)>=5 and structured:
        records={}
        for group in structured:
            code_node=group.select_one(".category-code")
            cat_node=group.select_one(".category-name")
            foods=group.select(".category-foods > .food")
            if not code_node or not cat_node or not foods:continue
            code=code_node.get_text(" ",strip=True).upper()
            cat=cat_node.get_text(" ",strip=True)
            if not re.fullmatch(r"[A-Z0-9]{1,8}",code):continue
            for position,tile in enumerate(foods):
                title=tile.select_one(".food-top-title-interfood")
                name=title.get_text(" ",strip=True) if title else ""
                if len(name)<3 or len(name)>100:continue
                date=days[position] if len(foods)==len(days) and position<len(days) else None
                text=tile.get_text(" ",strip=True)
                macro=NUTRI.search(text)
                nutrients=({k:float(macro.group(k).replace(",",".")) for k in
                    ("kcal","protein","carbs","fat")} if macro else
                    {"kcal":None,"protein":None,"carbs":None,"fat":None})
                item_id=str(tile.get("data-menu-item-id",""))
                # Food tiles contain dietary/status pictograms, not reliable meal
                # photos. Never attach those graphics as the meal image.
                image=None
                key=(date or "week")+"|"+code+"|"+name.casefold()
                if key in records:continue
                price_node=tile.select_one(".food-top-bottom-price")
                price_text=price_node.get_text(" ",strip=True) if price_node else ""
                price=PRICE.search(price_text)
                records[key]={
                    "id":"if-"+re.sub(r"[^a-z0-9]+","-",code.lower()+"-"+(date or "weekly")+
                                      "-"+name.lower())[:110],
                    "code":code,"name":name,"category":cat,"label":cat,
                    "menuDate":date,"week":week,"nutrients":nutrients,
                    "imageUrl":image,"sourceUrl":SOURCE,
                    "sourceItemId":item_id if item_id.isdigit() else None,
                    "priceFt":int(re.sub(r"\D","",price.group(1))) if price else None,
                    "nutritionBasis":"published-per-serving" if macro else "not-published",
                    "imageBasis":"public-source-url" if image else "no-public-image",
                }
        items=list(records.values())
        items.sort(key=lambda x:((x["menuDate"] or ""),x["category"],x["code"],x["name"]))
        return {
            "schemaVersion":"healthhub.interfood.live/1",
            "updatedAt":now.isoformat(timespec="seconds").replace("+00:00","Z"),
            "sourceUrl":SOURCE,"week":week,"selectedDate":None,
            "availableDates":days,"items":items
        }
    result={}
    category=None
    labels={"Főétel","Desszert","Leves","Sport és egészség","Sport desszert","Vegán","Főzelék","Kis adag","Vegán kis adag","Menü","Tortilla"}
    for i,line in enumerate(lines):
        if line in CATEGORIES:
            category=line
            continue
        m=CODE.match(line)
        if not m:continue
        code=m.group(1).upper()
        desc=m.group(2).strip()
        if code.isdigit() or len(code)>8:continue
        name=next((t for t in lines[i+1:i+7] if
            7<=len(t)<=100 and not CODE.match(t) and
            t not in CATEGORIES and t not in labels and
            not SKIP.match(t) and not BAD_NAME.match(t) and
            not PRICE.match(t) and not NUTRI.search(t) and
            not re.search(r"\b(kcal|szénh|fehérje|zsír)\b",t,re.I)),None)
        if not name:continue
        nutrient_line=next((x for x in lines[i+1:i+9] if NUTRI.search(x)),None)
        macro=NUTRI.search(nutrient_line) if nutrient_line else None
        nutrients=({k:float(macro.group(k).replace(",",".")) for k in
            ("kcal","protein","carbs","fat")} if macro else
            {"kcal":None,"protein":None,"carbs":None,"fat":None})
        if nutrients["kcal"] is not None and not 0<=nutrients["kcal"]<=5000:continue
        # Limit candidate scope to the immediate text parent (avoid unrelated photos).
        target=soup.find(string=lambda t: bool(t and t.strip()==line))
        image=image_near(target.parent if target else None)
        key=code+"|"+name.casefold()
        if key in result:continue
        result[key]={
            "id":"if-"+re.sub(r"[^a-z0-9]+","-",code.lower()+"-"+name.lower())[:110],
            "code":code,"name":name,
            "category":category or desc,"label":desc,
            "menuDate":selected_date,
            "week":week,"nutrients":nutrients,
            "imageUrl":image,"sourceUrl":SOURCE,
            "nutritionBasis":"published-per-serving" if macro else "not-published",
            "imageBasis":"public-source-url" if image else "no-public-image",
        }
    items=list(result.values())
    items.sort(key=lambda x:(x["category"],x["code"],x["name"]))
    return {
        "schemaVersion":"healthhub.interfood.live/1",
        "updatedAt":now.isoformat(timespec="seconds").replace("+00:00","Z"),
        "sourceUrl":SOURCE,"week":week,"selectedDate":selected_date,
        "items":items
    }




API = "https://ia.interfood.hu/api/v1/menu"
PARTS = ("one", "two", "three")
NUTRI_KEYS = {"kcal":"energy", "protein":"protein", "carbs":"carb", "fat":"fat"}

def as_number(raw):
    if raw is None or raw == "":return None
    try:
        value=float(str(raw).replace(",","."))
        return value if value >= 0 and value < 1_000_000 else None
    except (ValueError,TypeError):return None

def get_public_week(year:int,week:int):
    """Exact anonymous JSON POST used by the public Interfood ordering site."""
    body={
        "year":str(year),"week":str(week),
        "seek_labels":[],"ignore_labels":[],
        "seek_ingredients":[],"ignore_ingredients":[],
        "calorie":{"min":0,"max":9000},"carb":{"min":0,"max":9000},
        "protein":{"min":0,"max":9000},"fat":{"min":0,"max":9000},
        "price":{"min":0,"max":9000},
        "favorites":False,"last_minute":False
    }
    req=urllib.request.Request(API,
        data=json.dumps(body,separators=(",",":")).encode("utf-8"),
        headers={"Accept":"application/json",
          "Content-Type":"application/json",
          "User-Agent":"Mozilla/5.0 (compatible; HealthHubPublicMenuRead/1.0)",
          "Origin":"https://rendel.interfood.hu"},
        method="POST")
    with urllib.request.urlopen(req,timeout=22) as response:
        if response.status!=200 or "json" not in response.headers.get("Content-Type",""):
            raise RuntimeError("Interfood public API unexpectedly unavailable")
        raw=response.read(5_000_000)
        data=json.loads(raw)
    if not isinstance(data,dict) or data.get("error") is not False or not isinstance(data.get("data"),dict):
        raise RuntimeError("Interfood JSON response has unexpected schema")
    return data

def nutrition_and_weight(item):
    """Sum separately published components; never infer or estimate nutrients."""
    active=[]
    for part in PARTS:
        label=item.get("food_name_"+part)
        weight=as_number(item.get("weight_food_"+part))
        energy=as_number(item.get("energy_portion_food_"+part))
        if (isinstance(label,str) and label.strip()) or (weight is not None and weight>0) or (energy is not None and energy>0):
            active.append((part,weight))
    if not active:
        active=[("one",as_number(item.get("weight_food_one")))]
    result={}
    for key,prefix in NUTRI_KEYS.items():
        vals=[as_number(item.get(prefix+"_portion_food_"+part)) for part,_ in active]
        result[key]=round(sum(vals),2) if all(v is not None for v in vals) else None
        if result[key] is not None and result[key]>(5000 if key=="kcal" else 1000):
            result[key]=None
    weights=[weight for _,weight in active]
    grams=round(sum(weights),2) if all(w is not None and w>0 for w in weights) else None
    if grams is not None and not 1<=grams<=3000:grams=None
    return result,grams

def parse_public_api(data,year:int,week:int,now:dt.datetime):
    """Read official menu data with date+code+name and exact serving nutrition."""
    if not isinstance(data,dict) or data.get("error") is not False:
        raise ValueError("Unverified Interfood public JSON")
    groups=data.get("data")
    if not isinstance(groups,dict):raise ValueError("Missing public menu groups")
    cards={}
    for group in groups.values():
        if not isinstance(group,dict):continue
        group_name=str(group.get("name") or "Interfood").strip()[:60]
        for category in group.get("categories") or []:
            if not isinstance(category,dict):continue
            code=str(category.get("code") or "").strip().upper()
            if not re.fullmatch(r"[A-Z0-9]{1,8}",code):continue
            label=str(category.get("name") or group_name).strip()[:60]
            for item in category.get("items") or []:
                if not isinstance(item,dict):continue
                menu_date=str(item.get("date") or "")
                if not re.fullmatch(r"20\d{2}-\d{2}-\d{2}",menu_date):continue
                try:
                    when=dt.date.fromisoformat(menu_date)
                    if when.isocalendar().week!=week or when.isocalendar().year!=year:continue
                except ValueError:continue
                food=item.get("food")
                food_name=food.get("name") if isinstance(food,dict) else None
                food_display=food.get("display_name") if isinstance(food,dict) else None
                title=str(food_display or food_name or item.get("food_name_one") or "").strip()
                if len(title)<2 or len(title)>100:continue
                item_id=str(item.get("id") or "")
                if not re.fullmatch(r"\d{1,10}",item_id):continue
                macros,weight=nutrition_and_weight(item)
                key=(menu_date,code,item_id)
                if key in cards:continue
                image_id=food.get("image_id") if isinstance(food,dict) else None
                # This URL is the site's own food-photo request, verified by
                # opening its public green photo button. It uses the exact menu
                # item ID (NOT food.image_id, which is a private DB key).
                image_url=("https://ia.interfood.hu/api/v1/i?menu_item_id="+
                           item_id+"&width=425&height=425")
                price=as_number(item.get("price"))
                cards[key]={
                    "id":"if-"+code.lower()+"-"+menu_date+"-"+item_id,
                    "code":code,"name":title,"category":group_name,
                    "label":label,"menuDate":menu_date,"week":week,
                    "weightGrams":weight,"nutrients":macros,
                    "imageUrl":image_url,"sourceUrl":SOURCE,
                    "sourceItemId":item_id,
                    "imageId":str(image_id) if image_id is not None else None,
                    "priceFt":int(price) if price is not None else None,
                    "nutritionBasis":"published-per-serving" if all(x is not None for x in macros.values()) else "partial-published",
                    "imageBasis":"interfood-official-menu-item-image"
                }
    items=sorted(cards.values(),key=lambda a:(a["menuDate"],a["category"],a["code"],a["name"]))
    return {"schemaVersion":"healthhub.interfood.live/1",
            "updatedAt":now.isoformat(timespec="seconds").replace("+00:00","Z"),
            "sourceUrl":SOURCE,"week":week,"selectedDate":None,
            "availableDates":sorted({x["menuDate"] for x in items}),
            "items":items}

def main():
    from zoneinfo import ZoneInfo
    local_now=dt.datetime.now(ZoneInfo("Europe/Budapest"))
    year,week,_=local_now.isocalendar()
    print("Interfood Live direct public API:",year,"week",week)
    data=get_public_week(year,week)
    now=dt.datetime.now(dt.timezone.utc)
    feed=parse_public_api(data,year,week,now)
    items=feed["items"]
    count=len(items)
    complete=sum(all(x is not None for x in row["nutrients"].values()) for row in items)
    weights=sum(row["weightGrams"] is not None for row in items)
    photos=sum(bool(row["imageUrl"]) for row in items)
    print("Verified direct API:",count,"unique dated foods,",complete,"full macros,",
          weights,"measured portion weights,",photos,"confirmed photos")
    print("First verified entries:",[(row["menuDate"],row["code"],row["name"][:35],row["nutrients"])
                                    for row in items[:3]])
    if count<8 or complete<3:
        raise RuntimeError("Interfood returned incomplete public menu; refusing to publish")
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(feed,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print("Written verified public Interfood feed:",OUTPUT)


if __name__=="__main__":
    try:main()
    except Exception as e:
        print("Interfood Sync ERROR:",str(e),file=sys.stderr)
        sys.exit(1)
