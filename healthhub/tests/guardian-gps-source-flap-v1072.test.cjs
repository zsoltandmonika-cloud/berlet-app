'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../guardian/guardian-profile-follow-v837.js'),'utf8');
const follow=require('../guardian/guardian-profile-follow-v837.js');
const pos=(source,age=2000,lat=45,lng=10)=>({
 profile_key:'monika',latitude:lat,longitude:lng,accuracy_m:10,
 speed_kmh:0,updated_at:new Date(Date.now()-age).toISOString(),source
});
test('v1072 older registered native GPS wins a kilometre-scale source disagreement',()=>{
 const now=Date.now(),browser=pos('Family Live',500,45,10.08),
  native=pos('HH One Native GPS',5000,45,10);
 const choice=follow.resolveSources(browser,native,'monika',null,now);
 assert.equal(choice.conflict,true);
 assert.equal(choice.fix.source,'HH One Native GPS');
 assert.ok(choice.distance>5000);
 assert.equal(choice.fix.longitude,undefined);
 const noNative=follow.resolveSources(browser,null,'monika',choice.anchor,now);
 assert.equal(noNative.fix,null,'do not return to contradictory browser point after native expires');
 assert.equal(noNative.conflict,true);
 const aligned=follow.resolveSources(pos('Family Live',200,45,10.0001),null,'monika',choice.anchor,now);
 assert.equal(aligned.conflict,false);
 assert.equal(aligned.fix,null,'browser-only coordinates cannot attest Monika physical phone, even when aligned');
 assert.equal(follow.resolveSources(browser,native,'zsolt',null,now).fix,null);
 assert.equal(follow.preferRemote(follow.snapshot(native,'monika',now),now-1000,now),false,
  'current device browser GPS cannot be overwritten by remote data');
});
test('v1072 map never flaps back to disputed coordinates and shows source conflict',async()=>{
 let browser=pos('Family Live',250,45,10.08),
  native=pos('HH One Native GPS',4000,45,10),nativeAvailable=true;
 const moves=[],marked=[],removed=[],els={},listeners={};
 const d={readyState:'loading',hidden:false,
  getElementById(k){return els[k]||(els[k]={textContent:'',hidden:true,addEventListener(){}})},
  addEventListener(k,fn){listeners[k]=fn},
  createElement(){return {className:'',setAttribute(){},removeAttribute(){},
   append(){},appendChild(){},addEventListener(){}}}};
 const w={document:d,localStorage:{getItem(k){return k==='hh-profile'?'m':null}},
  HH_GOLDEN_AVATARS_V529:{m:'m',z:'z'},
  HH_GUARDIAN_V761:{map:{getZoom(){return 15},easeTo(v){moves.push(v)}},
   lastGpsFixAt:0,getLocationSettings(){return {follow_map:true}},
   setRemoteMarkerPreferred(){}},
  HH_GUARDIAN_LIVE_V785:{authenticated:true,familyAuthorized:true,boundProfile:'zsolt',
   getClient(){return{}},readSharedLocation(){return Promise.resolve({data:browser,error:null})}},
  HH_GUARDIAN_NATIVE_V156:{connected(){return true},read(){
   return Promise.resolve(nativeAvailable?{status:'ok',data:native}:{status:'invalid',data:null})}},
  maplibregl:{Marker:class{
   setLngLat(v){marked.push(v);return this}
   addTo(){return this}
   remove(){removed.push(true)}
  }},addEventListener(k,fn){listeners[k]=fn},setInterval(){},setTimeout(fn){fn()}};
 vm.runInNewContext(src,{window:w,Date,Number,Math,Promise,Object});
 const ctrl=w.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 for(let i=0;i<20;i++)await Promise.resolve();
 assert.equal(moves.length,1,'native source is followed once');
 assert.equal(moves[0].center[0],10);
 assert.equal(els.guardianGpsSourceConflictV1072.hidden,false);
 assert.match(els.guardianGpsSourceConflictV1072.textContent,/GPS-források/);
 nativeAvailable=false;
 await ctrl.refresh();
 assert.equal(moves.length,1,'browser conflicting position must never move camera');
 assert.equal(removed.length,1,'outdated trusted native portrait is hidden');
 assert.match(els.guardianMeState.textContent,/NEM ÉLŐ/);
 browser=pos('Family Live',100,45,10.0001);
 await ctrl.refresh();
 assert.equal(moves.length,1,'a matching but unattested browser-only fix must not move Monika camera');
 assert.equal(els.guardianGpsSourceConflictV1072.hidden,true);
 assert.match(els.guardianMeState.textContent,/NEM ÉLŐ/);
});
test('v1072 warning is visible without changing GPS consent or map settings',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../guardian/index.html'),'utf8');
 assert.match(html,/id="guardianGpsSourceConflictV1072"/);
 assert.match(html,/gpsSource=1072-conflict-lock/);
 assert.doesNotMatch(src,/navigator\.geolocation|watchPosition|getCurrentPosition|\.upsert\(|\.delete\(|\bsetItem\(/);
});
