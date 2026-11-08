'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../nutrition');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html'),original=read('hh-nutrition-quick-glass-v1137.css'),
 compact=read('hh-quick-compact-sync-v1152.css'),
 bevitel=read('hh-bevitel-premium-v643.css'),v1151=read('hh-bevitel-recipe-studio-v1151.css');
const cardIds=['hhManualLaunch1130','hhQuickLaunch','hhQuickOwnFoodsV1137','hhQuickDiaryV1137'];
test('All four Quick Intake tiles keep original IDs, order, names and handlers',()=>{
 const indexes=cardIds.map(id=>html.indexOf('id="'+id+'"'));
 assert.ok(indexes.every((p,i)=>p>0&&(!i||p>indexes[i-1])));
 assert.ok(indexes[3]<html.indexOf('<dialog id="hhManualDialog1130"'));
 assert.match(html,/id="hhManualLaunch1130"[^>]*aria-controls="hhQuickDialog"/);
 assert.match(html,/id="hhQuickLaunch"[^>]*aria-controls="hhQuickDialog"/);
 for(const name of ['Gyors bevitel','Kedvencek','Saját ételek','Napi napló']){
  assert.ok(html.includes('<strong>'+name+'</strong>'),name);
 }
 assert.match(html,/hh-nutrition-quick-glass-v1137\.js\?v=1137-quick-buttons-tada/);
 assert.match(html,/hh-manual-intake-v1130\.js\?v=1147-quick-to-favorite/);
});
test('Compact override loads after old quick + Bevitel style, original profile colors retained',()=>{
 const uri='hh-quick-compact-sync-v1152.css?v=1152-match-bevitel-card-height';
 assert.ok(html.includes(uri));
 assert.ok(html.indexOf('hh-nutrition-quick-glass-v1137.css')<html.indexOf(uri));
 assert.ok(html.indexOf('hh-bevitel-recipe-studio-v1151.css')<html.indexOf(uri));
 assert.match(original,/html\[data-profile="monika"\]/);
 assert.match(original,/color:#f5b2db/);
 assert.match(original,/color:#acd8ff/);
 assert.match(original,/#hhManualToast1135:not\(\[hidden\]\)/);
 assert.match(original,/aspect-ratio:1 \/ 1/);
 assert.match(compact,/aspect-ratio:auto/);
 assert.match(compact,/min-height:0/);
 assert.match(compact,/flex-direction:row/);
 assert.match(compact,/align-items:flex-start/);
 assert.match(compact,/text-align:left/);
 assert.match(compact,/@media\(max-width:540px\)/);
 assert.match(compact,/@media\(max-width:360px\)/);
 assert.match(v1151,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('Existing dynamic Bevitel KPI card height is reused for every Quick tile',()=>{
 const section=html.match(/\/\* v1152 · The same measured KPI height[\s\S]*?(?=<\/script>)/)?.[0];
 assert.ok(section,'v1152 shared height observer present');
 assert.match(section,/document\.querySelector\('\.grid \.kpi'\)/);
 assert.match(section,/document\.querySelector\('\.hh-bevitel-grid'\)/);
 assert.match(section,/document\.getElementById\('hhNutritionQuickGridV1137'\)/);
 assert.match(section,/ResizeObserver\(resize\)/);
 assert.match(compact,/height:var\(--hh-kpi-card-height,103px\)/);
 assert.match(bevitel,/height:var\(--hh-kpi-card-height,103px\)/);
 const vars={bevitel:[],quick:[]},events={},kpi={getBoundingClientRect:()=>({height:76})};
 const elements={
  '.grid .kpi':kpi,
  '.hh-bevitel-grid':{style:{setProperty:(a,b)=>vars.bevitel.push([a,b])}},
  hhNutritionQuickGridV1137:{style:{setProperty:(a,b)=>vars.quick.push([a,b])}}
 };
 const doc={readyState:'complete',querySelector:selector=>elements[selector]||null,
  getElementById:id=>elements[id]||null,addEventListener:(name,fn)=>events[name]=fn};
 const ResizeObserver=class{constructor(cb){events.resizeObserver=cb}observe(target){
  assert.equal(target,kpi)}};
 const win={ResizeObserver,addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(section,{document:doc,window:win,ResizeObserver});
 assert.deepEqual(vars.bevitel,[['--hh-kpi-card-height','76px']]);
 assert.deepEqual(vars.quick,[['--hh-kpi-card-height','76px']]);
 events.resizeObserver();
 assert.deepEqual(vars.bevitel[1],vars.quick[1]);
});
test('Four compact cards are two-up on mobile and desktop without touching diary or AI Scan',()=>{
 assert.match(compact,/#hhNutritionQuickGridV1137\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(compact,/#hhNutritionQuickGridV1137 > button\.hh-nutrition-quick-tile-v1137\{/);
 assert.match(compact,/width:34px;/);
 assert.match(compact,/height:34px;/);
 assert.match(compact,/width:29px;height:29px/);
 assert.match(compact,/border-radius:17px/);
 assert.doesNotMatch(compact,/\.hh-bevitel-tile|hhManualToast1135|recordAiMeal|fetch\(|putImage|puter|upload|localStorage/);
 assert.match(html,/id="hhBevitelRecipeStudioV1151"/);
 assert.match(html,/id="hhBevitelAI"/);
});
