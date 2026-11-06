'use strict';
// v1015: Activity/Health Connect sync storm regression, synthetic private data.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const sync=fs.readFileSync(path.join(root,'live-v165.js'),'utf8');
const activity=fs.readFileSync(path.join(root,'live-v191.js'),'utf8');
const profiles=fs.readFileSync(path.join(root,'live-v260.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function make(){
 const local={},pending={},reads=[],listeners={},timers=[];
 const w={
  localStorage:{getItem(key){return local[key]??null},setItem(key,value){local[key]=String(value)}},
  addEventListener(event,fn){(listeners[event]||(listeners[event]=[])).push(fn)},
  dispatchEvent(event){(listeners[event.type]||[]).forEach(fn=>fn(event))},
  HH_DROPBOX_VAULT:{connected(){return true},downloadJson(file){
   reads.push(file);return new Promise((resolve,reject)=>pending[file]={resolve,reject});
  }}
 };
 local['hh-profile']='m';
 const document={documentElement:{dataset:{}},getElementById(){return null}};
 const context={window:w,localStorage:w.localStorage,document,navigator:{userAgent:'Android'},
  URL,location:{href:'https://example.org/healthhub/'},history:{replaceState(){}},
  setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
  console,Date,Promise,Map};
 vm.runInNewContext(sync,context,{filename:'live-v165.js'});
 return{w,reads,pending,listeners,timers};
}

test('Nov 3 importer reads only the requested profile file',async()=>{
 const h=make(),applied=[];
 h.w.hhImportHealthConnectRaw=async function(raw,path){applied.push({profile:raw.profile,path})};
 const pending=h.w.hhHealthCloudSyncProfile('monika',true);
 assert.deepEqual(h.reads,['/HealthHub/profiles/monika-health-connect.json']);
 h.pending['/HealthHub/profiles/monika-health-connect.json'].resolve({profile:'monika',exportedAt:'2026-11-03T08:00:00Z',records:{dailyActivity:[]}});
 assert.equal(await pending,true);
 assert.deepEqual(applied,[{profile:'monika',path:'Dropbox /HealthHub/profiles/monika-health-connect.json'}]);
 assert.equal(h.reads.some(x=>x.includes('zsolt-health-connect')),false);
});
test('Nov 3 importer refuses wrong-profile Health Connect file without importing',async()=>{
 const h=make();let applied=0;
 h.w.hhImportHealthConnectRaw=async function(){applied++};
 const p=h.w.hhHealthCloudSyncProfile('monika',true);
 h.pending['/HealthHub/profiles/monika-health-connect.json'].resolve({profile:'zsolt',records:{}});
 assert.equal(await p,false);
 assert.equal(applied,0);
});
test('Nov 3 restores canonical importer without 12-second in-memory response cache',async()=>{
 const h=make();let applied=0;
 h.w.hhImportHealthConnectRaw=async function(){applied++};
 assert.equal(h.w.HH_HEALTH_CONNECT_SOURCE_V1015,undefined);
 const one=h.w.hhHealthCloudSyncProfile('monika',true);
 h.pending['/HealthHub/profiles/monika-health-connect.json'].resolve({profile:'monika',exportedAt:'2026-11-03T08:00:00Z'});
 assert.equal(await one,true);
 const two=h.w.hhHealthCloudSyncProfile('monika',true);
 assert.equal(h.reads.length,2,'explicit second sync starts a new source read');
 h.pending['/HealthHub/profiles/monika-health-connect.json'].resolve({profile:'monika',exportedAt:'2026-11-03T09:00:00Z'});
 assert.equal(await two,true);
 assert.equal(applied,2);
});
test('rollback script references and Activity refresh behavior are consistent',()=>{
 assert.ok(activity.includes("window.addEventListener('healthhub:healthconnect-imported',refreshIfOpen)"));
 assert.ok(activity.includes("window.addEventListener('healthhub:health-cloud-synced',refreshIfOpen)"));
 assert.ok(activity.includes('window.hhHealthCloudSync(false)'));
 assert.ok(sync.includes('try{got=await downloadRaw(profile)}'));
 assert.ok(!sync.includes('readSharedCloud('));
 assert.ok(profiles.includes("if(isOn('hhActivityPage191')"));
 assert.ok(html.includes('live-v165.js?v=306-rollback-20261106'));
 assert.ok(html.includes('live-v191.js?v=1013-source-guard-20261106'));
 assert.ok(html.includes('live-v260.js?v=303-rollback-20261106'));
});
