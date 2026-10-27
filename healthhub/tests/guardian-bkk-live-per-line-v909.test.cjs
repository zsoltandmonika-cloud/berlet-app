'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'../guardian');
const load=n=>fs.readFileSync(path.join(base,n),'utf8');
const filterSource=load('guardian-bkk-live-per-line-v909.js');
const pilotSource=load('guardian-live-pilot-v793.js');
const watchSource=load('guardian-bkk-watchlist-v814.js');
function harness(){
 const storage=new Map(),listeners={},rendered=[],calls=[];
 const elem=()=>({id:'',hidden:false,style:{},children:[],setAttribute(){},append(...xs){this.children.push(...xs)},prepend(...xs){this.children.unshift(...xs)},addEventListener(t,cb){this[t]=cb},scrollIntoView(){}});
 const panel=elem(),doc={hidden:false, getElementById(id){return id==='hhTransitPanel'?panel:null},createElement:elem,addEventListener(){}};
 let profile='zsolt',favorites=['bus:260','tram:17'];
 const snapshot={generatedAt:'2026-10-27T20:00:00Z',ok:true,vehicles:[
  {routeId:'260',id:'260-a',lat:47.5,lng:19,timestamp:'2026-10-27T20:00:00Z'},
  {routeId:'17',id:'17-a',lat:47.51,lng:19,timestamp:'2026-10-27T20:00:00Z'}]};
 const root={location:{search:''},localStorage:{getItem(k){return storage.get(k)||null},setItem(k,v){storage.set(k,v)}},
  CustomEvent:class {constructor(type,v){this.type=type;this.detail=v.detail}},
  addEventListener(t,h){(listeners[t]??=[]).push(h)},dispatchEvent(e){for(const h of listeners[e.type]||[])h(e)},
  HH_BKK_CATALOG_V801:{get activeProfile(){return profile},get favoriteIds(){return favorites}},
  HH_GUARDIAN_TRANSIT_V790:{selected:[]},
  HH_BKK_LIVE_V793:{validate(d){return{...d,ok:true}}},
  HH_BKK_LIVE_MAP_V793:{render(_m,d){rendered.push(d.vehicles.map(v=>v.routeId));return true},clear(){rendered.push([])},focus(){return true}},
  HH_GUARDIAN_V761:{map:{}},
  HH_GUARDIAN_LIVE_V785:{getClient:()=>({auth:{getSession:async()=>({data:{session:{access_token:'test-only'}}})}})},
  HH_CENTRAL_VAULT:{supabaseUrl:'https://example.invalid',publishableKey:'public-test'},
  setInterval(){return 1},clearInterval(){},
  fetch:async(url)=>{calls.push(url);return{ok:true,json:async()=>snapshot}}
 };
 vm.runInNewContext(filterSource,{window:root,document:doc,URLSearchParams,Date,Set});
 vm.runInNewContext(pilotSource,{window:root,document:doc,URLSearchParams,Date,Set});
 return {root,rendered,calls,storage,panel,setProfile(p){profile=p},setFavorites(f){favorites=f},
  globalButton(){return panel.children[0].children[1]}};
}
const flush=async()=>{await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r))};
test('v909: independent favorite live visibility, no extra network requests',async()=>{
 const x=harness(),f=x.root.HH_BKK_LIVE_PER_LINE_V909;
 await flush();
 assert.deepEqual(x.rendered.at(-1),['260','17']);
 assert.equal(x.calls.length,1);
 f.setEnabled('17',false,'zsolt');
 assert.deepEqual(x.rendered.at(-1),['260']);
 assert.equal(x.calls.length,1,'individual live toggle must redraw from cached snapshot');
 assert.equal(f.enabled('17','zsolt'),false);
 assert.equal(f.enabled('17','monika'),true,'profiles are isolated');
 f.setEnabled('17',true,'zsolt');
 assert.deepEqual(x.rendered.at(-1),['260','17']);
 assert.equal(x.calls.length,1);
});
test('v909: global LIVE master remains authoritative and route-line toggle independent',async()=>{
 const x=harness();await flush();
 const b=x.globalButton();b.click();
 assert.deepEqual(x.rendered.at(-1),[]);
 x.root.HH_BKK_LIVE_PER_LINE_V909.setEnabled('260',false,'zsolt');
 assert.deepEqual(x.rendered.at(-1),[],'per-line change cannot override global OFF');
 assert.equal(x.calls.length,1);
 b.click();assert.deepEqual(x.rendered.at(-1),['17'],'global ON respects route choice');
 assert.match(watchSource,/transit\.setLineVisible\(id,false\)/);
 assert.match(watchSource,/liveFilter\.setEnabled\(key,!liveFilter\.enabled\(key,profile\),profile\)/);
});
test('v909: cached profile-specific preferences do not mutate favorites',async()=>{
 const x=harness(),f=x.root.HH_BKK_LIVE_PER_LINE_V909;await flush();
 f.setEnabled('260',false,'zsolt');
 assert.ok(x.storage.has(f.KEY));
 assert.deepEqual([...x.root.HH_BKK_CATALOG_V801.favoriteIds],['bus:260','tram:17']);
 x.setProfile('monika');x.root.dispatchEvent(new x.root.CustomEvent('hh-bkk-watchlist-v814-changed',{detail:{}}));
 await flush();assert.deepEqual(x.rendered.at(-1),['260','17']);
 x.setProfile('zsolt');x.root.dispatchEvent(new x.root.CustomEvent('hh-bkk-watchlist-v814-changed',{detail:{}}));
 await flush();assert.deepEqual(x.rendered.at(-1),['17']);
 assert.equal(x.calls.length,3,'only profile/watchlist changes preserve preexisting fetch behavior');
 assert.equal(f.setEnabled('260',false,'invalid'),true);
 assert.equal(f.setEnabled('999',true,'zsolt'),false);
 const restoreRoot={localStorage:{getItem:k=>x.storage.get(k),setItem(){}}};
 vm.runInNewContext(filterSource,{window:restoreRoot,URLSearchParams,Set});
 assert.equal(restoreRoot.HH_BKK_LIVE_PER_LINE_V909.enabled('260','zsolt'),false);
 assert.equal(restoreRoot.HH_BKK_LIVE_PER_LINE_V909.enabled('260','monika'),true);
});
test('v909: no fabricated vehicle data and no extra remote GPS/API traffic',()=>{
 assert.match(pilotSource,/lastSourceSnapshot/);
 assert.match(pilotSource,/renderLiveFromSnapshot\(lastSourceSnapshot\)/);
 assert.doesNotMatch(filterSource,/fetch\(|geolocation|setInterval\(/);
 assert.match(watchSource,/hh-bkk-watch-live-v909/);
});
