'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../guardian');
const read=n=>fs.readFileSync(path.join(base,n),'utf8');
const live=require('../guardian/bkk-live-map-v793.js');
const {validate}=require('../guardian/bkk-live-v793.js');
const now=Date.parse('2026-10-28T11:00:20Z'),stamp=new Date(now-20000).toISOString();
test('v913 shows only BKK-sourced visible fleet label/plate, never the feed entity ID',()=>{
 const info=live.vehicleInfo({id:'internal-entity-key',routeId:'17',mode:'tram',vehicleLabel:'V2238',
  vehicleNumber:'internal-vehicle-ref',headsign:'Budafok kocsiszín',timestamp:stamp},now);
 assert.equal(info.routeId,'17');
 assert.equal(info.vehicleCode,'V2238');
 assert.equal(info.headsign,'Budafok kocsiszín');
 assert.equal(info.age,'20 mp');
 assert.equal(live.vehicleInfo({id:'opaque-entity',routeId:'41',timestamp:stamp},now).vehicleCode,'');
});
test('v913 renders sanitized user-facing vehicle card without model invention',()=>{
 const created=[];
 const doc={createElement(tag){
  const e={tag,className:'',textContent:'',children:[],append(...items){this.children.push(...items)}};
  created.push(e);return e;
 }};
 const panel=live.renderVehicleInfo(doc,{id:'feed-entity',routeId:'17',mode:'tram',
  vehicleLabel:'V2238',headsign:'Budafok kocsiszín',timestamp:stamp});
 const all=created.map(x=>x.textContent).join(' ');
 assert.match(panel.className,/vehicle-card-v913/);
 assert.match(all,/17/);assert.match(all,/V2238/);assert.match(all,/Budafok kocsiszín/);
 assert.doesNotMatch(all,/feed-entity|CAF|3 modulos|5 modulos/);
});
test('v913 validator preserves only actual server vehicle descriptor properties',()=>{
 const parsed=validate({schemaVersion:1,source:'BKK Zrt., CC BY 4.0',
  feedType:'GTFS-RT VehiclePositions',generatedAt:stamp,vehicles:[
   {id:'opaque-key',routeId:'17',routeKey:'tram:17',mode:'tram',lat:47.5,lng:19,
    timestamp:stamp,vehicleLabel:'V2238',vehicleNumber:'v-2238',licensePlate:''}
  ]},now);
 assert.equal(parsed.ok,true);assert.equal(parsed.vehicles[0].vehicleLabel,'V2238');
 assert.equal(parsed.vehicles[0].vehicleNumber,'v-2238');
 assert.equal(parsed.vehicles[0].routeId,'17');
});
test('v913 uses existing verified/cache-bound authenticated BKK API and refreshed JS assets',()=>{
 const edge=fs.readFileSync(path.join(__dirname,'../../supabase/functions/hh-bkk-live-v793-preview/index.ts'),'utf8');
 assert.match(edge,/descriptor\?\.label/);assert.match(edge,/descriptor\?\.id/);
 assert.match(edge,/if\(label\)entry\.vehicleLabel=label/);
 assert.match(edge,/feedCache/);assert.match(edge,/getUser\(token\)/);
 assert.doesNotMatch(read('bkk-live-map-v793.js'),/fetch\(|setInterval\(/);
 assert.match(read('index.html'),/913-bkkgo-vehicle/);
 assert.match(read('guardian-transit-v791.js'),/913-bkkgo-vehicle/);
 assert.match(read('bkk-live-glass-v800.css'),/hh-bkk-vehicle-card-v913/);
});
