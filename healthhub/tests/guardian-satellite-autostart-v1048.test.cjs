'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const script=fs.readFileSync(path.join(__dirname,'../guardian/guardian-satellite-v1033.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../guardian/index.html'),'utf8');

const KEY='hh-maptiler-browser-key-device-v1035';
const PREF='hh-maptiler-satellite-auto-v1048';
const SOURCE='hh-guardian-satellite-tiles-v1033';
const LAYER='hh-guardian-satellite-raster-v1033';
const TILES='https://api.maptiler.com/tiles/satellite-v2/tiles.json';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function storage(data={}){
 return {data,getItem(k){return Object.prototype.hasOwnProperty.call(data,k)?data[k]:null},
  setItem(k,v){data[k]=String(v)},removeItem(k){delete data[k]}};
}
function run({device=storage(),session=storage(),loaded=true,failed=false}={}){
 let network=0,dialogs=0,visible=false;
 const handlers={};
 const card={dataset:{}};
 const events={};
 const sources={};
 const layers={'guardian-buildings-3d':{id:'guardian-buildings-3d'}};
 const map={
  isStyleLoaded(){return loaded},
  once(t,fn){events[t]=fn},
  getSource(k){return sources[k]||null},
  addSource(k,v){sources[k]=v},
  getLayer(k){return layers[k]||null},
  addLayer(v,before){layers[v.id]={...v,before}},
  setLayoutProperty(k,p,v){if(!layers[k])throw Error('Missing map layer');layers[k].layout??={};layers[k].layout[p]=v},
  getStyle(){return {layers:[{id:'guardian-buildings-3d',type:'fill-extrusion'}]}},
  load(){loaded=true;events.load?.();delete events.load}
 };
 const nodes=new Map();
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const n={id,attrs:{},dataset:{},hidden:false,disabled:false,open:false,value:'',title:'',
   checked:true,addEventListener(t,fn){this['on'+t]=fn},
   setAttribute(k,v){this.attrs[k]=String(v)},
   getAttribute(k){return this.attrs[k]??null},
   removeAttribute(k){delete this.attrs[k]},
   closest(){return card},
   click(){this.onclick?.({preventDefault(){}})},
   showModal(){this.open=true;dialogs++},
   close(){this.open=false},
   get src(){return this.attrs.src||''},
   set src(v){this.attrs.src=v}
  };
  if(id==='guardianSatelliteLogoImgV1033')n.dataset.src='https://api.maptiler.com/resources/logo.svg';
  nodes.set(id,n);return n;
 }
 const w={HH_GUARDIAN_V761:{map},localStorage:device,sessionStorage:session,
  addEventListener(t,cb){handlers[t]=cb},
  async fetch(url){
   network++;
   assert.ok(url.startsWith(TILES+'?key='));
   return failed?{ok:false,status:403}:{ok:true,json:async()=>({tiles:['https://tiles.example/only-metadata']})};
  }
 };
 const d={hidden:false,getElementById:node,addEventListener(t,cb){handlers[t]=cb}};
 vm.runInNewContext(script,{window:w,document:d,Date,Math,JSON,Number,String,Promise,Error,encodeURIComponent,URLSearchParams});
 return {map,card,sources,layers,device,session,nodes,handlers,
  get network(){return network},get dialogs(){return dialogs},
  button:node('guardianSatelliteV1033'),dialog:node('guardianSatelliteConfigV1033')};
}

test('startup with a previously saved key automatically overlays satellite under 3D buildings',async()=>{
 const x=run({device:storage({[KEY]:'ValidSavedKey_12345'})});
 await flush();
 assert.equal(x.network,1,'only one TileJSON validation');
 assert.equal(x.button.getAttribute('aria-pressed'),'true');
 assert.equal(x.card.dataset.hhSatellite,'on');
 assert.equal(x.dialogs,0,'no startup modal');
 assert.equal(x.layers[LAYER].before,'guardian-buildings-3d');
 assert.equal(x.layers[LAYER].layout.visibility,'visible');
 assert.ok(x.layers['guardian-buildings-3d'],'the existing 3D extrusion is never replaced');
 assert.equal(x.sources[SOURCE].type,'raster');
});
test('without an existing key the normal 3D map stays untouched and no request is made',async()=>{
 const x=run();await flush();
 assert.equal(x.network,0);assert.equal(x.button.getAttribute('aria-pressed'),'false');
 assert.equal(x.layers[LAYER],undefined);assert.equal(x.dialogs,0);
});
test('explicitly disabled autostart respects the family member until manually enabled',async()=>{
 const device=storage({[KEY]:'ValidSavedKey_12345',[PREF]:'off'});
 const x=run({device});await flush();assert.equal(x.network,0);
 x.button.click();await flush();
 assert.equal(x.network,1);assert.equal(device.getItem(PREF),'on');
 assert.equal(x.card.dataset.hhSatellite,'on');
});
test('manual off is remembered and a fresh opening remains ordinary 3D',async()=>{
 const device=storage({[KEY]:'ValidSavedKey_12345'});
 const a=run({device});await flush();
 a.button.click();
 assert.equal(a.card.dataset.hhSatellite,'off');
 assert.equal(a.layers[LAYER].layout.visibility,'none');
 assert.equal(device.getItem(PREF),'off');
 const b=run({device});await flush();
 assert.equal(b.network,0);assert.equal(b.layers[LAYER],undefined);
});
test('MapTiler rejection keeps 3D available; startup never raises an intrusive modal',async()=>{
 const x=run({device:storage({[KEY]:'InvalidSavedKey_12345'}),failed:true});
 await flush();
 assert.equal(x.button.getAttribute('aria-pressed'),'false');
 assert.equal(x.card.dataset.hhSatellite,'off');
 assert.equal(x.layers[LAYER],undefined);
 assert.equal(x.dialogs,0);
 assert.match(x.button.title,/Műhold nem érhető el/);
 x.button.click();await flush();
 assert.equal(x.dialogs,1,'manual tap can display the actionable error');
});
test('auto-enable waits for MapLibre style load, no polling or premature network fetch',async()=>{
 const x=run({device:storage({[KEY]:'ValidSavedKey_12345'}),loaded:false});
 await flush();assert.equal(x.network,0);
 x.map.load();await flush();
 assert.equal(x.network,1);assert.equal(x.card.dataset.hhSatellite,'on');
 assert.equal(x.dialogs,0);
});
test('only a structurally valid saved key can autostart satellite',async()=>{
 const x=run({device:storage({[KEY]:'bad'})});await flush();
 assert.equal(x.network,0);assert.equal(x.dialogs,0);
});
test('satellite remains an optional UI-only overlay; no GPS, interval or new consent path',()=>{
 assert.match(html,/guardian-satellite-v1033\.js\?v=1048-auto-3d-satellite/);
 assert.match(script,/autoEnable\(\)/);
 assert.match(script,/hh-guardian-map-ready-v839/);
 assert.match(script,/autoDisabled\(\)/);
 assert.doesNotMatch(script,/navigator\.geolocation|watchPosition|setInterval\(|setTimeout\(|map\.setStyle\s*\(/);
});
