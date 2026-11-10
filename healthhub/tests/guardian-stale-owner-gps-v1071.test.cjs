'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=name=>fs.readFileSync(path.join(__dirname,'../guardian',name),'utf8');

test('v1071 viewer device cannot recenter another selected family profile using its own GPS',()=>{
 const el={},store={'hh-profile':'m'},listeners={};let watches=0;
 const d={hidden:false,documentElement:{dataset:{}},
  createElement(){return {className:'',setAttribute(){},append(){},appendChild(){}}},
  getElementById(k){return el[k]||(el[k]={textContent:'',hidden:false,disabled:false,
   classList:{toggle(){}},setAttribute(n,v){this[n]=v},getAttribute(){return null},
   addEventListener(n,fn){this[n]=fn}})},
  addEventListener(n,fn){listeners[n]=fn}};
 const live={authenticated:true,boundProfile:'zsolt',onGpsStopped(){}};
 const w={document:d,isSecureContext:true,HH_GUARDIAN_LIVE_V785:live,
  navigator:{geolocation:{watchPosition(){return ++watches},clearWatch(){}}},
  localStorage:{getItem(k){return store[k]||null},setItem(k,v){store[k]=v}},
  HH_GOLDEN_AVATARS_V529:{m:'m',z:'z'},addEventListener(){},console:{warn(){}}};
 vm.runInNewContext(src('guardian.js'),{window:w,document:d,Date,Math,Number,String,Set});
 el.guardianStart.click();
 assert.equal(watches,0,'Mónika profile may not use Zsolt device GPS');
 assert.equal(w.HH_GUARDIAN_V761.active,false);
 assert.match(el.guardianStatus.textContent,/Zsolt profilhoz/);
 store['hh-profile']='z';
 el.guardianStart.click();
 assert.equal(watches,1,'bound owner can still start GPS explicitly');
 assert.equal(w.HH_GUARDIAN_V761.active,true);
 el.guardianStop.click();
 live.boundProfile=null;store['hh-profile']='m';
 el.guardianStart.click();
 assert.equal(watches,1,'authenticated unbound viewer cannot impersonate Mónika GPS');
 assert.match(el.guardianStatus.textContent,/Nincs saját telefon hozzárendelve/);
});

test('v1173 stale or fresh unverified Monika browser GPS cannot force camera home',async()=>{
 const el={},camera=[],markers=[],events={};
 let db={profile_key:'monika',latitude:47.55,longitude:19.035,
  accuracy_m:10,updated_at:new Date(Date.now()-25*60*1000).toISOString(),source:'Family Live'};
 const d={readyState:'loading',hidden:false,
  getElementById(k){return el[k]||(el[k]={textContent:'',hidden:false,addEventListener(){}})},
  addEventListener(k,fn){events['d:'+k]=fn},
  createElement(){return {setAttribute(){},append(){},appendChild(){},addEventListener(){},removeAttribute(){}}}};
 const w={document:d,localStorage:{getItem(k){return k==='hh-profile'?'m':null}},
  HH_GUARDIAN_V761:{map:{getZoom(){return 15},easeTo(v){camera.push(v)}},active:false,lastGpsFixAt:0,
   getLocationSettings(){return {follow_map:true}},setRemoteMarkerPreferred(){}},
  HH_GUARDIAN_LIVE_V785:{authenticated:true,familyAuthorized:true,boundProfile:'monika',
   getClient(){return{}},readSharedLocation(){return Promise.resolve({data:db,error:null})}},
  HH_GUARDIAN_NATIVE_V156:{connected(){return false}},
  HH_GOLDEN_AVATARS_V529:{m:'m',z:'z'},
  maplibregl:{Marker:class{setLngLat(v){markers.push(v);return this}addTo(){return this}remove(){}}},
  addEventListener(k,fn){events[k]=fn},setInterval(){},setTimeout(fn){fn()}};
 vm.runInNewContext(src('guardian-profile-follow-v837.js'),{window:w,Date,Number,Math,Promise,Object});
 const controller=w.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 for(let i=0;i<20;i++)await Promise.resolve();
 assert.match(el.guardianMeState.textContent,/nincs friss, telefonhoz kötött natív GPS-jel.*NEM ÉLŐ/);
 assert.match(el.guardianMapLabel.textContent,/NEM ÉLŐ/);
 assert.equal(camera.length,0,'expired fix must not move camera');
 assert.equal(markers.length,0,'expired fix must not paint live portrait');
 db={...db,updated_at:new Date().toISOString()};
 await controller.refresh();
 assert.match(el.guardianMeState.textContent,/nincs friss, telefonhoz kötött natív GPS-jel.*NEM ÉLŐ/);
 assert.equal(camera.length,0,'even a fresh browser-only Monika fix must not drive the remote camera');
 assert.equal(markers.length,0,'physical-phone proof is required before showing Monika live');
});
