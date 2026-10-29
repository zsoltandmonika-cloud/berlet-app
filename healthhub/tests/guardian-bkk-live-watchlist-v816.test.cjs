'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../guardian/guardian-live-pilot-v793.js'),'utf8');
function setup(favorites,sessionToken='test-session-token'){
 const elements={};
 function elem(tag){
  return {tag,style:{},children:[],hidden:false,textContent:'',id:'',
   setAttribute(){},append(...c){this.children.push(...c)},prepend(...c){this.children.unshift(...c)},
   addEventListener(type,handler){this[type]=handler},scrollIntoView(){}};
 }
 const doc={hidden:false,getElementById(id){
  if(id==='hhTransitPanel')return elements.holder||(elements.holder=elem('section'));
  return elements[id]||null;
 },createElement:elem,addEventListener(){}};
 const events={},rendered=[],urls=[],snapshot={generatedAt:'2026-10-25T09:43:00Z'};
 let current=[...favorites];
 const vehicles=[{routeId:'260',id:'260-a',lat:47.5,lng:19,timestamp:snapshot.generatedAt},
  {routeId:'17',id:'17-a',lat:47.51,lng:19,timestamp:snapshot.generatedAt}];
 const win={location:{search:''},document:doc,
  HH_BKK_LIVE_V793:{validate(){return{ok:true,generatedAt:snapshot.generatedAt,vehicles}}},
  HH_BKK_LIVE_MAP_V793:{render(_map,x){rendered.push(x.vehicles.map(v=>v.routeId));return true},clear(){rendered.push([])},focus(){return true}},
  HH_GUARDIAN_V761:{map:{}},
  HH_GUARDIAN_LIVE_V785:{getClient(){return {auth:{getSession:async()=>({data:{session:sessionToken?{access_token:sessionToken}:null}})}}}},
  HH_CENTRAL_VAULT:{supabaseUrl:'https://example.supabase.co',publishableKey:'public-anon'},
  HH_GUARDIAN_TRANSIT_V790:{selected:[]},
  HH_BKK_CATALOG_V801:{get favoriteIds(){return current}},
  CustomEvent:class{constructor(type,x){this.type=type;this.detail=x.detail}},
  addEventListener(t,h){events[t]=h},dispatchEvent(){},
  setInterval(){return 1},clearInterval(){},
  fetch:async(url)=>{urls.push(url);return{ok:true,json:async()=>snapshot}}
 };
 vm.runInNewContext(source,{window:win,document:doc,URLSearchParams,Date,Set});
 return {events,rendered,urls,elements,setFavorites(next){current=[...next]}};
}
const flush=async()=>{await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r))};
test('v816 BKK live map follows favorite Watchlist, not hidden unchecked route selector',async()=>{
 const ui=setup(['bus:260']);
 await flush();
 assert.deepEqual(ui.rendered.at(-1),['260']);
 assert.match(ui.elements.holder.children[0].children[0].textContent,/1 friss/);
 ui.setFavorites(['tram:17']);ui.events['hh-bkk-watchlist-v814-changed']();
 await flush();assert.deepEqual(ui.rendered.at(-1),['17']);
 ui.setFavorites([]);ui.events['hh-bkk-watchlist-v814-changed']();
 await flush();assert.deepEqual(ui.rendered.at(-1),[]);
 assert.match(ui.elements.holder.children[0].children[0].textContent,/Nincs kijelölt/);
 assert.equal(ui.urls.length,3);
});
test('v949 unauthenticated Family Guard shows Google sign-in without requesting BKK data',async()=>{
 const ui=setup(['bus:260'],null);await flush();
 assert.equal(ui.urls.length,0,'Unauthenticated clients must not call the BKK API');
 assert.match(ui.elements.holder.children[0].children[0].textContent,/bejelentkezés gombra/);
 const button=ui.elements.holder.children[0].children[2];
 assert.equal(button.hidden,false);
 assert.match(button.textContent,/Family Live bejelentkezés/);
});
test('v816 live source retains verification and polling, no fabricated bus markers',()=>{
 assert.match(source,/validator\.validate\(data\)/);
 assert.match(source,/const wanted=new Set\(watchedLines\(\)\)/);
 assert.match(source,/hh-bkk-watchlist-v814-changed/);
 assert.match(source,/catalog\.favoriteIds/);
 assert.match(source,/active\.vehicles\.length/);
 assert.match(source,/getSession\(\)/);
 assert.match(source,/renderer\.render\(mapApi\.map,active\)/);
 assert.doesNotMatch(source,/fakeVehicles|Math\.random|sampleVehicles|navigator\.geolocation/);
});
