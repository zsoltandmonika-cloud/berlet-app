'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'../guardian',p),'utf8');

test('v807 browser background stops GPS but does not send share deletion, retains opt-in',()=>{
 const gps=read('guardian.js'),live=read('guardian-live-v785.js'),html=read('index.html');
 assert.match(gps,/function stop\(temporary=false\)/);
 assert.match(gps,/stop\(true\);report\('A böngésző GPS-e szünetel/);
 assert.match(gps,/addEventListener\('pagehide',\(\)=>stop\(true\)\)/);
 assert.match(live,/function onGpsPaused\(\)/);
 assert.match(live,/onGpsPaused\(\);if\(pollTimer!==null\)/);
 assert.match(live,/onGpsStopped\(\)\{if\(sharing\)stopSharing\(\)\}/);
 assert.match(live,/LAST_KNOWN_MS=12\*60\*60\*1000/);
 assert.match(html,/UTOLSÓ ISMERT HELY/);
 assert.match(html,/guardian-live-v785\.js\?v=807-last-known/);
 assert.match(html,/guardian\.js\?v=807-last-known/);
});

test('v807 remotely shared stale GPS appears on map as last known, never live, and expires after 12h',async()=>{
 const controls={},listeners={},timerIds=[],pins=[];
 function make(){
  const classes=new Set();
  return {textContent:'',hidden:false,disabled:false,value:'',children:[],
   className:'',classList:{add(x){classes.add(x)},remove(x){classes.delete(x)},
    toggle(x,on){if(on)classes.add(x);else classes.delete(x)},contains(x){return classes.has(x)}},
   setAttribute(){},appendChild(x){this.children.push(x);return x},
   addEventListener(k,fn){this[k]=fn}};
 }
 const doc={hidden:false,getElementById(id){return controls[id]||(controls[id]=make())},
  createElement(){return make()},addEventListener(k,fn){listeners[k]=fn}};
 const store={'hh-profile':'z'};
 const storage={getItem(k){return store[k]||null},setItem(k,v){store[k]=v},removeItem(k){delete store[k]}};
 let remote={profile_key:'monika',latitude:47.529,longitude:19.031,accuracy_m:13,speed_kmh:null,
  updated_at:new Date(Date.now()-91000).toISOString()};
 const calls=[];
 const api={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null}),onAuthStateChange(){}},
  from(table){
   return {select(){return this},in(){return Promise.resolve({data:[{profile_key:'zsolt'},{profile_key:'monika'}],error:null})},
    eq(){return this},maybeSingle(){return Promise.resolve({data:table==='hh_guardian_live_locations'?remote:null,error:null})},
    upsert(){calls.push('upsert');return Promise.resolve({error:null})},
    delete(){calls.push('delete');return this},
    then(fn){return Promise.resolve({error:null}).then(fn)}
   };
  }};
 const win={HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://test.invalid',publishableKey:'public'},
  supabase:{createClient(){return api}},localStorage:storage,
  HH_GUARDIAN_V761:{getLocationSettings(){return {follow_map:true,map_3d:true}}},
  HH_GOLDEN_AVATARS_V529:{m:'photo-m',z:'photo-z'},
  maplibregl:{Marker:class{
   constructor({element}){this.el=element;pins.push(this)}
   setLngLat(value){this.point=value;return this}
   addTo(){this.attached=true;return this}
   remove(){this.removed=true}
   getElement(){return this.el}
  }},
  setInterval(fn){timerIds.push(fn);return timerIds.length},clearInterval(){},
  setTimeout(){return 1},addEventListener(){},
  location:{origin:'https://test.invalid',pathname:'/healthhub/guardian/index.html'}};
 vm.runInNewContext(read('guardian-live-v785.js'),{window:win,document:doc,Date,Math,Number,String,Promise});
 const map={getZoom(){return 15},easeTo(){}};
 win.HH_GUARDIAN_LIVE_V785.mountMap(map);
 for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(pins.length,1,'last known marker is not removed after 20 seconds');
 assert.deepEqual(Array.from(pins[0].point),[19.031,47.529]);
 assert.match(controls.guardianOtherState.textContent,/UTOLSÓ ISMERT HELY/);
 assert.match(controls.guardianOtherState.textContent,/NEM ÉLŐ/);
 assert.ok(controls.guardianOtherCard.classList.contains('guardian-last-known-v807'));
 assert.ok(pins[0].getElement().classList.contains('guardian-peer-stale-v807'));
 assert.equal(controls.guardianOtherCard.classList.contains('live'),false);
 assert.deepEqual(calls,[],'simply viewing another member does not upload or delete any GPS');
 remote={...remote,updated_at:new Date().toISOString()};
 win.HH_GUARDIAN_LIVE_V785.mountMap(map);
 for(let i=0;i<2;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.match(controls.guardianOtherState.textContent,/ÉLŐ/);
 assert.ok(controls.guardianOtherCard.classList.contains('live'));
 assert.equal(pins[0].getElement().classList.contains('guardian-peer-stale-v807'),false);
 remote={...remote,updated_at:new Date(Date.now()-13*60*60*1000).toISOString()};
 win.HH_GUARDIAN_LIVE_V785.mountMap(map);
 for(let i=0;i<2;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.ok(pins[0].removed,'expired past 12h does not show indefinite stale location');
 assert.equal(controls.guardianOtherCard.classList.contains('live'),false);
});
