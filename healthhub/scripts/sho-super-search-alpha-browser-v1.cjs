/* SHO Super Search Alpha Test 1 · real Chromium end-to-end smoke.
 * Runs a local-only static test origin. All timetable data is synthetic.
 * Never visits public SHO, Supabase, a private account or the ChatGPT UI.
 * Requires Playwright installed in NODE_PATH and its Chromium binary.
 */
'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../..');
const BASE='/sh9/super-search/local-shadow-preview-v3.html';
const observed=[];
const timing=()=>performance.now();
const feed={
 schema:'sh9-mav-gtfs-v1',timezone:'Europe/Budapest',
 rightsConfirmed:false,localOnly:true,source:'MÁV GTFS (helyi)',
 generatedAt:'2026-11-06T09:00:00Z',
 stops:[['keleti','Budapest-Keleti'],['barcika','Kazincbarcika vasútállomás']],
 services:{daily:{from:'20261101',to:'20261130',days:'1111111',exceptions:{}}},
 trips:[{id:'synthetic-sajo',service:'daily',route:'Sajó Expressz',
  stops:[['keleti',1015,1015],['barcika',1165,1165]]}]
};
function server(){
 return http.createServer(async(req,res)=>{
  try{
   const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(!p.startsWith('/sh9/super-search/')&&!p.startsWith('/sh9/smart-travel/smart-trip/')){
    res.writeHead(403);res.end();return;
   }
   const file=path.resolve(ROOT,'.'+p);
   if(!file.startsWith(ROOT+path.sep)){
    res.writeHead(403);res.end();return;
   }
   observed.push({method:req.method,path:p});
   const data=await fs.readFile(file);
   res.writeHead(200,{'Content-Type':file.endsWith('.mjs')?'text/javascript; charset=utf-8':
    file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   res.end(data);
  }catch(_){res.writeHead(404);res.end('Not found')}
 });
}
function formValues(){return {
 from:'Budapest-Keleti',to:'Kazincbarcika',
 date:'2026-11-09',time:'16:00'
}}
async function fill(page){
 const q=formValues();
 await page.locator('#superFrom').fill(q.from);
 await page.locator('#superTo').fill(q.to);
 await page.locator('#superDate').fill(q.date);
 await page.locator('#superTime').fill(q.time);
 await page.locator('#superConsent').check();
}
async function seed(page,data){
 await page.evaluate(async feed=>{
  await new Promise((resolve,reject)=>{
   const r=indexedDB.open('sh9-mav-private-gtfs-v2',1);
   r.onerror=()=>reject(new Error('seed db open failed'));
   r.onupgradeneeded=()=>{
    if(!r.result.objectStoreNames.contains('datasets'))
     r.result.createObjectStore('datasets');
   };
   r.onsuccess=()=>{
    const db=r.result,tx=db.transaction('datasets','readwrite');
    tx.objectStore('datasets').put(feed,'household');
    tx.oncomplete=()=>{db.close();resolve()};
    tx.onerror=()=>{db.close();reject(new Error('seed transaction failed'))};
   };
  });
 },data);
}
function statusIsDone(text){
 return text.includes('Helyi menetrendi jelöltek')||
 text.includes('Nincs ellenőrzött')||
 text.includes('nem futott végig');
}
async function perform(page){
 await fill(page);
 const before=timing();
 await page.locator('#superRun').click();
 await page.waitForFunction(()=>document.getElementById('superRun').disabled===false&&
  /Helyi menetrendi jelöltek|Nincs ellenőrzött|nem futott végig/.test(
   document.getElementById('superStatus').textContent||''),{timeout:10000});
 const result=await page.evaluate(()=>({
  status:document.getElementById('superStatus').textContent,
  details:document.getElementById('superDetails').textContent,
  cards:document.querySelectorAll('.super-result').length,
  scrollWidth:document.documentElement.scrollWidth,
  viewWidth:innerWidth
 }));
 result.wallMs=Math.round(timing()-before);
 try{result.metrics=JSON.parse(result.details)}catch(_){result.metrics=null}
 return result;
}
(async()=>{
 const service=server();
 await new Promise(resolve=>service.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+service.address().port+BASE;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report={kind:'isolated_chromium_alpha_1',sample:'synthetic_only',
  realGtfs:false,productionTouched:false,checks:[]};
 const errors=[];
 async function run(name,fn){
  try{const data=await fn();report.checks.push({name,status:'pass',...data})}
  catch(error){errors.push({name,message:String(error.message||error).slice(0,350)});
   report.checks.push({name,status:'fail',reason:String(error.message||error).slice(0,180)})}
 }
 try{
  await run('empty_store_fails_closed',async()=>{
   const context=await browser.newContext({viewport:{width:1440,height:900}});
   try{
    const page=await context.newPage();
    await page.goto(url,{waitUntil:'load'});
    const a=await perform(page);
    assert.match(a.status,/Nincs ellenőrzött/);
    assert.equal(a.metrics.status,'fallback_required');
    assert.equal(a.metrics.found,0);
    assert.equal(a.metrics.myTripsSaved,false);
    return {wallMs:a.wallMs,providerStatus:a.metrics.providerStatus}
   }finally{await context.close()}
  });
  await run('browser_worker_reads_synthetic_gtfs',async()=>{
   const context=await browser.newContext({viewport:{width:1440,height:900}});
   try{
    const page=await context.newPage();
    await page.goto(url,{waitUntil:'load'});
    const onload=await page.evaluate(()=>({hasDb:!!indexedDB.databases,
      beforeSearch:document.getElementById('superDetails').textContent}));
    assert.equal(onload.hasDb,true);
    assert.match(onload.beforeSearch,/Nincs mért adat/);
    await seed(page,feed);
    const a=await perform(page);
    assert.match(a.status,/Helyi menetrendi jelöltek/);
    assert.equal(a.metrics.status,'results');
    assert.ok(a.metrics.found>=1);
    assert.equal(a.metrics.providerStatus,'ok');
    assert.equal(a.metrics.myTripsSaved,false);
    assert.equal(a.metrics.gpt6Seconds,null);
    assert.ok(a.metrics.brokerMs>=0);
    const cards=await page.locator('.super-result').allTextContents();
    assert.ok(cards.join(' ').includes('Sajó Expressz'));
    return {wallMs:a.wallMs,localRouteMs:a.metrics.routeMs,
     candidates:a.metrics.found,brokerMs:a.metrics.brokerMs}
   }finally{await context.close()}
  });
  await run('mobile_390px_responsive_real_worker',async()=>{
   const context=await browser.newContext({viewport:{width:390,height:844},
    isMobile:true,hasTouch:true,deviceScaleFactor:2});
   try{
    const page=await context.newPage();
    await page.goto(url,{waitUntil:'load'});
    await seed(page,feed);
    await page.locator('#superProfile').selectOption('m');
    const css=await page.evaluate(()=>getComputedStyle(document.documentElement)
     .getPropertyValue('--accent').trim());
    assert.equal(css,'#f2addb');
    const a=await perform(page);
    assert.equal(a.metrics.status,'results');
    assert.ok(a.scrollWidth<=a.viewWidth+2,
      'horizontal overflow '+a.scrollWidth+' > '+a.viewWidth);
    assert.equal(a.metrics.myTripsSaved,false);
    return {wallMs:a.wallMs,viewWidth:a.viewWidth,scrollWidth:a.scrollWidth}
   }finally{await context.close()}
  });
  await run('unresponsive_worker_times_out_with_fallback',async()=>{
   const context=await browser.newContext({viewport:{width:1024,height:768}});
   await context.addInitScript(()=>{
    class DelayedWorker{
     constructor(){this.onmessage=null;this.onerror=null}
     postMessage(){}
     terminate(){}
    }
    window.Worker=DelayedWorker;
   });
   try{
    const page=await context.newPage();
    await page.goto(url,{waitUntil:'load'});
    const a=await perform(page);
    assert.match(a.status,/Nincs ellenőrzött/);
    assert.equal(a.metrics.status,'fallback_required');
    assert.equal(a.metrics.found,0);
    assert.ok(a.wallMs>=6000&&a.wallMs<10000,'deadline '+a.wallMs);
    return {wallMs:a.wallMs,timeoutFallback:true}
   }finally{await context.close()}
  });
  await run('only_test_origin_requested',async()=>{
   assert.ok(observed.length>0);
   assert.ok(observed.every(x=>x.method==='GET'&&
    (x.path.startsWith('/sh9/super-search/')||
     x.path.startsWith('/sh9/smart-travel/smart-trip/'))));
   return {localRequests:observed.length}
  });
 }finally{
  await browser.close();
  await new Promise(resolve=>service.close(resolve));
 }
 report.passed=report.checks.filter(x=>x.status==='pass').length;
 report.failed=errors.length;
 console.log(JSON.stringify(report,null,2));
 if(errors.length){console.error(JSON.stringify(errors));process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
