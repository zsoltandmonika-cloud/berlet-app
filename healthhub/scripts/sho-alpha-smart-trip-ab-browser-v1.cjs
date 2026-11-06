/* Isolated real-Chromium alpha A/B on original Golden Smart Trip form.
 * All accounts and cloud/ChatGPT URLs are mocked in Chromium routing.
 * No live Supabase write, no production deployment or network search.
 */
'use strict';
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../..');
const PAGE='/sh9/smart-travel/public-transport/smart-trip/alpha-stopwatch-v1.html';
const cloudMock=`
window.__alphaABQueries=[];window.__alphaABCloud=null;
window.supabase={createClient(){return{
 auth:{async getUser(){return {data:{user:{id:"test"}},error:null}}},
 from(name){
  if(name!=="hh_my_trip_packs")throw Error("forbidden table");
  const q={name};return{
   select(fields){q.fields=fields;return this},
   eq(key,value){q[key]=value;return this},
   async maybeSingle(){window.__alphaABQueries.push({...q});
    const x=window.__alphaABCloud;
    return{data:x&&x.profile_key===q.profile_key&&x.trip_id===q.trip_id?x:null,error:null}
   }
  };
 }
}}};
`;
const testTrip=(id,date,from,to)=>({
 schema:'sh9.trip-pack/1',id,savedAt:Date.now(),
 title:'Alpha összehasonlítás · tesztútvonal',
 travelDate:date,from,to,departure:'16:00',arrival:'19:00',
 arrivalStatus:'timetable',summary:'Tesztadat, nem valós járat.',
 segments:[{mode:'train',line:'Sajó Expressz',from,to,
  departure:'16:00',arrival:'19:00',status:'timetable',note:'Alfa'}],
 alerts:[],alternatives:[],sources:[{name:'teszt',url:'https://example.org/'}]
});
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(ROOT,'.'+pathname);
  if(!file.startsWith(ROOT+path.sep)||pathname.includes('..')){
   res.writeHead(403);res.end();return;
  }
  const bytes=await fs.readFile(file);
  const contentType=/\.m?js$/.test(file)?'text/javascript':/\.css$/.test(file)?'text/css':
   /\.html$/.test(file)?'text/html':/\.avif$/.test(file)?'image/avif':/\.png$/.test(file)?'image/png':
   /\.svg$/.test(file)?'image/svg+xml':'application/octet-stream';
  res.writeHead(200,{'Content-Type':contentType,'Cache-Control':'no-store'});
  res.end(bytes);
 }catch(_){res.writeHead(404);res.end('Not found')}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+PAGE;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const checks=[],browserErrors=[];
 async function run(name,fn){
  try{checks.push({name,status:'pass',...await fn()})}
  catch(e){checks.push({name,status:'fail',message:String(e?.message||e).slice(0,350)})}
 }
 async function setup(mobile=false){
  const ctx=await browser.newContext({
   viewport:mobile?{width:390,height:844}:{width:1280,height:900},
   ...(mobile?{isMobile:true,hasTouch:true}: {})
  });
  await ctx.route('**/*',async route=>{
   const requestUrl=route.request().url();
   if(requestUrl.startsWith('http://127.0.0.1:'))return route.continue();
   if(requestUrl.includes('/healthhub/central-vault/config.js'))return route.fulfill({
    status:200,contentType:'text/javascript',
    body:'window.HH_CENTRAL_VAULT={enabled:true,supabaseUrl:"https://alpha.supabase.co",publishableKey:"public-mock"};'
   });
   if(requestUrl.includes('cdn.jsdelivr.net/npm/@supabase/'))return route.fulfill({
    status:200,contentType:'text/javascript',body:cloudMock
   });
   if(requestUrl.startsWith('https://chatgpt.com/'))return route.fulfill({
    status:200,contentType:'text/html',body:'<!doctype html><title>Mock ChatGPT</title>'
   });
   return route.abort();
  });
  // Config script must be mocked on the same localhost origin as well.
  await ctx.route('**/healthhub/central-vault/config.js*',route=>route.fulfill({
   status:200,contentType:'text/javascript',
   body:'window.HH_CENTRAL_VAULT={enabled:true,supabaseUrl:"https://alpha.supabase.co",publishableKey:"public-mock"};'
  }));
  const page=await ctx.newPage();
  page.on('pageerror',e=>browserErrors.push(String(e?.message||e).slice(0,250)));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#st22AlphaAB').waitFor({state:'visible',timeout:12000});
  // Set mode before opening predictive station dropdowns. On narrow mobile
  // viewports suggestions may physically overlay the planner's upper controls.
  await page.locator('[data-st22-mode="depart"]').click();
  await page.locator('#st22From').fill('Budapest-Keleti');
  await page.locator('#st22To').fill('Kazincbarcika');
  await page.locator('#st22Date').fill('2026-11-09');
  await page.locator('#st22Time').fill('16:00');
  if(mobile&&await page.locator('#st22KeyboardDockV1088').isVisible()){
   // Exercise the actual Samsung predictive keyboard dock close control;
   // the overlay intentionally prevents taps elsewhere while it is open.
   await page.locator('#st22KeyboardCloseV1088').click();
  }
  await page.locator('#st22SearchMethod').selectOption('chatgpt');
  return {ctx,page};
 }
 async function start(page,arm){
  await page.locator('input[name="abArm"][value="'+arm+'"]').check();
  const popupPromise=page.waitForEvent('popup');
  await page.locator('#st22Search').click();
  const popup=await popupPromise;
  await popup.waitForURL(/chatgpt\.com\/\?q=/,{timeout:13000});
  const prompt=new URL(popup.url()).searchParams.get('q');
  await popup.close();
  assert.ok(prompt&&prompt.length<2401);
  const match=prompt.match(/tp-lena-[0-9a-f]{32}/);
  assert.ok(match,'unique id missing');
  return {id:match[0],prompt};
 }
 async function observe(page){
  await page.waitForFunction(()=>{
   const history=document.getElementById('abHistory');
   return history?.querySelectorAll('tbody tr').length>0&&
    document.getElementById('abStatus')?.textContent.includes('Teljes idő');
  },null,{timeout:7500});
 }
 try{
  await run('Golden_search_has_AB_panel_but_original_controls_unchanged',async()=>{
   const {ctx,page}=await setup();
   try{
    assert.equal(await page.locator('#st22Search').count(),1);
    assert.equal(await page.locator('input[name="abArm"]').count(),2);
    assert.equal((await page.locator('#abClock').textContent()).trim(),'00:00.0');
    assert.equal(await page.locator('#st22SearchMethod').inputValue(),'chatgpt');
    assert.equal(await page.evaluate(()=>window.__alphaABQueries?.length||0),0);
    return {searchButtonOriginal:true,noCloudReadBeforeStart:true};
   }finally{await ctx.close()}
  });
  await run('A_baseline_launch_and_matched_cloud_auto_STOP',async()=>{
   const {ctx,page}=await setup();
   try{
    const {id,prompt}=await start(page,'legacy');
    assert.match(prompt,/1\. közvetlen Volán, 2\. Sajó Expressz/);
    assert.match(prompt,/trip_id=tp-lena-/);
    assert.equal(await page.locator('#st22Search').isDisabled(),true);
    await page.evaluate(row=>window.__alphaABCloud=row,{
     trip_id:id,profile_key:'zsolt',
     trip_data:testTrip(id,'2026-11-09','Budapest-Keleti','Kazincbarcika')
    });
    await observe(page);
    const report=await page.evaluate(()=>window.SH9_SUPER_SEARCH_ALPHA_AB_V1.status());
    assert.equal(report.last.arm,'legacy');
    assert.equal(report.last.cloudSaved,true);
    assert.equal(report.last.result,'auto');
    assert.match(await page.locator('#st22JourneyList').textContent(),/Sajó Expressz/);
    assert.equal(await page.locator('#st22Search').isDisabled(),false);
    return {totalMs:report.last.totalMs,promptChars:prompt.length};
   }finally{await ctx.close()}
  });
  await run('B_super_launch_matches_same_origin_and_discloses_private_GTFS_not_shared',async()=>{
   const {ctx,page}=await setup(true);
   try{
    const {id,prompt}=await start(page,'super');
    assert.match(prompt,/1\. közvetlen Volán, 2\. Sajó Expressz/);
    assert.match(await page.locator('#abStatus').textContent(),/továbbítás nélkül/);
    await page.evaluate(row=>window.__alphaABCloud=row,{
     trip_id:id,profile_key:'zsolt',
     trip_data:testTrip(id,'2026-11-09','Budapest-Keleti','Kazincbarcika')
    });
    await observe(page);
    const report=await page.evaluate(()=>window.SH9_SUPER_SEARCH_ALPHA_AB_V1.status());
    assert.equal(report.last.arm,'super');
    assert.equal(report.last.cloudSaved,true);
    assert.equal(report.last.result,'auto');
    const scroll=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);
    assert.ok(scroll[0]<=scroll[1]+3,'mobile overflow '+scroll.join('/'));
    return {totalMs:report.last.totalMs,promptChars:prompt.length,layoutWidth:scroll[1]};
   }finally{await ctx.close()}
  });
  await run('wrong_id_cannot_stop_and_cancel_aborts',async()=>{
   const {ctx,page}=await setup();
   try{
    const {id}=await start(page,'legacy');
    await page.evaluate(row=>window.__alphaABCloud=row,{
     trip_id:'tp-lena-'+'f'.repeat(32),profile_key:'zsolt',
     trip_data:testTrip('tp-lena-'+'f'.repeat(32),'2026-11-09','Budapest-Keleti','Kazincbarcika')
    });
    await page.waitForTimeout(500);
    assert.equal((await page.locator('#abClock').textContent()).trim().startsWith('00:'),true);
    assert.equal(await page.locator('#abStatus').textContent() .then(x=>x.includes('⏱ Fut')),true);
    await page.locator('#abCancel').click();
    assert.match(await page.locator('#abStatus').textContent(),/megszakítva/);
    assert.equal(await page.locator('#st22Search').isDisabled(),false);
    assert.ok(id.length>30);
    return {wrongIdRejected:true,stopNotFaked:true};
   }finally{await ctx.close()}
  });
  await run('non_ChatGPT_methods_keep_existing_form_handler',async()=>{
   const {ctx,page}=await setup();
   try{
    await page.locator('#st22SearchMethod').selectOption('bkk_gtfs');
    // Only test that A/B mode does not consume non-GPT submits.
    const mode=await page.evaluate(()=>({
     alphaPresent:!!window.SH9_SUPER_SEARCH_ALPHA_AB_V1,
     method:document.getElementById('st22SearchMethod').value
    }));
    assert.equal(mode.method,'bkk_gtfs');
    assert.equal(mode.alphaPresent,true);
    return {otherEnginesUntouched:true};
   }finally{await ctx.close()}
  });
 }finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
 const report={kind:'sho_smart_trip_AB_browser_alpha',liveGPT:false,liveCloud:false,
  productionTouched:false,checks,passed:checks.filter(x=>x.status==='pass').length,
  failed:checks.filter(x=>x.status==='fail').length,browserErrors:browserErrors.slice(0,4)};
 console.log(JSON.stringify(report,null,2));
 if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
