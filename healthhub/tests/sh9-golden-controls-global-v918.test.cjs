'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=[
 'index.html',
 'healthhub/index.html','healthhub/guardian/index.html',
 'healthhub/digital-health/index.html','healthhub/digital-health/time-machine-v534.html',
 'healthhub/digital-wellbeing-preview/index.html','healthhub/nutrition/index.html',
 'healthhub/nutrition/index-v621-test.html','healthhub/nutrition-preview/index.html',
 'healthhub/usage-control/index.html','recepttar/index.html','recepttar-studio/index.html',
 'sh9/index.html','sh9/family-hub/index.html','sh9/smart-travel/index.html',
 'sh9/smart-travel/my-trips/index.html',
 'sh9/smart-travel/public-transport/index.html',
 'sh9/smart-travel/public-transport/bkk/index.html',
 'sh9/smart-travel/public-transport/bkk/grand-concept/index.html',
 'sh9/smart-travel/public-transport/mav/index.html',
 'sh9/smart-travel/public-transport/volan/index.html',
 'sh9/smart-travel/public-transport/smart-trip/index.html'
];
const lift5Pages=new Set([
 'healthhub/index.html','healthhub/nutrition/index.html',
 'sh9/smart-travel/my-trips/index.html',
 'sh9/smart-travel/public-transport/index.html',
 'sh9/smart-travel/public-transport/bkk/index.html',
 'sh9/smart-travel/public-transport/bkk/grand-concept/index.html',
 'sh9/smart-travel/public-transport/mav/index.html',
 'sh9/smart-travel/public-transport/volan/index.html'
]);
test('Golden Standard dock appears on every navigable category tree page and leaf',()=>{
 for(const file of pages){
  const html=read(file);
  const health=file==='healthhub/index.html';
  // v1156: Recept Stúdió intentionally keeps its own sticky header and the
  // shared bottom navigation, not the floating upper SHO glass bar.
  if(file==='recepttar-studio/index.html'){
   assert.doesNotMatch(html,/sh9-golden-controls-v1\.(?:css|js)/,file+' no obstructing upper dock');
   assert.match(html,/sh9-golden-bottom-nav-v924\.css\?v=924-unified/);
   assert.match(html,/sh9-golden-bottom-nav-v924\.js\?v=924-unified/);
   assert.match(html,/<header class="app-header">/);
   continue;
  }
  if(file==='sh9/index.html'){ assert.match(html,/class="sho-unified-dock"/);continue; }
  const count=health?2:1; // Fallback is a reconstructed document.
  const version=file==='healthhub/index.html'?'1043-records-meds-dock-plan-b':lift5Pages.has(file)?'935-selective-dock-lift5':'934-unified-glass-dock';
  const jsVersion=file==='healthhub/digital-health/index.html'?'540-plan-b-title-slot':version;
  const styles=[...html.matchAll(/sh9-golden-controls-v1\.css\?v=([a-z0-9-]+)/g)].map(x=>x[1]);
  const scripts=[...html.matchAll(/sh9-golden-controls-v1\.js\?v=([a-z0-9-]+)/g)].map(x=>x[1]);
  assert.deepEqual(styles,Array(count).fill(version),file+' CSS version');
  assert.deepEqual(scripts,Array(count).fill(jsVersion),file+' JS version');
  assert.doesNotMatch(html,/sh9-tasks-golden-v901\.js/,file+' duplicate old Tasks script');
 }
});
test('native profile switches preserve module authorization instead of direct unsafe data mutations',()=>{
 const src=read('sh9/shared/sh9-golden-controls-v1.js');
 for(const id of ['fhProfileSwitch','guardianProfileSwitch','profileBtn','profileLabel','profile','mtProfile','st22Profile','hhDigitalProfileDock'])
  assert.ok(src.includes("'"+id+"'"),id+' delegated');
 assert.match(src,/native\.click\(\)/);
 assert.match(src,/if\(family&&!w\.FAMILY_TASKS_V880\)return/);
 assert.match(src,/w\.SH9_I18N_V1\?\.setLanguage/);
 assert.match(src,/w\.localStorage\?\.getItem\(KEY\)/);
 assert.match(src,/w\.localStorage\?\.setItem\(KEY,next\)/);
 assert.match(src,/w\.SH9_GOLDEN_CONTROLS_V1=Object\.freeze/);
 assert.doesNotMatch(src,/fetch\s*\(|supabase\.|navigator\.geolocation|setInterval/);
});
test('v934 unified four-zone glass dock has production SHO dimensions and profile-aware colors',()=>{
 const css=read('sh9/shared/sh9-golden-controls-v1.css');
 const js=read('sh9/shared/sh9-golden-controls-v1.js');
 assert.match(css,/#sh9UnifiedGlassDockV34/);
 assert.match(css,/height:50px!important/);
 assert.match(css,/background:rgba\(8,42,80,.60\)!important/);
 assert.match(css,/border-radius:14px!important/);
 assert.match(css,/#79bfff/);
 assert.match(css,/#f9a6d3/);
 assert.match(css,/grid-template-columns:1\.1fr 1\.15fr \.95fr \.92fr/);
 assert.match(css,/backdrop-filter:blur\(10px\)/);
 assert.match(css,/#guardianProfileSwitch/);
 assert.match(css,/#profileLabel/);
 assert.match(css,/#fhProfileSwitch/);
 assert.match(css,/data-sh9-golden-floating/);
 assert.match(css,/visibility:hidden!important/);
 assert.match(js,/function mountDock\(host\)/);
 assert.match(js,/dockCell\(dock,'profile'\)/);
 assert.match(js,/dockCell\(dock,'tasks'\)/);
 assert.match(js,/dockCell\(dock,'wallet'\)/);
 assert.match(js,/dockCell\(dock,'language'\)/);
 assert.match(js,/task\.replaceChildren\(\)/);
 assert.match(js,/data-sh9-golden-unified/);
 assert.match(js,/SHO='\/berlet-app\/sh9\/\?sho=wallet'/);
});
test('all 22 user-facing HTML pages are covered; archived releases and auth callbacks remain immutable',()=>{
 const htmlPaths=[];
 function scan(dir){
  for(const e of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
   const rel=path.posix.join(dir,e.name);
   if(e.isDirectory())scan(rel);
   else if(/\.html$/.test(e.name))htmlPaths.push(rel);
  }
 }
 for(const d of ['sh9','healthhub','recepttar','recepttar-studio'])scan(d);
 const excluded=p=>p.includes('/releases/')||/\/family-guard-v\d+\.html$/.test(p)||
  /\/force-v\d+\.html$/.test(p)||/\/chatgpt-dropbox-callback-v\d+\.html$/.test(p)||
  p==='healthhub/architecture-grand-design.html'||p==='sh9/sh9-original-v23.html'||p==='sh9/sho-preview/index.html';
 const uncovered=htmlPaths.filter(p=>!excluded(p)&&!pages.includes(p));
 assert.deepEqual(uncovered,[], 'Uncovered user-facing category leaves: '+uncovered.join(', '));
});

test('HealthHub v919 Golden Controls follow active Egészség subpage Hero',()=>{
 const src=read('sh9/shared/sh9-golden-controls-v1.js');
 const css=read('sh9/shared/sh9-golden-controls-v1.css');
 const health=read('healthhub/index.html');
 const legacy=read('healthhub/health-subhero-layout-v576.css');
 assert.match(src,/visibleOverlay\('healthSection'\)/);
 assert.match(src,/sub\.querySelector\('\.healthSubHero'\)/);
 assert.match(src,/anchorTo\(healthHost\(\)\)/);
 assert.match(src,/new MutationObserver\(changes=>/);
 assert.match(src,/attributeFilter:\['class','hidden'\]/);
 assert.match(src,/observeHealthPages\(\)/);
 assert.match(css,/#healthSection\.page\.on \.healthSubHero > #sh9HeaderControlsV2\{/);
 assert.match(css,/#healthSection\.page\.on \.healthSubHero > #sh9LauncherProfileV1\{/);
 assert.match(css,/left:5px!important;top:2px!important;/);
 assert.match(css,/left:5px!important;bottom:0!important;/);
 assert.match(css,/transform:none!important;/);
 assert.match(legacy,/\.healthSubHero > div/);
 assert.equal((health.match(/sh9-golden-controls-v1\.css\?v=1043-records-meds-dock-plan-b/g)||[]).length,2);
 assert.equal((health.match(/sh9-golden-controls-v1\.js\?v=1043-records-meds-dock-plan-b/g)||[]).length,2);
});


test('v935 selective Glass Dock lift is exactly 5px and excluded from unrelated pages',()=>{
 const css=read('sh9/shared/sh9-golden-controls-v1.css');
 const js=read('sh9/shared/sh9-golden-controls-v1.js');
 assert.match(css,/data-sh9-dock-lift5="on"/);
 assert.match(css,/bottom:6px!important/);
 assert.match(css,/top:calc\(39px \+ env\(safe-area-inset-top,0px\)\)!important/);
 assert.match(css,/height:50px!important/);
 assert.match(css,/background:rgba\(8,42,80,.60\)!important/);
 const begin=js.indexOf(' const LIFT5_ROUTES=');
 const end=js.indexOf(' function anchorTo(host)',begin);
 assert.ok(begin>=0&&end>begin,'v935 route gating exists');
 const source=js.slice(begin,end);
 const predicate=(pathname,isHealth)=>new Function('currentPath','healthShell',source+'return lift5For;')(
  ()=>pathname,()=>isHealth);
 const destinations=[
  '/berlet-app/sh9/smart-travel/public-transport/',
  '/berlet-app/sh9/smart-travel/public-transport/bkk/',
  '/berlet-app/sh9/smart-travel/public-transport/bkk/grand-concept/',
  '/berlet-app/sh9/smart-travel/public-transport/mav/',
  '/berlet-app/sh9/smart-travel/public-transport/volan/',
  '/berlet-app/sh9/smart-travel/my-trips/',
  '/berlet-app/healthhub/nutrition/'
 ];
 for(const path of destinations)assert.equal(predicate(path,false)({id:'hero'}),true,path);
 for(const path of ['/berlet-app/sh9/','/berlet-app/healthhub/guardian/',
                     '/berlet-app/sh9/smart-travel/','/berlet-app/sh9/family-hub/'])
  assert.equal(predicate(path,false)({id:'hero'}),false,path);
 const health=predicate('/berlet-app/healthhub/',true);
 assert.equal(health({id:'heroHome',closest:()=>null}),false,'HealthHub Home stays put');
 assert.equal(health({id:'heroSleep',closest:()=>({id:'hhSleepPage'})}),true,'Sleep');
 assert.equal(health({id:'heroActivity',closest:()=>({id:'hhActivityPage191'})}),true,'Activity');
});


test('v936 Sleep gets +10px total; Activity and other destinations retain v935 +5px',()=>{
 const css=read('sh9/shared/sh9-golden-controls-v1.css');
 const js=read('sh9/shared/sh9-golden-controls-v1.js');
 const hh=read('healthhub/index.html');
 assert.equal((hh.match(/sh9-golden-controls-v1\.css\?v=1043-records-meds-dock-plan-b/g)||[]).length,2);
 assert.equal((hh.match(/sh9-golden-controls-v1\.js\?v=1043-records-meds-dock-plan-b/g)||[]).length,2);
 assert.match(css,/data-sh9-dock-lift10="on"/);
 assert.match(css,/bottom:11px!important/);
 assert.match(css,/top:calc\(34px \+ env\(safe-area-inset-top,0px\)\)!important/);
 assert.match(css,/bottom:6px!important/);
 assert.match(css,/top:calc\(39px \+ env\(safe-area-inset-top,0px\)\)!important/);
 assert.match(js,/host\.id==='hhSleepPage'/);
 assert.match(js,/host\.closest\?\.\('#hhSleepPage\.on'\)/);
 assert.match(js,/d\.body\.removeAttribute\('data-sh9-dock-lift10'\)/);
 assert.match(js,/if\(sleepActive\)d\.body\.setAttribute\('data-sh9-dock-lift10','on'\)/);
});
