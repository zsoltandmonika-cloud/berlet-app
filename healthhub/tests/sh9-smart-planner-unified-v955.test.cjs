'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../guardian');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'guardian-smart-planner-unified-v955.css'),'utf8');

test('SH9 v955 Smart Planner has one outer glass card and no nested decorative panels',()=>{
 assert.match(html,/id="hhSmartHubDestinationV802" class="hh-smart-hub-v802"/);
 assert.match(html,/guardian-smart-planner-unified-v955\.css\?v=955-one-surface/);
 assert.ok(html.indexOf('guardian-smart-planner-unified-v955.css')>html.indexOf('guardian-smart-hub-clean-space-v954.css'));
 assert.match(css,/#hhSmartHubDestinationV802\.hh-smart-hub-v802\{[\s\S]*?gap:0!important/);
 for(const selector of [
  '.hh-active-transit-v862','.hh-smart-hub-field-v806',
  '.hh-planner-time-v939','.hh-smart-hub-favorites-v806'
 ]){
  const start=css.indexOf('#hhSmartHubDestinationV802 '+selector+'{');
  assert.ok(start>=0,selector+' style exists');
  const body=css.slice(start,css.indexOf('}',start));
  assert.match(body,/background:transparent!important/,selector+' has no independent card fill');
  assert.match(body,/box-shadow:none!important/,selector+' has no extra shadow');
 }
 for(const selector of ['.hh-smart-hub-paired-v806','.hh-planner-time-v939','.hh-smart-hub-favorites-v806','.hh-smart-hub-routes-v804']){
  const start=css.indexOf('#hhSmartHubDestinationV802 '+selector+'{');
  assert.ok(start>=0);
  assert.match(css.slice(start,css.indexOf('}',start)),/border-top:1px solid var\(--sh9-planner-seam\)!important/);
 }
});

test('SH9 v955 retains all real controls and the original BKK/live route architecture',()=>{
 for(const id of [
  'hhActiveTransitBoardV862','hhActiveTransitCurrentV862','hhActiveTransitStopV862',
  'hhSmartHubPairedV806','hhSmartHubFromV806','hhSmartHubToV806','hhSmartHubSwapV806',
  'hhSmartHubCurrentPositionV860','hhPlannerNowV939','hhPlannerDepartV939',
  'hhPlannerArriveV939','hhPlannerDateV939','hhSmartHubPlanV806',
  'hhSmartHubFavoritesV806','hhSmartHubFavoriteRowsV806',
  'hhSmartHubPriorityTransfersV805','hhSmartHubPriorityWalkingV805',
  'hhSmartHubPriorityWaitingV806','hhSmartHubTripPlansV804','hhSmartHubGuideV805',
  'hhSmartHubTripStatusV804','hhSmartHubDestinationStatusV802'
 ]) assert.ok(html.includes('id="'+id+'"'),id+' retained');
 assert.match(html,/<details class="hh-smart-hub-sources-v954">/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/@media\(max-width:375px\)/);
 assert.match(css,/:root\[data-guardian-profile="m"\] #hhSmartHubDestinationV802/);
 assert.doesNotMatch(css,/fetch\(|XMLHttpRequest|setInterval\(|watchPosition\(|getCurrentPosition\(|new maplibregl|supabase\.co|https?:\/\//);
});

test('SH9 v955 preserves functional color, focus, actual results and empty-status behavior',()=>{
 for(const fragment of [
  '#hhSmartHubDestinationV802 .hh-active-transit-current-v862',
  '#hhSmartHubDestinationV802 .hh-smart-hub-field-v806 input:focus-visible',
  '#hhSmartHubDestinationV802 .hh-smart-hub-favorites-v806>summary:focus-visible',
  '#hhSmartHubDestinationV802 .hh-smart-hub-plans-v804:not(:empty)',
  '#hhSmartHubDestinationV802 .hh-smart-hub-sources-v954'
 ])assert.ok(css.includes(fragment),fragment);
 assert.match(css,/var\(--selected\)|var\(--accent\)/);
 const previous=fs.readFileSync(path.join(root,'guardian-smart-hub-clean-space-v954.css'),'utf8');
 assert.match(previous,/:empty\{display:none!important\}/);
 assert.match(previous,/\.hh-smart-hub-auto-v806\[hidden\]/);
});
