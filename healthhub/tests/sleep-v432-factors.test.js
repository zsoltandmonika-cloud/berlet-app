'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('healthhub/live-v170.js','utf8');
const css=fs.readFileSync('healthhub/sleep-three-views-v428.css','utf8');
const html=fs.readFileSync('healthhub/index.html','utf8');
function section(start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Function markers must be present: '+start);
 return source.slice(a,b);
}
const vitals=section('function hhSelectNightVitals384(','function hhNightBiometrics384(');
const factors=section('function sleepFactorCards381(','function sleepOverview(');
function environment(preview,vital){
 const ctx={
  window:{HH_SLEEP_V428_ENABLED:preview,HH_SLEEP_V428:{night:()=>({
   startTime:'2026-10-13T01:26:00Z',endTime:'2026-10-13T04:00:00Z',stages:[],sessions:[]})}},
  hhLatestNight:()=>({startTime:'2026-10-13T10:07:00Z',endTime:'2026-10-13T13:05:00Z'}),
  hhSleepVitals384:{zsolt:null,monika:null},
  hhSleepMetrics382:()=>({actual:142,efficiency:.92,stages:[
   {stage:4,startTime:'2026-10-13T01:26:00Z',endTime:'2026-10-13T02:36:00Z'},
   {stage:5,startTime:'2026-10-13T02:36:00Z',endTime:'2026-10-13T03:15:00Z'},
   {stage:6,startTime:'2026-10-13T03:15:00Z',endTime:'2026-10-13T03:47:00Z'}
  ]}),
  hhSleepIndex382:()=>({tone:'warn',score:54,label:'Figyelmet igényel'}),
  hhSleepTone382:()=>({tone:'warn',label:'6 óránál rövidebb'}),
  hhSleepEfficiency382:()=>({tone:'good',label:'Kevés ébrenlét'}),
  hhNightBiometrics384:()=>vital,
  durMin:(a,b)=>(Date.parse(b)-Date.parse(a))/60000,
  durText:(min)=>{let x=Math.round(min||0);return Math.floor(x/60)+' ó '+x%60+' p'},
  esc:(v)=>String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
 };
 vm.runInNewContext(' '+vitals+' '+factors,ctx,{filename:'healthhub-factors-v432.js'});
 return ctx;
}
const night={startTime:'2026-10-13T01:26:00Z',endTime:'2026-10-13T04:00:00Z'};
const healthy={pulse:{value:74,minutes:134},oxygen:{value:93,minutes:1}};
let ctx=environment(true,healthy),render=ctx.sleepFactorCards381(night,'zsolt');
assert.ok(render.indexOf('Éjszakai pulzus')<render.indexOf('Könnyű alvás'),
 'Pulse must be directly before light sleep in preview');
assert.match(render,/74 \/perc/,'Actual measured overnight pulse visible');
assert.match(render,/hhSleepFactorsV432/,'Compact 2-column preview flag present');
assert.doesNotMatch(render,/Saját, becsült pihenésindex · nem Samsung-pontszám/,
 'Redundant long index disclaimer is removed from visible card');
assert.match(render,/Hogyan számoljuk az alvásindexet/,
 'Detailed disclosure remains in expandable explanation');
assert.match(render,/Éjszakai véroxigén/,
 'Known oxygen data remains available, without replacing pulsemeter');
ctx=environment(true,{pulse:null,oxygen:null});render=ctx.sleepFactorCards381(night,'zsolt');
assert.match(render,/Éjszakai pulzus/,'Empty pulse measurement still reserves matching card');
assert.match(render,/Nincs éjszakai pulzusadat/,'Empty data must be clearly identified, not invented');
assert.equal((render.match(/hhSleepFactor381 hhSleepRag382/g)||[]).length,6,
 'Exactly six paired basic tiles when optional oxygen is absent');
ctx=environment(false,{pulse:null,oxygen:null});render=ctx.sleepFactorCards381(night,'zsolt');
assert.ok(render.indexOf('Könnyű alvás')>0 && !render.includes('Éjszakai pulzus'),
 'Stable Sleep remains unchanged when preview is off');
assert.match(render,/Saját, becsült pihenésindex · nem Samsung-pontszám/,
 'Stable scoring label is not changed by preview-only release');
assert.doesNotMatch(render,/hhSleepFactorsV432/,'No preview CSS flag in stable mode');

const records={heartRate:[{startTime:'2026-10-13T02:00:00Z',
 endTime:'2026-10-13T02:20:00Z',samples:[{time:'2026-10-13T02:01:00Z',bpm:74}]}],
 oxygenSaturation:[{time:'2026-10-13T02:05:00Z',percent:93}]};
ctx=environment(true,healthy);
ctx.hhSelectNightVitals384('zsolt',records,[night]);
assert.equal(ctx.hhSleepVitals384.zsolt.nightKey,
 '2026-10-13T01:26:00Z|2026-10-13T04:00:00Z',
 'Preview vitals must bind to the main night, even after a daytime nap');
assert.equal(ctx.hhSleepVitals384.zsolt.heartRate.length,1);
assert.equal(ctx.hhSleepVitals384.zsolt.oxygenSaturation.length,1);
assert.equal(ctx.hhSleepVitals384.monika,null,'No cross-profile fallback');
ctx=environment(false,healthy);
ctx.hhSelectNightVitals384('zsolt',records,[night]);
assert.equal(ctx.hhSleepVitals384.zsolt.nightKey,
 '2026-10-13T10:07:00Z|2026-10-13T13:05:00Z',
 'The unmodified stable nightly selection must remain active');

assert.match(css,/#hhSleepPage \.hhSleepFactorsV432 \.hhSleepFactors381\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/,
 'Preview tiles must stay two columns at mobile widths');
assert.match(css,/#hhSleepPage \.hhSleepFactorsV432 \.hhSleepFactor381\{[^}]*grid-column:auto!important/,
 'The light-sleep card cannot expand to full row in the preview');
assert.match(html,/sleep-three-views-v428\.css\?v=432-pulse-light-compact/,
 'New preview CSS must not be served from old cache');
assert.match(html,/live-v170\.js\?v=432-pulse-light-golden/,
 'New Sleep renderer must not be served from old cache');
console.log('Sleep v432 PASS: paired pulse/light, clear missing measurements, source-aligned night, no redundant subtitle, stable view untouched');
