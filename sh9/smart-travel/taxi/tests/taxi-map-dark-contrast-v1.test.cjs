'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const src=fs.readFileSync(path.join(base,'taxi-map-dark-contrast-v1.js'),'utf8');
const gps=fs.readFileSync(path.join(base,'taxi-current-location-map-v1.js'),'utf8');
const route=fs.readFileSync(path.join(base,'taxi-route-result-map-v1.js'),'utf8');
function mock(mode='dark'){
 const calls=[],events={},layers=new Set([
  'background','highway_path','highway_minor','highway_major_casing',
  'highway_major_inner','highway_major_subtle','highway_motorway_casing',
  'highway_motorway_inner','highway_motorway_subtle',
  'highway_name_other','highway_name_motorway','building',
  'place_suburb','place_city','tx-route-stroke','tx-route-halo'
 ]);
 const map={
  getLayer:id=>layers.has(id)?{id}:null,
  setPaintProperty:(id,key,value)=>calls.push({id,key,value}),
  on:(name,fn)=>{events[name]=fn;},
  isStyleLoaded:()=>true
 };
 const w={SHO_TAXI_MAP_THEME_V1:{getTheme:()=>mode}};
 vm.runInNewContext(src,{window:w,console,Object});
 return {api:w.SHO_TAXI_DARK_CONTRAST_V1,map,calls,events,setMode:v=>{mode=v}};
}
test('Dark-mode contrast specifically brightens street geometry and street-name lettering',()=>{
 const e=mock();
 const count=e.api.apply(e.map);
 assert.ok(count>=18,'Not enough road and label contrast properties applied');
 function read(id,key){return e.calls.find(x=>x.id===id&&x.key===key)?.value;}
 assert.equal(read('highway_minor','line-color'),'#4b586d');
 assert.equal(read('highway_major_inner','line-color'),'#61718a');
 assert.equal(read('highway_name_other','text-color'),'#d4dceb');
 assert.equal(read('highway_name_motorway','text-color'),'#d5dded');
 assert.equal(read('building','fill-outline-color'),'#3b4657');
 assert.equal(read('place_city','text-color'),'#c1cfe2');
 assert.ok(read('highway_name_other','text-halo-width')>=1);
 assert.equal(read('background','background-color'),undefined,'Dark canvas must remain black');
 assert.equal(read('tx-route-stroke','line-color'),undefined,'Cyan calculated route must be unchanged');
 assert.equal(read('tx-route-halo','line-color'),undefined,'Route halo must be unchanged');
});
test('Light map is completely untouched; contrast restores after dark style reload',()=>{
 const e=mock('light');
 e.api.bind(e.map);
 assert.equal(e.calls.length,0);
 e.events['style.load']();
 assert.equal(e.calls.length,0,'Light mode must retain the official bright style');
 e.setMode('dark');
 e.events['style.load']();
 assert.ok(e.calls.length>=18,'Road contrast must re-apply on dark style load');
 const changed=e.calls.length;
 e.setMode('light');
 e.events['style.load']();
 assert.equal(e.calls.length,changed,'Light mode must not gain dark overrides');
});
test('Both SHO maps use identical contrast helper, with GPS, routes, footer and themes preserved',()=>{
 assert.match(gps,/SHO_TAXI_DARK_CONTRAST_V1\?\.bind\?\.\(map\)/);
 assert.match(route,/SHO_TAXI_DARK_CONTRAST_V1\?\.bind\?\.\(map\)/);
 assert.match(index,/taxi-map-dark-contrast-v1\.js\?v=20261119-dark-road-legibility-v1/);
 assert.ok(index.indexOf('taxi-map-theme-v1.js')<index.indexOf('taxi-map-dark-contrast-v1.js'));
 assert.ok(index.indexOf('taxi-map-dark-contrast-v1.js')<index.indexOf('taxi-current-location-map-v1.js'));
 assert.ok(index.indexOf('taxi-map-dark-contrast-v1.js')<index.indexOf('taxi-route-result-map-v1.js'));
 assert.match(index,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(index,/data-action="close">Bezárás/);
 assert.match(index,/data-action="uber">Uber rendelés ↗/);
 assert.match(index,/taxi-route-v8-fare-map\.js/);
 assert.match(route,/map\.addLayer\(\{id:'tx-route-stroke'/);
 assert.match(gps,/getCurrentPosition\(/);
 assert.match(src,/if\(!map\|\|w\.SHO_TAXI_MAP_THEME_V1\?\.getTheme\?\.\(\)!=='dark'\)return 0/);
 assert.doesNotThrow(()=>new vm.Script(src));
});
