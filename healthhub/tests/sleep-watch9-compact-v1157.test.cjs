'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const sleep=fs.readFileSync('healthhub/live-v170.js','utf8');
const index=fs.readFileSync('healthhub/index.html','utf8');
const section=(a,b)=>{
 const start=sleep.indexOf(a),end=sleep.indexOf(b,start+a.length);
 assert.ok(start>=0&&end>start,'missing tested section '+a);
 return sleep.slice(start,end);
};
const base=section('function sleepFactorCards381(','function sleepOverview(');
const watch=section('function hhSleepWatch9Markup(','async function hhLoadWatch9Sleep(');
function env(profile){
 const e={
  window:{HH_SLEEP_V428_ENABLED:true},
  hhSleepVitals384:{
   zsolt:{hrv:null,respiratory:null},
   monika:{hrv:{rmssdMs:34.7,time:new Date().toISOString()},respiratory:{breathsPerMinute:15.2,time:new Date().toISOString()}}
  },
  hhSleepMetrics382:()=>({actual:422,efficiency:.88,stages:[
   {stage:4,startTime:'2026-11-17T22:00:00Z',endTime:'2026-11-17T22:40:00Z'},
   {stage:5,startTime:'2026-11-17T22:40:00Z',endTime:'2026-11-17T23:30:00Z'},
   {stage:6,startTime:'2026-11-17T23:30:00Z',endTime:'2026-11-18T00:00:00Z'}
  ]}),
  hhSleepIndex382:()=>({score:75,tone:'warn',label:'Figyelendő'}),
  hhSleepTone382:()=>({label:'7–9 óra',tone:'good'}),
  hhSleepEfficiency382:()=>({label:'Kevés ébrenlét',tone:'good'}),
  hhNightBiometrics384:()=>({pulse:{value:68,minutes:312},oxygen:{value:96,minutes:24}}),
  durMin:(a,b)=>(Date.parse(b)-Date.parse(a))/60000,
  durText:(min)=>{const v=Math.floor(min||0);return Math.floor(v/60)+' ó '+v%60+' p'},
  fmtDate:(v)=>String(v).slice(0,10),
  esc:(v)=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
  Date,Number,Array,Object,Math,Intl,Set,Map,JSON,console
 };
 vm.runInNewContext(base+'\n'+watch,e,{filename:'sleep-compact-1157.js'});
 return e;
}
const now=new Date();
const end=new Date(now.valueOf()-60*60*1000).toISOString();
const start=new Date(now.valueOf()-8*60*60*1000).toISOString();
const uid='m-sleep-v1157';
function sample(profile){
 return {status:'ready',data:{profile,
  sleepSessions:[{uid,date:end.slice(0,10),endTime:end,sleepScore:87}],
  energyScores:[{date:now.toISOString().slice(0,10),energyScore:82}],
  nightSkinTemperature:[{sleepUid:uid,minCelsius:33.5,maxCelsius:34.1}],
  nightOxygen:[{sleepUid:uid,minPercent:92}],
 }};
}
test('S24 Ultra overview is seven original HC measures + five optional Watch measures = exactly 12',()=>{
 const envMonika=env('monika'),night={startTime:start,endTime:end};
 const first=envMonika.sleepFactorCards381(night,'monika');
 const second=envMonika.hhSleepWatch9Markup('monika',sample('monika'));
 assert.equal((first.match(/class="hhSleepFactor381 hhSleepRag382 /g)||[]).length,7);
 assert.equal((second.match(/class="hhSleepFactor381 hhSleepWatchExtra1157"/g)||[]).length,5);
 assert.equal((first.match(/Véroxigén \(SpO₂\)/g)||[]).length,1,'one oxygen card, no duplicate tile');
 assert.match(first,/id="hhSleepOxygenCard1157"/);
 assert.match(first,/id="hhSleepWatch9Panel"/);
 assert.match(second,/87\s*<small>\/100<\/small>/);
 assert.match(second,/82\s*<small>\/100<\/small>/);
 assert.match(second,/33,5–34,1/);
 assert.match(second,/34,7/);
 assert.match(second,/15,2/);
 assert.doesNotMatch(second,/SpO₂/,'Samsung oxygen only annotates the existing HC card');
 assert.match(sleep,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
 assert.match(sleep,/min-height:70px!important/);
});
test('Source/profile isolation: never borrow another owner measured Samsung records',()=>{
 const e=env('zsolt');
 const invalid=e.hhSleepWatch9Markup('zsolt',sample('monika'));
 assert.match(invalid,/Forrás hiányzik/);
 assert.match(invalid,/Samsung-fájl hibás vagy más profilú/);
 assert.doesNotMatch(invalid,/87\s*<small>\/100<\/small>/);
 const unavailable=e.hhSleepWatch9Markup('zsolt',{status:'unavailable',data:null});
 assert.match(unavailable,/Samsung-fájl nem érhető el/);
 const empty=e.hhSleepWatch9Markup('zsolt',{status:'ready',data:{
   profile:'zsolt',sleepSessions:[],energyScores:[],nightSkinTemperature:[]
 }});
 assert.match(empty,/Samsung-fájl megvan, nincs wellness-rekord/);
 assert.match(empty,/Nincs pontszám/);
 const noScore=e.hhSleepWatch9Markup('zsolt',{status:'ready',data:{
   profile:'zsolt',sleepSessions:[{uid:'s1',endTime:new Date().toISOString()}],energyScores:[]
 }});
 assert.match(noScore,/Samsung-alvás megvan, pontszám nincs/);
 const missing=e.hhSleepWatch9Markup('zsolt',null);
 assert.equal((missing.match(/class="hhSleepFactor381 hhSleepWatchExtra1157"/g)||[]).length,5);
 assert.equal((missing.match(/<strong class="hhSleepFactorValue381">—<\/strong>/g)||[]).length,5);
 assert.doesNotMatch(missing,/87\s*<small>\/100<\/small>/);
});
test('Renderer inserts five extra tiles inside same original factors grid, no secondary Samsung page',()=>{
 assert.match(sleep,/hhSleepWatch9Panel" class="hhSleepWatch9Integrated1157"/);
 assert.match(sleep,/if\(watchSlot\)watchSlot.innerHTML=hhSleepWatch9Markup\(requestedProfile,null\)/);
 assert.equal((sleep.match(/<div id="hhSleepWatch9Panel"/g)||[]).length,1);
 assert.match(sleep,/hhSleepWatch9Oxygen1157\(profile,result\)/);
 assert.match(sleep,/renderId===sleepRenderSeq&&pkey\(\)===profile/);
 assert.match(sleep,/sourceStatus==='verified-cloud'/);
 assert.ok(sleep.includes("if(!preview&&['zsolt','monika'].includes(requestedProfile))"),
   'Verified Samsung source loads independent of Health Connect cloud freshness');
 assert.ok(!sleep.includes("window.hhSleepSourceMeta.source==='Dropbox / Health Connect'&&"),
   'Do not block the owner-scoped Samsung cloud file on HC status');
 assert.match(sleep,/Samsung: a webes Dropbox nincs csatlakoztatva/);
 assert.match(sleep,/Samsung: a webes Dropbox-fiókban nincs Samsung-adatfájl/);
 assert.match(sleep,/webes fiók: /);
 assert.match(sleep,/data-hh-samsung-status/);
 assert.ok(sleep.includes('hozzáférés megtagadva (HTTP 403)'));
 assert.ok(sleep.includes('hálózati hiba (NETWORK)'));
 assert.match(index,/live-v170\.js\?v=1160-watch9-http-diagnostics/);
});
