'use strict';
/* Pure, offline regression tests: no cloud credentials or personal data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('healthhub/sleep-three-views-v428.js','utf8');
// Freeze the test clock so tomorrow's midnight HealthCheck is deterministic too.
const FIXED_NOW=Date.parse('2026-10-13T12:00:00Z');
class FixedDate extends Date { static now(){return FIXED_NOW;} }
function load(enabled=true,searchOverride){
 // Default production is Golden Standard; the old UI is an explicit opt-out.
 const search=searchOverride!=null?searchOverride:(enabled?'':'?hh_sleep_v428_preview=0');
 const window={location:{search:search},addEventListener:function(){}};
 // Model the minimal browser surface used by the CSS-only Premium Glass adapter.
 // No stylesheet loads in this offline computation test; production code is unchanged.
 const document={
  addEventListener:function(){},
  documentElement:{setAttribute:function(){},dataset:{}},
  createElement:function(){return {dataset:{},addEventListener:function(){}}},
  head:{appendChild:function(){}}
 };
 const ctx={window,location:window.location,URLSearchParams,Intl,Date:FixedDate,Number,Array,Math,String,Set,
  document,localStorage:{getItem:()=> 'z'},
  requestAnimationFrame:function(){}};
 vm.runInNewContext(source,ctx,{filename:'sleep-three-views-v428.js'});
 return window.HH_SLEEP_V428;
}
const sleep=load();
function rec(a,b,stages,id){
 return {id:id||a,startTime:a,endTime:b,stages:(stages||[]).map(x=>({
  stage:x[0],startTime:x[1],endTime:x[2]})),sourcePackage:'com.sec.android.app.shealth'};
}
const NOW=FIXED_NOW; // Budapest 14:00, stable regardless of CI run date
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
assert.equal(load(false).top([night,nap],'zsolt'),'','Explicit classic flag must turn new UI off');
assert.ok(load(true,'').top([night,nap],'zsolt').includes('Utolsó alvás'),'No-query, normal production URL must enable Golden Standard Sleep');
assert.ok(load(true,'?hh_sleep_v428_preview=1').top([night,nap],'zsolt').includes('Utolsó alvás'),'Existing preview bookmarks remain valid');
assert.equal(load(true,'?hh_sleep_legacy=1').top([night,nap],'zsolt'),'','Alternative legacy flag opens the old display only');

const calendar=sleep.calendar([night,nap],'zsolt');
assert.ok(calendar.includes('hh428CalendarNav'));
assert.ok(calendar.includes('30 NAPOS ALVÁSNAPTÁR'));
assert.ok(!calendar.includes('on-demand szinkron'),'Calendar must be read-only');
const css=fs.readFileSync('healthhub/sleep-three-views-v428.css','utf8');
const html=fs.readFileSync('healthhub/index.html','utf8');
assert.match(css,/\.hh428Value\{[^}]*white-space:nowrap/,'Card durations must fit on one line');
assert.match(css,/\.hh428Cards\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,
 'Three compact overview cards must stay side by side');
assert.match(css,/\.hh428Timebar,\.hh428RecordBar\{[^}]*height:27px/,
 '24h timeline must be a short, flat ribbon');
assert.match(css,/\.hh428RecordBar\{height:24px\}/,
 'Calendar timeline must also be compact');
assert.match(html,/sleep-three-views-v428\.css\?v=433-golden-standard/,
 'Release needs a fresh cache key for the new card styles');
assert.match(html,/sleep-three-views-v428\.js\?v=433-default-sleep/,
 'Release needs a fresh cache key for the new timeline code');
assert.match(sleep.top([night,nap],'zsolt'),/hh428Timebar/,
 'Flat stage bar must remain present under the three cards');
assert.doesNotMatch(sleep.top([night,nap],'zsolt'),/style="top:/,
 'Sleep-phase spans may not be four-level vertical stacks');

// v430: Zoom only the visual domain; never alter actual 24h measured totals.
const visual=sleep.timelineViewport([night,nap],NOW-24*3600000,NOW);
assert.equal(visual.zoom,true,'The domain should dynamically zoom to the measured sessions');
assert.ok(visual.start < Date.parse(night.startTime),'Viewport adds context before the first sleep');
assert.ok(visual.end > Date.parse(nap.endTime),'Viewport adds context after the last sleep');
assert.ok(visual.end-visual.start < 17*3600000,'Zoom should remove irrelevant outer empty hours');
assert.equal(sleep.summarize([night,nap],NOW).daily,285*60000,
 'Visual zoom must not change the measured 24-hour sum');
const actualTicks=sleep.timelineTicks([night,nap],visual.start,visual.end);
assert.match(actualTicks,/00:00/,'First night start must be shown as a real clock time');
assert.match(actualTicks,/04:00/,'End of nighttime sleep must be shown as a real clock time');
assert.match(actualTicks,/12:00/,'Afternoon nap start must be shown as a real clock time');
assert.match(actualTicks,/12:45/,'Nap end must follow its actual time-axis position');
assert.match(actualTicks,/left:\d+\.\d+%/,'Tick positions must be proportional, not evenly invented');
const emptyView=sleep.timelineViewport([],NOW-24*3600000,NOW);
assert.equal(emptyView.zoom,false,'No-record case keeps the complete 24h scale');
assert.equal(emptyView.end-emptyView.start,24*3600000);
const alone=sleep.timelineViewport([nap],NOW-24*3600000,NOW);
assert.ok(alone.end-alone.start>=150*60000,'Short naps keep enough time context to read');
assert.ok(alone.end-alone.start<24*3600000,'A single nap still zooms in');
assert.match(sleep.top([night,nap],'zsolt'),/Automatikusan nagyított idővonal/,
 'The UI must explicitly explain that the visual time scale has changed');

// v431: the two full-session phase charts must PRECEDE the combined assessment.
const twoTimelines=sleep.recentTimelines([night,nap],'zsolt');
assert.match(twoTimelines,/Fő \(éjjeli\) alvás/,'First graph explains overnight main sleep');
assert.match(twoTimelines,/Utolsó alvás/,'Second graph is the latest (daytime) sleep');
assert.equal((twoTimelines.match(/hh431RecentBar/g)||[]).length,2,'Exactly two labeled stage graphs');
assert.ok(twoTimelines.indexOf('Fő (éjjeli) alvás')<twoTimelines.indexOf('Utolsó alvás'),
 'Timeline order is main overnight sleep, then last sleep');
assert.match(twoTimelines,/04:00/,'Main night ends at its actual recorded end time');
assert.match(twoTimelines,/12:45/,'Latest nap ends at its actual recorded end time');
assert.doesNotMatch(sleep.recentTimelines([night,nap],'monika'),/Zsolt/,
 'Timeline markup must not mix Zsolt into the Monika view');
assert.equal(load(false).recentTimelines([night,nap],'zsolt'),'','Manual old Sleep display remains available unchanged');
const assessment=sleep.lenaComment([night,nap],'zsolt');
assert.match(assessment,/4 ó 0 p/,'Léna considers the overnight rest');
assert.match(assessment,/45 p/,'Léna considers the latest nap');
assert.match(assessment,/4 ó 45 p/,'Léna considers the de-duplicated 24h total');
assert.match(assessment,/nem diagnózis/,'Review never claims to diagnose');
assert.doesNotMatch(sleep.lenaComment([night,nap],'monika'),/Zsolt/,
 'Léna narration must use the currently selected profile only');
const sameSession=sleep.recentTimelines([night],'zsolt');
assert.match(sameSession,/ugyanahhoz az alvásrekordhoz/,
 'When last sleep is also the main night, explain the duplicate view');
assert.match(calendar,/hh431HistoryDetails/,
 'The calendar is still accessible but its details are collapsible');
const mainRenderer=fs.readFileSync('healthhub/live-v170.js','utf8');
const recentPos=mainRenderer.indexOf('HH_SLEEP_V428.recentTimelines(rows,requestedProfile)');
const lenaPos=mainRenderer.indexOf('HH_SLEEP_V428.lenaComment(rows,requestedProfile)');
const calendarPos=mainRenderer.indexOf('HH_SLEEP_V428.calendar(rows,requestedProfile)');
const helperPos=mainRenderer.indexOf('hhSleepCard helperCard');
assert.ok(recentPos>0&&lenaPos>recentPos,'Two graphs must render before Léna');
assert.ok(calendarPos>lenaPos&&helperPos>calendarPos,
 'Historical calendar must move toward the Sleep Helper section');
console.log('HealthHub Sleep v433 regression PASS: 3 metrics, naps, night selection, 24h union, boundary, missing data, flag, calendar.');
