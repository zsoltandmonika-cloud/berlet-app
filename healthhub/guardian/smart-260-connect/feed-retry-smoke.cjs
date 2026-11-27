/* Current official timetable, real Chromium, scoped retry acceptance.
 * No contact with private services and no frozen historical date. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const assert=require("node:assert/strict");
const {chromium}=require("playwright-core");
const root=path.resolve(__dirname,"../../..");
const types={".html":"text/html",".mjs":"text/javascript",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png"};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,"http://127.0.0.1");
  if(!url.pathname.startsWith("/berlet-app/"))throw Error("path");
  let file=path.resolve(root,decodeURIComponent(url.pathname.slice("/berlet-app/".length)));
  if(!file.startsWith(root+path.sep))throw Error("path");
  if(fs.statSync(file).isDirectory())file=path.join(file,"index.html");
  res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
  fs.createReadStream(file).pipe(res);
 }catch(_){res.writeHead(404);res.end("Not found")}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port+"/berlet-app/";
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:["--no-sandbox"]});
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1320,height:890},isMobile:mobile,hasTouch:mobile,serviceWorkers:"block"});
   let snapshots=0,broken=true;
   await context.route("**/*",route=>{
    const url=route.request().url();
    if(!url.startsWith(base))return route.abort();
    if(url.includes("bkk-selected-routes-v1106.json")){
     snapshots++;
     if(broken)return route.fulfill({status:200,contentType:"application/json",body:"{}"});
    }
    return route.continue();
   });
   const page=await context.newPage();
   await page.goto(base+"healthhub/guardian/smart-260-connect/?profile=m",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.getElementById("status")?.textContent.includes("⚠️"),{timeout:45000});
   assert.equal(snapshots,2,"Exactly two bounded attempts for broken publication");
   assert.match(await page.locator("#status").textContent(),/nem egyezik/);
   assert.equal(await page.locator(".v34-260-row").count(),0,"No unverified departures");
   broken=false;
   await page.getByRole("button",{name:"Menetrend újratöltése"}).click();
   await page.waitForFunction(()=>document.getElementById("status")?.textContent.includes("✓ BKK GTFS"),{timeout:45000});
   assert.ok(await page.locator(".v34-260-row").count()>20,"Actual current full-day departures render");
   console.log("Current verified BKK recovery PASS",mobile?"mobile":"desktop",await page.locator("#status").textContent());
   await context.close();
  }
 }finally{if(browser)await browser.close();server.close()}
})().catch(err=>{console.error(err);process.exitCode=1;server.close()});
