'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function boot(){
 const cache=new Map();let now=Date.now(),gpsReads=0,settingsWrites=0;
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
     gpsReads++;return {data:{profile_key:key,latitude:47.5,longitude:19.1,
       accuracy_m:12,speed_kmh:0,updated_at:new Date(now).toISOString()},error:null};
    }
    return {data:null,error:null};
   },
   upsert:async()=>{settingsWrites++;return {error:null}},
   delete(){return this}
  }}
 };
 const w={HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://example.invalid',publishableKey:'public'},
  supabase:{createClient:()=>client},localStorage:storage,
  addEventListener(){},dispatchEvent(){},setInterval(){return 1},
  clearInterval(){},setTimeout(){},CustomEvent:null};
 const d={hidden:false,getElementById:()=>null,addEventListener(){}};
 vm.runInNewContext(read('guardian/guardian-live-v785.js'),
  {window:w,document:d,Date:Clock,Promise,Map,Number,Math,console},{timeout:1000});
 return {w,d,advance:ms=>{now+=ms},reads:()=>gpsReads,writes:()=>settingsWrites,
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
