'use strict';
// HealthHub v1018 · source-read performance pilot. All fixtures are synthetic.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const source=name=>fs.readFileSync(path.join(base,name),'utf8');
const shared=source('live-v165.js');
const sleep=source('live-v170.js');
const activity=source('live-v191.js');
const wear=source('hc-wear-history-v1150.js');
const evidence=source('intelligence-sleep-evidence-v651.js');
const html=source('index.html');
test('all Health Connect readers use one shared, profile-scoped verified payload',()=>{
 assert.match(activity,/HH_HEALTH_CONNECT_SOURCE_V1015/);
 assert.match(sleep,/source\.read\(profile\)/);
 assert.match(sleep,/String\(raw\.profile\|\|''\)\.toLowerCase\(\)===profile/);
 assert.match(wear,/source\.read\(p\)/);
 assert.match(wear,/profile\(raw\.profile\)===p/);
 assert.match(evidence,/source\.read\(profile\)/);
 assert.match(evidence,/String\(raw\.profile\|\|''\)\.toLowerCase\(\)!==profile/);
});
test('45-second memo is in-tab only; forced refresh bypasses it',async()=>{
 const start=shared.indexOf('var sharedCloud=new Map()');
 const end=shared.indexOf('async function processIncoming(');
 assert.ok(start>=0&&end>start);
 const reads=[];
 const fake={HH_DROPBOX_VAULT:{
  async downloadJson(file){reads.push(file);const p=file.includes('monika')?'monika':'zsolt';
   return {profile:p,records:{sleepSessions:[],dailyActivity:[]},exportedAt:'2026-11-17T10:00:00Z'}}
 }};
 const context={window:fake,localStorage:{getItem:()=>null},Date,Promise,Error,Map,console};
 vm.runInNewContext(shared.slice(start,end),context,{filename:'health-connect-inflight.js'});
 const api=fake.HH_HEALTH_CONNECT_SOURCE_V1015;
 assert.equal(api.version,'1018-shared-health-read');
 await Promise.all([api.read('zsolt'),api.read('zsolt'),api.read('zsolt')]);
 assert.equal(reads.length,1,'three overlapping users must share one cloud transfer');
 await api.read('zsolt');
 assert.equal(reads.length,1,'repeat open during TTL must be instant from tab memory');
 await api.read('monika');
 assert.equal(reads.length,2,'other profile requires its own verified payload');
 const other=await api.read('monika');
 assert.equal(other.raw.profile,'monika');
 await api.read('zsolt',true);
 assert.equal(reads.length,3,'explicit force bypasses cached result');
 api.invalidate('zsolt');
 await api.read('zsolt');
 assert.equal(reads.length,4);
 assert.match(shared,/SHARED_TTL_MS=45000/);
});
test('Sleep Refresh uses source invalidation rather than a stale local snapshot',()=>{
 assert.match(sleep,/onclick="hhRefreshSleepNowV1018\(\)"/);
 assert.match(sleep,/source\.invalidate\(pkey\(\)\)/);
 assert.match(sleep,/hhSleepPerfV1=\{totalMs:/);
 assert.doesNotMatch(sleep,/localStorage\.setItem\('hhSleepPerfV1'/);
});
test('HealthHub loads the modified assets and preserves Activity optimizations',()=>{
 for(const name of ['live-v165.js','live-v170.js','hc-wear-history-v1150.js','intelligence-sleep-evidence-v651.js'])
  assert.match(html,new RegExp(name.replace(/\./g,'\\.')+'\\?v=[^\\s"<>]*cache=1018-shared-verified-read'));
 assert.match(html,/live-v191\.js\?v=1017-profile-memory-verified/);
 assert.match(activity,/LOCAL_MEMO_TTL_MS=45000/);
 assert.match(activity,/if\(!hasVisibleData\)page\.innerHTML=/);
});
