'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const nutri=path.resolve(__dirname,'..');
const source=p=>fs.readFileSync(path.join(nutri,p),'utf8');
const html=source('index.html');
const css=source('hh-nutrition-premium-dark-wave-v1200.css');
const upstream=fs.readFileSync(path.resolve(nutri,'../../sh9/shared/lena-premium-wave-v2.css'),'utf8');

test('new Nutrition Golden Standard skin is the final head stylesheet after approved wave V2',()=>{
 const token='hh-nutrition-premium-dark-wave-v1200.css?v=1200-approved-waves';
 assert.equal(html.split(token).length,2,'one scoped skin loaded');
 const head=html.slice(0,html.indexOf('</head>'));
 const links=[...head.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(x=>x[0]);
 assert.ok(links.some(x=>x.includes(token)),'v1200 baseline remains loaded');
 assert.ok(links.at(-1).includes('hh-hydration-showcase-v1202.css'),'v1202 only upgrades the hydration card');
 assert.ok(head.indexOf('lena-premium-wave-v2.css')<head.indexOf(token));
 assert.match(html,/body data-lp-v2="on" data-lp-module="nutrition"/);
});

test('exact reference Léna Sleep wave is reused as painted background on Nutrition',()=>{
 assert.match(upstream,/--lpv-wave:url\(/,'the approved wave must exist');
 assert.match(css,/background-image:[\s\S]*?var\(--lpv-wave\),[\s\S]*?var\(--lpv-wave\)/);
 assert.match(css,/#balanceCard\.balance\.hh-body\{[\s\S]*?background-image:var\(--lpv-wave\)/);
 assert.match(css,/data-profile="monika"/);
 assert.match(css,/data-lpv-owner="m"/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
});

test('all primary nutrition panels have scoped Golden Standard ink and glass',()=>{
 for(const id of ['#balanceCard','#hhNutritionQuickPanelV1137','#hhNutritionQuickGridV1137',
 '#hhInterfoodTileV1173','#logDate','#hhNutritionSyncUtilityV1136','#hhWaterGoal']){
  assert.ok(css.includes(id),id);
 }
 for(const s of ['.hh-bevitel-tile','.glass.kpi','.glass.section','.glass.log','.hh-water.glass']){
  assert.ok(css.includes(s),s);
 }
 assert.match(css,/color:#ffffff!important/);
 assert.match(css,/--nutri3-border:/);
});

test('only CSS and stylesheet reference are modified, preserve all functional selectors, photos and sizes',()=>{
 const untouched=[
  'id="nutritionApprovedHero"','id="ringKcal"','id="hhNetRing"','id="hhWaterLevel"',
  'id="hhWaterGaugeFill"','id="hhManualLaunch1130"','id="hhQuickDiaryV1137"',
  'id="addFood"','id="addDrink"','id="hhBevitelAI"',
  'id="hhBevitelRecipeStudioV1151"','id="hhInterfoodTileV1173"',
  'class="hh-interfood-brand-v1174"','id="log"','id="syncNutritionNow"',
  'id="hhNutritionQuickGridV1137"'
 ];
 for(const s of untouched)assert.ok(html.includes(s),s);
 assert.match(html,/nutri-chipmunk-3d-v594\.webp/);
 assert.match(html,/interfood-logo-v1174\.webp/);
 assert.match(html,/hh-bevitel-photo/);
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
 assert.doesNotMatch(clean,/(?:^|[\s;{])(?:position|top|bottom|left|right|width|height|min-height|max-height|display|overflow|grid-template-columns|grid-template-rows|transform|object-fit|pointer-events|z-index|scroll-snap-type)\s*:/m);
 assert.doesNotMatch(clean,/#hhWaterLevel|#hhWaterGaugeFill|#hhNetRing|\.hh-body-circle|\.hh-pitcher|\.hh-sl-star/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});
