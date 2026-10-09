#!/usr/bin/env node
'use strict';
/* Self-contained v328 regression checks. No real user records or network. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','live-v328.js'),'utf8');
const now=new Date().toISOString();
const yesterday=new Date(Date.now()-86400000).toISOString();
function boot(code,opts={}){
 const map=new Map(Object.entries(Object.assign({
  'hh-profile':code==='monika'?'m':'z',
  ['hh-lena-context-v289-'+code]:JSON.stringify({
   profile:code,generatedAt:now,
   metrics:{bloodPressure:{latest:{measuredAt:now,systolic:124,diastolic:81}},pulse:{latest:{value:69,measuredAt:now}}},
   sleep:{recent:[{durationMin:350,endTime:now}],h72:{avgDurationMin:355},d7:{avgDurationMin:390}},
   activity:{recent:[{date:now.slice(0,10),steps:4200,activeMinutes:44}],d7:{avgSteps:4000}},
   documents:{index:[{id:'record',title:'Kardiológiai kontroll',date:now.slice(0,10)}]},
   medications:[{name:'Fiktív készítmény'}],profileCore:{}
  }),
  'hh-symptom-journal-v1':JSON.stringify({events:[
   {id:'headache',profile:'zsolt',symptom:'Fejfájás',severity:4,eventAt:now},
   {id:'back',profile:'zsolt',symptom:'Hátfájás',severity:8,eventAt:now},
   {id:'other',profile:'monika',symptom:'Szédülés',severity:5,eventAt:now}
  ]})
 },opts.storage||{})));
 const localStorage={
  getItem(k){return map.has(k)?map.get(k):null},
  setItem(){throw Error('The Bridge must not write persistent user data')},
  removeItem(){throw Error('The Bridge must not remove user data')}
 };
 const window={
  addEventListener(){},
  HH_ENVIRONMENT_V1:{getCurrent:()=>opts.environment===false?null:{
   fetchedAt:opts.oldWeather?new Date(Date.now()-5*3600000).toISOString():now,
   observedAt:now,current:{temperature:19,pressureMsl:1012,humidity:56},
   pressureDelta:{h6:-5,h24:-9},airQuality:{europeanAqi:28},pollen:{grass:4}}},
  HH_INFECTION_WATCH_V1:{get:()=>({periodEnd:yesterday.slice(0,10),items:[]})}
 };
 const document={documentElement:{dataset:{}},getElementById(){return null}};
 vm.runInNewContext(source,{window,document,localStorage,console,Date,JSON,Number,String,Math,Array,RegExp,Map,Set},{filename:'live-v328.js'});
 return window.HH_LENA_CONTEXT_BRIDGE_V328;
}
const z=boot('zsolt').collect('Miért fáj a fejem?','zsolt');
assert.equal(z.schema,'healthhub.intelligence.context/1');
assert.equal(z.sources.length,8);
assert.equal(z.networkTransmission,false);
assert.equal(z.sources[0].entries.length,1,'Unrelated back pain must not count as headache');
assert.equal(z.sources[0].entries[0].name,'Fejfájás');
assert(z.sources[1].entries.some(x=>x.name==='Vérnyomás'&&x.value==='124/81'));
assert(z.sources[2].entries.some(x=>x.name==='Legutóbbi alvás'&&x.value==='350'));
assert(z.sources[3].entries.some(x=>x.name==='Legutóbbi napi lépésszám'&&x.value==='4 200'||x.value==='4200'));
assert(z.sources[4].entries.some(x=>x.name==='Légnyomás'&&x.value==='1012'));
assert(z.sources[6].entries.some(x=>x.name==='Rögzített gyógyszer'));
assert(z.sources[7].entries.some(x=>x.name==='Indexelt leletek'));
const monika=boot('monika').collect('Miért fáj a fejem?','monika');
assert.equal(monika.profile,'monika');
assert.equal(monika.sources[0].entries.length,0,'Other profile symptom records must stay private');
const old=boot('zsolt',{oldWeather:true}).collect('Milyen az időjárás?','zsolt');
assert.equal(old.sources[4].status,'stale','Old environmental cache must not show green status');
const missing=boot('zsolt',{storage:{'hh-lena-context-v289-zsolt':'null'}}).collect('Hogy aludtam?','zsolt');
assert.equal(missing.sources[1].status,'missing','Do not invent missing measurements');
assert.equal(missing.sources[7].status,'missing','Missing document index must not show success');
console.log('HealthHub Intelligence Context v328: all isolated data and privacy checks PASSED.');
