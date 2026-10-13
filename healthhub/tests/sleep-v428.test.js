'use strict';
/* Pure, offline regression tests: no cloud credentials or personal data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('healthhub/sleep-three-views-v428.js','utf8');
function load(enabled=true){
 const window={location:{search:enabled?'?hh_sleep_v428_preview=1':''}};
 const ctx={window,URLSearchParams,Intl,Date,Number,Array,Math,String,Set,
  document:{addEventListener:function(){}},localStorage:{getItem:()=> 'z'},
  requestAnimationFrame:function(){}};
 vm.runInNewContext(source,ctx,{filename:'sleep-three-views-v428.js'});
 return window.HH_SLEEP_V428;
}
const sleep=load();
function rec(a,b,stages,id){
 return {id:id||a,startTime:a,endTime:b,stages:(stages||[]).map(x=>({
  stage:x[0],startTime:x[1],endTime:x[2]})),sourcePackage:'com.sec.android.app.shealth'};
}
const NOW=Date.parse('2026-10-13T12:00:00Z'); // Budapest 14:00
const night=rec('2026-10-12T22:00:00Z','2026-10-13T02:00:00Z',
 [[4,'2026-10-12T22:00:00Z','2026-10-13T02:00:00Z']],'night');
const nap=rec('2026-10-13T10:00:00Z','2026-10-13T10:45:00Z',
 [[4,'2026-10-13T10:00:00Z','2026-10-13T10:45:00Z']],'nap');
let v=sleep.summarize([night,nap],NOW);
assert.equal(v.last.id,'nap','The newest nap is latest sleep');
assert.equal(v.night.sessions[0].id,'night','The latest main night does not become the nap');
assert.equal(v.lastActual,45*60000);
assert.equal(v.nightActual,240*60000);
assert.equal(v.daily,285*60000,'Night + nap both count in rolling 24h');
assert.ok(sleep.top([night,nap],'zsolt').includes('Utolsó alvás'));
assert.ok(sleep.top([night,nap],'zsolt').includes('Éjjeli alvás'));
assert.ok(sleep.top([night,nap],'zsolt').includes('Elmúlt 24 óra'));
assert.equal(sleep.top([night,nap],'zsolt').includes('Mónika'),false,'No other profile mentioned');

const duplicate={...night,id:'duplicate-night'};
assert.equal(sleep.summarize([night,duplicate,nap],NOW).daily,285*60000,
 'Duplicated/overlapping sleep interval must not inflate 24h');
const partial=rec('2026-10-12T11:00:00Z','2026-10-12T13:00:00Z',
 [[4,'2026-10-12T11:00:00Z','2026-10-12T13:00:00Z']],'boundary');
assert.equal(sleep.summarize([partial],NOW).daily,60*60000,'24h boundary must clip stages');
const noStages=rec('2026-10-13T08:00:00Z','2026-10-13T09:00:00Z',[],'unknown');
assert.equal(sleep.summarize([noStages],NOW).daily,null,
 'No stage observations must never be assumed full sleep');
const unrelated=rec('2026-10-13T09:00:00Z','2026-10-13T10:00:00Z',
 [[1,'2026-10-13T09:00:00Z','2026-10-13T10:00:00Z']],'awake');
assert.equal(sleep.summarize([unrelated],NOW).daily,null,
 'Only awake stage must not become sleep');
assert.equal(load(false).top([night,nap],'zsolt'),'','Default feature flag must be off');

const calendar=sleep.calendar([night,nap],'zsolt');
assert.ok(calendar.includes('hh428CalendarNav'));
assert.ok(calendar.includes('30 NAPOS ALVÁSNAPTÁR'));
assert.ok(!calendar.includes('on-demand szinkron'),'Calendar must be read-only');
console.log('HealthHub Sleep v428 regression PASS: 3 metrics, naps, night selection, 24h union, boundary, missing data, flag, calendar.');
