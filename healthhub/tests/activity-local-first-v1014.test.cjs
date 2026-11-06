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

test('Nov 3 restored Activity uses measured profile-only data after canonical sources complete',async()=>{
 const h=make();
 h.w.hhOpenActivity();
 for(let i=0;i<10;i++)await flush();
 assert.match(h.nodes.hhActivityPage191.innerHTML,/Aktivitás adatok betöltése/);
 assert.equal(h.w.hhActivity191Cache,undefined,'legacy mode deliberately waits for sources instead of showing a possibly stale preview');
 assert.equal(h.stats().cloudReads,1,'canonical Dropbox file is requested for the active profile');
 assert.equal(h.stats().syncReads,1,'legacy opening reactivates the Health Connect import flow');
 h.releaseCloud(9012);h.releaseSamsung();
 for(let i=0;i<16;i++)await flush();
 assert.equal(h.w.hhActivity191CurrentProfile,'monika');
 assert.equal(h.w.hhActivity191Cache.daily.find(x=>x.date===h.today).steps,9012);
 assert.ok(h.w.hhActivity191Source.cloud,'Dropbox export metadata is present');
 assert.equal(h.w.hhActivity191Cache.daily.find(x=>x.date===h.today).steps===77777,false,'other profile stays excluded');
 assert.doesNotMatch(h.nodes.hhActivityPage191.innerHTML,/Helyi gyorsnézet/);
});
test('optional Samsung source cannot hold Activity blank indefinitely',async()=>{
 const h=make();h.w.hhOpenActivity();
 for(let i=0;i<12;i++)await flush();
 h.releaseCloud(7100);
 // Leave the optional Samsung source pending beyond its 2.5s safety limit.
 await new Promise(resolve=>setTimeout(resolve,2625));
 for(let i=0;i<12;i++)await flush();
 assert.equal(h.w.hhActivity191Cache.daily.find(x=>x.date===h.today).steps,7100);
 assert.equal(h.w.hhActivity191Source.samsung.status,'pending');
 assert.equal(h.w.hhActivity191CurrentProfile,'monika');
 h.releaseSamsung();
});
test('Nov 3 baseline is loaded with a fresh JS cache key and retains profile guards',()=>{
 assert.match(script,/async function load\(profile\)/);
 assert.match(script,/out\.imports=out\.imports\.filter\(function\(x\)\{return x\.profile===profile/);
 assert.match(script,/out\.activity=out\.activity\.filter\(function\(x\)\{return x\.profile===profile/);
 assert.match(script,/var sources=await Promise\.all\(\[load\(requestedProfile\),heightPromise,samsungGuard\]\)/);
 assert.match(script,/window\.hhHealthCloudSync\(false\)/);
 assert.doesNotMatch(script,/Helyi gyorsnézet/);
 assert.match(html,/live-v191\.js\?v=1013-source-guard-20261106/);
 assert.match(script,/var cloud=await Promise\.race/);
 assert.match(script,/out\._cloudTimedOut/);
 assert.match(script,/var missingMeasuredDay/);
 assert.match(script,/A Dropbox nem válaszolt 12 másodpercen belül/);
});
