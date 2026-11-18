'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const trio=require('../guardian/guardian-live-trio-v845.js');
const html=read('guardian/index.html');
const css=read('guardian/guardian-lena-premium-v1182.css');
const device=read('guardian/guardian-device-pack-preview-v1053.js');
const js=read('guardian/guardian-live-trio-v845.js');
const NOW=Date.parse('2026-11-19T10:00:00Z');
function raw(profile,date='2026-11-19',score=83,stamp=NOW){
 return {profile,schemaVersion:'healthhub.samsung.daily/1.1',
  exportedAt:new Date(stamp).toISOString(),records:{
   dailySummary:[],samsungEnergyScores:[{date,energyScore:score}]
  }};
}
test('Energy Score is real owner-verified Samsung SDK value, never a calculated Sleep index',()=>{
 assert.deepEqual(trio.samsungEnergyScore('monika',raw('monika'),NOW),{
  score:83,date:'2026-11-19',tone:'good',
  kind:'samsung-energy-score',source:'Samsung Health · Energy Score · mentett SDK-export'
 });
 assert.equal(trio.samsungEnergyScore('monika',raw('monika','2026-11-19',0),NOW).score,0,'legitimate measured zero remains zero');
 assert.equal(trio.samsungEnergyScore('monika',raw('monika','2026-11-19',59),NOW).tone,'bad');
 assert.equal(trio.samsungEnergyScore('monika',raw('monika','2026-11-19',70),NOW).tone,'warn');
 assert.equal(trio.samsungEnergyScore('monika',raw('monika','2026-11-19',100),NOW).tone,'good');
 const state=trio.healthState(trio.samsungEnergyScore('monika',raw('monika'),NOW),null);
 assert.equal(state.score,83);
 assert.deepEqual(state.factors,['Energy Score']);
});
test('Energy Score rejects wrong owner/schema, absent, future, stale and malformed values',()=>{
 const sample=raw('monika');
 for(const bad of [
  {profile:'zsolt',raw:sample},
  {profile:'monika',raw:{...sample,profile:'zsolt'}},
  {profile:'monika',raw:{...sample,schemaVersion:'healthhub.healthconnect/1'}},
  {profile:'monika',raw:{...sample,exportedAt:new Date(NOW-49*3600000).toISOString()}},
  {profile:'monika',raw:{...sample,exportedAt:new Date(NOW+6*60000).toISOString()}},
  {profile:'monika',raw:{...sample,records:{samsungEnergyScores:[]}}},
  {profile:'monika',raw:raw('monika','2026-11-16',83)},
  {profile:'monika',raw:raw('monika','2026-11-20',83)},
  {profile:'monika',raw:raw('monika','2026-11-19',null)},
  {profile:'monika',raw:raw('monika','2026-11-19','83')},
  {profile:'monika',raw:raw('monika','2026-11-19',101)},
  {profile:'monika',raw:raw('monika','2026-11-19',-1)}
 ])assert.equal(trio.samsungEnergyScore(bad.profile,bad.raw,NOW),null,
  JSON.stringify({profile:bad.profile,score:bad.raw?.records?.samsungEnergyScores?.[0]?.energyScore}));
 const multiple=raw('monika','2026-11-18',63);
 multiple.records.samsungEnergyScores.push({date:'2026-11-19',energyScore:86});
 assert.equal(trio.samsungEnergyScore('monika',multiple,NOW).score,86,'latest owner measurement wins');
});
test('Guardian keeps original eight live cells, only replaces Energy caption and adds scoped visual styles',()=>{
 for(const id of ['guardianTrioV845','guardianBatteryV841','guardianGpsCardV845',
   'guardianHealthCardV845','guardianPackBluetoothV1053']) {
  if(id==='guardianPackBluetoothV1053')assert.match(device,/guardianPack'\+id\[0\]\.toUpperCase\(\)/);
  else assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/Samsung Energy Score · <span id="guardianHealthSleepDetailV845">/);
 assert.match(html,/guardian-lena-premium-v1182\.css\?v=1182-guardian-energy-bluetooth/);
 assert.match(html,/guardian-live-trio-v845\.js\?v=1182-samsung-energy-score&router=1177/);
 assert.match(html,/<div class="shell" data-hh-skin="lena-premium">/);
 assert.match(css,/#guardianPackBluetoothV1053\[data-signal="blue"\] svg/);
 assert.match(css,/width:23px!important;height:24px!important/);
 assert.match(css,/stroke-width:2\.8!important/);
 assert.match(css,/\[data-signal="blue"\]/);
 assert.match(css,/#guardianMapSearchInputV819/);
 assert.match(css,/#guardianFollow/);
 assert.match(css,/#guardian3D/);
 assert.match(css,/#guardianSatelliteV1033/);
 assert.doesNotMatch(css,/maplibregl|\.maplibregl-canvas|pointer-events:none!important.*#guardianMap/);
 assert.match(css,/:root:not\(\[data-sh9-transit="on"\]\)/,'Smart Transit remains untouched');
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(js,/requestPermissions|navigator\.geolocation|localStorage\.setItem\(['"]hh-profile/);
 let depth=0;for(const c of css){if(c==='{')depth++;if(c==='}')depth--;assert.ok(depth>=0)}
 assert.equal(depth,0,'styles balanced');
});
test('Guardian UI displays only selected owner Energy Score, isolates profile switch and no new refresh timers',async()=>{
 const els=new Map(),listeners={},store={'hh-profile':'z'},reads=[];
 function el(id){
  if(!els.has(id))els.set(id,{
   id,dataset:{},attrs:{},handlers:{},hidden:true,textContent:'',
   setAttribute(name,value){this.attrs[name]=value},
   addEventListener(name,fn){this.handlers[name]=fn}
  });
  return els.get(id);
 }
 const doc={hidden:false,readyState:'complete',getElementById:el,
  addEventListener(name,fn){listeners['doc:'+name]=fn}};
 const isoNow=Date.now();
 const localDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',
  year:'numeric',month:'2-digit',day:'2-digit'}).format(isoNow);
 let timers=0;
 const w={document:doc,localStorage:{getItem(k){return store[k]||null}},
  HH_GUARDIAN_GPS_ROUTER_V1177:{forProfile(){return true},async read(){return {status:'missing'}}},
  HH_DROPBOX_VAULT:{connected(){return true},async downloadJson(p){
   reads.push(p);
   if(p.endsWith('-samsung-health.json')){
    const name=p.includes('monika')?'monika':'zsolt';
    return raw(name,localDate,name==='zsolt'?74:89,isoNow);
   }
   return null;
  }},
  addEventListener(name,fn){listeners[name]=fn},
  setTimeout(fn){fn()},setInterval(){timers++;return timers}};
 vm.runInNewContext(js,{window:w,Date,Intl,Number,String,Math,Promise,
  URLSearchParams,Array,Object,JSON});
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 await flush();
 assert.equal(el('guardianHealthTextV845').textContent,'74');
 assert.equal(el('guardianHealthSleepDetailV845').textContent,'74 / 100');
 assert.match(el('guardianHealthSleepMetaV845').textContent,/Samsung Health · Energy Score/);
 assert.equal(el('guardianBatteryCaptionV845').textContent,'Zsolt Mobil');
 assert.equal(timers,1,'reuse the existing Guardian refresh cadence');
 const initial=reads.length;
 assert.equal(initial,2,'one Samsung + one Nutrition read; old Health Connect read replaced');
 store['hh-profile']='m';
 el('guardianProfileSwitch').handlers.click();
 await flush();
 assert.equal(el('guardianHealthTextV845').textContent,'89');
 assert.equal(el('guardianHealthSleepDetailV845').textContent,'89 / 100');
 assert.equal(el('guardianBatteryCaptionV845').textContent,'Mónika Mobil');
 assert.equal(reads.length,4,'two owner-scoped source reads after explicit profile switch');
 assert.ok(reads.slice(2).every(p=>p.includes('/monika-')),'do not borrow Zsolt health data');
});
