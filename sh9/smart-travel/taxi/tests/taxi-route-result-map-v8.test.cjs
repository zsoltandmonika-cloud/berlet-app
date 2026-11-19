'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const fare=fs.readFileSync(path.join(base,'taxi-route-v8-fare-map.js'),'utf8');
const preview=fs.readFileSync(path.join(base,'taxi-route-result-map-v1.js'),'utf8');
const backend=fs.readFileSync(path.join(base,'backend/hh-sho-taxi-route-preview-v1/index.ts'),'utf8');
test('V8: fare top scroll with pinned bottom Close/Uber and intact old calculator/hero',()=>{
 assert.match(index,/class="taxi-dialog-scroll" id="taxiDialogScroll"/);
 assert.match(index,/#calcDialog \.taxi-dialog-scroll\{[^}]*overflow-y:auto/);
 assert.match(index,/#calcDialog \.dialog-card>\.actions\{flex:0 0 auto/);
 assert.match(index,/id="calcDialog"[\s\S]*id="taxiDialogScroll"[\s\S]*<\/div>\s*<div class="actions"><button type="button" data-action="close">Bezárás<\/button><button type="button" data-action="uber">Uber rendelés ↗<\/button><\/div>/);
 assert.match(fare,/window\.SHO_TAXI_RESULT_MAP_V1\?\.show\?\./);
 assert.match(fare,/viewport\.scrollTo\(\{top:Math\.max\(0,viewport\.scrollTop\+delta-6\),behavior:'smooth'\}\)/);
 assert.match(fare,/viewport\?\.classList\.add\('has-result'\)/);
 assert.match(index,/taxi-route-v8-fare-map\.js\?v=20261119-v8-shared-map-theme/);
 assert.match(fare,/\.tx-route-map-canvas\{position:relative;height:clamp\(325px,calc\(46dvh \+ 15px\),435px\)/);
 assert.match(index,/taxi-route-result-map-v1\.js\?v=20261119-compact-dark-credits-v2/);
 assert.match(index,/taxi-current-location-map-v1\.js/);
 assert.match(index,/src="\.\/assets\/SHO_Smart_Taxi_approved\.png" width="1193" height="1319"/);
 assert.match(index,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(fare,/id="txEstimate" aria-label="Smart Taxi viteldíj-kalkulátor"/);
 assert.match(fare,/id="txFotaxiOfficial"/);
 assert.match(fare,/id="txMap" target="_blank"/);
 assert.match(fare,/const x=await request\(\{action:'estimate',from,to\}\)/);
 assert.match(fare,/x\.estimatedFareFt/);
 assert.doesNotMatch(fare,/A napi térképes lekérdezési keret elfogyott/);
 assert.doesNotThrow(()=>new vm.Script(fare));
 assert.doesNotThrow(()=>new vm.Script(preview));
});
test('Optional map preview is separate from Google-based fare, secure and without artificial quotas',()=>{
 assert.match(backend,/if\(!await authorize\(req\)\)/);
 assert.match(backend,/hh_profile_access/);
 assert.match(backend,/action!=="preview"/);
 assert.match(backend,/router\.project-osrm\.org\/route\/v1\/driving/);
 assert.match(backend,/overview=simplified&steps=false&geometries=geojson/);
 assert.match(backend,/type:"LineString",coordinates:coords/);
 assert.doesNotMatch(backend,/hh_taxi_api_reserve|v_cap_day|daily_or_monthly_quota_reached/);
 assert.match(fare,/hh-sho-taxi-route-preview-v1/);
 assert.match(fare,/request\(\{action:'preview',from,to\},routePreviewEndpoint\)/);
 assert.match(preview,/tiles\.openfreemap\.org\/styles\/dark/);
 assert.match(preview,/new w\.maplibregl\.LngLatBounds\(\)/);
 assert.match(preview,/fitBounds\(bounds,/);
 assert.match(preview,/window,document/);
});
function env(){
 const callbacks={},created={markers:[],maps:[],layers:[]},els={};
 const element=id=>({id,hidden:true,dataset:{},textContent:'',title:'',
  setAttribute(){},addEventListener(name,fn){callbacks[name]=fn;}});
 ['txRouteMapSection','txRouteMapCanvas','txRouteMapStatus','txCost'].forEach(id=>{els[id]=element(id)});
 class Marker{
  constructor({element:pin}){this.el=pin;created.markers.push(this)}
  setLngLat(coords){this.position=coords;return this}
  addTo(){return this}
  remove(){}
 }
 class LngLatBounds{
  constructor(){this.points=[]}
  extend(pt){this.points.push(pt);return this}
 }
 class Map{
  constructor(options){this.options=options;created.maps.push(this);this.sources={}}
  once(event,fn){if(event==='load')Promise.resolve().then(fn)}
  on(){}
  isStyleLoaded(){return true}
  getSource(id){return this.sources[id]}
  addSource(id,src){this.sources[id]={...src,setData(data){this.data=data}}}
  addLayer(layer){created.layers.push(layer)}
  resize(){}
  fitBounds(bounds,options){this.bounds=bounds;this.boundsOptions=options}
 }
 let starts=0;
 class AudioContext{
  state='running';currentTime=4;destination={};resume(){return Promise.resolve()}
  createOscillator(){return {type:'',frequency:{value:0},connect(){},start(){starts++},stop(){}}}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}
 }
 const document={
  getElementById:id=>els[id]||null,
  head:{append(){}},querySelector(){return null},
  createElement:tag=>({...element(tag),className:'',append(){}}),
  addEventListener(name,fn){callbacks[name]=fn}
 };
 const window={maplibregl:{Map,Marker,LngLatBounds},AudioContext,
  requestAnimationFrame:fn=>fn(),addEventListener(name,fn){callbacks[name]=fn}};
 vm.runInNewContext(preview,{window,document,Promise,Number,Array,Math,Error,URL,console,setTimeout,clearTimeout});
 return {api:window.SHO_TAXI_RESULT_MAP_V1,els,callbacks,created,get starts(){return starts}};
}
test('One successful preview renders the actual road polyline and A/B markers with fitBounds',async()=>{
 const e=env();
 const points=[[19.032,47.545],[19.043,47.536],[19.08,47.481]];
 await e.api.show(async()=>({route:{type:'LineString',coordinates:points}}));
 assert.equal(e.els.txRouteMapSection.hidden,false);
 assert.equal(e.els.txRouteMapSection.dataset.state,'ready');
 assert.equal(e.created.maps.length,1);
 assert.equal(e.created.maps[0].options.attributionControl.compact,true,'source credits should stay accessible via compact info control');
 assert.equal(e.created.markers.length,2);
 assert.equal(e.created.markers[0].el.dataset.label,'A');
 assert.equal(e.created.markers[1].el.dataset.label,'B');
 assert.equal(e.created.layers.length,2);
 assert.equal(e.created.maps[0].sources['tx-route-line'].data.features[0].geometry.type,'LineString');
 assert.equal(e.created.maps[0].bounds.points.length,3);
 assert.equal(e.created.maps[0].boundsOptions.maxZoom,16);
});
test('Map error never removes the fare card, and Golden TADÁÁ sounds three notes only on explicit success trigger',async()=>{
 const e=env();
 await e.api.show(async()=>{throw Error('OSM offline')});
 assert.equal(e.els.txRouteMapSection.dataset.state,'error');
 assert.equal(e.els.txCost.hidden,true,'map module does not touch the fare visibility');
 e.callbacks.click({target:{closest:x=>x==='#txEstimate'}});
 e.api.tadaa();
 assert.equal(e.starts,3);
 e.api.cancel();
 assert.equal(e.els.txRouteMapSection.hidden,true);
});
