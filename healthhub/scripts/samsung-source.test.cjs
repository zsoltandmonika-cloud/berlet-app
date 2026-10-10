'use strict';
/* node healthhub/scripts/samsung-source.test.cjs
 * Synthetic records only; no personal health data or vendor SDK.
 */
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'..','live-v371-samsung.js'),'utf8');
const window={};
vm.runInNewContext(script,{window,Date,Map,Number,Array,Object,Promise});
const api=window.HH_SAMSUNG_SOURCE_V371;
const today=new Date().toISOString().slice(0,10);
const payload=(p='monika')=>({
 schemaVersion:'healthhub.samsung.daily/1',profile:p,exportedAt:new Date().toISOString(),
 records:{dailySummary:[{date:today,activeCaloriesKcal:180,activeMinutes:45,distanceMeters:3500,floorsClimbed:1}]}
});
const normalized=api.normalize('monika',payload());
assert.ok(normalized);
assert.equal(normalized.days.get(today).activeMinutes,45);
assert.equal(api.normalize('zsolt',payload()),null,'Never accept other profile');
assert.equal(api.normalize('monika',{...payload(),schemaVersion:'healthhub.samsung.hack/9'}),null);
assert.equal(api.normalize('monika',{...payload(),exportedAt:'3000-01-01T00:00:00Z'}),null);
assert.equal(api.normalize('monika',{...payload(),records:{dailySummary:[{date:today,activeCaloriesKcal:-12,activeMinutes:1500,floorsClimbed:20000} ]}}).days.size,0);
const original={daily:[{date:today,steps:7000,activeCaloriesKcal:0,activeMinutes:32,distanceMeters:1456}]};
const result=api.merge(original,{status:'ready',data:normalized},'monika');
assert.equal(result.daily[0].steps,7000,'Keep Health Connect steps');
assert.equal(result.daily[0].activeCaloriesKcal,180,'Samsung aggregate wins only when present');
assert.equal(result.daily[0].activeMinutes,45);
assert.equal(result.daily[0].floorsClimbed,1);
assert.equal(result.daily[0].distanceMeters,1456,'Keep HC distance because HealthHub uses own estimate');
assert.equal(result.daily[0]._hhSamsungDistanceMeters,3500);
assert.equal(result.daily[0]._hhHealthConnect.activeMinutes,32,'Source retained');
assert.equal(original.daily[0].activeMinutes,32,'Immutable merge');
assert.equal(api.merge(original,{status:'ready',data:normalized},'zsolt'),original,'No cross-profile leakage');
assert.equal(api.merge(original,{status:'not_connected',data:null},'monika'),original,'HC fallback');

(async()=>{
 const goodVault={connected:()=>true,downloadJson:async p=>{assert.equal(p,'/HealthHub/profiles/monika-samsung-health.json');return payload()}};
 const ready=await api.load('monika',goodVault);assert.equal(ready.status,'ready');
 const offline=await api.load('monika',{connected:()=>false,downloadJson:()=>{throw Error('unexpected')}});assert.equal(offline.status,'unavailable');
 const absent=await api.load('monika',{connected:()=>true,downloadJson:async()=>{let e=Error('not found');e.status=409;throw e}});assert.equal(absent.status,'not_connected');
 console.log('Samsung Health v371 source-adapter tests: PASS (13 assertions/groups).');
})().catch(e=>{console.error(e);process.exitCode=1});
