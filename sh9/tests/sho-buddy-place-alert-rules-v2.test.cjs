'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const code=read('healthhub/guardian/guardian-place-alert-rules-v2.js');
function boot(){
 const saved=new Map(),handlers={},writes=[];
 const cloud={from:(table)=>({upsert:async row=>{writes.push({table,row});return {error:null}},select:()=>({limit:async()=>({data:[],error:null})})}),auth:{getUser:async()=>({data:{user:{id:'test'}},error:null})}};
 const slots=Array.from({length:40},()=>({place:null}));
 slots[2]={label:'Otthon',place:{name:'Otthon',lat:47.5,lng:19.01,subtitle:''}};
 const w={localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},document:{readyState:'loading',hidden:false,addEventListener:()=>{}},
  HH_GUARDIAN_LIVE_V785:{getClient:()=>cloud},HH_TRAVEL_FAVORITES_V972:{getSlots:()=>slots},
  addEventListener:(n,fn)=>handlers[n]=fn,dispatchEvent:()=>true,CustomEvent:class{constructor(n){this.type=n}}};
 vm.runInNewContext(code,{window:w,Date,Math,Number,JSON,Error});
 return {api:w.SHO_BUDDY_PLACE_RULES_V2,w,writes,slots,saved};
}
const base={slot_index:2,profile_key:'monika',place_lat:47.5,place_lng:19.01,arrival_enabled:true,departure_enabled:false,
radius_m:150,arrival_sound:'chime',departure_sound:'bell'};
test('rules normalize only finite valid family-owned geofence controls',()=>{
 const {api}=boot();
 assert.equal(api.normalize(base).profile_key,'monika');
 assert.equal(api.normalize({...base,profile_key:'unknown'}),null);
 assert.equal(api.normalize({...base,slot_index:40}),null);
 assert.equal(api.normalize({...base,arrival_sound:'<script>'}),null);
 assert.equal(api.normalize({...base,radius_m:999}),null);
});
test('upsert keeps separate person and slot; rejects stale coordinates and invalid places',async()=>{
 const {api,writes,slots}=boot();
 const saved=await api.save(base);
 assert.equal(saved.arrival_enabled,true);
 assert.equal(writes.length,1);
 assert.equal(writes[0].table,'hh_guardian_place_alert_rules_v2');
 assert.equal(api.forPlace(2,'monika',47.5,19.01).departure_enabled,false);
 assert.equal(api.forPlace(2,'zsolt',47.5,19.01),null);
 assert.equal(api.forPlace(2,'monika',47.51,19.01),null);
 slots[2].place.lat=48.2;
 await assert.rejects(()=>api.save(base),/megváltozott/);
});
test('front end includes local opt-in, independent arrival/departure and reuses existing GPS',()=>{
 const h=read('sh9/notification-center/index.html');
 const g=read('healthhub/guardian/index.html');
 const nc=read('sh9/notification-center/notification-place-alerts-v2.js');
 const fg=read('healthhub/guardian/guardian-smart-places-v1068.js');
 const rule=read('healthhub/guardian/guardian-place-alert-rules-v2.js');
 assert.match(h,/id="ncPlaceListV2"/);
 assert.match(h,/id="ncPlaceLocalV2"/);
 assert.match(h,/notification-place-alerts-v2\.js/);
 assert.match(g,/guardian-place-alert-rules-v2\.js/);
 assert.ok(g.indexOf('guardian-place-alert-rules-v2.js')<g.indexOf('guardian-smart-places-v1068.js'));
 assert.match(nc,/data-rule-field="arrival_enabled"/);
 assert.match(nc,/data-rule-field="departure_enabled"/);
 assert.match(fg,/arrivalEnabled===false/);
 assert.match(fg,/departureEnabled===false/);
 assert.doesNotMatch(rule,/watchPosition|getCurrentPosition|setInterval\(/);
});
