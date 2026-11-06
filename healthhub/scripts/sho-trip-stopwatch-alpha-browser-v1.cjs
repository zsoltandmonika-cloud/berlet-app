/* Real Chromium Alpha for Léna stopwatch (cloud connector MOCK only).
 * Fully isolated localhost: no live GPT, Supabase, HealthHub or account access.
 */
'use strict';
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../..');
const PAGE='/sh9/super-search/trip-stopwatch-preview-v1.html';
const fakeSupabaseJs=`
window.supabase={createClient(url,key){
 window.__alphaQueries=[];
 return {auth:{async getUser(){return {data:{user:window.__alphaNoAuth?null:{id:"mocked-user"}},error:null}}},
  from(name){
   if(name!=="hh_my_trip_packs")throw Error("wrong_table");
   const query={name};
   return {
    select(fields){query.fields=fields;return this},
    eq(field,value){query[field]=value;return this},
    async maybeSingle(){
     window.__alphaQueries.push({...query});
     const row=window.__alphaCloud||null;
     return {data:row&&row.trip_id===query.trip_id&&row.profile_key===query.profile_key?row:null,error:null}
    }
   };
  }};
}};
`;
function service(){return http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith('/sh9/super-search/')&&
   !pathname.startsWith('/sh9/smart-travel/public-transport/smart-trip/')){
   res.writeHead(403);res.end();return;
  }
  const p=path.resolve(ROOT,'.'+pathname);
  if(!p.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
  const data=await fs.readFile(p);
  res.writeHead(200,{'Content-Type':p.endsWith('.mjs')||p.endsWith('.js')?
   'text/javascript':'text/html','Cache-Control':'no-store'});
  res.end(data);
 }catch(_){res.writeHead(404);res.end('Not found')}
})}
const routeFor=(id,date)=>({
 schema:'sh9.trip-pack/1',id,savedAt:Date.now(),
 title:'Alfa · Budapest-Keleti → Kazincbarcika',
 travelDate:date,from:'Budapest-Keleti',to:'Kazincbarcika',
 departure:'16:00',arrival:'19:00',arrivalStatus:'timetable',
 summary:'Szintetikus teszt, nem élő járat.',
 segments:[{mode:'train',line:'Sajó Expressz',from:'Budapest-Keleti',
  to:'Kazincbarcika',departure:'16:00',arrival:'19:00',
  status:'timetable',note:'Kizárólag teszt'}],
 alerts:[],alternatives:[],sources:[{name:'Szintetikus teszt',url:'https://example.org/'}]
});
(async()=>{
 const server=service();await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port+PAGE;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const records=[];
 async function check(name,task){
  try{records.push({name,status:'pass',...(await task())})}
  catch(e){records.push({name,status:'fail',error:String(e?.message||e).slice(0,300)})}
 }
 async function setup({width=1240}={}){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({
   status:200,contentType:'text/javascript',body:fakeSupabaseJs}));
  await context.route('**/healthhub/central-vault/config.js',route=>route.fulfill({
   status:200,contentType:'text/javascript',
   body:'window.HH_CENTRAL_VAULT={enabled:true,supabaseUrl:"https://mock.supabase.co",publishableKey:"mock-publishable"};'
  }));
  await context.route('https://chatgpt.com/**',route=>route.fulfill({
   status:200,contentType:'text/html',body:'<html><body>Mock ChatGPT handoff, no network</body></html>'
  }));
  const page=await context.newPage();
  await page.goto(url,{waitUntil:'load'});
  await page.locator('#swFrom').fill('Budapest-Keleti');
  await page.locator('#swTo').fill('Kazincbarcika');
  await page.locator('#swDate').fill('2026-11-09');
  await page.locator('#swHour').fill('16:00');
  return {context,page};
 }
 async function start(page){
  const popup=page.waitForEvent('popup');
  await page.locator('#swLaunch').click();
  const launched=await popup;const href=launched.url();await launched.close();
  const prompt=new URL(href).searchParams.get('q');
  const id=prompt?.match(/tp-lena-[a-f0-9]{32}/)?.[0];
  assert.ok(id,'unique cloud correlation ID missing');
  assert.match(prompt,/1\. közvetlen Volán, 2\. Sajó Expressz/);
  assert.ok(prompt.length<=2400);
  return {id,prompt};
 }
 try{
  await check('idle_does_not_read_cloud',async()=>{
   const {context,page}=await setup();
   try{
    assert.equal((await page.locator('#swTime').textContent()).trim(),'00:00.0');
    assert.equal(await page.locator('#swStop').isDisabled(),true);
    const count=await page.evaluate(()=>window.__alphaQueries?.length??0);
    assert.equal(count,0);
    return {cloudQueries:count};
   }finally{await context.close()}
  });
  await check('launch_starts_clock_and_preserves_preferences',async()=>{
   const {context,page}=await setup();
   try{
    const {id,prompt}=await start(page);
    await page.waitForTimeout(150);
    const state=JSON.parse(await page.locator('#swReport').textContent());
    assert.equal(state.state,'searching');
    assert.equal(state.cloudSaved,false);
    assert.ok(state.totalMs>=0);
    assert.match(prompt,/profile_key=zsolt/);
    assert.match(await page.locator('#swStatus').textContent(),/ChatGPT új lapon/);
    return {correlationIdFormat:id.startsWith('tp-lena-'),timeRunning:true};
   }finally{await context.close()}
  });
  await check('matched_cloud_record_auto_renders_and_stops',async()=>{
   const {context,page}=await setup();
   try{
    const {id}=await start(page);
    const trip=routeFor(id,'2026-11-09');
    await page.evaluate(row=>{window.__alphaCloud=row},{
     profile_key:'zsolt',trip_id:id,trip_data:trip
    });
    await page.waitForFunction(()=>JSON.parse(document.getElementById('swReport').textContent).state==='finished_auto',
     null,{timeout:9000});
    const result=JSON.parse(await page.locator('#swReport').textContent());
    assert.equal(result.automated,true);
    assert.equal(result.cloudSaved,true);
    assert.ok(result.cloudObservedMs!==null&&result.totalMs>=result.cloudObservedMs);
    assert.equal(await page.locator('#swRoute').isVisible(),true);
    assert.match(await page.locator('#swRoute').textContent(),/Sajó Expressz/);
    assert.match(await page.locator('#swStatus').textContent(),/STOP/);
    return {totalMs:result.totalMs,cloudObservedMs:result.cloudObservedMs,
     renderMs:result.uiRenderMs};
   }finally{await context.close()}
  });
  await check('different_trip_id_never_stops_until_manual_fallback',async()=>{
   const {context,page}=await setup({width:390});
   try{
    const {id}=await start(page);
    await page.evaluate(row=>{window.__alphaCloud=row},{
     profile_key:'zsolt',trip_id:'tp-lena-'+'f'.repeat(32),
     trip_data:routeFor('tp-lena-'+'f'.repeat(32),'2026-11-09')
    });
    await page.waitForTimeout(400);
    assert.equal(JSON.parse(await page.locator('#swReport').textContent()).state,'searching');
    await page.locator('#swManualJson').fill(JSON.stringify(routeFor(id,'2026-11-09')));
    await page.locator('#swManualButton').click();
    await page.waitForFunction(()=>JSON.parse(document.getElementById('swReport').textContent).state==='finished_manual',
     null,{timeout:4000});
    const state=JSON.parse(await page.locator('#swReport').textContent());
    assert.equal(state.cloudSaved,false);
    assert.equal(state.automated,false);
    assert.match(await page.locator('#swStatus').textContent(),/kézi importtal/);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    assert.equal(overflow,false);
    return {manualDistinguished:true,mobileNoOverflow:true};
   }finally{await context.close()}
  });
  await check('monika_profile_scopes_cloud_query',async()=>{
   const {context,page}=await setup();
   try{
    await page.locator('#swProfile').selectOption('m');
    const {id,prompt}=await start(page);
    assert.match(prompt,/profile_key=monika/);
    await page.waitForFunction(()=>window.__alphaQueries?.length>0,null,{timeout:4000});
    const qs=await page.evaluate(()=>window.__alphaQueries);
    assert.equal(qs[0].profile_key,'monika');
    assert.equal(qs[0].trip_id,id);
    assert.equal(qs[0].fields,'profile_key,trip_id,trip_data');
    return {profileScoped:true,selectOnly:true};
   }finally{await context.close()}
  });
 }finally{
  await browser.close();await new Promise(ok=>server.close(ok))
 }
 const summary={kind:'sho_trip_stopwatch_alpha',productionTouched:false,
  realCloud:false,realGPT:false,tests:records,
  passed:records.filter(x=>x.status==='pass').length,
  failed:records.filter(x=>x.status==='fail').length};
 console.log(JSON.stringify(summary,null,2));
 if(summary.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
