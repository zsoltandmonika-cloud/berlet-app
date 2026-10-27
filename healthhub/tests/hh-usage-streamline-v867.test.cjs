'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function store(){const mem=new Map();return {getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)}}
test('Ask Lena history: fresh cache skips repeated reads, manual refresh still works',async()=>{
 const storage=store();let gets=0,posts=0;
 const api={
  getStatus:()=>({authenticated:true,authorizedProfiles:['zsolt','monika']}),
  request:async(path,opts)=>{if(opts.method==='POST'){posts++;return null;}gets++;return []}
 };
 const w={HH_DAILY_HEALTH_SYNC_V319:api,addEventListener:()=>{}};
 const ctx={window:w,localStorage:storage,document:{getElementById:()=>null},console,Date,Map,Set,Promise,setTimeout:()=>{},crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000001'}};
 vm.runInNewContext(read('live-v364-history.js'),ctx,{timeout:1000});
 const svc=w.HH_ASK_LENA_HISTORY_V364;
 await svc.sync('zsolt',false);
 await svc.sync('zsolt',false);
 assert.equal(gets,1,'second read should use cached snapshot');
 await svc.sync('zsolt',true);
 assert.equal(gets,2,'manual sync must bypass cache');
 const pending={id:'00000000-0000-4000-8000-000000000001',profile:'zsolt',question:'Q',answer:'A',generatedAt:new Date().toISOString(),synced:false};
 storage.setItem('hh-ask-lena-history-v364-zsolt',JSON.stringify([pending]));
 await svc.sync('zsolt',false);
 assert.equal(posts,1,'unsynced answer must still upload');
 assert.equal(gets,3,'unsynced answer triggers reconciliation');
});
test('Family Guard shared landmarks: 2-minute cache but edits sync immediately',async()=>{
 const storage=store();let reads=0,writes=0,bridge=null;
 const callbacks=[];
 const api={from:()=>({
   select(){return {order(){return {limit:async()=>{reads++;return {data:[],error:null}}}}}},
   upsert:async()=>{writes++;return {error:null}},
   update(){return {eq:async()=>({error:null})}}
 })};
 const landmarks={setSharedEntries:()=>{},setBridge:b=>{bridge=b}};
 const live={authenticated:true,familyAuthorized:true,boundProfile:'zsolt',getClient:()=>api};
 const w={HH_GUARDIAN_LANDMARKS_V776:landmarks,HH_GUARDIAN_LIVE_V785:live,
   localStorage:storage,setTimeout:cb=>{callbacks.push(cb)},setInterval:()=>{},addEventListener:()=>{}};
 const d={hidden:false,getElementById:()=>null,addEventListener:()=>{}};
 vm.runInNewContext(read('guardian/guardian-landmarks-sync-v787.js'),{window:w,document:d,Date,Map,Promise,Number}, {timeout:1000});
 for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(reads,1,'first landmarks fetch');
 await w.HH_GUARDIAN_LANDMARK_SYNC_V787.sync();
 assert.equal(reads,1,'fresh cache prevents duplicate reads');
 bridge.create({id:'home123',kind:'home',name:'Otthon',lng:19,lat:47});
 assert.equal(callbacks.length,1,'edit schedules one immediate sync');
 callbacks.shift()();
 for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(writes,1,'edit is uploaded despite cache');
 assert.equal(reads,2,'remote state is reconciled after edit');
});
test('GPS settings: do not upsert unchanged values; keep live tracking cadence',()=>{
 const s=read('guardian/guardian-live-v785.js');
 assert.match(s,/if\(settingsSignature===signature\)return settingsWrites/);
 assert.match(s,/const signature=JSON\.stringify\(\[k,uid,payload\.refresh_interval_ms,payload\.follow_map,payload\.map_3d\]\)/);
 assert.match(s,/if\(settingsSignature===signature\)settingsSignature=''/);
 assert.match(s,/validIntervals=\[1000,3000,5000,10000,30000,60000\]/);
 const l=read('guardian/guardian-landmarks-sync-v787.js');
 assert.match(l,/TICK=120000/);
});

test('Ask Lena history optimizer: entry uses cache-busted v868 module',()=>{
 const html=read('index.html');
 assert.match(html,/src="\.\/live-v364-history\.js\?v=868-history-data-saver"/);
 assert.doesNotMatch(html,/live-v364-history\.js\?v=699-no-flicker/);
});
