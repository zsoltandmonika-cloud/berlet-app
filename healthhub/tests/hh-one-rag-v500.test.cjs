'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const base=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(base,'hh-one-rag-v500.js'),'utf8');
const w={location:{href:'https://example.org/berlet-app/healthhub/'},addEventListener(){}};
const d={readyState:'loading',addEventListener(){}};
vm.runInNewContext(source,{window:w,document:d,Date,console});
const api=w.HH_ONE_RAG_V500;
assert.equal(typeof api?.classify,'function');
const now=Date.now();
const time=(ms)=>new Date(now-ms).toISOString();
const registry={schema:'healthhub.device_registry/1',
 activePhones:{zsolt:'android-z',monika:'android-m'},archived:[]};
const device=(id,owner,age=50000,state='done')=>({
 deviceId:id,deviceType:'android',activeProfile:owner,lastSeenAt:time(age),
 status:{state,updatedAt:time(age)},
 lastHealthSyncAt:time(age)
});
const both=[device('android-z','zsolt'),device('android-m','monika')];
const classify=api.classify;
assert.equal(classify(registry,both,true).color,'green','two recently seen verified phones');
assert.equal(classify(registry,both,false).color,'red','disconnected vault must not show green');
assert.equal(classify(registry,[both[0]],true).color,'amber','missing Mónika phone');
assert.equal(classify(registry,[device('android-z','monika'),both[1]],true).color,'amber','wrong-owner phone');
assert.equal(classify(registry,[device('android-z','zsolt',3600000),both[1]],true).color,'amber','stale heartbeat');
assert.equal(classify(registry,[device('android-z','zsolt',50000,'failed'),both[1]],true).color,'amber','failed status');
assert.equal(classify(registry,[device('android-z','zsolt',50000,'pending'),both[1]],true).color,'amber','queued operation not green');
assert.equal(classify(registry,[device('android-z','zsolt',50000,'running'),both[1]],true).color,'amber','running not successful');
assert.equal(classify(registry,[device('android-z','zsolt',50000),device('android-z','monika')],true).color,'amber','duplicate ID forbidden');
assert.equal(classify({...registry,archived:['android-z']},both,true).color,'amber','archived phone not active');
assert.equal(classify(registry,[{...both[0],deviceType:'web'},both[1]],true).color,'amber','browser cannot be physical phone');
assert.notEqual(classify(null,both,true).color,'green','unknown registry');
assert.match(source,/hhOrchestratorDispatchScope355\('all',null,'health'\)/,'existing health scope only');
assert.doesNotMatch(source,/hhOrchestratorDispatchScope355\('all',null,'full'\)/,'never claim full supported');
assert.match(source,/root\.confirm\(/,'owner confirmation');
const main=fs.readFileSync(path.join(base,'index.html'),'utf8');
const digital=fs.readFileSync(path.join(base,'digital-health','index.html'),'utf8');
assert.match(main,/hh-one-rag-v500\.js\?v=500-private-rag/);
assert.match(digital,/\.\.\/hh-one-rag-v500\.js\?v=500-private-rag/);
const meta=main.match(/healthhub-live-build" content="([^"]+)"/)?.[1];
const bootstrap=main.match(/var v='([^']+)'/)?.[1];
assert.equal(meta,'v'+bootstrap,'Level3 guard version must be aligned');
console.log('HH One v500 RAG tests PASS: owner/device/freshness/command status and cross-page bootstraps.');
