'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'../guardian',file),'utf8');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
function node(){
 const classes=new Set();
 return {children:[],className:'',textContent:'',hidden:false,dataset:{},
  classList:{add(x){classes.add(x)},remove(x){classes.delete(x)},
   contains(x){return classes.has(x)},toggle(x,v){if(v)classes.add(x);else classes.delete(x)}},
  addEventListener(){},append(){},appendChild(){},setAttribute(k,v){this[k]=v},removeAttribute(){}};
}
class Marker{
 constructor({element}){this.element=element;this.removed=false;Marker.all.push(this)}
 setLngLat(point){this.point=point;return this}
 addTo(){return this}
 remove(){this.removed=true}
 getElement(){return this.element}
}
Marker.all=[];
function selectedHarness(profile){
 Marker.all=[];const listeners={},ui={},state={status:'ok'},time=Date.now();
 const fix=()=>({profile_key:profile,latitude:47.55,longitude:19.035,
  accuracy_m:12,updated_at:new Date(time-1500).toISOString(),
  speed_kmh:0,source:'HH One Native GPS'});
 const doc={readyState:'complete',hidden:false,createElement:node,
  getElementById(k){return ui[k]||(ui[k]=node())},
  addEventListener(k,cb){listeners['doc:'+k]=cb}};
 const map={getZoom(){return 15},easeTo(){}};
 const win={document:doc,
  localStorage:{getItem(k){return k==='hh-profile'?(profile==='monika'?'m':'z'):null}},
  navigator:{userAgent:'Windows'},
  HH_GOLDEN_AVATARS_V529:{m:'m',z:'z'},
  HH_GUARDIAN_V761:{map,lastGpsFixAt:0,getLocationSettings(){return{follow_map:true}},
   setRemoteMarkerPreferred(){}},
  HH_GUARDIAN_LIVE_V785:{boundProfile:profile,authenticated:true,familyAuthorized:true},
  HH_GUARDIAN_GPS_ROUTER_V1177:{connected(){return true},async read(){
   if(state.status==='ok')return{status:'ok',data:fix()};
   if(state.status==='old')return{status:'ok',data:{...fix(),
    updated_at:new Date(time-90000).toISOString()}};
   return{status:state.status,data:null};
  }},
  maplibregl:{Marker},setInterval(){return 1},
  setTimeout(fn){fn();return 1},addEventListener(k,fn){listeners[k]=fn}};
 new Function('window',read('guardian-profile-follow-v837.js'))(win);
 const controller=win.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 return {controller,state,ui,markers:Marker.all};
}
for(const profile of ['monika','zsolt']){
 test('v1181 selected portrait '+profile+' survives transient errors, stale reads, recovers and respects revocation',async()=>{
  const h=selectedHarness(profile);await settle();await h.controller.refresh();await settle();
  assert.equal(h.markers.length,1);const m=h.markers[0];
  assert.equal(m.removed,false);
  h.state.status='error';await h.controller.refresh();await settle();
  assert.equal(m.removed,false);
  assert.equal(m.element.classList.contains('guardian-selected-stale-v1181'),true);
  assert.match(h.ui.guardianMeState.textContent,/NEM ÉLŐ/);
  h.state.status='old';await h.controller.refresh();await settle();
  assert.equal(m.removed,false);
  h.state.status='ok';await h.controller.refresh();await settle();
  assert.equal(m.element.classList.contains('guardian-selected-stale-v1181'),false);
  h.state.status='revoked';await h.controller.refresh();await settle();
  assert.equal(m.removed,true,'Explicit revoke must clear previous portrait');
 });
}
function peerHarness(localProfile){
 Marker.all=[];const remote=localProfile==='monika'?'zsolt':'monika';
 const store={'hh-profile':localProfile==='monika'?'m':'z'};
 const ui={},callbacks=[],state={status:'ok'},time=Date.now();
 const fix=()=>({profile_key:remote,latitude:47.53,longitude:19.04,
  accuracy_m:12,speed_kmh:null,updated_at:new Date(time-2000).toISOString(),
  source:'HH One Native GPS'});
 const doc={hidden:false,getElementById(k){return ui[k]||(ui[k]=node())},
  createElement:node,addEventListener(){}};
 const api={auth:{async getUser(){return{data:{user:{id:'family'}},error:null}},
  onAuthStateChange(){}},from(){return{select(){return this},eq(){return this},
  in(){return Promise.resolve({data:[{profile_key:'zsolt'},{profile_key:'monika'}],error:null})},
  maybeSingle(){return Promise.resolve({data:null,error:null})}}}};
 const win={HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://test.invalid',
   publishableKey:'pub'},supabase:{createClient(){return api}},
  localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v},
   removeItem(k){delete store[k]}},
  navigator:{userAgent:'Windows'},location:{origin:'https://test.invalid',pathname:'/guardian'},
  HH_GOLDEN_AVATARS_V529:{m:'m',z:'z'},maplibregl:{Marker},
  HH_GUARDIAN_GPS_ROUTER_V1177:{connected(){return true},async read(k){
   assert.equal(k,remote);
   return state.status==='ok'?{status:'ok',data:fix()}:{status:state.status,data:null};
  }},
  setTimeout(fn){fn();return 1},setInterval(fn){callbacks.push(fn);return callbacks.length},
  clearInterval(){},addEventListener(){}};
 new Function('window','document',read('guardian-live-v785.js'))(win,doc);
 win.HH_GUARDIAN_LIVE_V785.mountMap({getZoom(){return 15},easeTo(){}});
 return {state,ui,callbacks,markers:Marker.all};
}
for(const viewer of ['monika','zsolt']){
 test('v1181 peer '+viewer+' survives temporary Dropbox outage but not revoked sharing',async()=>{
  const h=peerHarness(viewer);await settle();
  assert.equal(h.markers.length,1);
  const m=h.markers[0];assert.equal(m.removed,false);
  h.state.status='error';h.callbacks.at(-1)();await settle();
  assert.equal(m.removed,false);
  assert.equal(m.element.classList.contains('guardian-peer-stale-v807'),true);
  assert.match(h.ui.guardianOtherState.textContent,/NEM ÉLŐ/);
  h.state.status='ok';h.callbacks.at(-1)();await settle();
  assert.equal(m.element.classList.contains('guardian-peer-stale-v807'),false);
  h.state.status='revoked';h.callbacks.at(-1)();await settle();
  assert.equal(m.removed,true);
 });
}
test('v1181 GPS stability does not modify OTA, owner registry, Dropbox OAuth or sensors',()=>{
 const files=['guardian-live-v785.js','guardian-profile-follow-v837.js'];
 for(const file of files){
  const text=read(file);
  assert.doesNotMatch(text,/HH_DROPBOX_VAULT\\.disconnect|device_owner_profile\\s*=|navigator\\.geolocation/);
 }
 const html=read('index.html');
 assert.match(html,/guardian-live-v785\\.js\\?v=1181-stable-peers/);
 assert.match(html,/guardian-profile-follow-v837\\.js\\?v=1181-stable-selected/);
 assert.match(html,/guardian-profile-follow-v837\\.css\\?v=1181-stale-portrait-label/);
});
