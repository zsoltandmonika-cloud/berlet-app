'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../guardian');
const source=fs.readFileSync(path.join(root,'guardian-profile-follow-v837.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

function makeHarness(){
 const store={'hh-profile':'m'},listeners={},markers=[],positions=[],camera=[],frames=[];
 let accuracy=12,readCount=0;
 let reading=fix(47.55,19.035,Date.now()-2400,0);
 function fix(lat,lon,when,speed){
  return {profile_key:'monika',latitude:lat,longitude:lon,accuracy_m:accuracy,
   updated_at:new Date(when).toISOString(),source:'HH One Native GPS',speed_kmh:speed};
 }
 function node(){
  return {className:'',textContent:'',dataset:{},hidden:false,children:[],
   setAttribute(){},removeAttribute(){},addEventListener(){},
   append(...items){this.children.push(...items)},
   appendChild(item){this.children.push(item)}};
 }
 const doc={readyState:'complete',hidden:false,
  createElement:node,getElementById:()=>node(),
  addEventListener(k,fn){listeners['doc:'+k]=fn}};
 const map={getZoom(){return 15},easeTo(opts){camera.push(opts)}};
 const win={document:doc,
  localStorage:{getItem(k){return store[k]}},
  HH_GOLDEN_AVATARS_V529:{m:'m.jpg',z:'z.jpg'},
  HH_GUARDIAN_V761:{map,lastGpsFixAt:0,getLocationSettings(){return {follow_map:true}},
   setRemoteMarkerPreferred(){}},
  HH_GUARDIAN_LIVE_V785:{authenticated:true,familyAuthorized:true,boundProfile:'monika',
   getClient(){return {}},async readSharedLocation(){readCount++;return {data:null,error:null}}},
  HH_GUARDIAN_NATIVE_V156:{connected(){return true},async read(){return {status:'ok',data:reading}}},
  maplibregl:{Marker:class{
   constructor({element}){this.element=element;markers.push(this)}
   setLngLat(coords){this.position=coords;positions.push(coords);return this}
   addTo(){return this}remove(){}
  }},
  matchMedia(){return {matches:false}},performance:{now(){return 0}},
  requestAnimationFrame(fn){frames.push(fn);return frames.length},
  cancelAnimationFrame(){},addEventListener(k,fn){listeners[k]=fn},
  setInterval(){return 1},setTimeout(fn){fn();return 1}};
 vm.runInNewContext(source,{window:win,Date,Number,Math,Promise,Object});
 return {win,doc,frames,camera,positions,markers,fix,
  change(next){reading=next},
  get reads(){return readCount},
  async settle(){for(let i=0;i<8;i++)await new Promise(setImmediate)},
  flush(progress){
   const opts=camera.at(-1),duration=opts?.duration||0;
   while(frames.length){
    const next=frames.shift();next(duration*progress);
    // At a mid-frame the function queues another RAF, so stop after one.
    break;
   }
  }};
}

test('v1004 moving portrait and map share one easing curve and one duration per fresh GPS fix',async()=>{
 const h=makeHarness(),controller=h.win.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 await h.settle();
 assert.equal(h.markers.length,1);
 assert.ok(h.camera.length>0);
 const before=h.camera.length,reads=h.reads;
 const ts=Date.now()-500;
 h.change(h.fix(47.5502,19.035,ts,12));
 await controller.refresh();
 assert.equal(h.camera.length,before+1,'one synchronized map move, no competing recenter');
 assert.equal(h.reads,reads+1,'existing read only, no additional API request');
 const animation=h.camera.at(-1);
 assert.ok(animation.duration>=950&&animation.duration<=3400);
 assert.equal(typeof animation.easing,'function');
 assert.equal(animation.easing(.5),.5);
 h.flush(.5);
 assert.ok(Math.abs(h.positions.at(-1)[1]-47.5501)<1e-7,
  'portrait is halfway at exactly the same eased time as camera');
 h.flush(1);
 assert.ok(Math.abs(h.positions.at(-1)[1]-47.5502)<1e-7);
});

test('v1004 verified-stationary satellite noise does not re-center or jitter the portrait',async()=>{
 const h=makeHarness(),controller=h.win.HH_GUARDIAN_PROFILE_FOLLOW_V837.start();
 await h.settle();
 const before=h.camera.length,positions=h.positions.length;
 h.change(h.fix(47.550035,19.035,Date.now()-600,0)); // 3.9 m drift at 12 m accuracy
 await controller.refresh();
 assert.equal(h.camera.length,before,'stationary GPS noise must not move camera');
 assert.equal(h.positions.length,positions,'stationary GPS noise must not move portrait');
 h.change(h.fix(47.55016,19.035,Date.now()-200,6)); // actual ~18m movement
 await controller.refresh();
 assert.equal(h.camera.length,before+1,'real movement must resume tracking');
});

test('v1004 preserves consented, read-only GPS, Android privacy and Golden Glass assets',()=>{
 assert.match(html,/guardian-profile-follow-v837\.js\?v=865-adaptive-continuous-verified-gps&handoff=839&speed=851&smoothing=1004/);
 assert.match(source,/function alignFollowCamera/);
 assert.match(source,/function ignoreGpsNoise/);
 assert.match(source,/const eased=smoothStep\(progress\)/);
 assert.match(source,/alignFollowCamera\(fix,next,duration,smoothStep\)/);
 assert.doesNotMatch(source,/navigator\.geolocation|watchPosition|getCurrentPosition|\.upsert\(|\.upload\(|\.delete\(/);
 assert.match(html,/guardian-profile-foreground-v838\.css/);
 assert.match(html,/guardian-speed-glass-v850\.css/);
});
