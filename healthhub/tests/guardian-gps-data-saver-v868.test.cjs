'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function boot({speedKmh=7,accuracyM=12,ageMs=0,deferOwnReads=false}={}){
 const cache=new Map(),events={},activeTimers=new Map(),pendingReads=[];
 let now=Date.now(),gpsReads=0,settingsWrites=0,nextTimer=0;
 class Clock extends Date {static now(){return now}}
 const storage={getItem:key=>cache.has(key)?cache.get(key):null,
  setItem:(key,value)=>cache.set(key,String(value)),
  removeItem:key=>cache.delete(key)};
 const client={
  auth:{getUser:async()=>({data:{user:{id:'family-user'}},error:null}),onAuthStateChange(){}},
  from(table){let key=null;return {
   select(){return this},eq(_,value){key=value;return this},
   in:async()=>({data:[{profile_key:'zsolt'},{profile_key:'monika'}],error:null}),
   maybeSingle:async()=>{
    if(table==='hh_guardian_live_locations'){
     gpsReads++;
     const row={data:{profile_key:key,latitude:47.5,longitude:19.1,
       accuracy_m:accuracyM,speed_kmh:speedKmh,updated_at:new Date(now-ageMs).toISOString()},error:null};
     if(deferOwnReads&&key==='zsolt')return await new Promise(resolve=>pendingReads.push(()=>resolve(row)));
     return row;
    }
    return {data:null,error:null};
   },
   upsert:async()=>{settingsWrites++;return {error:null}},
   delete(){return this}
  }}
 };
 const w={HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://example.invalid',publishableKey:'public'},
  supabase:{createClient:()=>client},localStorage:storage,
  addEventListener(name,fn){events[name]=fn},dispatchEvent(){},
  setInterval(fn,ms){const id=++nextTimer;activeTimers.set(id,{fn,ms});return id},
  clearInterval(id){activeTimers.delete(id)},setTimeout(){},CustomEvent:null};
 const d={hidden:false,getElementById:()=>null,addEventListener(){}};
 vm.runInNewContext(read('guardian/guardian-live-v785.js'),
  {window:w,document:d,Date:Clock,Promise,Map,Number,Math,console},{timeout:1000});
 return {w,d,advance:ms=>{now+=ms},reads:()=>gpsReads,writes:()=>settingsWrites,
  fire:name=>events[name]&&events[name](),timerCount:()=>activeTimers.size,
  releaseReads:()=>{for(const fn of pendingReads.splice(0))fn()},
  ready:async()=>{for(let i=0;i<32;i++)await Promise.resolve()}};
}
test('GPS Data Saver: authenticated same-profile reads deduplicated and cached for 2200ms',async()=>{
 const app=boot();await app.ready();
 const api=app.w.HH_GUARDIAN_LIVE_V785;
 assert.equal(api.authenticated,true);
 const before=app.reads();
 const result=await Promise.all(Array.from({length:4},()=>api.readSharedLocation('zsolt')));
 assert.equal(app.reads()-before,1,'four requests use one actual API call');
 for(const row of result)assert.equal(row.data.profile_key,'zsolt');
 await api.readSharedLocation('zsolt');
 assert.equal(app.reads()-before,1,'fresh cached response');
 app.advance(2250);
 await api.readSharedLocation('zsolt');
 assert.equal(app.reads()-before,2,'expired cache is refreshed');
 await api.readSharedLocation('monika');
 assert.equal(app.reads()-before,3,'different profiles are not mixed');
 const denied=await api.readSharedLocation('other');
 assert.ok(denied.error);
 assert.equal(app.reads()-before,3,'unknown profile never accesses the database');
 api.onProfileChanged();
 const afterSwitch=app.reads(); // switching legitimately refreshes the other family profile
 await api.readSharedLocation('zsolt');
 assert.equal(app.reads()-afterSwitch,1,'profile switch invalidates selected cached position');
});
test('GPS Data Saver: source retains authentication, revocation, live freshness and explicit stop',()=>{
 const src=read('guardian/guardian-live-v785.js');
 assert.match(src,/locationReads\.clear\(\)/);
 assert.match(src,/readSharedLocation\(k\)/);
 assert.match(src,/now-lastPeerReadAt<10000/);
 assert.match(src,/Math\.max\(interval,10000\)/);
 assert.match(src,/LAST_KNOWN_MS=12\*60\*60\*1000/);
 assert.match(src,/AGE_MS=20000/);
 assert.match(src,/function userStopSharing\(/);
 assert.match(src,/if\(!api\|\|!user\|\|!access\.includes\(k\)/);
 const follow=read('guardian/guardian-profile-follow-v837.js');
 const trio=read('guardian/guardian-live-trio-v845.js');
 assert.match(follow,/l\.readSharedLocation\(k\)/);
 assert.match(trio,/live\.readSharedLocation\(profile\)/);
 assert.match(follow,/Date\.now\(\)-lastAdaptivePoll<9000/);
 assert.match(follow,/FRESH_BROWSER_MS=20000/);
});

test('Steady v879: fresh accurately measured stationary GPS is reused up to 8.5s across panels',async()=>{
 const app=boot({speedKmh:0});await app.ready();
 const api=app.w.HH_GUARDIAN_LIVE_V785;
 const initial=app.reads();
 await api.readSharedLocation('zsolt');
 assert.equal(app.reads()-initial,1);
 app.advance(6000);
 await api.readSharedLocation('zsolt');
 assert.equal(app.reads()-initial,1,'stationary position reuses one authenticated read');
 app.advance(2600);
 await api.readSharedLocation('zsolt');
 assert.equal(app.reads()-initial,2,'8.5s cache expires and rechecks live data');
});
test('Steady v879: unknown/moving, low-quality or aged GPS is never long-cached',async()=>{
 for(const opts of [{speedKmh:7},{speedKmh:null},{speedKmh:0,accuracyM:80},{speedKmh:0,ageMs:19000}]){
  const app=boot(opts);await app.ready();
  const api=app.w.HH_GUARDIAN_LIVE_V785,initial=app.reads();
  await api.readSharedLocation('zsolt');
  app.advance(2250);
  await api.readSharedLocation('zsolt');
  assert.equal(app.reads()-initial,2,'2.2s cache required for '+JSON.stringify(opts));
 }
});
test('Steady v879: a pagehide / bfcache pageshow recovers polling exactly once',async()=>{
 const app=boot();await app.ready();
 assert.equal(app.timerCount(),1,'one interval for active Family Live');
 app.fire('pagehide');
 assert.equal(app.timerCount(),0,'no hidden browser polling');
 app.fire('pageshow');await app.ready();
 assert.equal(app.timerCount(),1,'one fresh polling interval after bfcache restore');
 app.fire('pageshow');await app.ready();
 assert.equal(app.timerCount(),1,'repeated pageshow cannot create duplicated intervals');
 app.fire('online');await app.ready();
 assert.equal(app.timerCount(),1,'network recovery leaves existing timer alone');
});
test('Steady v879: source retains revocation, owner consent and Android GPS separation',()=>{
 const src=read('guardian/guardian-live-v785.js');
 assert.match(src,/function locationCacheMs/);
 assert.match(src,/LOCATION_IDLE_CACHE_MS=8500/);
 assert.match(src,/if\(k&&uid\)locationReads\.delete\(uid\+':'\+k\)/);
 assert.match(src,/w\.addEventListener\('pagehide'/);
 assert.match(src,/w\.addEventListener\('pageshow'/);
 assert.match(src,/w\.addEventListener\('online'/);
 assert.match(src,/if\(!d\.hidden&&user&&pollTimer===null\)resetPolling\(\)/);
 assert.match(src,/onGpsPaused\(\)/);
 assert.match(src,/if\(lastPeerSpeedKmh!==null&&lastPeerSpeedKmh<4/);
 assert.match(src,/AGE_MS=20000/);
});

test('Steady v879: a late response after profile change cannot resurrect a cleared GPS cache',async()=>{
 const app=boot({deferOwnReads:true});await app.ready();
 const api=app.w.HH_GUARDIAN_LIVE_V785;
 const before=app.reads(),first=api.readSharedLocation('zsolt');
 assert.equal(app.reads()-before,1);
 api.onProfileChanged(); // invalidates pending location cache
 app.releaseReads();
 await first;
 const second=api.readSharedLocation('zsolt');
 assert.equal(app.reads()-before,2,'invalidated pending result is not cached again');
 app.releaseReads();
 await second;
});
