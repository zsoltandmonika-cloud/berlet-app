'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../guardian');
const source=fs.readFileSync(path.join(root,'guardian-profile-follow-v837.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

const fix=(lat=47.55,ts=Date.now()-600,speed=22)=>({
 profile_key:'monika',latitude:lat,longitude:19.035,accuracy_m:12,
 updated_at:new Date(ts).toISOString(),speed_kmh:speed,source:'HH One Native GPS'
});
function harness(){
 const callbacks={},frames=[],positions=[],camera=[],reads={db:0,native:0};
 const state={current:fix(47.55,Date.now()-2000,22)};
 const mk=()=>({className:'',textContent:'',hidden:false,
  setAttribute(){},removeAttribute(){},append(){},appendChild(){},addEventListener(){}});
 const doc={readyState:'complete',hidden:false,getElementById:mk,createElement:mk,
  addEventListener(k,cb){callbacks['doc:'+k]=cb}};
 const w={document:doc,localStorage:{getItem(){return 'm'}},
  HH_GOLDEN_AVATARS_V529:{m:'m.jpg',z:'z.jpg'},
  HH_GUARDIAN_V761:{map:{getZoom(){return 15},easeTo(options){camera.push(options)}},
   lastGpsFixAt:0,getLocationSettings(){return {follow_map:true}},
   setRemoteMarkerPreferred(){}},
  HH_GUARDIAN_LIVE_V785:{authenticated:true,familyAuthorized:true,boundProfile:'monika',
   getClient(){return {}},async readSharedLocation(){reads.db++;return {data:null,error:null}}},
  HH_GUARDIAN_NATIVE_V156:{connected(){return true},async read(){reads.native++;return {status:'ok',data:state.current}}},
  maplibregl:{Marker:class{
   setLngLat(position){positions.push(position);return this}addTo(){return this}remove(){}
  }},
  matchMedia(){return {matches:false}},performance:{now(){return 0}},
  requestAnimationFrame(cb){frames.push(cb);return frames.length},
  cancelAnimationFrame(){},
  setInterval(){return 1},setTimeout(cb){cb();return 1},
  addEventListener(k,cb){callbacks[k]=cb}};
 vm.runInNewContext(source,{window:w,Date,Number,Math,Promise,Object});
 const c=w.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 const settle=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate)};
 return {state,c,camera,positions,frames,reads,settle};
}

test('v1005 fast moving vehicle uses a subsecond smooth real-GPS glide without new reads',async()=>{
 const h=harness();await h.settle();
 const before=h.camera.length,prior={...h.reads};
 h.state.current=fix(47.55025,Date.now()-250,24);
 await h.c.refresh();
 assert.equal(h.camera.length,before+1,'one camera movement per new fix');
 const move=h.camera.at(-1);
 assert.ok(move.duration>=350&&move.duration<=900,'moving bus should not trail for 3.4 sec');
 assert.equal(typeof move.easing,'function');
 assert.equal(h.reads.db,prior.db+1,'only existing Supabase read');
 assert.equal(h.reads.native,prior.native+1,'only existing native relay read');
 assert.deepEqual(Array.from(move.center),[19.035,47.55025]);
 h.frames.shift()(move.duration*.5);
 assert.ok(Math.abs(h.positions.at(-1)[1]-47.550125)<1e-8);
 h.frames.shift()(move.duration);
 assert.ok(Math.abs(h.positions.at(-1)[1]-47.55025)<1e-8);
});
test('v1005 walking speed preserves original gentle interpolation and marker anchor',async()=>{
 const h=harness();await h.settle();
 h.state.current=fix(47.55009,Date.now()-200,3);
 await h.c.refresh();
 assert.ok(h.camera.at(-1).duration>=950,'walking should still be smoothly eased');
 assert.equal(h.camera.at(-1).duration<=3400,true);
});
test('v1005 starts permitted Supabase and native reads concurrently, never extra polls',async()=>{
 let releaseDb,releaseNative,db=0,native=0;
 const event={},started=[];
 const mk=()=>({className:'',textContent:'',setAttribute(){},removeAttribute(){},
  append(){},appendChild(){},addEventListener(){}});
 const d={readyState:'complete',hidden:false,getElementById:mk,createElement:mk,
  addEventListener(){}};
 const w={document:d,localStorage:{getItem(){return 'm'}},
  HH_GOLDEN_AVATARS_V529:{m:'m.jpg'},
  HH_GUARDIAN_V761:{map:{getZoom(){return 15},easeTo(){}},lastGpsFixAt:0,
   getLocationSettings(){return {follow_map:true}},setRemoteMarkerPreferred(){}},
  HH_GUARDIAN_LIVE_V785:{authenticated:true,familyAuthorized:true,boundProfile:'monika',
   getClient(){return {}},readSharedLocation(){db++;started.push('db');
    return new Promise(r=>{releaseDb=r})}},
  HH_GUARDIAN_NATIVE_V156:{connected(){return true},read(){native++;started.push('native');
    return new Promise(r=>{releaseNative=r})}},
  maplibregl:{Marker:class{setLngLat(){return this}addTo(){return this}remove(){}}},
  addEventListener(k,cb){event[k]=cb},setTimeout(cb){cb()},setInterval(){return 1}};
 vm.runInNewContext(source,{window:w,Date,Number,Math,Promise,Object});
 await Promise.resolve();await Promise.resolve();await Promise.resolve();
 assert.equal(db,1);assert.equal(native,1,'native request starts without waiting for Supabase');
 assert.deepEqual(started,['db','native']);
 releaseNative({status:'ok',data:fix(47.55,Date.now()-300,20)});
 releaseDb({data:null,error:null});
 for(let i=0;i<5;i++)await new Promise(setImmediate);
 assert.equal(db,1);assert.equal(native,1);
});
test('v1005 keeps same data permissions, no new sensors, and busts old app cache',()=>{
 assert.match(source,/function fastTransitMotion/);
 assert.match(source,/Promise\.allSettled/);
 assert.match(html,/speed=851&smoothing=1004-bus-latency-1005/);
 assert.doesNotMatch(source,/navigator\.geolocation|watchPosition|getCurrentPosition|\.upsert\(|\.upload\(|\.delete\(/);
});
