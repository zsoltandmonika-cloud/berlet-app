'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../guardian');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const now=()=>new Date().toISOString();
function boot(responder,active=true){
 const w={
  HH_GUARDIAN_NATIVE_V156:{
   connected(){return active},
   read(profile){return Promise.resolve(responder(profile))}
  }
 };
 vm.runInNewContext(read('guardian-gps-routes-v1177.js'),{window:w});
 vm.runInNewContext(read('guardian-gps-router-v1177.js'),{window:w});
 return w;
}
function fix(p){
 return {profile_key:p,source:'HH One Native GPS',latitude:p==='monika'?47.52693:47.49,
  longitude:p==='monika'?19.03802:19.02,accuracy_m:10,updated_at:now()};
}
test('only Zsolt GPS and Mónika GPS are official stable routes',()=>{
 const w=boot(p=>({status:'ok',data:fix(p)}));
 const z=w.HH_GUARDIAN_GPS_ROUTER_V1177.forProfile('zsolt');
 const m=w.HH_GUARDIAN_GPS_ROUTER_V1177.forProfile('monika');
 assert.equal(z.name,'Zsolt GPS');assert.equal(m.name,'Mónika GPS');
 assert.equal(z.id,'gps.zsolt');assert.equal(m.id,'gps.monika');
 assert.equal(z.targetAccount,'outlook');assert.equal(m.targetAccount,'outlook');
 assert.equal(z.activeReadAccount,'outlook');assert.equal(m.activeReadAccount,'outlook');
 assert.equal(w.HH_GUARDIAN_GPS_ROUTER_V1177.forProfile('route1'),null);
 assert.equal(w.HH_GUARDIAN_GPS_ROUTER_V1177.forProfile('unknown'),null);
});
test('profile-bound native output is tagged correctly and no other file is silently substituted',async()=>{
 const w=boot(p=>({status:'ok',data:fix(p)})),r=w.HH_GUARDIAN_GPS_ROUTER_V1177;
 const [m,z]=await Promise.all([r.read('monika'),r.read('zsolt')]);
 assert.equal(m.status,'ok');assert.equal(z.status,'ok');
 assert.equal(m.route_id,'gps.monika');assert.equal(z.route_id,'gps.zsolt');
 assert.equal(m.data.read_account,'outlook');assert.equal(z.data.read_account,'outlook');
 assert.equal(m.data.profile_key,'monika');assert.equal(z.data.profile_key,'zsolt');
});
test('crossed profile, forged source, unauthorized route and disconnected reader all fail closed',async()=>{
 const cross=boot(_=>({status:'ok',data:fix('zsolt')}));
 assert.equal((await cross.HH_GUARDIAN_GPS_ROUTER_V1177.read('monika')).status,'invalid');
 const fake=boot(p=>({status:'ok',data:{...fix(p),source:'Family Live'}}));
 assert.equal((await fake.HH_GUARDIAN_GPS_ROUTER_V1177.read('monika')).status,'invalid');
 const offline=boot(p=>({status:'ok',data:fix(p)}),false);
 assert.equal((await offline.HH_GUARDIAN_GPS_ROUTER_V1177.read('monika')).status,'not-connected');
 assert.equal((await cross.HH_GUARDIAN_GPS_ROUTER_V1177.read('other')).status,'route-unconfigured');
});
test('both map and peer viewer and GPS status tile bypass Supabase GPS coordinates',()=>{
 const follow=read('guardian-profile-follow-v837.js'),
  peer=read('guardian-live-v785.js'),trio=read('guardian-live-trio-v845.js'),own=read('guardian.js'),html=read('index.html');
 assert.match(follow,/const relay=w\.HH_GUARDIAN_GPS_ROUTER_V1177/);
 assert.match(peer,/const relay=w\.HH_GUARDIAN_GPS_ROUTER_V1177/);
 assert.match(trio,/const router=w\.HH_GUARDIAN_GPS_ROUTER_V1177/);
 assert.match(follow,/const dbRead=Promise\.resolve\(\{data:null,error:null\}\)/);
 assert.doesNotMatch(follow,/l\.readSharedLocation\(|client\.from\('hh_guardian_live_locations'\)/);
 assert.doesNotMatch(trio,/live\.readSharedLocation\(|client\.from\('hh_guardian_live_locations'\)/);
 assert.doesNotMatch(peer,/await readSharedLocation\(k\)/);
 assert.match(peer,/const selected=nativeFix&&peerSnapshot\(nativeFix\)\?\.live\?nativeFix:null/);
 assert.match(own,/!w\.HH_GUARDIAN_GPS_ROUTER_V1177/);
 assert.match(html,/guardian-gps-routes-v1177\.js/);
 assert.match(html,/guardian-gps-router-v1177\.js/);
 const idx=html.indexOf('guardian-gps-routes-v1177.js'),
  core=html.indexOf('guardian-native-dropbox-v156.js'),router=html.indexOf('guardian-gps-router-v1177.js'),
  map=html.indexOf('guardian-profile-follow-v837.js');
 assert.ok(idx>=0&&idx<core&&core<router&&router<map);
 assert.doesNotMatch(read('guardian-gps-router-v1177.js'),/geolocation|\.upsert\(|files\/upload|auth\.signOut/);
});
test('runtime ignores live wrong-home Supabase record when native Monika fix is present',async()=>{
 let supabaseReads=0;const moves=[],els={};
 const el=()=>({hidden:false,textContent:'',className:'',dataset:{},
  setAttribute(){},removeAttribute(){},append(){},appendChild(){},addEventListener(){}});
 const d={hidden:false,readyState:'loading',addEventListener(){},
  getElementById(k){return els[k]||(els[k]=el())},createElement:el};
 const w={document:d,localStorage:{getItem(k){return k==='hh-profile'?'m':null}},
  HH_GOLDEN_AVATARS_V529:{m:'m',z:'z'},
  HH_GUARDIAN_V761:{map:{getZoom(){return 15},easeTo(x){moves.push(x.center)}},
   lastGpsFixAt:Date.now(),getLocationSettings(){return{follow_map:true}},setRemoteMarkerPreferred(){}},
  HH_GUARDIAN_LIVE_V785:{authenticated:true,familyAuthorized:true,boundProfile:'zsolt',
   getClient(){supabaseReads++;return{}},
   readSharedLocation(){supabaseReads++;return{data:{...fix('monika'),source:'Family Live',latitude:47.49},error:null}}},
  maplibregl:{Marker:class{setLngLat(){return this}addTo(){return this}remove(){}}},
  addEventListener(){},setTimeout(fn){fn()},setInterval(){}
 };
 const original={connected(){return true},read:p=>Promise.resolve({status:'ok',data:fix(p)})};
 w.HH_GUARDIAN_NATIVE_V156=original;
 vm.runInNewContext(read('guardian-gps-routes-v1177.js'),{window:w});
 vm.runInNewContext(read('guardian-gps-router-v1177.js'),{window:w});
 vm.runInNewContext(read('guardian-profile-follow-v837.js'),{window:w,Date,Math,Number,Promise,Object});
 const control=w.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 for(let i=0;i<40;i++)await Promise.resolve();
 assert.equal(control.ready,true);
 assert.equal(supabaseReads,0,'No Supabase location call even if home record is fresh');
 assert.ok(moves.length>0,'Office native GPS drives map camera');
 assert.deepEqual(Array.from(moves.at(-1)),[19.03802,47.52693]);
});
