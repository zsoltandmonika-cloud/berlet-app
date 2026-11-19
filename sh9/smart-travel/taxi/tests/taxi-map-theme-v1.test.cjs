'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const coordinator=fs.readFileSync(path.join(base,'taxi-map-theme-v1.js'),'utf8');
const gps=fs.readFileSync(path.join(base,'taxi-current-location-map-v1.js'),'utf8');
const preview=fs.readFileSync(path.join(base,'taxi-route-result-map-v1.js'),'utf8');
const fare=fs.readFileSync(path.join(base,'taxi-route-v8-fare-map.js'),'utf8');
const dark='https://tiles.openfreemap.org/styles/dark';
const light='https://tiles.openfreemap.org/styles/bright';
function mockCoordinator(saved=null){
 let buttons=[{
  id:'taxiCurrentMapTheme',setAttribute(k,v){this[k]=v}
 }];
 const items=new Map();
 if(saved)items.set('sho-taxi-map-theme-v1',saved);
 const events={},w={
  localStorage:{getItem:key=>items.get(key)||null,setItem:(key,value)=>items.set(key,value)},
  addEventListener(name,handler){events[name]=handler;}
 };
 const d={
  querySelectorAll(selector){assert.equal(selector,'[data-taxi-map-theme]');return buttons},
  addEventListener(name,fn){events[name]=fn;}
 };
 vm.runInNewContext(coordinator,{window:w,document:d,console,Set,String});
 return {api:w.SHO_TAXI_MAP_THEME_V1,buttons,items,events,addResultButton(){
  const button={id:'txRouteMapTheme',setAttribute(k,v){this[k]=v}};
  buttons.push(button);w.SHO_TAXI_MAP_THEME_V1.refreshButtons();
  return button;
 }};
}
test('Both map toggles have a shared dark default, light switch, accessible text and saved preference',()=>{
 const e=mockCoordinator();
 const route=e.addResultButton();
 assert.equal(e.api.getTheme(),'dark');
 assert.equal(e.api.style(),dark);
 assert.equal(e.buttons[0].textContent,'☀️');
 assert.equal(route.textContent,'☀️');
 const seen=[];
 e.api.subscribe(theme=>seen.push(theme));
 e.events.click({target:{closest:selector=>selector==='[data-taxi-map-theme]'?route:null}});
 assert.equal(e.api.getTheme(),'light');
 assert.equal(e.api.style(),light);
 assert.equal(e.buttons[0].textContent,'🌙');
 assert.equal(route.textContent,'🌙');
 assert.equal(e.buttons[0]['aria-label'],'Sötét térkép bekapcsolása');
 assert.equal(e.items.get('sho-taxi-map-theme-v1'),'light');
 assert.deepEqual(seen,['light']);
 e.events.click({target:{closest:selector=>selector==='[data-taxi-map-theme]'?e.buttons[0]:null}});
 assert.equal(e.api.getTheme(),'dark');
 assert.equal(e.api.style(),dark);
 assert.equal(route.textContent,'☀️');
 const restored=mockCoordinator('light');
 assert.equal(restored.api.getTheme(),'light');
 assert.equal(restored.api.style(),light);
});
test('Both live maps use exactly the same theme manager, keep their pin/route data, and do not alter fares',()=>{
 assert.match(index,/id="taxiCurrentMapTheme" data-taxi-map-theme/);
 assert.match(fare,/id="txRouteMapTheme" data-taxi-map-theme/);
 assert.ok(index.indexOf('taxi-map-theme-v1.js')<index.indexOf('taxi-route-v8-fare-map.js'));
 assert.ok(index.indexOf('taxi-map-theme-v1.js')<index.indexOf('taxi-route-result-map-v1.js'));
 assert.ok(index.indexOf('taxi-map-theme-v1.js')<index.indexOf('taxi-current-location-map-v1.js'));
 assert.match(gps,/w\.SHO_TAXI_MAP_THEME_V1\?\.subscribe\?\./);
 assert.match(preview,/w\.SHO_TAXI_MAP_THEME_V1\?\.subscribe\?\./);
 assert.match(gps,/map\.setStyle\(mapStyle\(\)\)/);
 assert.match(preview,/map\.setStyle\(mapStyle\(\)\)/);
 assert.match(preview,/map\.on\('style\.load'/);
 assert.match(preview,/draw\(lastCoords,false\)/);
 assert.match(preview,/if\(fit\)map\.fitBounds\(bounds/);
 assert.match(gps,/w\.navigator\.geolocation\.getCurrentPosition/);
 assert.match(preview,/map\.addLayer\(\{id:'tx-route-stroke'/);
 assert.match(fare,/const x=await request\(\{action:'estimate',from,to\}\)/);
 assert.match(fare,/id="txRouteMapStatus"/); // Dynamic contents are in the fare script.
 assert.doesNotMatch(coordinator,/latitude|longitude|location\.coords|setInterval|watchPosition/);
 assert.doesNotThrow(()=>new vm.Script(coordinator));
 assert.doesNotThrow(()=>new vm.Script(gps));
 assert.doesNotThrow(()=>new vm.Script(preview));
});
