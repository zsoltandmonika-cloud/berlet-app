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
test('simultaneous Activity and importer requests share one Dropbox read per profile',async()=>{
 const h=make(),api=h.w.HH_HEALTH_CONNECT_SOURCE_V1015;
 assert.ok(api&&typeof api.read==='function');
 const a=api.read('monika',false),b=api.read('monika',false),c=api.read('zsolt',false);
 assert.equal(h.reads.length,2,'one read for each distinct profile');
 assert.ok(h.pending['/HealthHub/profiles/monika-health-connect.json']);
 assert.ok(h.pending['/HealthHub/profiles/zsolt-health-connect.json']);
 const mz={profile:'monika',exportedAt:'2026-11-05T07:00:00Z',records:{dailyActivity:[{date:'2026-11-05',steps:123}]}};
 const zz={profile:'zsolt',exportedAt:'2026-11-05T07:05:00Z',records:{dailyActivity:[{date:'2026-11-05',steps:678}]}};
 h.pending['/HealthHub/profiles/monika-health-connect.json'].resolve(mz);
 h.pending['/HealthHub/profiles/zsolt-health-connect.json'].resolve(zz);
 const results=await Promise.all([a,b,c]);
 assert.equal(results[0].raw.profile,'monika');
 assert.equal(results[1].raw.profile,'monika');
 assert.equal(results[2].raw.profile,'zsolt');
 await api.read('monika',false);
 assert.equal(h.reads.length,2,'12-second session cache prevents duplicate fetch');
 const forced=api.read('monika',true);
 assert.equal(h.reads.length,3,'explicit force must bypass completed response');
 h.pending['/HealthHub/profiles/monika-health-connect.json'].resolve(mz);
 await forced;
 await assert.rejects(api.read('other',false),/profil/i);
});
test('failed Dropbox read is evicted and may be retried',async()=>{
 const h=make(),api=h.w.HH_HEALTH_CONNECT_SOURCE_V1015;
 const first=api.read('monika',false);
 h.pending['/HealthHub/profiles/monika-health-connect.json'].reject(new Error('offline'));
 await assert.rejects(first,/offline/);
 const second=api.read('monika',false);
 assert.equal(h.reads.length,2);
 h.pending['/HealthHub/profiles/monika-health-connect.json'].resolve({profile:'monika',records:{}});
 await second;
});
test('source overlap does not trigger duplicate Activity rerenders',()=>{
 assert.match(activity,/window\.addEventListener\('healthhub:healthconnect-imported',function\(event\)/);
 assert.doesNotMatch(activity,/window\.addEventListener\('healthhub:health-cloud-synced',refreshIfOpen\)/);
 assert.match(activity,/var changed=event&&event\.detail&&event\.detail\.profile/);
 assert.match(activity,/if\(changed&&changed!==pkey\(\)\)return/);
 assert.match(profiles,/if\(reason!=='cloud'&&isOn\('hhActivityPage191'\)/);
 assert.match(activity,/var hasVisibleData=window\.hhActivity191CurrentProfile===requestedProfile/);
 assert.match(activity,/if\(!hasVisibleData\)page\.innerHTML=/);
 assert.match(activity,/window\.HH_HEALTH_CONNECT_SOURCE_V1015/);
 assert.match(sync,/try\{got=await readSharedCloud\(profile,!!force\)\}/);
 assert.match(html,/live-v165\.js\?v=1015-shared-hc-read/);
 assert.match(html,/live-v191\.js\?v=1017-profile-memory-verified/);
 assert.match(html,/live-v260\.js\?v=1015-activity-event-dedupe/);
});
