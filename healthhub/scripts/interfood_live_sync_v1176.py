#!/usr/bin/env python3
"""HealthHub Interfood Live v1176.
Fetch public anonymous menu HTML, extract verifiable food text and source image URLs.
No login, credentials, personal data, artificial nutrition estimates or paid APIs.
Fail closed on markup changes: previous verified JSON remains unchanged on GitHub.
"""
from __future__ import annotations
import datetime as dt
import json
import os
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



def browser_rendered_html() -> str:
    """Render the public SPA just like a browser; no login and no account cookies."""
    from playwright.sync_api import sync_playwright
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(channel="chrome",headless=True,
                        args=["--no-sandbox","--disable-dev-shm-usage"])
        try:
            context=browser.new_context(locale="hu-HU",timezone_id="Europe/Budapest",
                            viewport={"width":1280,"height":960})
            page=context.new_page()
            public_api=[]
            def observe(response):
                try:
                    u=urllib.parse.urlparse(response.url)
                    if (u.hostname=="interfood.hu" or str(u.hostname or "").endswith(".interfood.hu")) and response.request.resource_type in ("xhr","fetch"):
                        public_api.append((u.path[:140],response.status,response.headers.get("content-type","")[:65]))
                        if u.path=="/api/v1/menu" and response.status==200:
                            data=response.json()
                            def sample(value,depth=0):
                                if depth>=4:return type(value).__name__
                                if isinstance(value,dict):return {k:sample(v,depth+1) for k,v in list(value.items())[:14]}
                                if isinstance(value,list):return {"count":len(value),"sample":sample(value[0],depth+1) if value else None}
                                return str(value)[:65] if isinstance(value,str) else value
                            print("PUBLIC MENU API HOST:",u.scheme,u.hostname,u.path)
                            print("PUBLIC MENU API STRUCTURE:",json.dumps(sample(data),ensure_ascii=False)[:3800])
                            public=data.get("data",{}) if isinstance(data,dict) else {}
                            for key in ("25","33"):
                                sample_group=public.get(key) if isinstance(public,dict) else None
                                if sample_group:
                                    def deep(value,depth=0):
                                        if depth>=8:return type(value).__name__
                                        if isinstance(value,dict):return {k:deep(v,depth+1) for k,v in list(value.items())[:13]}
                                        if isinstance(value,list):return {"count":len(value),"sample":deep(value[0],depth+1) if value else None}
                                        return str(value)[:110] if isinstance(value,str) else value
                                    print("PUBLIC MENU CODE GROUP",key,json.dumps(deep(sample_group),ensure_ascii=False)[:8500])
                            print("PUBLIC MENU QUERY KEYS:",[k for k in urllib.parse.parse_qs(u.query).keys()])
                            catmap=public.get("25",{}).get("categories",[]) if isinstance(public,dict) else []
                            if isinstance(catmap,list) and catmap:
                                first=catmap[0]
                                print("SAMPLE CATEGORY ALL KEYS",list(first.keys()))
                                for field,value in first.items():
                                    if isinstance(value,(dict,list)):
                                        print("SAMPLE CATEGORY NESTED",field,json.dumps(deep(value),ensure_ascii=False)[:10000])
                                if isinstance(first.get("items"),list) and first["items"]:
                                    item=first["items"][0]
                                    print("PUBLIC MENU FOOD FIELD NAMES:",list(item.keys()))
                                    print("PUBLIC MENU FOOD NAME, PHOTO, GRAMS:",{k:str(v)[:150] for k,v in item.items()
                                       if any(term in k for term in ("name","image","photo","picture","weight","gram","energy","carb","protein","fat","portion","url"))})
                                    nested=item.get("food")
                                    if isinstance(nested,dict):
                                        print("NESTED FOOD MODEL KEYS:",list(nested.keys()))
                                        print("NESTED FOOD MEDIA:",{k:str(v)[:350] for k,v in nested.items() if
                                         any(w in k for w in ("image","photo","picture","media","file","name","title","weight"))})
                                    for name in ("menu_icons","menu_category"):
                                        other=item.get(name)
                                        if isinstance(other,(dict,list)):
                                            print("MENU ITEM RELATION",name,json.dumps(deep(other),ensure_ascii=False)[:850])
                            request=response.request
                            body=request.post_data or ""
                            print("MENU API REQUEST:",request.method,
                                  "content type:",request.headers.get("content-type",""),
                                  "body bytes:",len(body))
                            try:
                                public_body=json.loads(body)
                                print("MENU API POST KEYS:",
                                      list(public_body.keys()) if isinstance(public_body,dict) else type(public_body).__name__,
                                      {k:v for k,v in public_body.items() if k.lower() in ("week","week_id","weekid","date","year")}
                                      if isinstance(public_body,dict) else {})
                                print("MENU API POST PUBLIC FILTER BODY:",body[:550])
                                request_data=body.encode("utf-8")
                                pub_req=urllib.request.Request(u.scheme+"://"+u.hostname+u.path,data=request_data,
                                 headers={"Content-Type":"application/json","Accept":"application/json",
                                  "User-Agent":"Mozilla/5.0"},method="POST")
                                with urllib.request.urlopen(pub_req,timeout=15) as response2:
                                    api_data=json.load(response2)
                                    print("DIRECT ANONYMOUS POST API:",response2.status,
                                     "groups:",len(api_data.get("data",{})) if isinstance(api_data,dict) else "invalid",
                                     "error:",api_data.get("error") if isinstance(api_data,dict) else "invalid")
                            except Exception as err:print("MENU API POST PROBE ERROR:",str(err)[:180])
                except Exception:pass
            page.on("response",observe)
            response=page.goto(SOURCE,wait_until="domcontentloaded",timeout=35000)
            print("Browser navigation HTTP:",response.status if response else "unknown",
                  "title:",page.title()[:90])
            try:
                page.wait_for_function(
                    "() => document.querySelectorAll('.category-foods .food').length >= 8 "
                    "&& /kcal/i.test(document.body.innerText)",
                    timeout=30000)
            except Exception:
                print("Browser menu wait expired; DOM preview:",
                      re.sub(r"\s+"," ",page.locator("body").inner_text())[:750])
            page.wait_for_timeout(1200)  # allow images & nutrition panels to hydrate
            rendered=page.content()
            text=page.locator("body").inner_text()
            print("Browser rendered HTML:",len(rendered),"chars; visible text:",len(text),
                  "has SP1:","SP1" in text,"has kcal:","kcal" in text)
            print("PUBLIC XHR/FETCH (anonymous, paths only):",list(dict.fromkeys(public_api))[:24])
            for code in ("SP1","D9"):
                try:
                    group=page.locator(".category").filter(has=page.locator(".category-code",has_text=code)).first
                    if group.count():
                        tile=group.locator(".category-foods > .food").nth(2)
                        print("FOOD TILE",code,"text:",re.sub(r"\\s+"," ",tile.inner_text())[:600])
                        details=tile.locator('button[aria-label*="részletei"]')
                        if details.count():
                            details.first.click(timeout=2000)
                            page.wait_for_timeout(300)
                            print("DETAIL SAMPLE",code,re.sub(r"\\s+"," ",page.locator("body").inner_text())[-1100:])
                            print("DETAIL IMAGES",code,
                              [img.get_attribute("src") for img in page.locator("img:visible").all()[-6:]])
                            page.keyboard.press("Escape")
                            page.wait_for_timeout(180)
                        picture=tile.locator('button[aria-label*="képe"]')
                        if picture.count():
                            picture.first.click(timeout=2000)
                            page.wait_for_timeout(300)
                            print("PHOTO SAMPLE",code,
                              [img.get_attribute("src") for img in page.locator("img:visible").all()[-6:]])
                            page.keyboard.press("Escape")
                            page.wait_for_timeout(180)
                except Exception as exc:
                    print("Detail/photo probe skipped:",code,str(exc)[:150])
            context.close()
            return rendered
        finally:
            browser.close()



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
                # Numeric database IDs are not public photo URLs. Expose only
                # a verified source URL after its real file mapping is known.
                image_url=None
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
                    "imageBasis":"no-verified-photo-url"
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
