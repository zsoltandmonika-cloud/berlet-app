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
                image=image_near(tile)
                # Exclude status icons from image attribution. Public meal photos
                # typically appear in a detail/photo modal, not inside the tile.
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
            context.close()
            return rendered
        finally:
            browser.close()


def main():
    headers={"User-Agent":"Mozilla/5.0 (compatible; HealthHubPublicMenuRead/1.0; personal-use)",
             "Accept":"text/html,application/xhtml+xml","Accept-Language":"hu-HU,hu;q=0.9"}
    request=urllib.request.Request(SOURCE,headers=headers,method="GET")
    with urllib.request.urlopen(request,timeout=22) as resp:
        mime=resp.headers.get("Content-Type","")
        html=resp.read(3_000_000).decode("utf-8",errors="replace")
        print("Source HTTP:",resp.status,"content-type:",mime,"bytes:",len(html))
    if "html" not in mime.lower() or len(html)<1200:
        raise RuntimeError("Public Interfood HTML unavailable")
    now=dt.datetime.now(dt.timezone.utc)
    feed=parse(html,now)
    if len(feed["items"])<8:
        # Interfood serves a JavaScript app shell. Browser rendering is required.
        print("Public HTML is an SPA shell; switching to headless browser reading.")
        script_urls=re.findall(r'<script[^>]+src=["\']([^"\']+)',html,re.I)
        print("Public frontend JS bundles:",len(script_urls),
              [urllib.parse.urlparse(x).path[-70:] for x in script_urls[:9]])
        html=browser_rendered_html()
        feed=parse(html,now)
    n=len(feed["items"])
    with_nut=sum(x["nutrients"]["kcal"] is not None for x in feed["items"])
    with_image=sum(x["imageUrl"] is not None for x in feed["items"])
    print("Extracted:",n,"foods,",with_nut,"complete macro sets,",with_image,
          "public image URLs; week:",feed["week"],"selected day:",feed["selectedDate"])
    for x in feed["items"][:3]:
        print("Sample public item:",x["code"],x["name"][:75],x["nutritionBasis"])
    if n<8 or with_nut<3:
        # Snapshot failure is loud. Previous verified public feed stays untouched.
        print("DEBUG around food code / serialized page markers:",file=sys.stderr)
        for needle in ["D9","SP1","__NEXT_DATA__","__NUXT__","application/ld+json"]:
            idx=html.find(needle)
            print(needle,"offset:",idx,"preview:",
                  re.sub(r"\s+"," ",html[max(0,idx-90):idx+400])[:460] if idx>=0 else "",
                  file=sys.stderr)
        # Diagnostic structure only; no account, addresses, cookies, or full page stored.
        dom=BeautifulSoup(html,"html.parser")
        print("Category codes:",len(dom.select(".category-code")),
              "Food tiles:",len(dom.select(".category-foods .food")),file=sys.stderr)
        for tile in dom.select(".category-foods .food")[:2]:
            print("FOOD HTML SAMPLE:",str(tile)[:3500],file=sys.stderr)
        for code in dom.select(".category-code")[:2]:
            print("CATEGORY WRAPPER SAMPLE:",str(code.parent)[:1900],file=sys.stderr)
        for date in dom.select("[data-date]")[:6]:
            print("DATE SAMPLE:",str(date)[:500],file=sys.stderr)
        raise RuntimeError("Interfood menu parsing validation failed; refusing empty/stale publish")
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(feed,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    print("Written validated feed:",OUTPUT)


if __name__=="__main__":
    try:main()
    except Exception as e:
        print("Interfood Sync ERROR:",str(e),file=sys.stderr)
        sys.exit(1)
