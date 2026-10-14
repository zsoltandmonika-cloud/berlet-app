'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'hh-one-service-intelligence-v501.js'),'utf8');
const ctx={window:{},Date,console};
vm.runInNewContext(source,ctx);
const api=ctx.window.HH_ONE_SERVICE_INTELLIGENCE_V501;
assert.equal(typeof api?.recommend,'function');
const now=Date.now(),stamp=(age)=>new Date(now-age).toISOString();
const registry={schema:'healthhub.device_registry/1',activePhones:{zsolt:'android-z',monika:'android-m'},archived:[]};
const phone=(id,owner,age=10000,status='done')=>({
 deviceId:id,activeProfile:owner,deviceType:'android',lastSeenAt:stamp(age),
 status:{state:status,updatedAt:stamp(age)}
});
const both=[phone('android-z','zsolt'),phone('android-m','monika')];
const calc=(data)=>Array.from(api.recommend({cloud:true,registry,devices:both,nowMs:now,...data}));
const names=(r)=>Array.from(r,x=>x.id);
assert.ok(names(calc({cloud:false})).includes('OPS-CLOUD'));
assert.ok(names(calc({registry:null})).includes('OPS-REGISTRY'));
assert.ok(names(calc({devices:[both[0]]})).includes('OPS-DEVICE-monika'));
assert.ok(names(calc({devices:[phone('android-z','zsolt',3600000),both[1]]})).includes('OPS-HEARTBEAT-zsolt'));
assert.ok(names(calc({devices:[phone('android-z','zsolt',10000,'failed'),both[1]]})).includes('OPS-COMMAND-zsolt'));
assert.ok(names(calc({devices:[phone('android-z','zsolt',10000,'pending'),both[1]]})).includes('OPS-WAIT-zsolt'));
assert.ok(!names(calc({})).includes('OPS-RUNTIME'));
const health={at:stamp(10000),errors:{errors24:4},perf:{longTasks:11,avgLoad:4200}};
assert.ok(names(calc({opsHealth:health})).includes('OPS-RUNTIME'));
assert.ok(names(calc({opsHealth:health})).includes('DEV-PERFORMANCE'));
assert.ok(!names(calc({opsHealth:{...health,at:stamp(3*86400000)}})).includes('OPS-RUNTIME'));
const normal=calc({});
assert.ok(names(normal).includes('DEV-ONE-AGENT'));
assert.ok(normal.every(x=>x.status.includes('jóváhagyás')&&x.evidence&&x.proposal));
assert.doesNotMatch(source,/(?:uploadJson|fetch\(|\.delete\(|localStorage\.setItem)/,'advice must be read-only');
assert.doesNotMatch(source,/(?:vérnyomás érték|gyógyszer dózis|lelet tartalma)/,'no clinical telemetry');
const main=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(main,/hh-one-service-intelligence-v501\.js\?v=501-level3-advice/);
const scripts=[...main.matchAll(/const liveWithWellbeingClick=([^\n]+)/g)][0]?.[1]||'';
assert.ok(scripts.indexOf('hh-one-service-intelligence-v501.js')<scripts.indexOf('hh-one-rag-v500.js'),
  'advisory engine must load before the Service Center');
console.log('HH One Service Intelligence v501 tests PASS: real evidence, stale gates, read-only and loader order.');
