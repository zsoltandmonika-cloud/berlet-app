// HealthHub I-03 coverage-aware time-series regressions (synthetic only).
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const sandbox={window:{},console,Intl,Date,Map};
for(const p of ['healthhub/live-v389-ledger.js','healthhub/live-v390-trends.js','healthhub/live-v388-intelligence.js'])
 vm.runInNewContext(fs.readFileSync(p,'utf8'),sandbox,{filename:p});
const ledger=sandbox.window.HH_INTELLIGENCE_LEDGER_V389;
const engine=sandbox.window.HH_INTELLIGENCE_TRENDS_V390;
const gate=sandbox.window.HH_INTELLIGENCE_GATE_V388;
const now=Date.parse('2026-10-11T16:10:00+02:00');
function before(n){return new Date(Date.parse('2026-10-11T00:00:00Z')-n*86400000).toISOString().slice(0,10)}
function profileData(profile='monika'){
 const daily=[];
 for(let i=1;i<=14;i++)daily.push({date:before(i),steps:i<=7?7000:5000,
  activeMinutes:i<=7?48:31,distanceKm:i<=7?5.2:3.7,activeCaloriesKcal:0});
 daily.unshift({date:before(0),steps:12000,activeMinutes:65,distanceKm:8.2});
 return {
  profile,generatedAt:'2026-10-11T16:10:00+02:00',
  healthConnect:{exportedAt:'2026-10-11T15:49:00+02:00'},
  activity:{recent:daily},
  sleep:{recent:[
   {startTime:'2026-10-10T23:00:00+02:00',endTime:'2026-10-11T03:00:00+02:00',durationMin:240},
   {startTime:'2026-10-11T03:30:00+02:00',endTime:'2026-10-11T06:00:00+02:00',durationMin:150},
   {startTime:'2026-10-10T23:00:00+02:00',endTime:'2026-10-11T03:00:00+02:00',durationMin:240},
   {startTime:'2026-10-09T22:00:00+02:00',endTime:'2026-10-10T04:00:00+02:00',durationMin:360},
   {startTime:'2026-10-10T14:00:00+02:00',endTime:'2026-10-10T15:00:00+02:00',durationMin:60}
  ]},
  heartRate:{latest:{time:'2026-10-11T15:00:00+02:00',bpm:80}},
  metrics:{weight:{latest:{measuredAt:'2026-10-10T11:00:00+02:00',weightKg:77.6}}},
 };
}
function get(c){const l=ledger.build(c,c.profile,{now});return engine.calculate(l,c,{now});}
{
 const c=profileData(),beforeJson=JSON.stringify(c),r=get(c);
 assert.equal(r.schema,'healthhub.intelligence.trends/1');
 assert.equal(r.profile,'monika');
 assert.equal(r.completedThrough,'2026-10-10');
 assert.equal(r.metrics.steps.windows.d7.current.presentDays,7);
 assert.equal(r.metrics.steps.windows.d7.current.comparableMean,7000);
 assert.equal(r.metrics.steps.windows.d7.previous.comparableMean,5000);
 assert.equal(r.metrics.steps.windows.d7.trend.percent,40);
 assert.equal(r.metrics.steps.windows.d30.current.adequate,false);
 assert.equal(r.metrics.steps.windows.d90.current.adequate,false);
 assert.equal(r.quality.todayPartialSteps,12000,'today must not count toward past 7 days');
 assert.equal(r.metrics.active_minutes.windows.d7.trend.available,true);
 assert.equal(r.metrics.pulse_bpm.windows.d7.current.presentDays,0,'today pulse is not yesterday HR');
 assert.equal(r.metrics.pulse_bpm.windows.d7.trend.available,false);
 assert.equal(r.metrics.sleep_minutes.windows.d7.current.presentDays,2);
 assert.equal(r.metrics.sleep_minutes.windows.d7.current.observedMean,375,'awake gap and duplicates excluded');
 assert.equal(r.quality.sleepFragmentedNights,1,'separate intervals remain separate');
 assert.equal(r.metrics.sleep_minutes.windows.d7.current.range.to,'2026-10-11',
  'morning finished sleep belongs in today night window');
 assert.equal(r.metrics.sleep_minutes.windows.d7.current.adequate,false);
 assert.ok(r.issues.some(x=>x.includes('résznapos')));
 assert.equal(JSON.stringify(c),beforeJson,'source data stays untouched');
 const b=engine.brief(r);
 assert.ok(b.some(x=>x.label.includes('Lépések')&&x.value.includes('40%')));
 assert.ok(b.some(x=>/pulzus/i.test(x.label)&&x.value.includes('nem hitelesíthető')));
 assert.ok(b.every(x=>x.domain==='trends'));
}
{
 const c=profileData();
 c.activity.recent=c.activity.recent.filter(x=>![before(3),before(4),before(5)].includes(x.date));
 const r=get(c),w=r.metrics.steps.windows.d7;
 assert.equal(w.current.presentDays,4);
 assert.equal(w.current.adequate,false);
 assert.equal(w.current.comparableMean,null);
 assert.equal(w.trend.available,false,'incomplete current week cannot be called a trend');
 assert.equal(w.previous.comparableMean,5000);
}
{
 const c=profileData();
 assert.throws(()=>engine.calculate(ledger.build(c,'monika',{now}),profileData('zsolt'),{now}),/profilütközés/);
 assert.throws(()=>ledger.build(c,'zsolt',{now}),/profilütközés/);
 assert.throws(()=>gate.prepare({
  schema:'healthhub.ask-lena/1',profile:'monika',consent:false,
  sources:[],extra:[],question:'Trend?'
 },c,{now}),/engedélyezett/);
}
{
 const c=profileData(),l=ledger.build(c,'monika',{now});
 const x=gate.prepare({schema:'healthhub.ask-lena/1',profile:'monika',
  question:'Milyenek a heti trendek?',consent:true,
  sources:[{id:'activity',status:'available',title:'Aktivitás',entries:[{name:'Lépések',value:'7000',observedAt:before(1)}]}],
  extra:[]},c,{now});
 assert.ok(x.trendsQuality);
 assert.equal(x.trendsQuality.stepCoverage7,100);
 assert.ok(x.payload.extra.some(e=>e.domain==='trends'));
 assert.ok(!Object.prototype.hasOwnProperty.call(x.payload,'metrics'),
  'full time series stays only in memory');
 assert.ok(!Object.prototype.hasOwnProperty.call(x.payload,'observations'));
 assert.ok(JSON.stringify({sources:x.payload.sources,extra:x.payload.extra}).length<=18000);
}
console.log('PASS v390: completed days, 7/30/90 coverage, sleep fragments, missing days, profile and no data mutation');
