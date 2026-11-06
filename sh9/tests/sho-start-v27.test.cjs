'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=relative=>fs.readFileSync(path.resolve(__dirname,'../../',relative),'utf8');

test('SHO grid is exactly 4×3: Wallet takes former Family updates spot, bottom row is Health trio',()=>{
 const html=src('sh9/index.html');
 const keys=[...html.matchAll(/<button class="tile" data-module="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(keys,[
  'Egészség','Biztonság','Utazás','Szórakozás','Bevásárlás','Sport',
  'Wallet','Kapcsolatok','Életmód','Táplálkozás','Aktivitás','Alvás'
 ]);
 assert.doesNotMatch(html,/data-module="Családi aktualitások"/);
 assert.doesNotMatch(html,/class="tile wallet"/);
 assert.equal((html.match(/<button class="tile" data-module=/g)||[]).length,12);
 assert.match(html,/sho-wiring-v2\.js\?v=936-activity-one-route/);
});

test('SHO keeps shared taskbar, native OTA and Outlook bindings',()=>{
 const html=src('sh9/index.html');
 assert.match(html,/shared\/sh9-golden-bottom-nav-v924\.js/);
 assert.match(html,/shared\/sh9-golden-bottom-nav-v924\.css/);
 assert.match(html,/\.shell > nav\.nav\[data-sh9-golden-bottom-nav="on"\]/);
 assert.match(html,/id="sh9OtaIndicatorV1043"/);
 assert.match(html,/id="sh9AgendaDialog"/);
 assert.match(html,/id="heroWallet"/);
});

test('three new tiles route to actual HealthHub destinations and remain bilingual',()=>{
 const js=src('sh9/sho-preview/sho-wiring-v2.js');
 for(const marker of ["'Táplálkozás':HH+'nutrition/'","'Aktivitás':HH+'activity-one/?source=sho'","'Alvás':HH+'?sho=sleep'"]){
  assert.ok(js.includes(marker),marker);
 }
 assert.match(js,/\[data-module\]/);
 assert.match(js,/Táplálkozás:'Nutrition'/);
 assert.match(js,/Aktivitás:'Activity'/);
 assert.match(js,/Alvás:'Sleep'/);
});

test('SHO Activity launches standalone verified profile reader, preserving other module routes',()=>{
 const routing=src('sh9/sho-preview/sho-wiring-v2.js');
 const entry=src('healthhub/activity-one/index.html');
 const engine=src('healthhub/activity-profile-test/activity-engine-v2.js');
 assert.match(routing,/'Aktivitás':HH\+'activity-one\/\?source=sho'/);
 assert.doesNotMatch(routing,/'Aktivitás':HH\+'\?sho=activity'/);
 assert.match(routing,/'Alvás':HH\+'\?sho=sleep'/);
 assert.match(routing,/'Egészség':HH,/);
 assert.match(entry,/activity-profile-test\/activity-engine-v2\.js/);
 assert.doesNotMatch(entry,/window\.hh191ManualSave=function/);
 assert.match(engine,/window\.hh191ManualSave=function/);
 assert.match(engine,/LOCAL_MEMO_TTL_MS=45000/);
 assert.match(engine,/source\.read\(p,false\)/);
});
test('Sleep and Activity bridge opens only canonical HealthHub modules, on explicit opt-in route',()=>{
 const html=src('healthhub/index.html');
 const js=src('healthhub/sho-entry-v1.js');
 assert.match(html,/shoTarget==='activity'\|\|shoTarget==='sleep'/);
 assert.match(html,/sho-entry-v1\.js\?v=1016-priority-boot/);
 assert.match(js,/root\.hhOpenActivity/);
 assert.match(js,/root\.hh225OpenSleep\|\|root\.hhOpenSleep/);
 assert.match(js,/if\(target!=='activity'&&target!=='sleep'\)return/);
 assert.doesNotMatch(js,/fetch\(|supabase|\.from\(/i);
});

test('SHO production unified glass dock preserves four canonical controls and critical integrations',()=>{
 const html=src('sh9/index.html');
 const js=src('sh9/sho-preview/sho-wiring-v2.js');
 const preview=src('sh9/sho-preview/index.html');
 assert.match(html,/class="sho-unified-dock"/);
 assert.match(html,/background:rgba\(8,42,80,\.60\)/);
 assert.equal((html.match(/class="sho-dock-cell/g)||[]).length,4);
 for(const id of ['profile','tasks','heroWallet','hu','en']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(html,/🇭🇺/);
 assert.match(html,/🇨🇦/);
 assert.match(html,/id="sh9OtaIndicatorV1043"/);
 assert.match(html,/id="sh9CalendarCell"/);
 assert.match(html,/sh9-ota-browser-v1067\.js/);
 assert.match(html,/outlook-agenda-v1\.js/);
 assert.match(html,/sh9-golden-bottom-nav-v924\.js/);
 assert.equal((html.match(/data-module="/g)||[]).length,12);
 assert.match(html,/sho-security-emblem/);
 assert.match(html,/🛡️/);
 assert.match(html,/sh9-i18n-v1\.js\?v=32-sho-unified-dock/);
 assert.match(js,/i18n\.setLanguage\(value\)/);
 assert.match(js,/FAMILY_TASKS=SH9\+'family-hub\/'/);
 assert.match(js,/\$\('heroWallet'\)\.onclick=wallet/);
 assert.match(preview,/class="sho-unified-dock"/);
});


test('SHO v33 hero lift and info label spacing do not touch the golden dock',()=>{
 const html=src('sh9/index.html');
 assert.match(html,/\.head\{background-position:50% -30px;\}/);
 assert.match(html,/\.info>button:nth-child\(-n\+2\)>strong\{margin-top:5px;\}/);
 assert.equal((html.match(/class="sho-dock-cell/g)||[]).length,4);
 assert.equal((html.match(/class="tile" data-module=/g)||[]).length,12);
 assert.match(html,/id="sh9OtaIndicatorV1043"/);
 assert.match(html,/sh9-golden-bottom-nav-v924\.js/);
});

test('SHO weather v33 retries failures and never fabricates stale readings',()=>{
 const js=src('sh9/sho-preview/sho-wiring-v2.js');
 assert.match(js,/weatherAt=0; \/\/ A failed request/);
 assert.match(js,/WX_OPENMETEO/);
 assert.match(js,/WX_WTTR/);
 assert.match(js,/WEATHER_FRESH_MS=60\*60\*1000/);
 assert.match(js,/queueWeatherRetry\(\)/);
 assert.match(js,/data\.temp>65/);
 assert.match(js,/v\.temperature_2m===null/);
 assert.match(js,/AbortController/);
});


test('v934 shared Wallet deep link opens the real existing SHO Wallet handler',()=>{
 const srcJs=src('sh9/sho-preview/sho-wiring-v2.js');
 const globalJs=src('sh9/shared/sh9-golden-controls-v1.js');
 assert.match(globalJs,/\/berlet-app\/sh9\/\?sho=wallet/);
 assert.match(srcJs,/params\.get\('sho'\)==='wallet'/);
 assert.match(srcJs,/params\.delete\('sho'\)/);
 assert.match(srcJs,/wallet\(\)/);
 assert.match(srcJs,/history\.replaceState/);
});
