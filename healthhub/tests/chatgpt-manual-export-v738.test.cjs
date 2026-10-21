// Synthetic, private-data-free tests for HealthHub v738.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const code=fs.readFileSync(path.join(__dirname,'..','hh-chatgpt-manual-export-v738.js'),'utf8');
const t=Date.parse('2026-10-21T02:55:00Z');
const src={
 '/HealthHub/profiles/zsolt-health-connect.json':{
  profile:'zsolt',exportedAt:'2026-10-21T02:00:00Z',
  records:{
   heartRate:[{startTime:'2026-10-20T12:00:00Z',endTime:'2026-10-20T12:05:00Z',samples:[{time:'2026-10-20T12:00:00Z',bpm:69}]},
    {startTime:'2026-10-17T12:00:00Z',endTime:'2026-10-17T12:05:00Z'}],
   dailySteps:[{date:'2026-10-20',count:5500},{date:'2026-10-18',count:1000}],
   sleepSessions:[{startTime:'2026-10-20T01:00:00Z',endTime:'2026-10-20T06:00:00Z'}],
   undated:[{value:123}]
  }
 },
 '/HealthHub/profiles/zsolt-digital-wellbeing.json':{profile:'zsolt',days:[{date:'2026-10-20',screenTimeMinutes:120}]},
 '/HealthHub/profiles/zsolt-nutrition.json':{profile:'zsolt',entries:[{date:'2026-10-20'}]},
 '/HealthHub/profiles/monika-health-connect.json':{profile:'monika',records:{dailySteps:[{date:'2026-10-20',count:4000}]}},
 '/HealthHub/profiles/monika-digital-wellbeing.json':{profile:'monika',days:[{date:'2026-10-20'}]}
};
const w={HH_DROPBOX_VAULT:{connected:()=>true,downloadJson:async p=>{
 if(!Object.prototype.hasOwnProperty.call(src,p))throw Error('Dropbox 409');
 return src[p];
}},setInterval:()=>0};
const d={readyState:'loading',addEventListener:()=>{}};
vm.runInNewContext(code,{window:w,document:d,Date,console});
const api=w.HH_CHATGPT_MANUAL_EXPORT_V738;
assert.equal(api.version,'738');

(async()=>{
 const z=await api.build('zsolt',t);
 assert.equal(z.profile,'zsolt');
 assert.equal(z.data.digitalWellbeing.days[0].screenTimeMinutes,120);
 assert.equal(z.data.healthConnect.records.heartRate.length,1);
 assert.equal(z.data.healthConnect.records.dailySteps.length,1);
 assert.equal(z.data.healthConnect.records.sleepSessions.length,1);
 assert.equal(z.data.healthConnect.coverage.undated.undatedExcluded,1);
 assert.equal(z.data.nutrition.entries.length,1);
 assert.equal(z.isAutomaticSync,false);
 assert.equal(z.chatgptReadVerified,false);
 assert.ok(z.warnings.length>0);
 const m=await api.build('monika',t);
 assert.equal(m.profile,'monika');
 assert.equal(m.data.healthConnect.records.dailySteps[0].count,4000);
 assert.equal(m.data.digitalWellbeing.profile,'monika');
 src['/HealthHub/profiles/zsolt-digital-wellbeing.json']={profile:'monika',days:[]};
 await assert.rejects(api.build('zsolt',t),/másik profil/);
 delete src['/HealthHub/profiles/zsolt-digital-wellbeing.json'];
 await assert.rejects(api.build('zsolt',t),/kötelező forrás/);
 assert.equal(api.recordWindow({startTime:'2026-10-18T00:00:00Z',endTime:'2026-10-20T04:00:00Z'},t-86400000,t),'included');
 console.log('PASS v738: 24h health window, Digital Wellbeing, optional failures, both profiles, cross-profile guard.');
})().catch(e=>{console.error(e);process.exitCode=1;});
