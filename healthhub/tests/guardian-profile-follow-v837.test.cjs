'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../guardian');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const follow=require('../guardian/guardian-profile-follow-v837.js');
function sample(profile,source='HH One Native GPS',age=2000){
 return {profile_key:profile,latitude:47.55,longitude:19.035,
  accuracy_m:16,updated_at:new Date(Date.now()-age).toISOString(),source};
}
test('v837 native, browser and selected profile freshness rules never follow stale or wrong person',()=>{
 const now=Date.now();
 assert.equal(follow.version,'837');
 assert.equal(follow.selectedProfile({getItem(){return 'm'}}),'monika');
 assert.equal(follow.selectedProfile({getItem(){return 'z'}}),'zsolt');
 assert.equal(follow.snapshot(sample('monika'),'zsolt',now),null);
 assert.equal(follow.snapshot(sample('monika','HH One Native GPS',80000),'monika',now),null);
 assert.equal(follow.snapshot(sample('monika','Family Live',25000),'monika',now),null);
 assert.equal(follow.snapshot(sample('monika','HH One Native GPS',40000),'monika',now).source,'HH One Native GPS');
 assert.equal(follow.snapshot({...sample('monika'),accuracy_m:160},'monika',now),null);
 assert.equal(follow.snapshot({...sample('monika'),latitude:Infinity},'monika',now),null);
 assert.equal(follow.snapshot({...sample('monika'),updated_at:new Date(now+12000).toISOString()},'monika',now),null);
 const old=sample('monika','Family Live',18000),native=sample('monika','HH One Native GPS',2000);
 assert.equal(follow.newest(old,native,'monika',now).source,'HH One Native GPS');
 assert.equal(follow.newest(old,native,'zsolt',now),null);
 assert.equal(follow.preferRemote(follow.snapshot(native,'monika',now),now-22000,now),true);
 assert.equal(follow.preferRemote(follow.snapshot(native,'monika',now),now-100,now),false);
 assert.equal(follow.canRead({authenticated:false,familyAuthorized:true},'monika'),false);
 assert.equal(follow.canRead({authenticated:true,familyAuthorized:false,boundProfile:'zsolt'},'monika'),false);
 assert.equal(follow.canRead({authenticated:true,familyAuthorized:true,boundProfile:'zsolt'},'monika'),true);
 assert.equal(follow.canRead({authenticated:true,familyAuthorized:false,boundProfile:'monika'},'monika'),true);
});
test('v837 verified Monika native fix recenters Monika view without starting GPS/uploading',async()=>{
 const store={'hh-profile':'m'},events={},dom={},mapMoves=[],lookups=[],markerPositions=[],suppressed=[];
 const n=sample('monika','HH One Native GPS',3000);
 const w={
  localStorage:{getItem(k){return store[k]||null}},
  document:null,
  HH_GOLDEN_AVATARS_V529:{m:'m.jpg',z:'z.jpg'},
  HH_GUARDIAN_V761:{
   map:{getZoom(){return 15},easeTo(v){mapMoves.push(v)}},
   getLocationSettings(){return {follow_map:true,map_3d:true}},
   lastGpsFixAt:0,
   setRemoteMarkerPreferred(v){suppressed.push(v)}
  },
  HH_GUARDIAN_LIVE_V785:{
   authenticated:true,familyAuthorized:true,boundProfile:'monika',
   getClient(){return {from(){return {select(){return this},eq(k,v){lookups.push(v);return this},maybeSingle:async()=>({data:null,error:null})}}}}
  },
  HH_GUARDIAN_NATIVE_V156:{connected(){return true},read:async(k)=>({status:'ok',data:k==='monika'?n:null})},
  maplibregl:{Marker:class{
   constructor({element}){this.el=element}
   setLngLat(p){this.p=p;markerPositions.push(p);return this}
   addTo(){return this}
   remove(){}
  }},
  addEventListener(k,fn){events[k]=fn},
  setInterval(){return 1},
  setTimeout(fn){fn();return 1}
 };
 const d={readyState:'complete',hidden:false,
  getElementById(k){return dom[k]||(dom[k]={textContent:'',addEventListener(){}})},
  createElement(){return {className:'',setAttribute(){},append(){},appendChild(){}} },
  addEventListener(k,fn){events['doc:'+k]=fn}};
 w.document=d;
 vm.runInNewContext(read('guardian-profile-follow-v837.js'),{window:w,Date,Number,Math,Promise,Object});
 const ctrl=w.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 // The module starts its first read on load; let that pending read resolve
 // before requesting the next refresh to assert actual map behaviour.
 for(let n=0;n<3;n++)await new Promise(resolve=>setImmediate(resolve));
 await ctrl.refresh();
 assert.ok(mapMoves.length>=1,'valid native fix must move map camera');
 assert.equal(mapMoves.at(-1).center[0],19.035);
 assert.equal(mapMoves.at(-1).center[1],47.55);
 assert.ok(markerPositions.length>0,'verified own marker shown');
 assert.deepEqual(lookups,['monika','monika'],'must fetch ONLY selected profile');
 assert.ok(suppressed.includes(true),'old local marker is hidden only while remote is valid');
 assert.equal(dom.guardianMeState.textContent.includes('HH One Native GPS'),true);
 assert.equal(w.HH_GUARDIAN_PROFILE_FOLLOW_V837.preventWrongDeviceGps(),false);
 // User dragged map: no automatic camera re-centering on refreshed GPS fix.
 w.HH_GUARDIAN_V761.getLocationSettings=()=>({follow_map:false,map_3d:true});
 const oldCount=mapMoves.length;
 await ctrl.refresh();assert.equal(mapMoves.length,oldCount);
 // A profile mismatch must not start this physical phone's GPS.
 store['hh-profile']='z';
 assert.equal(w.HH_GUARDIAN_PROFILE_FOLLOW_V837.preventWrongDeviceGps(),true);
 events.storage?.({key:'hh-profile'});
 await ctrl.refresh();
 assert.equal(w.HH_GUARDIAN_PROFILE_FOLLOW_V837.ready,false);
});
test('v837 adds only read-only follow and keeps the approved Family Guard design',()=>{
 const html=read('index.html'),js=read('guardian.js'),
  src=read('guardian-profile-follow-v837.js'),css=read('guardian-profile-follow-v837.css');
 assert.match(html,/guardian-profile-follow-v837\.js\?v=837-selected-own-live/);
 assert.match(html,/guardian-profile-follow-v837\.css\?v=837-selected-profile-pin/);
 assert.ok(html.indexOf('guardian-profile-follow-v837.js')>html.indexOf('guardian-live-v785.js'));
 assert.match(html,/guardian-attribution-dot-v834\.css/);
 assert.match(html,/guardian-zoom-center-v835\.css/);
 assert.match(html,/guardian-origin-search-v836\.js/);
 assert.match(js,/remote\?\.requestFollow\(\)/);
 assert.match(js,/remote\?\.preventWrongDeviceGps\(\)/);
 assert.match(js,/setRemoteMarkerPreferred/);
 assert.match(src,/getClient\?\.\(\)/);
 assert.match(src,/relay\.read\(k\)/);
 assert.match(src,/follow_map===true/);
 assert.match(css,/\.hh-guardian-local-superseded-v837/);
 assert.doesNotMatch(src,/navigator\.geolocation|watchPosition|getCurrentPosition|\.upsert\(|\.delete\(|\bsetItem\(|\bupload\(/);
});

test('v838 GPS family portraits sit above map pins without altering Follow or UX',()=>{
 const html=read('index.html'),css=read('guardian-profile-foreground-v838.css');
 const accepted=read('guardian-profile-follow-v837.css');
 const guardian=read('guardian.js');
 const live=read('guardian-live-v785.js');
 const own=read('guardian-profile-follow-v837.js');
 assert.match(html,/guardian-profile-foreground-v838\.css\?v=838-gps-portraits-top/);
 assert.ok(html.indexOf('guardian-profile-foreground-v838.css')>
  html.indexOf('guardian-profile-follow-v837.css'),'foreground is the final profile-pin layer');
 assert.match(css,/#guardianMap \.maplibregl-marker\.guardian-position\{/);
 assert.match(css,/z-index:80!important/);
 assert.match(css,/\.guardian-position\.guardian-peer-position\{/);
 assert.match(css,/z-index:81!important/);
 assert.match(css,/\.guardian-position\.guardian-selected-profile-position-v837\{/);
 assert.match(css,/z-index:82!important/);
 assert.match(css,/\.guardian-position\.hh-guardian-local-superseded-v837/);
 assert.match(accepted,/display:none!important/,'previous superseded-browser-marker remains hidden');
 assert.match(guardian,/className='guardian-position'/);
 assert.match(live,/className='guardian-position guardian-peer-position'/);
 assert.match(own,/className='guardian-position guardian-selected-profile-position-v837'/);
 assert.doesNotMatch(css,/\.map-follow|\.map-3d|\.map-family|maplibregl-ctrl|#guardianMapSearch|#guardianMapOrigin|#guardianHHNav|guardian-hero/);
 assert.match(css,/pointer-events:none!important/,'no new tap interception');
 assert.doesNotMatch(css,/transform|top:|left:|bottom:|position:/,'do not move the real GPS anchor');
 assert.match(html,/guardian-attribution-dot-v834\.css/);
 assert.match(html,/guardian-zoom-center-v835\.css/);
 assert.match(html,/guardian-origin-search-v836\.css/);
});
