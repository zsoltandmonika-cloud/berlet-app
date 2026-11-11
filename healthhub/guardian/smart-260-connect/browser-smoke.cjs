/* Real browser smoke test for SHO Smart Match.
 * Runs against a local checkout using official public BKK GTFS snapshot.
 * Never contacts health, GPS, Dropbox or Supabase services.
 */
"use strict";
const fs=require("node:fs");
const http=require("node:http");
const path=require("node:path");
const assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const {chromium}=require("playwright-core");
const ROOT=path.resolve(__dirname,"../../../");
const output=path.join(ROOT,"artifacts","smart-match");
fs.mkdirSync(output,{recursive:true});
const extType={".html":"text/html;charset=utf-8",".mjs":"text/javascript;charset=utf-8",
 ".js":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8",
 ".json":"application/json;charset=utf-8",".png":"image/png",".svg":"image/svg+xml"};
function lookup(url){
 const u=new URL(url,"http://localhost");
 const prefix="/berlet-app/";
 if(!u.pathname.startsWith(prefix))return null;
 const suffix=decodeURIComponent(u.pathname.slice(prefix.length));
 const file=path.resolve(ROOT,suffix);
 if(file!==ROOT&&!file.startsWith(ROOT+path.sep))return null;
 const resolved=fs.existsSync(file)&&fs.statSync(file).isDirectory()?
  path.join(file,"index.html"):file;
 return fs.existsSync(resolved)&&fs.statSync(resolved).isFile()?resolved:null;
}
const server=http.createServer((req,res)=>{
 let file=null;
 try{file=lookup(req.url)}catch(_){}
 if(!file){res.writeHead(404);res.end("Not found");return}
 res.writeHead(200,{"Content-Type":extType[path.extname(file)]||"application/octet-stream",
  "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
 fs.createReadStream(file).pipe(res);
});
function findChrome(){
 if(process.env.CHROME_PATH&&fs.existsSync(process.env.CHROME_PATH))return process.env.CHROME_PATH;
 for(const candidate of ["google-chrome-stable","google-chrome","chromium","chromium-browser"]){
  try{const p=execFileSync("which",[candidate],{encoding:"utf8"}).trim();if(fs.existsSync(p))return p}
  catch(_){}
 }
 throw Error("Chrome/Chromium browser was not found in runner.");
}
async function smoke(browser,base,device){
 const mobile=device==="mobile";
 const context=await browser.newContext({
  viewport:mobile?{width:390,height:844}:{width:1320,height:890},
  isMobile:mobile,hasTouch:mobile,
  deviceScaleFactor:mobile?2:1,
  serviceWorkers:"block"
 });
 // Only the app's local, PUBLIC static files are allowed in the test.
 await context.route("**/*",r=>{
  if(r.request().url().startsWith(base))return r.continue();
  return r.abort();
 });
 const page=await context.newPage(),failures=[];
 page.on("pageerror",err=>failures.push("pageerror: "+err.message));
 page.on("console",msg=>{if(msg.type()==="error")failures.push("console: "+msg.text())});
 try {
  const url=base+"healthhub/guardian/smart-260-connect/";
  const resp=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(resp.status(),200,"Smart Match page must load");
  await page.waitForFunction(()=>{
   const s=document.getElementById("status")?.textContent||"";
   return s.includes("✓ BKK GTFS")||s.includes("⚠️");
  },{timeout:30000});
  const status=await page.locator("#status").textContent();
  assert.match(status,/✓ BKK GTFS/, "Public GTFS must load and validate: "+status);
  const total=await page.locator(".timeline-row").count();
  assert.ok(total>0,"Schedule should render at least one 260 bus entry");
  const work=await page.locator(".timeline-row:not(.unmatched)").count();
  assert.ok(work>0,"At least one 260/tram match should render");
  assert.equal(await page.locator("#walkMetric").textContent(),"10 + 1 perc");
  assert.equal(await page.locator("#windowMetric").textContent(),"13:00–19:00");
  assert.ok(await page.locator("#ring").isVisible(),"Countdown ring is visible");
  // V2 visual regression contract: dedicated hero + source-driven reusable route stages.
  assert.equal(await page.locator("#routeFlow .v2-step").count(),6,
   "Office route must display all six independently styled journey stages");
  assert.ok(await page.locator(".v2-skyline").isVisible(),"Dedicated Smart Match hero artwork visible");
  const heroBg=await page.locator(".v2-skyline").evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(heroBg,/smart-match-budapest-neon-hero-v2\.svg/,"Hero must be a standalone original asset");
  assert.ok(await page.locator("#templates .template-chip").count()>=2,"Two templates exist");

  await page.screenshot({path:path.join(output,device+"-work.png"),fullPage:true});

  await page.locator("#templates .template-chip").filter({hasText:"Citronella"}).click();
  await page.waitForFunction(()=>{
   const s=document.getElementById("status")?.textContent||"";
   return document.getElementById("kind")?.value==="walk"&&s.includes("✓ BKK GTFS");
  });
  assert.equal(await page.locator("#walkMetric").textContent(),"6 + 2 perc");
  assert.equal(await page.locator("#kind").inputValue(),"walk");
  assert.equal(await page.locator("#routeFlow .v2-step").count(),4,
   "The walk-only route must use the same reusable visual journey component");
  assert.ok(await page.locator(".timeline-row:not(.unmatched)").count()>0,
   "Citronella 260 has expected real timetable results");
  await page.locator("#pinBtn").click();
  await page.waitForFunction(()=>document.body.classList.contains("pinned"));
  assert.equal(await page.locator("#editor").isVisible(),false,"Pinned screen hides form");
  assert.ok(await page.locator("#heroTime").isVisible(),"Pinned hero is visible");
  assert.ok(await page.locator("#timeline").isVisible(),"Pinned timeline is visible");
  assert.ok(await page.locator("#pinnedActions").isVisible(),"Bottom dock is visible in fullscreen pinned mode");
  assert.equal(await page.locator("#pinTemplateSelect option").count(),2,
   "Pinned selector preserves both previously saved sample schemes");
  await page.screenshot({path:path.join(output,device+"-home-pinned.png"),fullPage:true});
  await page.locator("#pinTemplateSelect").selectOption("monika-260");
  await page.waitForFunction(()=>document.getElementById("heading")?.textContent?.includes("Munkahely"));
  assert.equal(await page.locator("#routeFlow .v2-step").count(),6,
   "Pinned mode must dynamically re-render a different route scheme");
  await page.locator("#pinTemplateSelect").selectOption("home-citronella-260");
  await page.waitForFunction(()=>document.getElementById("kind")?.value==="walk");
  await page.locator("#exitPin").click();
  await page.waitForFunction(()=>!document.body.classList.contains("pinned"));
  await page.locator("#saveBtn").click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("sh9-smart-match-templates-v1-m")));
  assert.ok(Array.isArray(saved)&&saved.some(x=>x.id==="home-citronella-260"&&x.pinned),
   "Local template storage should persist pinned home template");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=4,"No horizontal overflow: "+overflow+"px");
  assert.deepEqual(failures,[],"No uncaught errors or failed external requests");
  return {device,status,total,work,homeRows:await page.locator(".timeline-row").count(),
   pinnedTest:"passed",storageTest:"passed",overflow};
 }finally{await context.close()}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port+"/berlet-app/";
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:findChrome(),
   args:["--no-sandbox","--disable-dev-shm-usage"]});
  for(const device of ["desktop","mobile"])console.log("SMART-MATCH-BROWSER-SMOKE",JSON.stringify(await smoke(browser,base,device)));
 }finally{
  if(browser)await browser.close();
  server.close();
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
