'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../hh-chatgpt-dropbox-analytics-v732.js'),'utf8');
const handlers={};
const window={
 healthSectionKind:'home',addEventListener(){},setInterval(){},
 localStorage:{getItem(){return null},setItem(){}},
 HH_DROPBOX_VAULT:null
};
const document={readyState:'complete',getElementById(){return null},hidden:false,addEventListener(){}};
vm.runInNewContext(source,{window,document,Date,Map,Set,Number,Intl,Error,Promise,JSON,fetch(){throw Error('Network must not be called in pure tests');}},{timeout:3000});
const api=window.HH_DROPBOX_CHATGPT_ANALYTICS_V732;
assert(api&&api.version==='732');
const {allowed,summarize,document:makeIndex,checkReadback}=api.model;
assert(allowed('/HealthHub/master/medical-master.json'));
assert(allowed('/HealthHub/master/symptoms.json'));
assert(allowed('/HealthHub/profiles/zsolt-nutrition.json'));
assert(allowed('/HealthHub/profiles/monika-nutrition.json'));
assert(allowed('/HealthHub/profiles/zsolt-health-connect.json'));
assert(allowed('/HealthHub/profiles/monika-digital-wellbeing.json'));
assert(allowed('/HealthHub/documents/files/report.pdf'));
assert(allowed('/HealthHub/shared/nutrition-images/test.jpg'));
assert(!allowed('/HealthHub/orchestrator/commands/device.json'));
assert(!allowed('/HealthHub/sync/secrets.json'));
assert(!allowed('/HealthHub/profiles/monika-oauth-token.json'));
assert(!allowed('/not-healthhub/private.pdf'));
const fake=['master/documents.json','master/medications.json',
 'master/medical-master.json','master/symptoms.json',
 'profiles/zsolt-nutrition.json','profiles/monika-nutrition.json',
 'profiles/zsolt-health-connect.json','profiles/monika-health-connect.json'];
const files=fake.map((p,i)=>({path:'/HealthHub/'+p,relativePath:p,profile:p.includes('zsolt')?'zsolt':p.includes('monika')?'monika':'shared',bytes:100+i,dropboxModifiedAt:'2026-10-20T10:00:00Z',revision:'test'+i,contentHash:'fixture'}));
const summary=summarize(files);
assert.equal(summary.fileCount,8);
assert.equal(summary.presentCount,8);
assert.equal(summary.missingCount,summary.expectedCount-8);
const n=summary.sources.find(s=>s.path.endsWith('zsolt-nutrition.json'));
assert.equal(n.status,'present');
const missing=summary.sources.find(s=>s.path.endsWith('monika-digital-wellbeing.json'));
assert.equal(missing.status,'missing');
const record=makeIndex(files,summary);
assert.equal(record.connectorReadVerified,false);
assert.equal(record.inventory.length,8);
assert(record.unverifiedExternalSources.some(s=>s.key==='supabase-private-daily-health'));
assert(checkReadback(record,JSON.parse(JSON.stringify(record))));
assert.throws(()=>checkReadback(record,{...record,fileCount:7}));
assert.throws(()=>checkReadback(record,{...record,generatedAt:'bad'}));
console.log('PASS Dropbox-first Analytics v732: privacy allowlist, both profiles, missing source flags, truthful connector status and readback validation');
