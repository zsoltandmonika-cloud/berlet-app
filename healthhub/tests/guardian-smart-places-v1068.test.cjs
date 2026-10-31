'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const js=read('guardian/guardian-smart-places-v1068.js');
const css=read('guardian/guardian-smart-places-v1068.css');
const html=read('guardian/index.html');
const follow=read('guardian/guardian-profile-follow-v837.js');
const smartTrip=read('../sh9/smart-travel/public-transport/smart-trip/smart-trip-ai-v1022.js');
const tripHtml=read('../sh9/smart-travel/public-transport/smart-trip/index.html');
function setup({authorized=true,fresh=true}={}){
 const byId={},handlers={},events={},slots=Array.from({length:40},()=>({label:'Szabad',place:null})),calls=[];
 function element(id){
  return byId[id]??(byId[id]={id,hidden:false,textContent:'',value:'',checked:false,disabled:false,
   children:[],className:'',attributes:{},appendChild(x){this.children.push(x);x.parent=this},
   setAttribute(k,v){this.attributes[k]=v},addEventListener(e,fn){handlers[id+':'+e]=fn},
   querySelector(selector){const cls=selector.replace('.','');for(const child of this.children){if(child.className===cls)return child;const nested=child.querySelector?.(selector);if(nested)return nested}return null},
   showModal(){this.open=true},close(){this.open=false}});
 }
 ['guardianSmartPlaceDialogV1068','guardianSmartPlaceNameV1068','guardianSmartPlaceRadiusV1068',
  'guardianSmartPlaceArrivalV1068','guardianSmartPlaceDepartureV1068','guardianSmartPlaceSaveV1068',
  'guardianSmartPlaceDeleteV1068','guardianSmartPlaceCloseV1068','guardianSmartPlaceStatusV1068',
  'guardianSmartPlaceSoundV1068','guardianSmartPlaceToastV1068'].forEach(element);
 const label=element('portraitLabel');label.className='guardian-position-label';
 const marker=element('portraitMarker');marker.appendChild(label);

 const d={hidden:false,getElementById:id=>byId[id]||null,createElement:tag=>element('auto-'+Object.keys(byId).length),addEventListener:(e,fn)=>events[e]=fn};
 const store=new Map();
 const pool={getSlots:()=>JSON.parse(JSON.stringify(slots)),setSlots:newSlots=>{
  slots.splice(0,40,...JSON.parse(JSON.stringify(newSlots)));calls.push('setSlots');return true;
 },async sync(){calls.push('sync');return true}};
 const w={localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},addEventListener:(e,fn)=>events[e]=fn,
  setTimeout:()=>1,clearTimeout(){},HH_TRAVEL_FAVORITES_V972:pool,
  HH_GUARDIAN_LIVE_V785:{authenticated:authorized,familyAuthorized:authorized,getClient:()=>authorized?{}:null},
  CustomEvent:class{constructor(name){this.type=name}}};
 vm.runInNewContext(js,{window:w,document:d,Number,Date,Math,Array,String,JSON,Set,Map,Error,Intl});
 const api=w.HH_GUARDIAN_SMART_PLACES_V1068;
 const fix={profile:'monika',lat:47.50,lng:19.05,accuracy:12,ts:Date.now()-(fresh?3000:120000),source:'HH One Native GPS'};
 return {byId,handlers,events,slots,calls,marker,api,fix,w,d,async settle(){
  for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));
 }};
}
test('location and selected profile come ONLY from existing verified portrait, never new browser GPS or APIs',()=>{
 assert.match(follow,/HH_GUARDIAN_SMART_PLACES_V1068\?\.onFix\?\.\(fix,markerNode\)/);
 assert.match(follow,/HH_GUARDIAN_SMART_PLACES_V1068\?\.onFix\?\.\(null,null\)/);
 assert.match(js,/MAX_MS=75000,MAX_ACCURACY=100/);
 assert.doesNotMatch(js,/watchPosition|getCurrentPosition|navigator\.geolocation|fetch\(|setInterval\(|supabase\.from|files\/upload/);
});
test('one explicit tap adds one family slot, saves precise verified coordinates and prompts edit',async()=>{
 const x=setup();x.api.onFix(x.fix,x.marker);
 const btn=x.marker.querySelector('.hh-smart-place-save-v1068');
 assert.equal(btn.textContent,'📍 Rögzítés');
 x.handlers[btn.id+':click']({stopPropagation(){},preventDefault(){}});
 await x.settle();
 const used=x.slots.filter(s=>s.place);
 assert.equal(used.length,1);
 assert.equal(used[0].place.lat,47.50);
 assert.equal(used[0].place.lng,19.05);
 assert.match(used[0].place.subtitle,/Smart Places • monika • 150 m • chime • bell/);
 assert.equal(x.byId.guardianSmartPlaceDialogV1068.open,true);
 assert.match(x.byId.guardianSmartPlaceStatusV1068.textContent,/SYNC/);
 assert.equal(x.calls.filter(n=>n==='setSlots').length,1);
});
test('rename edit uses same synced favorite slot; no duplicate on same spot',async()=>{
 const x=setup();x.api.onFix(x.fix,x.marker);
 const btn=x.marker.querySelector('.hh-smart-place-save-v1068');
 x.handlers[btn.id+':click']({stopPropagation(){},preventDefault(){}});
 await x.settle();
 x.byId.guardianSmartPlaceNameV1068.value='Anyunál';
 x.byId.guardianSmartPlaceRadiusV1068.value='200';
 x.byId.guardianSmartPlaceArrivalV1068.value='digital';
 x.byId.guardianSmartPlaceDepartureV1068.value='silent';
 await x.handlers['guardianSmartPlaceSaveV1068:click']();await x.settle();
 assert.equal(x.slots.filter(s=>s.place).length,1);
 assert.equal(x.slots[0].label,'Anyunál');
 assert.equal(x.api.decode(x.slots[0].place.subtitle).radius,200);
 assert.equal(x.api.decode(x.slots[0].place.subtitle).departure,'silent');
 assert.match(x.marker.querySelector('.guardian-position-label').children[0].textContent,/Anyunál/);
});
test('invalid, stale, unauthorized positions cannot become family saved destinations',async()=>{
 for(const settings of [{fresh:false},{authorized:false}]){
  const x=setup(settings);x.api.onFix(x.fix,x.marker);
  assert.equal(x.marker.querySelector('.hh-smart-place-save-v1068'),null);
  assert.equal(x.slots.filter(s=>s.place).length,0);
 }
});
test('alias/name is directly discoverable in existing Smart Trip AI source',()=>{
 assert.match(smartTrip,/geo\?\.favoriteSuggestions\?\.\(w\.localStorage,q,12\)/);
 assert.match(smartTrip,/displayName\|\|x\.name/);
 assert.match(smartTrip,/lastSmartPlaceSync/);
 assert.match(smartTrip,/family\.sync\(true\)/);
 assert.match(tripHtml,/smart-trip-ai-v1022\.js\?v=1068-smart-places-synced-search/);
 assert.match(html,/guardian-smart-places-v1068\.js\?v=1068-family-sync-geofence/);
 assert.match(html,/guardian-profile-follow-v837\.js\?v=1068-smart-places-hook/);
 assert.match(html,/guardianSmartPlaceSoundV1068/);
 assert.match(css,/hh-smart-place-save-v1068/);
});
test('geofence requires 2 distinct observations, opt-in sound and stable hysteresis; no silent install/background fake push',()=>{
 assert.match(js,/fix\.ts-old\.candidateAt<8000/);
 assert.match(js,/p\.radius\+Math\.max\(40,fix\.accuracy\)/);
 assert.match(js,/if\(!enabled\|\|d\.hidden\)return/);
 assert.match(js,/Notification\?\.permission==='granted'/);
 assert.match(js,/HH_TRAVEL_FAVORITES_V972/);
 assert.doesNotMatch(js,/Notification\.requestPermission\(\).*setInterval|navigator\.serviceWorker|serviceWorker\.register/);
});
