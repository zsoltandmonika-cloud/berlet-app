'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.join(__dirname,'../guardian');
const read=n=>fs.readFileSync(path.join(base,n),'utf8');
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
function harness(nativeReply){
 const widgets={},moves=[],positions=[],removes=[],store={'hh-profile':'m'};
 const make=()=>({textContent:'',hidden:false,className:'',dataset:{},
  append(){},appendChild(){},removeAttribute(){},addEventListener(){},
  setAttribute(){},getAttribute(){}});
 const d={hidden:false,readyState:'loading',addEventListener(){},
  getElementById(id){return widgets[id]||(widgets[id]=make())},
  createElement(){return make()}};
 const w={
  document:d,localStorage:{getItem(k){return store[k]||null}},
  HH_GOLDEN_AVATARS_V529:{m:'m',z:'z'},
  HH_GUARDIAN_V761:{active:false,map:{getZoom(){return 15},easeTo(x){moves.push(x)}},
   lastGpsFixAt:0,getLocationSettings(){return{follow_map:true}},setRemoteMarkerPreferred(){}},
  // Deliberately not logged into Supabase. Dropbox OAuth is separate.
  HH_GUARDIAN_LIVE_V785:{authenticated:false,familyAuthorized:false,boundProfile:null,getClient(){return null}},
  HH_GUARDIAN_GPS_ROUTER_V1177:{connected(){return true},forProfile(){return {name:'Mónika GPS',activeReadAccount:'gmail'}},async read(){return nativeReply()}},
  maplibregl:{Marker:class{
   setLngLat(p){positions.push(p);return this}addTo(){return this}remove(){removes.push(true)}
  }},
  addEventListener(){},setInterval(){},setTimeout(fn){fn()}
 };
 vm.runInNewContext(read('guardian-profile-follow-v837.js'),{window:w,Date,Number,Math,Promise,Object});
 const ctrl=w.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 return{w,d,widgets,moves,positions,removes,ctrl,tick};
}
const phoneFix=()=>({
 profile_key:'monika',latitude:47.52693,longitude:19.03802,accuracy_m:40,
 updated_at:new Date().toISOString(),source:'HH One Native GPS',speed_kmh:null
});
test('v1174 displays verified Monika office phone fix even without Supabase login',async()=>{
 const h=harness(()=>({status:'ok',data:phoneFix()}));
 await h.tick();
 assert.equal(h.ctrl.ready,true);
 assert.ok(h.moves.length>=1);
 assert.equal(h.moves.at(-1).center[0],19.03802);
 assert.equal(h.moves.at(-1).center[1],47.52693);
 assert.match(h.widgets.guardianNativeGpsMessageV1174.textContent,/HH Connect natív GPS/);
 assert.equal(h.widgets.guardianNativeGpsConnectV1174.hidden,true);
});
test('v1174 missing Gmail browser OAuth fails closed and exposes safe connect link',async()=>{
 const h=harness(()=>({status:'not-connected',data:null}));
 await h.tick();
 assert.equal(h.ctrl.ready,false);
 assert.equal(h.moves.length,0);
 assert.equal(h.positions.length,0);
 assert.equal(h.widgets.guardianNativeGpsConnectV1174.hidden,false);
 assert.match(h.widgets.guardianNativeGpsMessageV1174.textContent,/Gmail bridge kapcsolat nem olvasható/);
});
test('v1174 never paints stale GPS, even with Supabase/browser home source',async()=>{
 const h=harness(()=>({status:'ok',data:{...phoneFix(),updated_at:new Date(Date.now()-90000).toISOString()}}));
 await h.tick();
 assert.equal(h.ctrl.ready,false);
 assert.equal(h.moves.length,0);
 assert.match(h.widgets.guardianNativeGpsMessageV1174.textContent,/NEM ÉLŐ/);
});
test('v1174 source diagnostics are visible, have a safe OAuth path and do not fake fixes',()=>{
 const html=read('index.html'),js=read('guardian-profile-follow-v837.js');
 const live=read('guardian-live-v785.js'),own=read('guardian.js');
 assert.match(html,/id="guardianNativeGpsSourceV1174"/);
 assert.match(html,/id="guardianNativeGpsConnectV1174"/);
 assert.match(html,/href="\.\.\/remote-service\/"/);
 assert.match(html,/guardian-native-source-v1174\.css/);
 assert.match(html,/guardian-profile-follow-v837\.js\?v=[^"\n]*owner=v1174/);
 assert.match(live,/sharingProfile==='monika'&&ua&&!\/Android\/i.test\(ua\)/);
 assert.match(own,/selected==='monika'&&ua&&!\/Android\/i.test\(ua\)/);
 assert.doesNotMatch(js,/navigator\.geolocation|watchPosition|getCurrentPosition|\.upsert\(|files\/upload/);
});
