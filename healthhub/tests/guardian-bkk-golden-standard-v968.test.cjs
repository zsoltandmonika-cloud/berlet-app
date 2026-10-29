'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../guardian');
const transport=path.resolve(__dirname,'../../sh9/smart-travel/public-transport');
const read=(base,name)=>fs.readFileSync(path.join(base,name),'utf8');
const guardian=read(root,'index.html');
const bkkJs=read(root,'guardian-bkk-golden-planner-v968.js');
const bkkCss=read(root,'guardian-bkk-golden-planner-v968.css');

test('v968 is enabled after original BKK timetable and route engine',()=>{
 assert.match(guardian,/guardian-bkk-golden-planner-v968\.css\?v=968-uniform-golden-profile/);
 assert.match(guardian,/guardian-bkk-golden-planner-v968\.js\?v=968-uniform-golden-profile/);
 assert.ok(guardian.indexOf('guardian-bkk-golden-planner-v968.js')>
  guardian.indexOf('guardian-smart-hub-router-v804.js'));
 assert.equal((guardian.match(/id="hhSmartHubFromV806"/g)||[]).length,1);
 assert.equal((guardian.match(/id="hhSmartHubToV806"/g)||[]).length,1);
 for(const id of ['hhSmartHubPairedV806','hhSmartHubSwapV806','hhSmartHubCurrentPositionV860',
 'hhPlannerNowV939','hhPlannerDepartV939','hhPlannerArriveV939','hhPlannerDateV939',
 'hhSmartHubNativeResultsV803','hhSmartHubPlanV806','hhSmartHubTripPlansV804'])
  assert.match(guardian,new RegExp('id="'+id+'"'),id+' present');
});

test('MÁV, Volán, Smart Trip and BKK use Golden Standard building blocks',()=>{
 for(const file of ['mav/index.html','volan/index.html','index.html']){
  const html=read(transport,file);
  for(const part of ['class="phead"','class="mode"','class="routebox"',
   'class="stationfields"','class="datetime"','class="actions"','class="rail-journey-quick"'])
   assert.ok(html.includes(part),file+' missing '+part);
 }
 for(const part of ['hh-bkk-golden-head-v968','hh-planner-time-buttons-v939',
  'hh-bkk-golden-routebox-v968','hh-bkk-golden-datetime-v968',
  'hh-bkk-golden-actions-v968','hh-bkk-golden-quick-v968'])
  assert.ok(bkkJs.includes(part),part+' reused in BKK');
 assert.match(bkkCss,/grid-template-columns:minmax\(0,1\.46fr\) minmax\(0,1fr\)/);
 assert.match(bkkCss,/data-guardian-profile="m"/);
});

test('Original BKK prediction, keyboard and time logic are retained',()=>{
 assert.match(bkkJs,/nativePair\.prepend\(rail\)/);
 assert.match(bkkJs,/head\.append\(title,nativeMode\)/);
 assert.match(bkkJs,/route\.append\(nativePair,datetime\)/);
 assert.match(bkkJs,/originalPlan\.click\(\)/);
 assert.match(bkkJs,/originalDate\.dispatchEvent\(new Event\('change'/);
 assert.match(guardian,/guardian-bkk-keyboard-dock-v964\.js\?v=965-original-field-no-autofill/);
 assert.doesNotMatch(bkkJs,/fetch\(|watchPosition\(|getCurrentPosition\(|setInterval\(/);
});

test('Trips save only by click, locally per profile, with delete and replay',()=>{
 assert.match(bkkJs,/hh-bkk-golden-trips-v968-/);
 assert.match(bkkJs,/getItem\('hh-profile'\)/);
 assert.match(bkkJs,/hhBkkGoldenSaveV968'\)\.addEventListener\('click'/);
 assert.match(bkkJs,/hhBkkGoldenJourneysV968'\)\.addEventListener\('click'/);
 assert.match(bkkJs,/hh-guardian-map-origin-v836/);
 assert.match(bkkJs,/hh-guardian-map-destination-v819/);
 assert.match(bkkJs,/items\.splice\(index,1\)/);
});
