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
 assert.match(read('index.html'),/914-mini-above-marker/);
 assert.match(read('guardian-transit-v791.js'),/914-mini-above-marker/);
 assert.match(read('bkk-live-glass-v800.css'),/hh-bkk-vehicle-card-v913/);
});

test('v913.1 gives bus tram trolley metro HEV distinct SVG icons with original live-marker geometry',()=>{
 const cases=[['260','bus'],['17','tram'],['75','trolley'],['M2','metro'],['H5','hev']];
 const doc={createElement(tag){return {tag,style:{},attributes:{},children:[],setAttribute(k,v){this.attributes[k]=v},append(...kids){this.children.push(...kids)},appendChild(k){this.children.push(k)}}}};
 for(const [routeId,mode] of cases){
  const marker=live.makeMarkerElement(doc,{routeId,mode});
  assert.match(marker.className,new RegExp('hh-bkk-glass--'+mode));
  const originalCapsule=marker.children[0].children[0];
  assert.equal(originalCapsule.className,'hh-bkk-glass-capsule-v800');
  const icon=originalCapsule.children[0];
  assert.match(icon.innerHTML,/<svg/);
  assert.notEqual(icon.innerHTML,'');
  assert.equal(originalCapsule.children[2].textContent,routeId);
 }
});
test('v913.1 no static automatic route popovers and phone-sized pink/blue glass',()=>{
 const routes=read('guardian-transit-v791.js'),extra=read('guardian-bkk-extra-route-v912.js');
 const originalZoom=routes.slice(routes.indexOf('function showRoute(id){'),routes.indexOf('function onToggle(id,value){'));
 const extraZoom=extra.slice(extra.indexOf('async function showLine(key){'),extra.indexOf('if(w?.addEventListener)'));
 assert.doesNotMatch(originalZoom,/routeDetailsPopup\(/);
 assert.doesNotMatch(extraZoom,/popup\(/);
 const css=read('bkk-live-glass-v800.css'),html=read('index.html');
 assert.match(css,/width:126px;max-width:min\(126px,58vw\)/);
 assert.match(css,/data-guardian-profile="m"/);
 assert.match(css,/data-guardian-profile="z"/);
 assert.match(css,/hh-bkk-glass-icon-v800 svg/);
 assert.match(html,/v=914-mini-above-marker/);
 assert.match(html,/v=913-static-no-auto-popup/);
});

test('v914 places popup above clicked vehicle and avoids nearby live BKK marker collision',()=>{
 const clicked={left:230,right:300,top:290,bottom:337,width:70,height:47};
 const adjacent={left:200,right:320,top:207,bottom:257};
 const viewport={left:20,right:500,top:20,bottom:700};
 const choice=live.vehiclePopupPlacement(clicked,[adjacent],viewport);
 assert.equal(choice.anchor,'bottom','popup never opens below/over its own vehicle');
 assert.ok(choice.offset[1]<=-54,'placement clears the tapped vehicle marker');
 const pinX=(clicked.left+clicked.right)/2+choice.offset[0],bottom=clicked.bottom+6+choice.offset[1];
 const card={left:pinX-63,right:pinX+63,top:bottom-96,bottom};
 const intersects=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top);
 assert.equal(intersects(card,clicked),false,'selected icon remains fully visible');
 assert.equal(intersects(card,adjacent),false,'other vehicle icon remains visible when safe placement exists');
 assert.ok(card.top>=viewport.top,'on-screen room is preferred when available');
});
test('v914 fallback and micro glass stay independent of external API requests',()=>{
 assert.deepEqual(live.vehiclePopupPlacement(null),{anchor:'bottom',offset:[0,-57]});
 const css=read('bkk-live-glass-v800.css'),src=read('bkk-live-map-v793.js');
 assert.match(css,/width:126px;max-width:min\(126px,58vw\)/);
 assert.match(css,/rgba\(29,72,108,\.43\)/);
 assert.match(css,/rgba\(116,49,102,\.44\)/);
 assert.match(src,/placementForMarker\(wrapper,m\)/);
 assert.match(src,/anchor:place\.anchor,offset:place\.offset,maxWidth:'126px'/);
 assert.match(src,/removeVehiclePopup\(\)/);
 assert.doesNotMatch(src,/fetch\(|setInterval\(|geolocation\./);
});
