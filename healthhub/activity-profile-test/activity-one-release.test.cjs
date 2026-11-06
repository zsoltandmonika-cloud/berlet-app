'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const production=fs.readFileSync(path.join(root,'activity-one/index.html'),'utf8');
const engine=fs.readFileSync(path.join(__dirname,'activity-engine-v2.js'),'utf8');
const full=fs.readFileSync(path.join(root,'live-v191.js'),'utf8');
test('Activity One is a full manual-capable lightweight route using the verified v2 engine',()=>{
 assert.match(production,/activity-profile-test\/activity-engine-v2\.js\?v=2/);
 assert.match(production,/activity-fast\/vault-read-v3\.js/);
 assert.match(production,/activity-premium-glass-v533\.js/);
 assert.doesNotMatch(production,/window\.hh191ManualSave=function/);
 assert.doesNotMatch(production,/a191Card\.manual\{display:none/);
 assert.match(engine,/window\.hh191ManualSave=function/);
 assert.match(engine,/MANUAL_KEY\+pkey\(\)/);
 assert.match(engine,/window\.hh191Profile=function/);
 assert.match(engine,/window\.hh191SourceDetails=function/);
 assert.match(engine,/async function downloadCanonicalCloud\(profile\)/);
 assert.match(full,/var LOCAL_MEMO_TTL_MS=45000/);
});
test('Activity One does not run the heavy Home bootstrap or introduce synthetic measurements',()=>{
 assert.doesNotMatch(production,/HHB13_0[0-9]|HH_CHUNKS|document\.open\(\)|premium-glass-home-v520/);
 assert.doesNotMatch(production,/\bfastReadSnapshot\b|\bfastSaveSnapshot\b/);
 assert.match(engine,/if\(row\.value&&row\.value\.profile===profile\)/);
 assert.match(engine,/tx=db\.transaction\(\['imports','activity'\],'readonly'\)/);
 assert.match(engine,/Dropbox-export NEM igazolt/);
});

test('Golden Standard Activity One bars are responsive native routes without new runtime dependencies',()=>{
 const app=fs.readFileSync(path.join(root,'activity-one/index.html'),'utf8');
 const expected={
  aOneTasks:'/berlet-app/sh9/family-hub/',
  aOneWallet:'/berlet-app/sh9/wallet/',
  aOneHome:'/berlet-app/sh9/',
  aOneAsk:'/berlet-app/healthhub/index.html?sh9nav=admin&sh9cfg=asklena',
  aOneAlerts:'/berlet-app/sh9/notification-center/',
  aOneAdmin:'/berlet-app/healthhub/index.html?sh9nav=admin'
 };
 for(const [id,href] of Object.entries(expected)){
  assert.ok(app.includes('id="'+id+'" href="'+href+'"'),id+' must navigate with native anchor');
  assert.doesNotMatch(app,new RegExp("byId\\('"+id+"'\\)\\.onclick"),id+' must not wait for Javascript to open');
 }
 assert.match(app,/id="activityGoldenTop".*data-sh9-golden-top="on"/);
 assert.match(app,/id="activityGoldenBottom".*data-sh9-golden-bottom-nav="on"/);
 assert.match(app,/a191Nav\{display:none!important\}/);
 assert.match(app,/window\.hh191Profile\(next\);mountHeroDock\(\);paintButtons\(\)/);
 assert.match(app,/window\.hh191CloseModal\(\)/);
 assert.match(app,/function home\(\)\{location\.assign\('\/berlet-app\/sh9\/'\)\}/);
 assert.ok(!app.includes("window.hh191Go=home;"),'HealthRadar must not silently redirect to heavy HealthHub home');
 const scriptUrls=[...app.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
 assert.deepEqual(scriptUrls,[
  './activity-fast/vault-read-v3.js',
  './live-v369-distance.js',
  './live-v371-samsung.js',
  './live-v375-activity-timeline.js',
  './activity-profile-test/activity-engine-v2.js',
  './live-v363.js',
  './activity-premium-glass-v533.js',
  './hc-wear-history-v1150.js'
 ],'Golden nav must add zero JS dependencies');
});

test('Hero-bottom Golden dock remains attached after rerenders, without network or engine changes',()=>{
 const app=fs.readFileSync(path.join(root,'activity-one/index.html'),'utf8');
 assert.match(app,/#activityGoldenTop\{--sho-a:[^}]*position:absolute;left:4px;right:4px/);
 assert.match(app,/#activityGoldenTop\{top:auto;bottom:4px;height:50px/);
 assert.match(app,/body \.a191Page\{padding-top:0!important/);
 assert.match(app,/var goldenHeroDock=document\.getElementById\('activityGoldenTop'\)/);
 assert.match(app,/if\(goldenHeroDock\.parentElement!==hero\)hero\.appendChild\(goldenHeroDock\)/);
 assert.match(app,/dockObserver\.observe\(page,\{childList:true\}\)/);
 assert.match(app,/window\.hh191Profile\(next\);mountHeroDock\(\);paintButtons\(\)/);
 assert.match(app,/#activityGoldenBottom\{--sho-a:[^}]*position:fixed/);
 assert.doesNotMatch(app,/#activityGoldenTop\{top:calc\(env\(safe-area-inset-top/);
 const scripts=[...app.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
 assert.equal(scripts.length,8,'keep exact eight original Activity dependencies');
 assert.deepEqual(scripts,[
  './activity-fast/vault-read-v3.js',
  './live-v369-distance.js',
  './live-v371-samsung.js',
  './live-v375-activity-timeline.js',
  './activity-profile-test/activity-engine-v2.js',
  './live-v363.js',
  './activity-premium-glass-v533.js',
  './hc-wear-history-v1150.js'
 ]);
});
