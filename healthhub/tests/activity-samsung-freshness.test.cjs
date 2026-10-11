// Regression test for today-only Samsung SDK snapshot freshness (no health data).
// Run: node healthhub/tests/activity-samsung-freshness.test.cjs
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const clock = Date.parse('2026-10-11T16:10:00+02:00');
class TestDate extends Date {
  constructor(...a){super(...(a.length?a:[clock]));}
  static now(){return clock;}
}
const mockWindow = {};
const context = {window:mockWindow,Date:TestDate,console};
const source = fs.readFileSync('healthhub/live-v371-samsung.js','utf8');
vm.runInNewContext(source,context,{filename:'live-v371-samsung.js'});
const api = mockWindow.HH_SAMSUNG_SOURCE_V371;
const today='2026-10-11',yesterday='2026-10-10';
function candidate(sdkAt){
  const json={
    schemaVersion:'healthhub.samsung.daily/1',profile:'monika',
    exportedAt:sdkAt,
    records:{dailySummary:[
      {date:today,activeCaloriesKcal:58,activeMinutes:16},
      {date:yesterday,activeCaloriesKcal:200,activeMinutes:45}
    ]}
  };
  const data=api.normalize('monika',json);
  assert.ok(data,'test SDK fixture is valid');
  return {status:'ready',profile:'monika',data};
}
function hc(exportedAt,kcal=0,minutes=39){
 return {daily:[
   {date:yesterday,steps:3000,activeCaloriesKcal:100,activeMinutes:24},
   {date:today,steps:6021,activeCaloriesKcal:kcal,caloriesKcal:kcal,activeMinutes:minutes,_hhBundleAt:exportedAt}
 ],sessions:[]};
}
{
 const result=candidate('2026-10-11T12:28:00+02:00');
 const out=api.merge(hc('2026-10-11T16:05:00+02:00'),result,'monika');
 assert.equal(out.daily[1].activeCaloriesKcal,0,'stale calories must not be called current');
 assert.equal(out.daily[1].activeMinutes,39,'current-day HC active time takes precedence');
 assert.equal(result.data.staleToday,true,'the old Samsung SDK export must be marked stale');
 assert.equal(out.daily[0].activeMinutes,45,'historical day Samsung data remains available');
}
{
 const result=candidate('2026-10-11T15:25:00+02:00');
 const out=api.merge(hc('2026-10-11T15:40:00+02:00',137,45),result,'monika');
 assert.equal(out.daily[1].activeCaloriesKcal,137,'more recent HC calories win');
 assert.equal(out.daily[1].activeMinutes,45,'more recent HC active minutes win');
 assert.equal(result.data.staleToday,true,'newer HC makes SDK obsolete for today');
}
{
 const result=candidate('2026-10-11T15:59:00+02:00');
 const out=api.merge(hc('2026-10-11T15:25:00+02:00',137,45),result,'monika');
 assert.equal(out.daily[1].activeCaloriesKcal,58,'newer SDK snapshot is allowed');
 assert.equal(out.daily[1].activeMinutes,16,'newer SDK snapshot is not discarded');
 assert.equal(result.data.staleToday,false);
}
{
 const result=candidate('2026-10-11T15:59:00+02:00');
 const out=api.merge(hc('2026-10-11T15:25:00+02:00'),result,'zsolt');
 assert.equal(out.daily[1].activeMinutes,39,'do not mix patient profiles');
}
console.log('PASS: Samsung/HC daily provenance, freshness, historical days, profile isolation');
