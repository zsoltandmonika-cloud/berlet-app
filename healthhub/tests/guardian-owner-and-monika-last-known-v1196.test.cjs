'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'../guardian',file),'utf8');
const settle=async()=>{for(let i=0;i<35;i++)await Promise.resolve()};
function element(){
 const classes=new Set();
 return {textContent:'',className:'',hidden:false,dataset:{},
  classList:{add(v){classes.add(v)},remove(v){classes.delete(v)},
   contains(v){return classes.has(v)},toggle(v,enabled){if(enabled)classes.add(v);else classes.delete(v)}},
  append(){},appendChild(){},removeAttribute(){},setAttribute(k,v){this[k]=v},
  addEventListener(){}};
}
function harness({selected='monika',bound='zsolt',status='ok',ageMs=7200000,
  nativeProfile=selected,ownFix=null}={}){
 const elements={},markers=[],moves=[],remotePreference=[];
 const d={hidden:false,readyState:'complete',createElement:element,
  addEventListener(){},getElementById(id){return elements[id]||(elements[id]=element())}};
 class Marker{
  constructor({element}){this.element=element;this.removed=false;markers.push(this)}
  setLngLat(v){this.coord=v;return this}
  addTo(){return this}
  remove(){this.removed=true}
 }
 const map={getZoom(){return 15},easeTo(v){moves.push(v)}};
 const w={document:d,navigator:{userAgent:'Android'},maplibregl:{Marker},
  localStorage:{getItem(k){return k==='hh-profile'?(selected==='monika'?'m':'z'):null}},
  HH_GOLDEN_AVATARS_V529:{m:'m',z:'z'},
  HH_GUARDIAN_V761:{map,active:!!ownFix,latestOwnBrowserFix:ownFix,
   getLocationSettings(){return {follow_map:true}},
   setRemoteMarkerPreferred(value){remotePreference.push(value)}},
  HH_GUARDIAN_LIVE_V785:{boundProfile:bound,authenticated:true,familyAuthorized:true},
  HH_GUARDIAN_GPS_ROUTER_V1177:{connected(){return true},async read(){
   if(status!=='ok')return{status,data:null};
   return{status:'ok',data:{profile_key:nativeProfile,
    source:'HH One Native GPS',latitude:47.5,longitude:19.04,
    accuracy_m:30,updated_at:new Date(Date.now()-ageMs).toISOString(),
    speed_kmh:null}};
  },forProfile(){return {activeReadAccount:'outlook',name:'Mónika GPS'}}},
  addEventListener(){},setInterval(){},setTimeout(cb){cb()}};
 new Function('window',read('guardian-profile-follow-v837.js'))(w);
 const ctrl=w.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 return {ctrl,markers,moves,elements,remotePreference,settle};
}
test('Mónika: 2h old consented native fix visible only as muted LAST KNOWN, never live or camera-followed',async()=>{
 const h=harness();await h.settle();
 assert.equal(h.markers.length,1);
 assert.equal(h.markers[0].removed,false);
 assert.equal(h.markers[0].element.classList.contains('guardian-selected-stale-v1181'),true);
 assert.deepEqual(h.markers[0].coord,[19.04,47.5]);
 assert.equal(h.moves.length,0,'do not auto-follow stale remote GPS');
 assert.equal(h.ctrl.ready,false,'stale native cannot be reported live');
 assert.match(h.elements.guardianMeState.textContent,/UTOLSÓ ISMERT HELY/);
 assert.match(h.elements.guardianMeState.textContent,/NEM ÉLŐ/);
 assert.match(h.elements.guardianNativeGpsMessageV1174.textContent,/NEM ÉLŐ/);
});
for(const [name,params] of [
 ['revoked owner consent',{status:'revoked'}],
 ['wrong profile',{nativeProfile:'zsolt'}],
 ['expired 13h fix',{ageMs:13*60*60*1000}],
 ['missing Outlook session',{status:'not-connected'}],
 ['failed Dropbox read',{status:'error'}]
]){
 test('Mónika: no native pin if '+name,async()=>{
  const h=harness(params);await h.settle();
  assert.equal(h.markers.length,0);
  assert.equal(h.ctrl.ready,false);
  assert.equal(h.moves.length,0);
 });
}
test('Zsolt: fresh own browser fix supersedes native read, never disappears under old native portrait',async()=>{
 const h=harness({selected:'zsolt',bound:'zsolt',ageMs:1000,
  ownFix:{timestamp:Date.now(),coords:{accuracy:6}}});
 await h.settle();
 assert.equal(h.markers.length,0,'do not draw a second overlapping native portrait');
 assert.equal(h.ctrl.onLocalGpsFix(),false);
 assert.equal(h.ctrl.ready,false);
 assert.ok(h.remotePreference.includes(false),'owner browser marker is never hidden by native viewer');
});
test('foreground auto-follow must start physical owner GPS even when native routes are configured',()=>{
 const js=read('guardian.js'),start=js.split('function startFollowing(){')[1].split('function toggle3D(){')[0];
 assert.match(start,/if\(!ownGpsBlockReason\(\)\)\{/);
 assert.match(start,/if\(!active\)\{start\(\);return\}/);
 assert.match(start,/HH_GUARDIAN_PROFILE_FOLLOW_V837\?\.requestFollow/);
 const own=js.split('function onPosition(pos){')[1].split('function tryNetworkFix(){')[0];
 assert.match(own,/w\.HH_GUARDIAN_LIVE_V785\.onGpsFix\(pos\)/);
 assert.doesNotMatch(start,/\.upsert\(|writeFile|enable\(context\)/);
});
