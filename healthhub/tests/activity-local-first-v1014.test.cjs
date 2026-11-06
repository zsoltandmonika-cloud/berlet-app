'use strict';
// v1014 Activity loading regression: real profile-scoped data, no invented
// values, no double HC download, and refresh without waiting for Samsung.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../live-v191.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function flush(){return new Promise(resolve=>setImmediate(resolve))}
function day(){
 const d=new Date();
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function make(profile='monika'){
 const nodes={},pageStates={},today=day(),store={'hh-profile':profile==='monika'?'m':'z'};
 const el=tag=>({tagName:tag,style:{},dataset:{},innerHTML:'',
  classList:{add(x){pageStates[x]=true},remove(x){pageStates[x]=false},contains(x){return!!pageStates[x]}},
  setAttribute(){},querySelector(){return null},querySelectorAll(){return []},
  remove(){},appendChild(){}});
 const doc={documentElement:{dataset:{},style:{setProperty(){}}},
  createElement:el,getElementById(id){return nodes[id]||null},
  querySelector(){return null},querySelectorAll(){return []},
  head:{appendChild(x){if(x.id)nodes[x.id]=x}},
  body:{appendChild(x){if(x.id)nodes[x.id]=x}}};
 const localImport={id:'local-monika',profile:'monika',importedAt:new Date(Date.now()-7200000).toISOString(),
  bundle:{profile:'monika',exportedAt:new Date(Date.now()-7200000).toISOString(),records:{
    dailyActivity:[{date:today,steps:1200,distanceMeters:900,activeMinutes:18}],
    exerciseSessions:[],heartRate:[]}}};
 const localActivity=[{id:'m',profile:'monika',date:today,steps:1200,updatedAt:localImport.importedAt},
   {id:'other',profile:'zsolt',date:today,steps:77777,updatedAt:localImport.importedAt}];
 function req(data){const q={};queueMicrotask(()=>{q.result=data;q.onsuccess?.()});return q}
 const indexedDB={open(){const q={};queueMicrotask(()=>{
    q.result={close(){},transaction(){return {objectStore(name){return {
      getAll(){return req(name==='imports'?[localImport]:localActivity)}
    }}}}};q.onsuccess?.();
   });return q}};
 let completeCloud,completeSamsung,cloudReads=0,syncReads=0;
 const cloudPromise=new Promise(resolve=>{completeCloud=resolve});
 const sdkPromise=new Promise(resolve=>{completeSamsung=resolve});
 const vault={connected(){return true},downloadJson(){cloudReads++;return cloudPromise}};
 const w={document:doc,localStorage:{getItem(k){return store[k]||null},
   setItem(k,v){store[k]=v}},HH_DROPBOX_VAULT:vault,
  HH_DISTANCE_ENGINE_V369:{async height(){return 170},estimate(){return {km:2}}},
  HH_SAMSUNG_SOURCE_V371:{load(){return sdkPromise},merge(c){return c}},
  hhHealthCloudSync(){syncReads++;return Promise.resolve(true)},
  addEventListener(){}};
 const context={window:w,document:doc,localStorage:w.localStorage,indexedDB,
  Date,Math,Number,String,Object,Array,Promise,Intl,console,
  setInterval(){return 0},clearTimeout,setTimeout,CustomEvent:class{}};
 vm.runInNewContext(script,context,{filename:'live-v191.js'});
 return {w,nodes,today,
  releaseCloud(steps=9012){completeCloud({profile:'monika',
    exportedAt:new Date().toISOString(),records:{
      dailyActivity:[{date:today,steps,distanceMeters:6100,activeMinutes:70}],
      exerciseSessions:[],heartRate:[]}})},
  releaseSamsung(){completeSamsung({status:'not_connected',profile:'monika',data:null})},
  stats(){return {cloudReads,syncReads}}};
}
test('local profile activity paints before deferred Dropbox and Samsung, then gets fresh verified cloud',async()=>{
 const h=make();
 h.w.hhOpenActivity();
 for(let i=0;i<12;i++)await flush();
 assert.match(h.nodes.hhActivityPage191.innerHTML,/Helyi gyorsnézet/);
 assert.equal(h.w.hhActivity191CurrentProfile,'monika');
 assert.equal(h.w.hhActivity191Cache.daily.find(x=>x.date===h.today).steps,1200);
 assert.equal(h.w.hhActivity191Source.preview,true);
 assert.equal(h.stats().cloudReads,1,'one canonical Dropbox fetch');
 assert.equal(h.stats().syncReads,0,'opening Activity cannot start duplicate HC import');
 h.releaseCloud();h.releaseSamsung();
 for(let i=0;i<15;i++)await flush();
 assert.doesNotMatch(h.nodes.hhActivityPage191.innerHTML,/Helyi gyorsnézet/);
 assert.equal(h.w.hhActivity191Source.preview,false);
 assert.ok(h.w.hhActivity191Source.cloud,'verified cloud metadata populated');
 assert.equal(h.w.hhActivity191Cache.daily.find(x=>x.date===h.today).steps,9012);
 assert.equal(h.stats().cloudReads,1);
});
test('slow optional Samsung export cannot delay verified Health Connect result',async()=>{
 const h=make();h.w.hhOpenActivity();
 for(let i=0;i<12;i++)await flush();
 assert.match(h.nodes.hhActivityPage191.innerHTML,/Helyi gyorsnézet/);
 h.releaseCloud(7100);
 await new Promise(resolve=>setTimeout(resolve,2650));
 for(let i=0;i<8;i++)await flush();
 assert.doesNotMatch(h.nodes.hhActivityPage191.innerHTML,/Helyi gyorsnézet/);
 assert.equal(h.w.hhActivity191Cache.daily.find(x=>x.date===h.today).steps,7100);
 assert.equal(h.w.hhActivity191Source.samsung.status,'pending');
 h.releaseSamsung();
 for(let i=0;i<8;i++)await flush();
 assert.equal(h.w.hhActivity191Source.samsung.status,'not_connected');
 assert.equal(h.stats().cloudReads,1);
});
test('Activity source code is read-only, profile scoped, and HTML busts stale JS',()=>{
 assert.match(script,/async function readLocal\(profile\)/);
 assert.match(script,/out\.imports=out\.imports\.filter\(function\(x\)\{return x\.profile===profile/);
 assert.match(script,/out\.activity=out\.activity\.filter\(function\(x\)\{return x\.profile===profile/);
 assert.match(script,/var cloudPromise=cloudBundle\(requestedProfile\)/);
 assert.match(script,/finalPainted/);
 assert.match(script,/var samsungQuick=timelyOptional\(samsungPromise\)/);
 assert.match(script,/Helyi gyorsnézet/);
 assert.doesNotMatch(script,/window\.hhHealthCloudSync\(false\)/);
 assert.match(html,/live-v191\.js\?v=1015-stable-activity-refresh/);
});
