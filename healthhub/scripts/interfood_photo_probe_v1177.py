#!/usr/bin/env python3
"""Diagnostic ONLY: inspect the public Interfood food-photo click path.
No credentials, personal data, image copying, or third-party publishing.
"""
import re, urllib.request, urllib.parse
from playwright.sync_api import sync_playwright
URL="https://rendel.interfood.hu/"
def main():
  with urllib.request.urlopen(URL,timeout=15) as response:
    html=response.read(100000).decode("utf-8","replace")
  bundles=re.findall(r'<script[^>]*\bsrc=["\']([^"\']*assets/index-[^"\']+\.js)',html)
  print("PUBLIC APP BUNDLES:",bundles[:4])
  for asset in bundles[:1]:
    with urllib.request.urlopen(urllib.parse.urljoin(URL,asset),timeout=25) as response:
      raw=response.read(8500000).decode("utf-8","replace")
    print("APP JS SIZE",len(raw))
    for key in ["image_id","small_image_id","/file/","/api/v1/file","food.image","backgroundImage","imageId"]:
      hits=[m.start() for m in re.finditer(re.escape(key),raw,re.I)]
      print("APP LOOKUP",key,len(hits),
        [re.sub(r"\s+"," ",raw[max(0,i-130):i+170])[:300] for i in hits[:3]])
  with sync_playwright() as playwright:
    browser=playwright.chromium.launch(channel="chrome",headless=True,args=["--no-sandbox","--disable-dev-shm-usage"])
    context=browser.new_context(viewport={"width":1420,"height":1000},locale="hu-HU",timezone_id="Europe/Budapest")
    page=context.new_page()
    response_log=[]
    def on_response(response):
      try:
        url=response.url
        p=urllib.parse.urlparse(url)
        if p.hostname and p.hostname.endswith("interfood.hu"):
          content_type=response.headers.get("content-type","")
          if p.path.startswith("/api/") or "/file/" in p.path or content_type.startswith("image/"):
            response_log.append((response.request.method, response.status, url[:210], content_type[:70]))
      except Exception:pass
    page.on("response",on_response)
    page.goto(URL,wait_until="domcontentloaded",timeout=35000)
    page.locator(".category-foods .food").first.wait_for(timeout=30000)
    print("MAIN PAGE LOADED",page.title())
    code=page.locator(".category").filter(has=page.locator(".category-code",has_text=re.compile(r"^E3$"))).first
    if not code.count():
      code=page.locator(".category").filter(has=page.locator(".category-code",has_text=re.compile(r"^SP1$"))).first
    tile=code.locator(".category-foods > .food").filter(has=page.locator(".food-top-title-interfood")).first
    if not tile.count():tile=code.locator(".category-foods > .food").first
    print("SELECTED CODE",code.locator(".category-code").first.inner_text(),"TILE",tile.inner_text()[:190])
    before=len(response_log)
    target=tile.locator('button[aria-label*="képe"]').first
    if target.count():
      try:target.click(timeout=4500)
      except Exception as e:print("PHOTO CLICK FAILED",str(e)[:160])
      page.wait_for_timeout(1300)
      result=page.evaluate("""() => ({
        images:[...document.querySelectorAll('img')].map(x=>({src:x.currentSrc||x.src,alt:x.alt,vis:!!x.getClientRects().length})).filter(x=>x.vis).slice(-45),
        styled:[...document.querySelectorAll('[style]')].map(x=>({tag:x.tagName,cls:String(x.className).slice(0,60),bg:x.style.backgroundImage})).filter(x=>x.bg&&x.bg!=='none').slice(-15),
        dialogs:[...document.querySelectorAll('[role=dialog],dialog,.modal')].map(x=>({class:String(x.className).slice(0,120),text:x.innerText.slice(0,150),html:x.outerHTML.slice(0,2200)})).slice(-3)
      })""")
      print("PHOTO OPEN VISUALS",str(result)[:8500])
      print("PHOTO OPEN NETWORK",response_log[before:][-25:])
    try:
      page.keyboard.press("Escape")
      page.wait_for_timeout(250)
      button=tile.locator('button[aria-label*="részletei"]').first
      if button.count():button.click(timeout=3500)
      page.wait_for_timeout(600)
      result=page.evaluate("""() => ({
        images:[...document.querySelectorAll('img')].filter(x=>x.getClientRects().length).map(x=>x.currentSrc||x.src).slice(-20),
        dialogs:[...document.querySelectorAll('[role=dialog],dialog,.modal')].map(x=>({class:String(x.className).slice(0,100),text:x.innerText.slice(0,220),html:x.outerHTML.slice(0,950)})).slice(-3)
      })""")
      print("DETAILS PANEL",str(result)[:4900])
    except Exception as e:print("DETAILS PROBE ERROR",str(e)[:180])
    context.close();browser.close()
if __name__=="__main__":main()
