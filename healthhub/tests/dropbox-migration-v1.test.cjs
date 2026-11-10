const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),test=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'../dropbox-migration-v1.js'),'utf8');
const w={crypto:require('node:crypto').webcrypto,indexedDB:{},localStorage:{},sessionStorage:{},fetch:()=>{},btoa:s=>Buffer.from(s,'binary').toString('base64')};
vm.runInNewContext(source,{window:w,TextEncoder,URL,URLSearchParams,Date,Map,Set,Array,JSON,Error,Number,String,Object});
const merge=w.HH_DROPBOX_MIGRATION_V1.compareCandidate;
function hc(profile,at,records){return {schemaVersion:'healthhub.health-connect/1',profile,exportedAt:at,rangeStart:'2026-11-01',rangeEnd:'2026-11-10',records:{heartRate:records,oxygenSaturation:[],dailySteps:[]},counts:{}}}
function dw(profile,at,hours,apps=[]){return {schema:'healthhub.digital-wellbeing/1',profileKey:profile,collectedAtMs:at,appDetailShared:false,hours,appHours:apps}}
test('two-file HC union retains one record per id and both source-only ids',()=>{
 const a=hc('monika','2026-11-10T04:00:00Z',[{id:'1',x:8},{id:'2',x:7}]);
 const b=hc('monika','2026-11-10T06:00:00Z',[{id:'2',x:7},{id:'3',x:9}]);
 const r=merge(a,b,'monika-health-connect.json');
 assert.deepEqual(Array.from(r.doc.records.heartRate,x=>x.id),['1','2','3']);
 assert.equal(r.doc.counts.heartRateRecords,3);
 assert.equal(r.issues.length,0);
});
test('identical id with different data uses later export, logs conflict',()=>{
 const a=hc('zsolt','2026-11-10T06:00:00Z',[{id:'x',v:7}]);
 const b=hc('zsolt','2026-11-10T05:00:00Z',[{id:'x',v:5}]);
 const r=merge(a,b,'zsolt-health-connect.json');
 assert.equal(r.doc.records.heartRate[0].v,7);
 assert.equal(r.issues.length,1);
 assert.equal(r.issues[0].selection,'outlook');
});
test('Daily records deduplicated by date, not summed',()=>{
 const a=hc('monika','2026-11-10T05:00:00Z',[]);
 const b=hc('monika','2026-11-10T06:00:00Z',[]);
 a.records.dailySteps=[{date:'2026-11-09',count:1500}];b.records.dailySteps=[{date:'2026-11-09',count:1700}];
 const r=merge(a,b,'monika-health-connect.json');
 assert.equal(r.doc.records.dailySteps.length,1);
 assert.equal(r.doc.records.dailySteps[0].count,1700);
});
test('Profile mismatch blocks cross-person data transfer',()=>{
 assert.throws(()=>merge(hc('zsolt','2026-11-10T05:00:00Z',[]),hc('monika','2026-11-10T05:00:00Z',[]),'zsolt-health-connect.json'),/Profilütközés/);
});
test('Same-hour Digital Wellbeing dedup, preserve private app details',()=>{
 const a=dw('monika',100,[{hourStartMs:10,observedForegroundMs:100}],[]);
 const b=dw('monika',200,[{hourStartMs:10,observedForegroundMs:100},{hourStartMs:20,observedForegroundMs:180}],[{hourStartMs:20,packageName:'app',observedForegroundMs:100}]);
 const r=merge(a,b,'monika-digital-wellbeing.json');
 assert.equal(r.doc.hours.length,2);assert.equal(r.doc.appHours.length,0);
});
test('Empty legacy nutrition cannot wipe existing Outlook records',()=>{
 const a={schemaVersion:'nutrition/1',profileKey:'monika',entries:[{id:'a'}],quickRecipes:[{id:'r'}],body:[],goal:{water:2000}};
 const b={schemaVersion:'nutrition/1',profileKey:'monika',entries:[],quickRecipes:[],body:[],catalog:[],units:[],quickRecipeOrder:[],presets:[],goal:{water:250}};
 const r=merge(a,b,'monika-nutrition.json');
 assert.equal(r.doc.entries.length,1);assert.equal(r.doc.quickRecipes.length,1);assert.equal(r.doc.goal.water,2000);
});
test('Do not silently merge unsupported large Vault',()=>{
 assert.throws(()=>merge({profile:'zsolt'},{profile:'zsolt'},'zsolt-vault.json'),/Nem engedélyezett fájltípus/);
});
test('Separate migration token does not touch existing ChatGPT Analytics session',()=>{
 assert.match(source,/hh-migrate-auth-v1/);
 assert.doesNotMatch(source,/hh-chatgpt-target-v739/);
 assert.match(source,/update:item.rev/);
 assert.match(source,/users\/get_current_account/);
 assert.match(source,/expectedEmail/);
 assert.match(source,/Nem a megadott Dropbox-fiók a cél/);
 assert.doesNotMatch(source,/@outlook\.com/i);
});
