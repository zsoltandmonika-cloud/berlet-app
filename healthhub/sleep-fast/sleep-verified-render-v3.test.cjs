'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sleep=fs.readFileSync(path.join(__dirname,'../live-v170.js'),'utf8');
const flush=async(n=12)=>{for(let i=0;i<n;i++)await new Promise(ok=>setImmediate(ok))};
const start=new Date(Date.now()-10*3600000).toISOString(),end=new Date(Date.now()-3*3600000).toISOString();
function row(id){return {id,startTime:start,endTime:end,sourcePackage:'Samsung Health',stages:[
 {stage:5,startTime:new Date(Date.parse(start)+3600000).toISOString(),endTime:new Date(Date.parse(start)+2*3600000).toISOString()},
 {stage:6,startTime:new Date(Date.parse(start)+2*3600000).toISOString(),endTime:new Date(Date.parse(start)+3*3600000).toISOString()}
]}}
function app(){
 const nodes=new Map(),profile={code:'m'},reads=[],writes=[],callbacks={};
 const element=tag=>{
  let html='';
  return {tagName:tag,id:'',style:{setProperty(){}},dataset:{},
   get innerHTML(){return html},set innerHTML(s){html=s},
   classList:{add(){},remove(){},contains(){return true}},
   querySelector(){return null},querySelectorAll(){return []},
   appendChild(){},setAttribute(){},closest(){return null}};
 };
 const doc={
  readyState:'complete',visibilityState:'visible',documentElement:{dataset:{}},
  createElement:element,getElementById(id){
   if(id==='hhSleepWatch9Panel'){
    const page=nodes.get('hhSleepPage');
    if(!page||!page.innerHTML.includes('id="hhSleepWatch9Panel"'))return null;
    if(!nodes.has(id))nodes.set(id,element('div'));
   }
   return nodes.get(id)||null;
  },
  querySelectorAll(){return []},querySelector(){return null},
  addEventListener(name,cb){callbacks[name]=cb},
  head:{appendChild(el){if(el.id)nodes.set(el.id,el)}},
  body:{appendChild(el){if(el.id)nodes.set(el.id,el)}}
 };
 const localStorage={
  getItem(k){return k==='hh-profile'?profile.code:null},
  setItem(k,v){if(k==='hh-profile')profile.code=v}
 };
 let resolveMonika,resolveZsolt;
 const cloudMonika=new Promise(ok=>{resolveMonika=ok});
 const cloudZsolt=new Promise(ok=>{resolveZsolt=ok});
 const win={
  document:doc,localStorage,location:{pathname:'/berlet-app/healthhub/sleep-one/'},
  addEventListener(name,cb){callbacks[name]=cb},dispatchEvent(){},
  HH_DROPBOX_VAULT:{connected(){return true},downloadJson(file){
   reads.push(file);return file.includes('monika')?cloudMonika:cloudZsolt;
  }},
  HH_SLEEP_LOCAL_V3:{
   async read(p){return {profile:p,exportedAt:new Date().toISOString(),rows:[row(p+'-local')]};},
   async save(p,raw){writes.push({profile:p,exportedAt:raw.exportedAt});return true;}
  }
 };
 const context={
  window:win,document:doc,localStorage,indexedDB:{open(){throw new Error('no fallback allowed during verified fetch')}},
  requestAnimationFrame(fn){fn()},setTimeout(){return 1},setInterval(){return 1},clearTimeout(){},clearInterval(){},
  cancelAnimationFrame(){},Date,Math,Map,Set,Number,Array,Promise,String,Object,JSON,Intl,console,
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}}
 };
 vm.runInNewContext(sleep,context,{filename:'sleep-render-v3.js'});
 return {win,profile,nodes,reads,writes,resolveMonika,resolveZsolt};
}
test('Sleep renders stored stages before a slow canonical cloud, clearly marked as old',async()=>{
 const x=app();x.win.hhOpenSleep();
 await flush(20);
 const page=x.nodes.get('hhSleepPage');
 assert.ok(page,'Sleep screen was created');
 assert.match(page.innerHTML,/data-hh-sleep-source="local-preview"/);
 assert.match(page.innerHTML,/Korábbi, helyben mentett alvás/);
 assert.match(page.innerHTML,/2 ó 0 p/,'measured stage duration is visible in local preview');
 assert.deepEqual(x.reads,['/HealthHub/profiles/monika-health-connect.json']);
 assert.deepEqual(x.writes,[],'preview never uploads any information');
 x.resolveMonika({profile:'monika',exportedAt:new Date().toISOString(),records:{sleepSessions:[row('verified-monika')],heartRate:[],oxygenSaturation:[]}});
 await flush(20);
 assert.match(page.innerHTML,/data-hh-sleep-source="verified-cloud"/);
 assert.match(page.innerHTML,/Dropbox Health Connect ellenőrizve/);
 assert.equal(x.writes.length,1,'only verified, matching cloud source seeds cache');
 assert.equal(x.writes[0].profile,'monika');
});
test('Sleep profile flip never paints the other household member’s delayed cloud response',async()=>{
 const x=app();x.win.hhOpenSleep();await flush(20);
 x.win.hhSleepToggleProfile();await flush(20);
 const page=x.nodes.get('hhSleepPage');
 assert.equal(x.profile.code,'z');
 assert.match(page.innerHTML,/Korábbi, helyben mentett alvás/);
 assert.equal(x.win.hhSleepSourceMeta.profile,'zsolt');
 x.resolveMonika({profile:'monika',exportedAt:new Date().toISOString(),records:{sleepSessions:[row('monika-late')]}});
 await flush(20);
 assert.equal(x.win.hhSleepSourceMeta.profile,'zsolt','old monika response cannot be painted in zsolt view');
 assert.doesNotMatch(page.innerHTML,/Dropbox Health Connect ellenőrizve/);
 x.resolveZsolt({profile:'zsolt',exportedAt:new Date().toISOString(),records:{sleepSessions:[row('zsolt-verified')]}});
 await flush(20);
 assert.match(page.innerHTML,/data-hh-sleep-source="verified-cloud"/);
 assert.equal(x.win.hhSleepSourceMeta.profile,'zsolt');
 assert.deepEqual(x.writes.map(z=>z.profile),['monika','zsolt']);
});

test('Watch9 scores and night vitals render only after verified Sleep cloud, no preview leakage',async()=>{
 const x=app(),calls=[];
 x.win.HH_SAMSUNG_SOURCE_V371={async load(profile){
  calls.push(profile);
  const date=new Date().toISOString().slice(0,10);
  return {status:'ready',data:{profile,wellnessReadAt:new Date().toISOString(),
   sleepSessions:[{uid:'sleep-record',date,startTime:start,endTime:end,sleepScore:84}],
   energyScores:[{date,energyScore:76}],
   nightOxygen:[{sleepUid:'sleep-record',startTime:start,endTime:end,minPercent:92,maxPercent:98}],
   nightSkinTemperature:[{sleepUid:'sleep-record',startTime:start,endTime:end,minCelsius:32.6,maxCelsius:34.1}]
  }};
 }};
 x.win.hhOpenSleep();await flush(20);
 assert.equal(calls.length,0,'local preview never loads secondary sensor cloud');
 const page=x.nodes.get('hhSleepPage');
 assert.doesNotMatch(page.innerHTML,/id="hhSleepWatch9Panel"/);
 x.resolveMonika({profile:'monika',exportedAt:new Date().toISOString(),
   records:{sleepSessions:[row('verified-monika')],heartRate:[],oxygenSaturation:[],
   heartRateVariabilityRmssd:[{time:new Date(Date.parse(start)+3600000).toISOString(),rmssdMs:35}],
   respiratoryRate:[{time:new Date(Date.parse(start)+3600000).toISOString(),breathsPerMinute:15.2}]}});
 await flush(24);
 assert.equal(calls.join(','),'monika');
 assert.match(page.innerHTML,/id="hhSleepWatch9Panel"/);
 const card=x.nodes.get('hhSleepWatch9Panel');
 assert.ok(card);
 assert.match(card.innerHTML,/Sleep Score/);
 assert.match(card.innerHTML,/84/);
 assert.match(card.innerHTML,/Energy Score/);
 assert.match(card.innerHTML,/76/);
 assert.match(card.innerHTML,/Éjszakai SpO₂ minimum/);
 assert.match(card.innerHTML,/92/);
 assert.match(card.innerHTML,/Bőrhőmérséklet/);
 assert.match(card.innerHTML,/32,6/);
 assert.match(card.innerHTML,/HRV · Health Connect/);
 assert.match(card.innerHTML,/35,0/);
 assert.match(card.innerHTML,/Légzésszám/);
 assert.match(card.innerHTML,/15,2/);
});

test('Watch9 delayed Samsung response cannot paint other profile after switching',async()=>{
 const x=app();let resolveOld,resolveNew;
 const old=new Promise(resolve=>{resolveOld=resolve});
 const newer=new Promise(resolve=>{resolveNew=resolve});
 x.win.HH_SAMSUNG_SOURCE_V371={load(profile){return profile==='monika'?old:newer}};
 x.win.hhOpenSleep();await flush(15);
 x.resolveMonika({profile:'monika',exportedAt:new Date().toISOString(),
    records:{sleepSessions:[row('m')],heartRate:[],oxygenSaturation:[]}});
 await flush(15);
 x.win.hhSleepToggleProfile();await flush(15);
 x.resolveZsolt({profile:'zsolt',exportedAt:new Date().toISOString(),
    records:{sleepSessions:[row('z')],heartRate:[],oxygenSaturation:[]}});
 await flush(15);
 const date=new Date().toISOString().slice(0,10);
 const payload=(profile,score)=>({status:'ready',data:{profile,
   sleepSessions:[{uid:profile,date,startTime:start,endTime:end,sleepScore:score}],
   energyScores:[],nightOxygen:[],nightSkinTemperature:[]}});
 resolveOld(payload('monika',84));await flush(15);
 const card=x.nodes.get('hhSleepWatch9Panel');
 assert.ok(card);
 assert.doesNotMatch(card.innerHTML,/84/);
 resolveNew(payload('zsolt',71));await flush(15);
 assert.match(card.innerHTML,/71/);
 assert.equal(x.win.hhSleepSourceMeta.profile,'zsolt');
});
