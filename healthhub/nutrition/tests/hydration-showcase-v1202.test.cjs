'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const html=read('index.html'),css=read('hh-hydration-showcase-v1202.css'),code=read('hh-hydration-showcase-v1202.js'),core=read('nutrition-preview-v592.js');
const id=x=>(html.match(new RegExp('id="'+x+'"','g'))||[]).length;

test('approved pitcher + one 250ml glass are the only two visible hydration tap actions',()=>{
 for(const x of ['hhWaterShowcaseV1202','hhJugTapV1202','hhGlassTapV1202',
 'hhShowcaseTotalV1202','hhShowcaseTargetV1202','hhShowcasePctV1202',
 'hhShowcaseBarV1202','hhShowcaseStagesV1202','hhShowcaseGoalEditV1202'])assert.equal(id(x),1,x);
 for(const x of ['waterQuickAdd','hhJarReset','hhWaterAmount','hhWaterGoal','hhWaterSave',
 'hhWaterLevel','hhWaterGaugeFill','hhWaterPct','hhHydrationStatus'])assert.equal(id(x),1,x);
 assert.match(html,/id="hhJugTapV1202"[^>]*type="button"/);
 assert.match(html,/id="hhGlassTapV1202"[^>]*type="button"/);
 assert.match(html,/id="hhShowcaseGoalDetailsV1202"/);
 assert.match(css,/\.hh-water > :is\(\.hh-water-copy,\.hh-hydration-side\)/);
 assert.match(code,/glass\.addEventListener\('click',function\(\)\{oldAdd\.click\(\);\}\)/);
 assert.match(code,/jug\.addEventListener\('click',function\(\)\{oldReset\.click\(\);\}\)/);
});

test('eight transparent png levels plus separate zero are rasterized from one stable jug master',()=>{
 assert.match(code,/\[306,283,256,229,201,173,145,116,86\]/);
 assert.match(code,/for\(var i=0;i<=8;i\+\+\)buildFrame\(i\)/);
 assert.match(code,/canvas\.toBlob\(function\(blob\)/);
 assert.match(code,/,['"]image\/png['"]\)/);
 assert.match(code,/Math\.floor\(n\/STEP\)/);
 assert.match(code,/Math\.min\(8,/);
 assert.match(code,/function jugSvg\(step\)/);
 assert.match(code,/data:image\/svg\+xml/);
 assert.match(code,/frameUrls=new Map\(\)/);
 assert.doesNotMatch(code,/localStorage|sessionStorage|indexedDB|fetch\(|\.entries\.push|update\(/);
});

test('existing diary, cloud sync, goal, pitcher gauge and automatic daily emptying all remain',()=>{
 assert.match(core,/click\('waterQuickAdd',logWater250\)/);
 assert.match(core,/click\('hhJarReset',resetJar\)/);
 assert.match(core,/click\('hhWaterSave'/);
 assert.match(core,/checkJarMidnight\(\)/);
 assert.match(core,/localStorage\.setItem\(JAR_KEY\+active\+'-'\+date/);
 assert.match(core,/function dailyJarOffset/);
 assert.match(core,/\$\('hhWaterLevel'\)\.style\.height=fillHeight\+'%'/);
 assert.match(core,/waterGauge\.style\.transform='scaleY\('/);
 assert.match(core,/az utolsó ürítés óta/);
 assert.match(code,/gauge\.getAttribute\('aria-label'\)/);
 assert.match(code,/goalHost\.appendChild\(goalEditor\)/);
});

test('water fill and empty play different short water effects and obey Nutrition silent mode',()=>{
 assert.match(core,/function sounds\(\)\{return localStorage\.getItem\('hh-nutrition-PREVIEW-sound'\)!=='off'\}/);
 assert.match(core,/if\(!sounds\(\)\)return/);
 assert.match(core,/if\(type==='water'\)/);
 assert.match(core,/if\(type==='splash'\)/);
 assert.match(core,/filter\.frequency\.exponentialRampToValueAtTime\(240,now\+\.58\)/);
 const add=core.slice(core.indexOf('function logWater250(){'),core.indexOf('function jumpTo('));
 const empty=core.slice(core.indexOf('function resetJar(){'),core.indexOf('function checkJarMidnight()'));
 assert.match(add,/success\('water'\)/);
 assert.match(empty,/tone\('splash'\)/);
 assert.match(empty,/logJar\(active,date,'Kézi Ürítés',raw\);render\(\)/);
 assert.doesNotMatch(code,/AudioContext|createOscillator|createBuffer/);
});

test('final stylesheet wins and old silhouettes/images remain unchanged everywhere else',()=>{
 const head=html.slice(0,html.indexOf('</head>'));
 const links=[...head.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(x=>x[0]);
 assert.ok(links.at(-1).includes('hh-hydration-showcase-v1202.css'));
 assert.match(html,/hh-hydration-showcase-v1202\.js\?v=1202-tap-pour-splash/);
 for(const s of ['nutritionApprovedHero','hhBevitelRecipeStudioV1151','hhInterfoodTileV1173','hhNutritionQuickGridV1137'])assert.equal(id(s),1,s);
 assert.match(html,/interfood-logo-v1174\.webp/);
 assert.match(html,/nutri-chipmunk-3d-v594\.webp/);
 assert.match(css,/var\(--lpv-wave\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
 new Function(code);
 new Function(core);
});

test('daily progress uses displayed intake while the eight pitcher frames track since-empty level',()=>{
 assert.ok(code.includes('var shownMl=Number.isFinite(dailyMl)?Math.max(0,dailyMl):n;'));
 assert.ok(code.includes("percent.textContent=valid?Math.round(shownMl/goal*100)+'%':'—';"));
 assert.ok(code.includes("progress.style.width=valid?Math.min(100,shownMl/goal*100)+'%':'0%';"));
 assert.ok(code.includes('var step=Math.min(8,Math.floor(n/STEP));'));
});
