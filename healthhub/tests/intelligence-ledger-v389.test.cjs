// HealthHub Intelligence I-02 regression tests. All fixtures are synthetic.
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const window={};
const context=vm.createContext({window,console,Map,Date,Number});
for(const file of ['healthhub/live-v389-ledger.js','healthhub/live-v388-intelligence.js']){
 vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const ledgerApi=window.HH_INTELLIGENCE_LEDGER_V389,gate=window.HH_INTELLIGENCE_GATE_V388;
const now=Date.parse('2026-10-11T16:10:00+02:00');
const today='2026-10-11';
function hc(profile='monika'){
 return {profile,generatedAt:'2026-10-11T16:09:00+02:00',
  healthConnect:{exportedAt:'2026-10-11T16:05:00+02:00'},
  activity:{recent:[
   {date:today,steps:6021,activeMinutes:39,activeCaloriesKcal:0,distanceKm:2.22},
   {date:'2026-10-10',steps:5000,activeMinutes:31,distanceKm:1.9},
   {date:today,steps:6021,activeMinutes:39,activeCaloriesKcal:0,distanceKm:2.22}
  ]},
  metrics:{bloodPressure:{latest:{measuredAt:'2026-10-11T09:30:00+02:00',systolic:112,diastolic:71,source:'Omron'}},
   weight:{latest:{measuredAt:'2026-10-10T08:00:00+02:00',weightKg:77.6,source:'Beurer'}}},
  sleep:{recent:[{startTime:'2026-10-11T00:00:00+02:00',endTime:'2026-10-11T03:00:00+02:00',durationMin:180},
   {startTime:'2026-10-11T03:15:00+02:00',endTime:'2026-10-11T06:00:00+02:00',durationMin:165}]},
  heartRate:{latest:{time:'2026-10-11T15:00:00+02:00',bpm:88}}};
}
function samsung(profile='monika',timestamp='2026-10-11T12:28:00+02:00'){
 return {status:'ready',data:{profile,exportedAt:timestamp,
  days:new Map([[today,{activeMinutes:16,activeCaloriesKcal:58,distanceMeters:1023}]])}};
}
function request(profile='monika'){
 return {schema:'healthhub.ask-lena/1',profile,consent:true,question:'Mai aktív idő?',
  sources:[{id:'activity',status:'available',title:'Mozgás',
   entries:[{name:'Aktív idő',value:'39',unit:'perc',observedAt:today}]}],
  extra:[]};
}
{
 const src=hc(),before=JSON.stringify(src);
 const l=ledgerApi.build(src,'monika',{now,samsung:samsung()});
 assert.equal(l.profile,'monika');
 assert.equal(l.schema,'healthhub.intelligence.ledger/1');
 assert.ok(l.observations.every(x=>x.profile==='monika'));
 assert.ok(l.observations.every(x=>x.observedAt&&x.observedPrecision));
 assert.ok(l.quality.duplicatesSkipped>=4);
 const todayMinutes=l.observations.filter(x=>x.type==='active_minutes'&&x.observedAt===today);
 assert.equal(todayMinutes.length,2,'older Samsung and newer HC values both retained');
 assert.deepEqual(todayMinutes.map(x=>x.value).sort((a,b)=>a-b),[16,39]);
 assert.equal(l.comparisons.length,1);
 assert.equal(l.comparisons[0].type,'active_minutes');
 assert.equal(l.comparisons[0].newestSnapshotSource,'healthhub-activity-cache');
 assert.ok(!l.observations.some(x=>x.type==='active_kcal'&&x.sourceSystem==='healthhub-activity-cache'),
  'legacy HC 0-calorie placeholder must never be called a measured value');
 assert.equal(l.observations.filter(x=>x.type==='sleep_minutes').length,2,
  'do not collapse segmented sleep into a fabricated full-night session');
 assert.equal(JSON.stringify(src),before,'input context must not be mutated');
 const result=gate.prepare(request(),src,{now});
 assert.ok(result.ledgerQuality.count>0);
 assert.equal(result.sourceDisagreements,0,
  'SDK data is NOT in an Ask Léna request unless a verified active-profile SDK state is present');
 assert.ok(result.payload.extra.some(x=>x.label.includes('Intelligence Ledger')));
 assert.ok(!('observations' in result.payload),'full sensitive ledger stays local');
 assert.ok(JSON.stringify(result.payload).length<20000);
}
{
 const src=hc();
 const l=ledgerApi.build(src,'monika',{now,samsung:samsung('zsolt')});
 assert.ok(l.warnings.some(w=>w.code==='sdk_profile_mismatch'));
 assert.ok(!l.observations.some(o=>o.sourceSystem==='samsung-health-data-sdk'));
 assert.throws(()=>ledgerApi.build(src,'zsolt',{now}),/profilütközés/);
 assert.throws(()=>gate.prepare(request('zsolt'),src,{now}),/profilütközés/);
 assert.throws(()=>gate.prepare({...request(),consent:false},src,{now}),/engedélyezett/);
}
{
 const src=hc();
 src.metrics.bloodPressure.latest.systolic=999;
 src.heartRate.latest.time='2026-12-11T12:00:00+02:00';
 const l=ledgerApi.build(src,'monika',{now});
 assert.ok(!l.observations.some(o=>o.type==='systolic_mmhg'));
 assert.ok(!l.observations.some(o=>o.type==='pulse_bpm'&&o.sourceSystem==='health-connect-heart-rate'));
 assert.ok(l.warnings.some(w=>w.code==='future_measurement'));
}
{
 const l=ledgerApi.build(null,'zsolt',{now});
 assert.equal(l.quality.count,0);
 assert.ok(l.warnings.some(w=>w.code==='missing_context'));
 assert.equal(ledgerApi.brief(l).length>0,true);
}
console.log('PASS I-02: timestamp precision, multi-source disagreements, no fake zero, consent, profile and nonmutation');
