'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../guardian'),root=path.resolve(__dirname,'../..');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
const {validate}=require('../guardian/bkk-live-v793.js');
const map=require('../guardian/bkk-live-map-v793.js');
function view(vehicle){
 class Element{
  constructor(){this.children=[];this.dataset={};this.style={};this.attrs={};}
  append(...children){this.children.push(...children)}
  appendChild(child){this.children.push(child)}
  setAttribute(name,value){this.attrs[name]=value}
 }
 const node=map.makeMarkerElement({createElement:()=>new Element()},vehicle);
 return {node,chip:node.children[0].children[0].children.find(x=>x.className==='hh-bkk-smart-delay-v1')};
}
function snapshot(delaySeconds,precision){
 const stamp=new Date(Date.now()-2000).toISOString();
 return {schemaVersion:1,source:'BKK Zrt., CC BY 4.0',
  feedType:'GTFS-RT VehiclePositions',generatedAt:stamp,
  vehicles:[{id:'bkk-17',routeId:'17',routeKey:'tram:17',mode:'tram',lat:47.5,lng:19.04,
    timestamp:stamp,delaySeconds,delayObservedAt:stamp,...(precision?{delayPrecision:precision}:{})}]};
}
test('estimated BKK GTFS zero is neutral, never confirmed green punctuality',()=>{
 const v=validate(snapshot(0,'minute'));
 assert.equal(v.ok,true);
 assert.equal(v.vehicles[0].delayPrecision,'minute');
 const {chip,node}=view(v.vehicles[0]);
 assert.equal(chip.textContent,'≈0p');
 assert.equal(chip.dataset.delay,'estimated');
 assert.doesNotMatch(node.attrs['aria-label'],/Pontos, ellenőrzött/);
});
test('estimated positive late and negative early remain signed and visibly approximate',()=>{
 const late=view(validate(snapshot(240,'minute')).vehicles[0]).chip;
 assert.equal(late.dataset.delay,'late');assert.equal(late.textContent,'≈−4p');
 const early=view(validate(snapshot(-120,'minute')).vehicles[0]).chip;
 assert.equal(early.dataset.delay,'early');assert.equal(early.textContent,'≈+2p');
});
test('real explicit zero remains true verified green and missing data stays unknown',()=>{
 const exact=view(validate(snapshot(0)).vehicles[0]).chip;
 assert.equal(exact.dataset.delay,'ontime');assert.equal(exact.textContent,'0p');
 const none=snapshot(0);delete none.vehicles[0].delaySeconds;
 const missing=view(validate(none).vehicles[0]).chip;
 assert.equal(missing.dataset.delay,'unknown');assert.equal(missing.textContent,'—');
});
test('approximate source must never survive stale data validation',()=>{
 const old=snapshot(240,'minute');
 old.vehicles[0].delayObservedAt='2020-01-01T00:00:00Z';
 const v=validate(old);
 assert.equal(v.ok,true);assert.equal(v.vehicles[0].delaySeconds,undefined);
 assert.equal(v.vehicles[0].delayPrecision,undefined);
});
test('edge only infers with official GTFS stop/time and refuses ambiguous matches',()=>{
 const edge=fs.readFileSync(path.join(root,'supabase/functions/hh-bkk-live-v793-preview/index.ts'),'utf8');
 assert.match(edge,/const PLAN_URL=/);
 assert.match(edge,/function plannedDelay\(/);
 assert.match(edge,/if\(result\)return null; \/\/ Multiple plausible service days/);
 assert.match(edge,/if\(stops\.has\(stop\)\)\{stops\.set\(stop,null\)/);
 assert.match(edge,/if\(inferred\)stats\.estimated\+\+/);
 assert.match(edge,/delayPrecision:"minute"/);
 assert.match(edge,/tripDelaySeconds=explicitDelay\(tu\)/);
 assert.doesNotMatch(edge,/delaySeconds\|\|0/);
});