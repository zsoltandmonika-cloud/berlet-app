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
  const total=await page.locator(".v34-260-row").count();
  assert.ok(total>20,"Full daily schedule must include morning and afternoon 260 buses");
  const work=await page.locator(".v34-260-row.v34-matched").count();
  assert.ok(work>0,"At least one 260/tram match should render");
  assert.ok(total>work,"Unmatched scheduled 260 buses must remain visibly present");
  assert.equal(await page.locator("#countdownLabel").textContent(),"260-asig");
  assert.match(await page.locator("#timelineSubtitle").textContent(),/260-as · Bécsi út/);
  assert.equal(await page.locator("#walkMetric").textContent(),"10 + 1 perc");
  assert.equal(await page.locator("#windowMetric").textContent(),"Teljes nap · 260");
  assert.ok(await page.locator("#ring").isVisible(),"Countdown ring is visible");
  assert.equal(await page.locator("#matchSummary").count(),0,"No verbose summary underneath the timeline");
  const normalHeight=await page.locator("#timeline").evaluate(el=>getComputedStyle(el).maxHeight);
  assert.ok(parseFloat(normalHeight)>500,"Normal view should reserve more height for journey tiles: "+normalHeight);
  // V2 visual regression contract: dedicated hero + source-driven reusable route stages.
  assert.equal(await page.locator("#routeFlow .v2-step").count(),6,
   "Office route must display all six independently styled journey stages");
  assert.ok(await page.locator(".v2-skyline").isVisible(),"Dedicated Smart Match hero artwork visible");
  assert.equal(await page.locator(".eyebrow, #editorIntro").count(),0,
   "Normal mode must not show redundant header text");
  const heroRect=await page.locator(".v2-skyline").boundingBox();
  const headingRect=await page.locator("#heading").boundingBox();
  assert.ok(headingRect.y>=heroRect.y+heroRect.height-2,
   "Route title must be BELOW the standalone hero without overlap");
  assert.ok(await page.locator("#scheduleInfo").count()===1,
   "Technical information should be available as collapsed details");
  assert.equal(await page.locator("#scheduleInfo").evaluate(el=>el.open),false);
  const heroBg=await page.locator(".v2-skyline").evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(heroBg,/smart-match-budapest-neon-hero-v2\.svg/,"Hero must be a standalone original asset");
  assert.ok(await page.locator("#templates .template-chip").count()>=2,"Two templates exist");

  // V3.2: calendar, next-day and bell must share one real row on phones.
  const rowLayout=await page.evaluate(()=>{
   const ids=["day","dayNext","remindBtn"];
   const boxes=ids.map(id=>document.getElementById(id).getBoundingClientRect());
   return {tops:boxes.map(b=>b.top),bottoms:boxes.map(b=>b.bottom),
    lefts:boxes.map(b=>b.left),rights:boxes.map(b=>b.right),
    parentRight:document.getElementById("timelinePanel").getBoundingClientRect().right,
    widths:boxes.map(b=>b.width)};
  });
  assert.ok(Math.max(...rowLayout.tops)-Math.min(...rowLayout.tops)<=4,
   "Date, +1 day and bell must be on the same row: "+JSON.stringify(rowLayout));
  assert.ok(rowLayout.rights[2]<=rowLayout.parentRight+2,
   "Bell must fit inside timeline card: "+JSON.stringify(rowLayout));
  assert.equal(await page.locator("#remindBtn").textContent(),"🔔","Bell must be icon-only");
  assert.equal(await page.locator("#remindBtn").getAttribute("aria-pressed"),"false");
  await page.locator("#remindBtn").click();
  assert.equal(await page.locator("#remindBtn").getAttribute("aria-pressed"),"true",
   "Reminder switch must still work");
  assert.match(await page.locator("#remindBtn").getAttribute("aria-label"),/kikapcsolása/);
  await page.locator("#remindBtn").click();
  assert.equal(await page.locator("#remindBtn").getAttribute("aria-pressed"),"false");

  await page.screenshot({path:path.join(output,device+"-work.png"),fullPage:true});
  await page.locator("#pinBtn").click();
  await page.waitForFunction(()=>document.body.classList.contains("pinned"));
  assert.equal(await page.locator("#routeFlow .v2-step").count(),6,
   "Pinned work route visual story must retain all stages");
  assert.equal(await page.locator("#pinnedBanner").isVisible(),false,"Duplicated top pinned toolbar must remain hidden");
  assert.equal(await page.locator("#scheduleInfo").isVisible(),false,
   "Pinned mode must hide long explanations and source paragraphs");
  assert.equal(await page.locator("#matchSummary").count(),0,
   "No summary prose may occupy timetable space in any mode");
  const layout=await page.evaluate(()=>{
   const timeline=document.getElementById("timeline").getBoundingClientRect();
   const dock=document.getElementById("pinnedActions").getBoundingClientRect();
   const banner=document.getElementById("pinnedBanner").getBoundingClientRect();
   const title=document.getElementById("heading").getBoundingClientRect();
   const skyline=document.querySelector(".v2-skyline").getBoundingClientRect();
   return {timelineHeight:timeline.height,timelineBottom:timeline.bottom,
    dockTop:dock.top,scrollHeight:document.getElementById("timeline").scrollHeight,
    clientHeight:document.getElementById("timeline").clientHeight,
    pageOverflow:document.documentElement.scrollHeight-innerHeight,
    titleY:title.y,heroArtBottom:skyline.bottom,
    bannerHeight:banner.height};
  });
  assert.ok(layout.timelineHeight>=105,"Pinned viewport must reserve useful vertical timeline space: "+JSON.stringify(layout));
  assert.ok(layout.timelineBottom<=layout.dockTop+3,
   "Scrollable timeline must stop before pinned action dock: "+JSON.stringify(layout));
  assert.ok(layout.scrollHeight>layout.clientHeight,"Timeline must scroll independently");
  assert.ok(layout.pageOverflow<=4,"Pinned page itself must not vertically scroll: "+JSON.stringify(layout));
  assert.ok(layout.titleY>=layout.heroArtBottom-2,
   "Pinned route title must stay below the hero image");
  assert.equal(await page.locator(".v2-skyline").isVisible(),false,
   "Dedicated scenic hero MUST NOT take space in pinned view");
  assert.ok(await page.locator("#pinnedActions").isVisible(),
   "Usual 3-button pinned taskbar remains available");
  assert.ok(await page.locator("#reverseBtn").isVisible(),
   "Reverse route icon appears beside the pinned title");
  const titleRow=await page.evaluate(()=>{
   const a=document.getElementById("heading").getBoundingClientRect();
   const b=document.getElementById("reverseBtn").getBoundingClientRect();
   const row=document.querySelector("main>.v33-titlebar").getBoundingClientRect();
   return {headingTop:a.top,reverseTop:b.top,reverseRight:b.right,width:innerWidth,
    headingCenter:a.left+a.width/2,rowCenter:row.left+row.width/2,
    headingRight:a.right,reverseLeft:b.left};
  });
  assert.ok(Math.abs(titleRow.headingTop-titleRow.reverseTop)<=14,
   "Reverse icon must be beside title, not on an extra row: "+JSON.stringify(titleRow));
  assert.ok(titleRow.reverseRight<=titleRow.width,
   "Reverse icon must not overflow screen");
  assert.ok(Math.abs(titleRow.headingCenter-titleRow.rowCenter)<=2,
   "Pinned route title must be centered across whole header: "+JSON.stringify(titleRow));
  assert.ok(titleRow.headingRight<=titleRow.reverseLeft+1,
   "Centered heading must not overlap reverse button: "+JSON.stringify(titleRow));
  await page.screenshot({path:path.join(output,device+"-work-pinned.png"),fullPage:true});
  await page.locator("#reverseBtn").click();
  await page.waitForFunction(()=>document.getElementById("headingShort")?.textContent?.includes("Otthon → Munkahely")&&
   document.getElementById("targetRoute")?.value==="17");
  assert.equal(await page.locator("#kind").inputValue(),"transfer",
   "Reversed home->work is a true 260-to-tram connection, not Citronella walk-only");
  assert.equal(await page.locator("#headingShort").textContent(),"Otthon → Munkahely");
  assert.equal(await page.locator("#pinTemplateSelect").inputValue(),"monika-home-to-office");
  await page.waitForFunction(()=>document.getElementById("timelineSubtitle")?.textContent?.includes("260-as · Citronella utca")&&
   document.querySelector("#timeline .timeline-row.next"),{timeout:30000});
  const focused=await page.evaluate(()=>{
   const outer=document.getElementById("timeline").getBoundingClientRect();
   const next=document.querySelector("#timeline .timeline-row.next").getBoundingClientRect();
   return {outerTop:outer.top,outerBottom:outer.bottom,nextTop:next.top,nextBottom:next.bottom};
  });
  assert.ok(focused.nextTop>=focused.outerTop-8&&focused.nextTop<focused.outerBottom-15,
   "After reversal, NEXT departure tile should actually be visible: "+JSON.stringify(focused));
  assert.equal(await page.locator(".v2-skyline").isVisible(),false);
  assert.ok(await page.locator("#pinnedActions").isVisible());
  await page.screenshot({path:path.join(output,device+"-work-reversed-pinned.png"),fullPage:true});
  await page.locator("#reverseBtn").click();
  await page.waitForFunction(()=>document.getElementById("headingShort")?.textContent==="Munkahely → Otthon"&&
   document.getElementById("targetRoute")?.value==="260");
  assert.equal(await page.locator("#pinTemplateSelect").inputValue(),"monika-260");
  await page.locator("#pinEdit").click();
  await page.waitForFunction(()=>!document.body.classList.contains("pinned"));

  await page.locator("#templates .template-chip").filter({hasText:"Citronella"}).click();
  await page.waitForFunction(()=>{
   const s=document.getElementById("status")?.textContent||"";
   return document.getElementById("kind")?.value==="walk"&&s.includes("✓ BKK GTFS");
  });
  assert.equal(await page.locator("#walkMetric").textContent(),"6 + 2 perc");
  assert.equal(await page.locator("#kind").inputValue(),"walk");
  assert.equal(await page.locator("#routeFlow .v2-step").count(),4,
   "The walk-only route must use the same reusable visual journey component");
  assert.ok(await page.locator(".v34-260-row.v34-matched").count()>0,
   "Citronella full 260 bus list has real timetable results");
  await page.locator("#pinBtn").click();
  await page.waitForFunction(()=>document.body.classList.contains("pinned"));
  assert.equal(await page.locator("#editor").isVisible(),false,"Pinned screen hides form");
  assert.ok(await page.locator("#heroTime").isVisible(),"Pinned hero is visible");
  assert.ok(await page.locator("#timeline").isVisible(),"Pinned timeline is visible");
  assert.ok(await page.locator("#pinnedActions").isVisible(),"Bottom dock is visible in fullscreen pinned mode");
  assert.equal(await page.locator("#pinTemplateSelect option").count(),3,
   "Pinned selector preserves the two existing favorites plus genuine reverse commute");
  assert.equal(await page.locator("#reverseBtn").isVisible(),false,
   "Citronella walk-only favorite is not incorrectly mapped to a reverse work commute");
  await page.screenshot({path:path.join(output,device+"-home-pinned.png"),fullPage:true});
  await page.locator("#pinTemplateSelect").selectOption("monika-260");
  await page.waitForFunction(()=>document.getElementById("heading")?.textContent?.includes("Munkahely"));
  assert.equal(await page.locator("#routeFlow .v2-step").count(),6,
   "Pinned mode must dynamically re-render a different route scheme");
  await page.locator("#pinTemplateSelect").selectOption("home-citronella-260");
  await page.waitForFunction(()=>document.getElementById("kind")?.value==="walk");
  await page.locator("#pinEdit").click();
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

async function guardianPinSmoke(browser,base,device){
 const mobile=device==="mobile";
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1320,height:890},
  deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,serviceWorkers:"block"});
 await context.route("**/*",request=>{
  if(request.request().url().startsWith(base))return request.continue();
  return request.abort();
 });
 const page=await context.newPage();
 // Fixed 07:53 Budapest on 2026-11-11 to catch the original 08:07 vs 08:17 bug.
 await page.addInitScript(()=>{Date.now=()=>Date.parse("2026-11-11T06:53:00Z")});
 try{
  const fixture=base+"healthhub/guardian/tests/smart-match-pin-v1-fixture.html";
  await page.goto(fixture,{waitUntil:"domcontentloaded"});
  await page.locator("#hhSmartMatchPinV1").waitFor({timeout:12000});
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinV1")?.dataset.state==="ready",{timeout:30000});
  assert.equal(await page.locator("#hhSmartMatchPinTimeV1").textContent(),"08:07",
   "At 07:53 the Citronella 260 inbound bus must depart at 08:07, not 08:17");
  assert.match(await page.locator("#hhSmartMatchPinNoteV1").textContent(),/07:59/,
   "Separate 6min walking plus 2min buffer as departure FROM HOME");
  assert.match(await page.locator("#hhSmartMatchPinV1").getAttribute("href"),/id=monika-home-to-office/,
   "Guardian 08:07 bus card must open the COMPLETE home-to-office pinned journey.");
  // At 09:15 the mini card must show the ACTUAL NEXT 260 bus, not the old
  // 15:12 matched recommendation observed in production.
  const scheduleAudit=await page.evaluate(async()=>{
   Date.now=()=>Date.parse("2026-11-11T08:15:00Z");
   const {readOfficialSnapshot}=await import("/berlet-app/sh9/smart-travel/lena-native/bkk/bkk-feed-client-v1106.mjs");
   const {HOME,compute,full260Timetable,pair260Connections}=await import("/berlet-app/healthhub/guardian/smart-260-connect/core.mjs?v=35");
   const {data}=await readOfficialSnapshot();
   const cfg={...HOME,startHour:0,endHour:24};
   const full=full260Timetable(data,"2026-11-11","work");
   const paired=pair260Connections(full,compute(data,"2026-11-11",cfg),cfg);
   const bus=paired.rows.find(x=>x.departMs>=Date.now());
   if(!bus)throw Error("Expected a genuine upcoming Citronella 260 departure.");
   const expected=new Intl.DateTimeFormat("hu-HU",{timeZone:"Europe/Budapest",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(bus.departMs));
   window.dispatchEvent(new Event("focus"));
   return {expected,total:paired.rows.length,stop:bus.stop};
  });
  assert.ok(scheduleAudit.total>=20,"Full-day 260 must include all scheduled departures");
  assert.equal(scheduleAudit.stop,"Citronella utca");
  await page.waitForFunction(expected=>document.getElementById("hhSmartMatchPinTimeV1")?.textContent===expected,
   scheduleAudit.expected,{timeout:4000});
  assert.ok(scheduleAudit.expected<"12:00","09:15 next 260 must not be an afternoon-only connection: "+JSON.stringify(scheduleAudit));
  assert.match(await page.locator(".hh-smart-match-pin-label").textContent(),/CITRONELLA/);
  await page.evaluate(()=>{
   Date.now=()=>Date.parse("2026-11-11T06:53:00Z");
   window.dispatchEvent(new Event("focus"));
  });
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinTimeV1")?.textContent==="08:07");
  // Previous rollout stored an incorrect 'office' default. Migrates once,
  // without hijacking a route subsequently pinned by the user.
  await page.evaluate(()=>{
   localStorage.removeItem("hh-smart-match-citronella-default-v2-m");
   localStorage.setItem("sh9-smart-match-active-pin-v1-m","monika-260");
  });
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinV1")?.dataset.state==="ready");
  assert.equal(await page.locator("#hhSmartMatchPinTimeV1").textContent(),"08:07");
  assert.equal(await page.evaluate(()=>localStorage.getItem("sh9-smart-match-active-pin-v1-m")),
   "home-citronella-260","Migrate old default exactly once");
  // Reproduce the reported bad pinned focus: at 07:53, Guardian's
  // Citronella card opens the FULL home-to-office route and must show
  // the real 260 stop time 08:07, never a later office/feeder proposal.
  await page.locator("#hhSmartMatchPinV1").click();
  await page.waitForFunction(()=>
   document.body.classList.contains("pinned")&&
   document.getElementById("headingShort")?.textContent==="Otthon → Munkahely"&&
   document.getElementById("heroTime")?.textContent==="08:07",{timeout:30000});
  assert.equal(await page.locator("#countdownLabel").textContent(),"260-asig");
  assert.match(await page.locator("#timelineSubtitle").textContent(),/Citronella utca/);
  assert.ok(await page.locator(".v34-260-row").count()>=20,
   "Pinned home-to-office must show the COMPLETE Citronella daily timetable");
  assert.equal(await page.locator("#heroTime").textContent(),
   await page.locator(".v34-260-row.next .row-time").first().textContent(),
   "Big focus time must be the 260 stop departure, not the proposed origin departure");
  await page.screenshot({path:path.join(output,device+"-guardian-full-260-pinned.png"),fullPage:true});
  await page.goto(fixture,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinV1")?.dataset.state==="ready",{timeout:30000});
  await page.evaluate(()=>document.documentElement.dataset.guardianProfile="z");
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinV1")?.dataset.state==="inactive");
  await page.evaluate(()=>document.documentElement.dataset.guardianProfile="m");
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinV1")?.dataset.state==="ready");
  assert.equal(await page.locator("#hhBkkFocusV796").textContent(),"Ne mutasd élő járműveket");
  assert.equal(await page.locator("#hhBkkWatchToggleV858 strong").textContent(),"BKK Watchlist");
  await page.goto(base+"healthhub/guardian/smart-260-connect/",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("status")?.textContent?.includes("✓ BKK GTFS"),
   {timeout:30000});
  await page.locator("#pinBtn").click();
  assert.equal(await page.evaluate(()=>localStorage.getItem("sh9-smart-match-active-pin-v1-m")),
   "monika-260","Pinning must publish active selection under new browser-local key.");
  await page.goto(fixture,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinV1")?.dataset?.state==="ready",
   {timeout:30000});
  assert.equal(await page.locator("#hhSmartMatchPinV1").evaluate(el=>el.parentElement.id),"hhBkkLiveBarV796",
   "Pin chip must be added after existing BKK controls without moving/replacing them.");
  assert.equal(await page.locator("#hhBkkFocusV796").textContent(),"Ne mutasd élő járműveket",
   "Existing BKK visibility action must remain untouched.");
  assert.equal(await page.locator("#guardianNativeGpsTitleV1177").textContent(),"GPS (érintetlen)");
  const time=await page.locator("#hhSmartMatchPinTimeV1").textContent();
  assert.match(time,/^\d{2}:\d{2}$/,"Only a verified official GTFS departure may be shown: "+time);
  const href=await page.locator("#hhSmartMatchPinV1").getAttribute("href");
  assert.match(href,/pinned=1&id=monika-260/);
  const rect=await page.locator("#hhSmartMatchPinV1").boundingBox();
  assert.ok(rect.width>=105&&rect.width<=230&&rect.height>=85,"Enlarged combined Smart Match tile expected");
  await page.screenshot({path:path.join(output,device+"-guardian-smart-match-pin.png"),fullPage:true});
  await page.locator("#hhSmartMatchPinV1").click();
  await page.waitForFunction(()=>document.body.classList.contains("pinned")&&
   document.getElementById("headingShort")?.textContent==="Munkahely → Otthon",{timeout:30000});
  // Switching the pinned route must update the Guardian shortcut as well.
  await page.locator("#reverseBtn").click();
  await page.waitForFunction(()=>document.getElementById("headingShort")?.textContent==="Otthon → Munkahely"&&
   localStorage.getItem("sh9-smart-match-active-pin-v1-m")==="monika-home-to-office");
  await page.goto(fixture,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinV1")?.dataset.state==="ready");
  assert.match(await page.locator(".hh-smart-match-pin-label").textContent(),/CITRONELLA/);
  assert.match(await page.locator("#hhSmartMatchPinV1").getAttribute("href"),/id=monika-home-to-office/);
  assert.equal(await page.locator("#hhSmartMatchPinTimeV1").textContent(),"08:07",
   "After reversal the Guardian card must focus the selected direction's next real 260");
  return {device,cardTime:time,guardianCard:"passed",opensPinned:"passed",bkkGuard:"unchanged"};
 }finally{await context.close()}
}


async function guardianSmartLocationSmoke(browser,base,device){
 const mobile=device==="mobile";
 const context=await browser.newContext({
  viewport:mobile?{width:390,height:844}:{width:1320,height:890},
  deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,
  serviceWorkers:"block"
 });
 const page=await context.newPage();
 await context.route("**/*",request=>{
  if(request.request().url().startsWith(base))return request.continue();
  return request.abort();
 });
 try{
  await page.addInitScript(()=>{
   Date.now=()=>Date.parse("2026-11-11T06:53:00Z");
  });
  const fixture=base+"healthhub/guardian/tests/smart-match-pin-v1-fixture.html";
  await page.goto(fixture,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinV1")?.dataset.state==="ready",
   {timeout:30000});
  const toggle=page.locator("#hhSmartLocationSwitchV1");
  assert.ok(await toggle.isVisible(),"Smart Location must be visible directly after Smart Match");
  assert.equal(await toggle.getAttribute("aria-pressed"),"true","Default must be ON");
  assert.match(await toggle.textContent(),/BE/);
  assert.equal(await page.evaluate(()=>localStorage.getItem("sh9-smart-location-switch-v1-m")),null,
   "Default ON does not need a settings or GPS write");
  const sameRow=await page.evaluate(()=>{
   const bar=document.getElementById("hhBkkLiveBarV796");
   const ids=["hhBkkLiveStatusV793","hhBkkFocusV796","hhSmartMatchPinV1","hhSmartLocationSwitchV1"];
   const a=ids.map(id=>document.getElementById(id));
   const boxes=a.map(x=>x.getBoundingClientRect()),bounds=bar.getBoundingClientRect();
   const header=document.querySelector(".hh-bkk-watch-header-v814").getBoundingClientRect();
   return {display:getComputedStyle(bar).display,
    status:{left:boxes[0].left,right:boxes[0].right,top:boxes[0].top},
    live:{left:boxes[1].left,right:boxes[1].right,top:boxes[1].top},
    match:{left:boxes[2].left,right:boxes[2].right,top:boxes[2].top,bottom:boxes[2].bottom,width:boxes[2].width},
    location:{left:boxes[3].left,right:boxes[3].right,top:boxes[3].top,bottom:boxes[3].bottom},
    watch:{left:header.left,right:header.right,top:header.top},
    barRight:bounds.right,cardNext:a[2].nextElementSibling?.id,
    liveLabel:a[1].textContent,liveFont:getComputedStyle(a[1]).fontSize,
    liveIcon:getComputedStyle(a[1],"::before").content};
  });
  assert.equal(sameRow.cardNext,"hhSmartLocationSwitchV1",
   "Location switch must be DIRECTLY after pinned Smart Match card");
  assert.equal(sameRow.display,"grid","Hero V2 uses a combined gridded Smart Match/Location card");
  assert.ok(sameRow.match.left>=sameRow.status.right-2,
   "Full size BKK logo must have its own left column: "+JSON.stringify(sameRow));
  assert.ok(sameRow.location.left>=sameRow.match.right-2,
   "Smart Location must sit to the right inside the top tile: "+JSON.stringify(sameRow));
  assert.ok(Math.abs(sameRow.location.top-sameRow.match.top)<12,
   "Smart Match and Smart Location must align: "+JSON.stringify(sameRow));
  assert.ok(sameRow.watch.top>=sameRow.match.bottom-15&&sameRow.watch.left>=sameRow.status.right-16,
   "Watchlist/Edit must form the right-hand second tile: "+JSON.stringify(sameRow));
  assert.ok(sameRow.location.right<=sameRow.barRight+2&&sameRow.watch.right<=sameRow.barRight+10,
   "Top tile and Watchlist must stay inside mobile panel: "+JSON.stringify(sameRow));
  assert.equal(sameRow.liveFont,"0px","Long BKK text must be replaced VISUALLY by an icon");
  assert.equal(sameRow.liveLabel,"Ne mutasd élő járműveket",
   "Do not modify the existing BKK control's JS, DOM action or text");
  const preview=await page.evaluate(()=>{
   const label=document.getElementById("hhBkkLiveStatusV793"),button=document.getElementById("hhBkkFocusV796");
   const current={label:getComputedStyle(label,"::before").content,
    labelFont:getComputedStyle(label,"::before").fontSize,
    enabled:getComputedStyle(button,"::before").content,
    enabledBg:getComputedStyle(button).backgroundImage};
   button.setAttribute("aria-pressed","false");
   const disabled={text:getComputedStyle(button,"::before").content,
    bg:getComputedStyle(button).backgroundImage};
   button.setAttribute("aria-pressed","true");
   return {current,disabled,originalText:button.textContent};
  });
  assert.equal(preview.current.label,'""',
   "The compact supplied BKK logo replaces the visible BKK élő text");
  const crest=await page.evaluate(async()=>{
   const status=document.getElementById("hhBkkLiveStatusV793");
   const image=getComputedStyle(status,"::before").backgroundImage;
   const url=image.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
   if(!url)return {ok:false,image:image.slice(0,70)};
   const im=new Image();im.src=url;
   try{await im.decode();return {ok:true,width:im.naturalWidth,height:im.naturalHeight,
     source:url.includes("bkk-live-dashboard-hero-v2.webp")?"hero-v2":"other"}}
   catch(_){return {ok:false,image:"decode failed",source:url.slice(0,90)}}
  });
  assert.ok(crest.ok&&crest.width>=100&&crest.height>=80&&crest.source==="hero-v2",
   "Large original BKK ÉLŐ user logo must decode: "+JSON.stringify(crest));
  assert.equal(preview.current.enabled,'"ON"');
  assert.equal(preview.disabled.text,'"OFF"');
  assert.match(preview.current.enabledBg,/36, 184, 97|8, 119, 64/,
   "ON must have a green background");
  assert.match(preview.disabled.bg,/233, 89, 98|169, 25, 48/,
   "OFF must have a red background");
  assert.equal(preview.originalText,"Ne mutasd élő járműveket",
   "Existing BKK live button's accessible action text remains intact");
  if(mobile){
   await page.setViewportSize({width:320,height:730});
   const narrow=await page.evaluate(()=>{
    const bar=document.getElementById("hhBkkLiveBarV796").getBoundingClientRect();
    const logo=document.getElementById("hhBkkLiveStatusV793").getBoundingClientRect();
    const match=document.getElementById("hhSmartMatchPinV1").getBoundingClientRect();
    const loc=document.getElementById("hhSmartLocationSwitchV1").getBoundingClientRect();
    const watch=document.querySelector(".hh-bkk-watch-header-v814").getBoundingClientRect();
    const title=document.querySelector("#hhBkkWatchToggleV858 strong").getBoundingClientRect();
    const edit=document.getElementById("hhBkkWatchEditV814").getBoundingClientRect();
    return {left:bar.left,right:bar.right,logoRight:logo.right,
     matchLeft:match.left,matchRight:match.right,locLeft:loc.left,locRight:loc.right,
     watchLeft:watch.left,watchRight:watch.right,
     titleRight:title.right,editLeft:edit.left};
   });
   assert.ok(narrow.locRight<=narrow.right+2&&narrow.watchRight<=narrow.right+10,
    "320px Hero controls must not overflow: "+JSON.stringify(narrow));
   assert.ok(narrow.logoRight<=narrow.matchLeft+3&&narrow.matchRight<=narrow.locLeft+3,
    "320px BKK logo and combined Smart tile must not overlap: "+JSON.stringify(narrow));
   assert.ok(narrow.titleRight<=narrow.editLeft+2,
    "320px Watchlist title and Edit must not overlap: "+JSON.stringify(narrow));
   await page.setViewportSize({width:390,height:844});
  }
  // Synthetic GPS and user favorites: no live phone or account connection.
  // Same cached GPS fix must not count as two independent readings.
  await page.evaluate(()=>{
   const t=Date.parse("2026-11-11T06:53:00Z");
   window.__testEpoch=t;
   window.__mockPlace="office";
   window.__testFix={
    profile:"monika",source:"HH One Native GPS",lat:47.5101,lng:19.0201,
    ts:t,accuracy:15
   };
   Object.defineProperty(window,"HH_GUARDIAN_PROFILE_FOLLOW_V837",{
    configurable:true,value:{get latestAuthorizedSelectedFix(){return window.__testFix}}
   });
   Object.defineProperty(window,"HH_TRAVEL_FAVORITES_V972",{configurable:true,value:{
    getSlots(){return [
     {label:"Otthon",place:{name:"Teszt Otthon",lat:47.55,lng:19.01}},
     {label:"Munkahely",place:{name:"Teszt Munkahely",lat:47.51,lng:19.02}}
    ]}
   }});
   window.dispatchEvent(new Event("hh-smart-location-check-v1"));
  });
  // One fix alone must never switch to work origin.
  assert.match(await page.locator("#hhSmartMatchPinV1").getAttribute("href"),/id=monika-home-to-office/);
  await page.evaluate(()=>{
   Date.now=()=>window.__testEpoch+9000;
   window.dispatchEvent(new Event("hh-smart-location-check-v1"));
  });
  assert.match(await page.locator("#hhSmartMatchPinV1").getAttribute("href"),/id=monika-home-to-office/,
   "Repeating the identical GPS reading must NOT switch directions");
  await page.evaluate(()=>{
   window.__testFix={...window.__testFix,ts:window.__testEpoch+9500};
   Date.now=()=>window.__testEpoch+10000;
   window.dispatchEvent(new Event("hh-smart-location-check-v1"));
  });
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinV1")?.href?.includes("id=monika-260"),
   {timeout:10000});
  assert.equal(await toggle.getAttribute("data-zone"),"work",
   "Office GPS should recommend Munkahely -> Otthon");
  assert.equal(await page.evaluate(()=>localStorage.getItem("sh9-smart-match-active-pin-v1-m")),
   "home-citronella-260","Auto switch must NOT overwrite manual saved pin");
  await page.evaluate(()=>{
   Date.now=()=>window.__testEpoch+20000;
   window.__testFix={...window.__testFix,lat:47.5501,lng:19.0101,ts:window.__testEpoch+20000};
   window.dispatchEvent(new Event("hh-smart-location-check-v1"));
   Date.now=()=>window.__testEpoch+31000;
   window.__testFix={...window.__testFix,ts:window.__testEpoch+31000};
   window.dispatchEvent(new Event("hh-smart-location-check-v1"));
  });
  await page.waitForFunction(()=>document.getElementById("hhSmartMatchPinV1")?.href?.includes("id=monika-home-to-office"),
   {timeout:10000});
  assert.equal(await toggle.getAttribute("data-zone"),"home",
   "Home GPS should recommend Otthon -> Munkahely");
  await page.screenshot({path:path.join(output,device+"-guardian-smart-location-on-one-row.png"),
   fullPage:true});
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-pressed"),"false");
  assert.equal(await page.evaluate(()=>localStorage.getItem("sh9-smart-location-switch-v1-m")),"off");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("hhSmartLocationSwitchV1")?.getAttribute("aria-pressed")==="false");
  assert.match(await page.locator("#hhSmartLocationSwitchV1").textContent(),/KI/,
   "User OFF preference must persist");
  assert.equal(await page.locator("#hhBkkFocusV796").textContent(),"Ne mutasd élő járműveket");
  return {device,layout:"unified-hero",locationDefault:"on",workFromOffice:"passed",
   workFromHome:"passed",gpsReadOnly:"passed",togglePersists:"passed",bkkLive:"untouched"};
 }finally{await context.close()}
}


async function watchlistAlwaysOpenSmoke(browser,base,device){
 const mobile=device==="mobile";
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1320,height:890},
  deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,serviceWorkers:"block"});
 await context.route("**/*",req=>{
  if(req.request().url().startsWith(base))return req.continue();
  return req.abort();
 });
 const page=await context.newPage();
 try{
  await page.goto(base+"healthhub/guardian/tests/bkk-watchlist-always-open-fixture.html",
   {waitUntil:"domcontentloaded"});
  const list=page.locator("#hhBkkWatchRowsV814");
  await page.waitForFunction(()=>document.querySelectorAll("#hhBkkWatchRowsV814 article").length===2);
  const section=page.locator("#hhBkkWatchlistV814");
  const body=page.locator("#hhBkkWatchContentV858");
  const header=page.locator("#hhBkkWatchToggleV858");
  assert.equal(await body.evaluate(el=>el.hidden),false,"Watchlist must be open immediately");
  assert.equal(await section.evaluate(el=>el.hidden),false);
  assert.equal(await header.evaluate(el=>el.tagName),"DIV","The heading is not a clickable collapse button");
  assert.equal(await header.getAttribute("role"),"heading");
  assert.equal(await header.locator(".hh-bkk-watch-chevron-v858").count(),0);
  assert.equal(await header.getAttribute("aria-expanded"),null);
  assert.equal(await header.locator("strong").textContent(),"BKK Watchlist");
  const mark=await header.evaluate(async el=>{
   const css=getComputedStyle(el,"::before");
   const url=css.backgroundImage.match(/url\(["']?(data:image\/webp;base64,[^"')]+)/)?.[1];
   if(!url)return {decoded:false,css:css.backgroundImage.slice(0,55)};
   const im=new Image();im.src=url;
   try{await im.decode();return {decoded:true,width:im.naturalWidth,height:im.naturalHeight}}
   catch(e){return {decoded:false,message:String(e)}}
  });
  assert.ok(mark.decoded&&mark.width>=100,
   "Watchlist left BKK crest must use the supplied cropped artwork");
  assert.equal(await list.locator("article").count(),2);
  const card=page.locator("#hhBkkWatchRowsV814 article").first();
  assert.equal(await card.locator(".hh-bkk-watch-actions-v814 button").count(),5,
   "Route controls must include Live, Show, Move up/down and Remove");
  const check=async width=>{
   await page.setViewportSize({width,height:800});
   return page.evaluate(()=>{
    const row=document.querySelector("#hhBkkWatchRowsV814 article");
    const actions=row.querySelector(".hh-bkk-watch-actions-v814");
    const badge=row.querySelector(".hh-bkk-watch-number-v814");
    const btns=[...actions.querySelectorAll("button")].map(x=>x.getBoundingClientRect());
    const box=row.getBoundingClientRect(),b=badge.getBoundingClientRect();
    const css=getComputedStyle(row);
    const heading=document.getElementById("hhBkkWatchToggleV858").getBoundingClientRect();
    const text=document.querySelector("#hhBkkWatchToggleV858 strong").getBoundingClientRect();
    const edit=document.getElementById("hhBkkWatchEditV814").getBoundingClientRect();
    return {width:box.width,height:box.height,numberFont:getComputedStyle(badge).fontSize,
     grid:css.display,buttons:btns.length,topY:btns.map(x=>x.top),
     lastRight:Math.max(...btns.map(x=>x.right)),right:box.right,topBadge:b.top,
     titleLeft:text.left,headingLeft:heading.left,titleRight:text.right,
     editLeft:edit.left,watchGap:edit.left-text.right};
   });
  };
  let dims=await check(mobile?390:1320);
  assert.equal(dims.grid,"grid");
  assert.ok(dims.height<115,"Compact Watchlist card should be under 115px: "+JSON.stringify(dims));
  assert.ok(parseFloat(dims.numberFont)>=21,"Route number should be larger");
  assert.ok(Math.max(...dims.topY)-Math.min(...dims.topY)<4,
   "All controls must share one row: "+JSON.stringify(dims));
  assert.ok(dims.lastRight<=dims.right+1,"Action buttons must not overrun the card");
  assert.ok(dims.titleLeft>=dims.headingLeft+30,
   "BKK Watchlist title must shift RIGHT to leave space for the image: "+JSON.stringify(dims));
  assert.ok(dims.watchGap>=-1,
   "BKK Watchlist title must not overlap Szerkesztés: "+JSON.stringify(dims));
  if(mobile){
   dims=await check(320);
   assert.ok(dims.height<125,"Narrow phone Watchlist must remain compact: "+JSON.stringify(dims));
   assert.ok(Math.max(...dims.topY)-Math.min(...dims.topY)<4);
   assert.ok(dims.lastRight<=dims.right+1);
   assert.ok(dims.watchGap>=-1,
    "Even 320px BKK logo, Watchlist title and Edit must not overlap: "+JSON.stringify(dims));
   await page.setViewportSize({width:390,height:844});
  }
  // Unified Watchlist button controls both route and live overlays.
  // Existing LIVE=ON state must be labelled Elrejt, not mistakenly Mutasd.
  const swatch=async selector=>card.locator(selector).evaluate(el=>({
   background:getComputedStyle(el).backgroundImage,
   color:getComputedStyle(el).color,
   state:el.getAttribute("aria-pressed")
  }));
  const assertPastel=(value,color,what)=>{
   assert.ok(value.background.includes(color==="green"?"rgb(212, 250, 229)":"rgb(255, 236, 243)"),
    what+" expected "+color+" pastel: "+JSON.stringify(value));
   assert.equal(value.color,color==="green"?"rgb(17, 84, 61)":"rgb(132, 35, 62)");
  };
  const unified=card.locator(".hh-bkk-watch-unified-v1");
  assert.equal(await unified.count(),1,"Exactly one Watchlist map/live control per route");
  assert.equal(await unified.getAttribute("aria-pressed"),"true");
  assert.match(await unified.textContent(),/^Elrejt/);
  assertPastel(await swatch(".hh-bkk-watch-unified-v1"),"green","Combined display ON");
  await unified.click();
  await page.waitForFunction(()=>document.querySelector("#hhBkkWatchRowsV814 .hh-bkk-watch-unified-v1")?.getAttribute("data-visible")==="false");
  assertPastel(await swatch(".hh-bkk-watch-unified-v1"),"red","Combined display OFF");
  assert.equal(await body.evaluate(el=>el.hidden),false,"Combined toggle must NOT collapse Watchlist");
  await unified.click();
  await page.waitForFunction(()=>document.querySelector("#hhBkkWatchRowsV814 .hh-bkk-watch-unified-v1")?.getAttribute("data-visible")==="true");
  assertPastel(await swatch(".hh-bkk-watch-unified-v1"),"green","Combined display ON again");
  assert.equal(await body.evaluate(el=>el.hidden),false);
  const editor=page.locator("#hhBkkCatalogV801");
  await page.locator("#hhBkkWatchEditV814").click();
  assert.equal(await editor.evaluate(el=>el.open),true);
  assert.equal(await body.evaluate(el=>el.hidden),false);
  await page.locator("#hhBkkWatchEditV814").click();
  assert.equal(await editor.evaluate(el=>el.open),false);
  assert.equal(await body.evaluate(el=>el.hidden),false);
  const down=list.locator("article").first().locator("button[aria-label='260 lejjebb helyezése']");
  await down.click();
  assert.equal(await list.locator("article").first().locator(".hh-bkk-watch-number-v814").textContent(),"17");
  assert.equal(await body.evaluate(el=>el.hidden),false);
  await page.screenshot({path:path.join(output,device+"-bkk-watchlist-always-open-compact.png"),
   fullPage:true});
  return {device,open:"permanent",collapseControl:"removed",height:dims.height,
   actions:"single-row",number:"enlarged",liveAndMap:"preserved",editing:"preserved",reorder:"preserved"};
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
  for(const device of ["desktop","mobile"])console.log("GUARDIAN-SMART-MATCH-PIN-SMOKE",JSON.stringify(await guardianPinSmoke(browser,base,device)));
  for(const device of ["desktop","mobile"])console.log("GUARDIAN-SMART-LOCATION-SMOKE",JSON.stringify(await guardianSmartLocationSmoke(browser,base,device)));
  for(const device of ["desktop","mobile"])console.log("BKK-WATCHLIST-ALWAYS-OPEN-COMPACT-SMOKE",JSON.stringify(await watchlistAlwaysOpenSmoke(browser,base,device)));
 }finally{
  if(browser)await browser.close();
  server.close();
 }
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
