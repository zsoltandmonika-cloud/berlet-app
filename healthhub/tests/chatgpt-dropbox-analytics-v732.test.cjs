'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../hh-chatgpt-dropbox-analytics-v732.js'),'utf8');
const handlers={};
const window={
 healthSectionKind:'home',addEventListener(){},setInterval(){},setTimeout(){},
 localStorage:{getItem(){return null},setItem(){}},
 HH_DROPBOX_VAULT:null
};
const document={readyState:'complete',getElementById(){return null},hidden:false,addEventListener(){}};
vm.runInNewContext(source,{window,document,Date,Map,Set,Number,Intl,Error,Promise,JSON,fetch(){throw Error('Network must not be called in pure tests');}},{timeout:3000});
const api=window.HH_DROPBOX_CHATGPT_ANALYTICS_V732;
assert(api&&api.version==='732');
const {allowed,summarize,document:makeIndex,checkReadback}=api.model;
const who=api.model.describeDropboxIdentity(
 'dbid:ALREADY_AUTHORIZED_TEST',
 {entries:[{'.tag':'folder',name:'HealthHub'},{'.tag':'folder',name:'other'}]});
assert.equal(who.hasHealthHub,true,'App folder virtual root should be recognized');
assert.equal(who.accountSuffix,'ZED_TEST');
assert.equal(who.visibleFolders.length,2);
assert.equal(api.model.describeDropboxIdentity(
 'dbid:DIFFERENT',{entries:[]}).hasHealthHub,false);
assert.equal(api.model.describeDropboxIdentity(null,{}).accountSuffix,null);
assert(!source.includes("req('users/get_current_account'"),
 'Scope-safe diagnosis must NOT request account_info.read');

assert(allowed('/HealthHub/master/medical-master.json'));
assert(allowed('/HealthHub/master/symptoms.json'));
assert(allowed('/HealthHub/profiles/zsolt-nutrition.json'));
assert(allowed('/HealthHub/profiles/monika-nutrition.json'));
assert(allowed('/HealthHub/profiles/zsolt-health-connect.json'));
assert(allowed('/HealthHub/profiles/monika-digital-wellbeing.json'));
assert(allowed('/HealthHub/analytics/healthhub-daily-health-monika.json'));
assert(allowed('/HealthHub/analytics/healthhub-daily-health-zsolt.json'));
assert(!allowed('/HealthHub/analytics/secrets.json'));
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
const latestText=api.model.auditStatus({...summary,generatedAt:'2026-10-21T01:40:00Z',published:false,warnings:[]},'',null);
assert(latestText.includes('✓ Dropbox-forrásleltár ellenőrizve'));
assert(latestText.includes('8/'+summary.expectedCount));
assert(!latestText.includes('Még nincs ellenőrzött'));
const savedIndexText=api.model.auditStatus({...summary,generatedAt:'2026-10-21T01:40:00Z',published:true,warnings:[]},'',null);
assert(savedIndexText.includes('Privát ChatGPT-index feltöltve és visszaolvasva'));
const cachedText=api.model.auditStatus(null,'',{generatedAt:'2026-10-21T01:40:00Z',presentCount:8,expectedCount:20});
assert(cachedText.includes('Korábbi helyi leltár'));
assert(cachedText.includes('újra kell ellenőrizni'));
assert(api.model.auditStatus(null,'hiba',null).startsWith('⚠ hiba'));
const record=makeIndex(files,summary);
assert.equal(record.connectorReadVerified,false);
assert.equal(record.inventory.length,8);

const first=api.model.compareFiles(files,null,summary.sources);
assert.equal(first.firstAudit,true);
assert.equal(first.counts.baseline,8,'First inventory cannot be called eight new uploads');
assert.equal(first.counts.new,0);
const oldIndex=JSON.parse(JSON.stringify(record));
const repeat=api.model.compareFiles(files,oldIndex,summary.sources);
assert.equal(repeat.firstAudit,false);
assert.equal(repeat.counts.unchanged,8);
assert.equal(repeat.counts.changed,0);
assert.equal(repeat.counts.new,0);
const modified=files.map((f,i)=>i===1?{...f,revision:'another-version',dropboxModifiedAt:'2026-10-21T01:00:00Z'}:f);
const moved=api.model.compareFiles(modified,oldIndex,summary.sources);
assert.equal(moved.counts.changed,1,'Changed Dropbox revision is changed file');
assert.equal(moved.counts.new,0);
assert(moved.rows.some(x=>x.path.endsWith('/master/medications.json')&&x.delta==='changed'));
const additional=modified.concat([{
  path:'/HealthHub/documents/files/new-clinic.pdf',
  relativePath:'documents/files/new-clinic.pdf',profile:'shared',bytes:255,
  dropboxModifiedAt:'2026-10-21T02:00:00Z',revision:'newfile',contentHash:'new'
}]);
const more=api.model.compareFiles(additional,oldIndex,summary.sources);
assert.equal(more.counts.new,1);
assert.equal(more.counts.changed,1);
assert(more.rows.some(x=>x.path.endsWith('new-clinic.pdf')&&x.delta==='new'));
assert(more.rows.some(x=>x.delta==='missing'&&x.path.endsWith('monika-digital-wellbeing.json')));

assert(record.unverifiedExternalSources.some(s=>s.key==='supabase-private-daily-health'));
assert(api.expected.some(x=>x[1]==='analytics/healthhub-daily-health-zsolt.json'));
assert.equal(typeof api.exportPrivateDailyHealth,'function');
assert(checkReadback(record,JSON.parse(JSON.stringify(record))));
assert.throws(()=>checkReadback(record,{...record,fileCount:7}));
assert.throws(()=>checkReadback(record,{...record,generatedAt:'bad'}));
console.log('PASS Dropbox-first Analytics v732: privacy allowlist, both profiles, private Daily Health coverage, missing-source flags, truthful connector status and readback validation');


(async()=>{
 const drop=new Map(),writes=[];
 const w2={
  healthSectionKind:'home',addEventListener(){},setInterval(){},setTimeout(){},
  localStorage:{getItem(){return null},setItem(){}},
  HH_DROPBOX_VAULT:{
   connected(){return true},async accessToken(){return 'synthetic'},
   async uploadJson(p,data){drop.set(p,JSON.parse(JSON.stringify(data)));writes.push(p);return {}},
   async downloadJson(p){return drop.get(p)}
  },
  HH_DAILY_HEALTH_SYNC_V319:{
   getStatus(){return {authenticated:true,authorizedProfiles:['zsolt','monika']}},
   async request(p){
    const profile=p.includes('profile_key=eq.zsolt')?'zsolt':'monika';
    const offset=Number((/offset=(\d+)/.exec(p)||[])[1]||0);
    if(offset>0)return [];
    return [{profile_key:profile,report_date:'2026-10-20',generated_at:'2026-10-20T05:00:00Z',status:'ready',report:{headline:'Synthetic test'}}];
   }
  }
 };
 const doc2={readyState:'complete',getElementById(){return null},hidden:false,addEventListener(){}};
 vm.runInNewContext(source,{window:w2,document:doc2,Date,Map,Set,Number,Intl,Error,Promise,JSON,
  async fetch(url){assert(url.includes('files/create_folder_v2'));return {ok:true,status:200};}},{timeout:3000});
 const output=await w2.HH_DROPBOX_CHATGPT_ANALYTICS_V732.exportPrivateDailyHealth();
 assert.equal(output.exported.length,2);
 assert.equal(output.failed.length,0);
 assert.equal(writes.length,2);
 for(const profile of ['zsolt','monika']){
  const file=drop.get('/HealthHub/analytics/healthhub-daily-health-'+profile+'.json');
  assert(file&&file.profile===profile&&file.count===1);
  assert(file.reports.every(r=>r.profile_key===profile));
 }
 console.log('PASS v732: authenticated two-profile private Daily Health export with Dropbox readback');
})().catch(e=>{console.error(e);process.exitCode=1;});
