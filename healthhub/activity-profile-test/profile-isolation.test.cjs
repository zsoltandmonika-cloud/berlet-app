'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const main=fs.readFileSync(path.join(root,'live-v191.js'),'utf8');
const script=fs.readFileSync(path.join(__dirname,'activity-engine-v1.js'),'utf8');
const page=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const today=()=>{
 const d=new Date();
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
};
const flush=async(n=15)=>{for(let i=0;i<n;i++)await new Promise(resolve=>setImmediate(resolve))};
const make=()=>{
 const day=today(),profile={value:'m'},nodes={},state={},reads=[],readModes=[],cacheReads=[],metaWrites=[];
 const importedAt=new Date().toISOString();
 const entries={
  imports:[
   {id:'m-import',profile:'monika',importedAt,bundle:{profile:'monika',records:{dailyActivity:[{date:day,steps:10}],exerciseSessions:[],heartRate:[]}}},
   {id:'z-import',profile:'zsolt',importedAt,bundle:{profile:'zsolt',records:{dailyActivity:[{date:day,steps:12}],exerciseSessions:[],heartRate:[]}}}
  ],
  activity:[
   {id:'m-activity',profile:'monika',date:day,steps:10,updatedAt:importedAt},
   {id:'z-activity',profile:'zsolt',date:day,steps:12,updatedAt:importedAt}
  ]
 };
 const mockElement=tag=>({
  tagName:tag,style:{},innerHTML:'',dataset:{},
  classList:{add(k){state[k]=true},remove(k){state[k]=false},contains(k){return!!state[k]}},
  remove(){},appendChild(){},setAttribute(){},querySelector(){return null},
  querySelectorAll(){return[]}
 });
 const document={
  documentElement:{dataset:{},style:{setProperty(){}}},
  createElement:mockElement,
  getElementById(k){return nodes[k]||null},
  querySelector(){return null},querySelectorAll(){return[]},
  head:{appendChild(e){if(e.id)nodes[e.id]=e}},
  body:{appendChild(e){if(e.id)nodes[e.id]=e}}
 };
 const indexedDB={
  open(name,version){
   assert.equal(name,'healthhub-connect-v1');
   assert.equal(version,undefined,'test must not request an upgrade');
   const r={};
   queueMicrotask(()=>{
    r.result={
     close(){},transaction(names,mode){
      assert.equal(mode,'readonly','test must never write to the live IndexedDB');
      return {objectStore(k){
       return {indexNames:{contains(){return false}},openCursor(){
        const seq=entries[k].slice();
        let i=0,req={};
        function pump(){queueMicrotask(()=>{
         req.result=i<seq.length?{value:seq[i],continue(){i++;pump()}}:null;
         req.onsuccess&&req.onsuccess();
        })}
        pump();return req;
       }};
      }};
     }
    };
    r.onsuccess&&r.onsuccess();
   });
   return r;
  }
 };
 const fresh={
  monika:{profile:'monika',exportedAt:importedAt,records:{dailyActivity:[{date:day,steps:9250,activeMinutes:71,distanceMeters:6100}],exerciseSessions:[],heartRate:[]}},
  zsolt:{profile:'zsolt',exportedAt:importedAt,records:{dailyActivity:[{date:day,steps:14520,activeMinutes:89,distanceMeters:11200}],exerciseSessions:[],heartRate:[]}}
 };
 const localStorage={
  getItem(k){return k==='hh-profile'?profile.value:null},
  setItem(k,v){
   if(k!=='hh-profile')metaWrites.push(k);
   else profile.value=v;
  }
 };
 const window={
  document,localStorage,addEventListener(){},dispatchEvent(){},
  HH_DROPBOX_VAULT:{
   connected(){return true},
   async downloadJson(p){
    reads.push(p);
    return fresh[p.includes('monika')?'monika':'zsolt'];
   }
  },
  HH_DISTANCE_ENGINE_V369:{async height(){return 168},estimate(){return {km:5}}},
  HH_SAMSUNG_SOURCE_V371:{async load(p){return {status:'not_connected',data:null,profile:p}},merge(c){return c}}
 };
 const context={
  window,document,localStorage,indexedDB,performance:{now(){return 100}},
  Date,Math,Number,String,Object,Array,Promise,Intl,console,IDBKeyRange:{only(x){return x}},
  CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail}},
  setInterval(){return 1},clearTimeout(){},setTimeout,clearTimeout
 };
 vm.runInNewContext(script,context,{filename:'profile-engine.js'});
 return{window,reads,readModes,cacheReads,metaWrites,day};
};
test('split profile engine uses exact current canonical cloud and no speculative cached values',()=>{
 assert.match(script,/async function cloudBundle\(profile\)/);
 assert.match(script,/source\.read\(p,false\)/);
 assert.match(main,/source\.read\(p,false\)/);
 assert.match(script,/\/HealthHub\/profiles\/\x27\+p\+\x27-health-connect\.json/);
 assert.match(script,/tx=db\.transaction\(\['imports','activity'\],'readonly'\)/);
 assert.match(script,/if\(row\.value&&row\.value\.profile===profile\)/);
 assert.doesNotMatch(script,/fastReadSnapshot|fastSaveSnapshot|sho-activity-fast-preview/);
 assert.doesNotMatch(script,/Promise\.all\(\[localPromise,heightPromise\]\)\.then/);
 assert.match(script,/Dropbox-export NEM igazolt/);
 assert.match(page,/activity-profile-test\/activity-engine-v1\.js/);
 assert.match(page,/hh191ManualSave=function\(\)/);
});
test('one active profile uses exact profile cloud file and rejects other profile local records',async()=>{
 const x=make();
 x.window.hhOpenActivity();
 await flush(24);
 assert.equal(x.window.hhActivity191CurrentProfile,'monika');
 assert.equal(x.window.hhActivity191Cache.daily.find(z=>z.date===x.day).steps,9250);
 assert.equal(x.window.hhActivity191Source.cloud.bundle.profile,'monika');
 assert.equal(x.window.hhActivitySplitDiag.profile,'monika');
 assert.equal(x.window.hhActivitySplitDiag.localMode,'profile-cursor');
 assert.deepEqual(x.reads,['/HealthHub/profiles/monika-health-connect.json']);
 assert.deepEqual(x.metaWrites,[],'no cloud sync or data metadata changes');
 x.window.hh191Profile('z');
 await flush(24);
 assert.equal(x.window.hhActivity191CurrentProfile,'zsolt');
 assert.equal(x.window.hhActivity191Cache.daily.find(z=>z.date===x.day).steps,14520);
 assert.equal(x.window.hhActivity191Source.cloud.bundle.profile,'zsolt');
 assert.deepEqual(x.reads,[
  '/HealthHub/profiles/monika-health-connect.json',
  '/HealthHub/profiles/zsolt-health-connect.json'
 ]);
 assert.deepEqual(x.metaWrites,[]);
});
