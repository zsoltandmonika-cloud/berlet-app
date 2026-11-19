'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const script=fs.readFileSync(path.join(base,'taxi-current-location-map-v1.js'),'utf8');
function runGPS(permission='allow',visible='visible'){
 const calls={gps:[],map:[],pins:[],moves:[],events:{}};
 const el=id=>({
  id,dataset:{},disabled:false,textContent:'',title:'',
  children:[],handlers:{},
  addEventListener(name,fn){this.handlers[name]=fn;},
  append(child){this.children.push(child);},
  setAttribute(name,value){this[name]=value;}
 });
 const widgets={taxiCurrentMap:el('taxiCurrentMap'),
  taxiCurrentMapCanvas:el('taxiCurrentMapCanvas'),
  taxiCurrentMapStatus:el('taxiCurrentMapStatus'),
  taxiCurrentMapRefresh:el('taxiCurrentMapRefresh'),
  taxiCurrentMapCenter:el('taxiCurrentMapCenter')};
 class Map{
  constructor(opts){calls.map.push(opts);this.events={};}
  once(name,fn){this.events[name]=fn;}
  on(name,fn){this.events[name]=fn;}
  loaded(){return true;}
  isStyleLoaded(){return true;}
  jumpTo(opts){calls.moves.push(opts);}
  resize(){}
 }
 class Marker{
  constructor(opts){this.opts=opts;calls.pins.push(this);}
  setLngLat(x){this.coords=x;return this;}
  addTo(){return this;}
 }
 const phonePosition={coords:{latitude:47.5991,longitude:19.0352,accuracy:22}};
 const w={isSecureContext:true,maplibregl:{Map,Marker},navigator:{geolocation:{
  getCurrentPosition(onSuccess,onError,opts){
   calls.gps.push(opts);
   if(permission==='allow')onSuccess(phonePosition);else onError({code:1});
  }}},
  requestAnimationFrame(fn){fn();},addEventListener(name,fn){calls.events[name]=fn;}
 };
 const d={visibilityState:visible,head:{append(){}},
  getElementById:id=>widgets[id]||null,
  createElement:tag=>el(tag),
  addEventListener(name,fn){calls.events[name]=fn;}
 };
 vm.runInNewContext(script,{window:w,document:d,Number,Math,Promise,Error,URL,console});
 return {calls,widgets,w,d,phonePosition};
}
test('Only the unused space below the approved Taxi hero contains the map; Golden nav/calculator remain',()=>{
 const hero=index.indexOf('class="reference"');
 const map=index.indexOf('id="taxiCurrentMap"');
 const calc=index.indexOf('id="calcDialog"');
 assert.ok(hero>=0&&map>hero&&calc>map);
 assert.match(index,/class="taxi-current-map" id="taxiCurrentMap"/);
 assert.match(index,/id="taxiCurrentMapCanvas"/);
 assert.match(index,/id="taxiCurrentMapRefresh"/);
 assert.match(index,/id="taxiCurrentMapCenter"/);
 assert.match(index,/taxi-current-location-map-v1\.js\?v=20261119-compact-dark-credits-v2/);
 assert.match(index,/taxi-route-v8-fare-map\.js\?v=20261119-v8-shared-map-theme/);
 assert.match(index,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(index,/src="\.\/assets\/SHO_Smart_Taxi_approved\.png" width="1193" height="1319"/);
 assert.doesNotMatch(index,/class="foot"/);
 assert.match(index,/\.taxi-current-map\{[^}]*height:clamp\(205px,29dvh,286px\)/);
});
test('GPS uses this device, no home fallback, profile crossover, daily caps, polling or saved tracking',()=>{
 assert.match(script,/w\.navigator\.geolocation\.getCurrentPosition/);
 assert.match(script,/enableHighAccuracy:true/);
 assert.match(script,/tiles\.openfreemap\.org\/styles\/dark/);
 assert.match(script,/maplibre-gl@4\.7\.1/);
 assert.doesNotMatch(script,/localStorage|sessionStorage|Supabase|setInterval\(|watchPosition\(|47\.506|19\.0467/);
 assert.doesNotThrow(()=>new vm.Script(script));
});
test('Real native phone coordinates create only one pin at its GPS location, no fake point',async()=>{
 const {calls,widgets}=runGPS();
 await new Promise(r=>setImmediate(r));
 assert.equal(calls.gps.length,1);
 assert.equal(calls.gps[0].enableHighAccuracy,true);
 assert.equal(calls.map.length,1);
 assert.equal(calls.map[0].style,'https://tiles.openfreemap.org/styles/dark');
 assert.equal(calls.map[0].attributionControl.compact,true,'source credits should stay accessible via compact info control');
 assert.deepEqual(Array.from(calls.map[0].center),[19.0352,47.5991]);
 assert.equal(calls.pins.length,1);
 assert.deepEqual(Array.from(calls.pins[0].coords),[19.0352,47.5991]);
 assert.match(widgets.taxiCurrentMapStatus.textContent,/±22 m/);
 assert.equal(widgets.taxiCurrentMap.dataset.state,'ready');
 widgets.taxiCurrentMapCenter.handlers.click();
 assert.equal(calls.gps.length,1,'recentering should not make another GPS request');
 widgets.taxiCurrentMapRefresh.handlers.click();
 await new Promise(r=>setImmediate(r));
 assert.equal(calls.gps.length,2);
 assert.equal(calls.pins.length,1,'refresh must update the same marker');
});
test('Permission denied never invents a position; hidden tab never asks GPS until visible',async()=>{
 const denied=runGPS('deny');
 await new Promise(r=>setImmediate(r));
 assert.equal(denied.calls.gps.length,1);
 assert.equal(denied.calls.map.length,0);
 assert.equal(denied.calls.pins.length,0);
 assert.match(denied.widgets.taxiCurrentMapStatus.textContent,/GPS-engedély/);
 const background=runGPS('allow','hidden');
 await new Promise(r=>setImmediate(r));
 assert.equal(background.calls.gps.length,0);
 background.d.visibilityState='visible';
 background.calls.events.visibilitychange();
 await new Promise(r=>setImmediate(r));
 assert.equal(background.calls.gps.length,1);
});
