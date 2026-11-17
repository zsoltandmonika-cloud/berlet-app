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
  createElement:element,getElementById(id){return nodes.get(id)||null},
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
