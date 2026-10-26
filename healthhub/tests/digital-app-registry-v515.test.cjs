'use strict';
/* Production Digital Wellbeing v515 presentation-only app identity regression. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'..');
const reg=require('../digital-health/digital-app-registry-v515.js');
const page=fs.readFileSync(path.join(base,'digital-health/index.html'),'utf8');
const live=fs.readFileSync(path.join(base,'digital-health/digital-live-v507.js'),'utf8');
test('four observed package IDs get human-friendly exact matches',()=>{
 const expected={
  'com.sec.android.app.launcher':['Kezdőképernyő','Rendszerfelület'],
  'com.zzkko':['SHEIN','Vásárlás'],
  'com.lppsa.app.sinsay':['Sinsay','Vásárlás'],
  'com.titastudio.mahjong':['Mahjong','Játék']
 };
 for(const [pkg,[name,category]] of Object.entries(expected)){
  const x=reg.resolveApp(pkg);
  assert.equal(x[0],name);
  assert.equal(x[2],category);
 }
});
test('verified public original icons and safe fallback rules',()=>{
 for(const pkg of ['com.sec.android.app.launcher','com.zzkko','com.lppsa.app.sinsay']){
  const x=reg.resolveApp(pkg);
  assert.ok(reg.allowedLogo(x[3]),pkg);
 }
 const mahjong=reg.resolveApp('com.titastudio.mahjong');
 assert.equal(mahjong[3],null,'do not misattribute unverified Mahjong publisher logo');
 assert.equal(mahjong[1],'🀄');
 assert.equal(reg.allowedLogo('http://img.samsungapps.com/logo.png'),false);
 assert.equal(reg.allowedLogo('https://evil.test/logo.png'),false);
 assert.equal(reg.allowedLogo('javascript:alert(1)'),false);
});
test('unknown packages are never guessed, categorized, or sent externally',()=>{
 assert.deepEqual(reg.resolveApp('my.unknown.package'),['my.unknown.package','📱','Besorolatlan',null]);
 assert.equal(reg.resolveApp('com.zzkko')[0],'SHEIN');
 assert.equal(reg.resolveApp('com.zzkko.fake')[0],'com.zzkko.fake');
 assert.ok(!/fetch\(|localStorage|Dropbox|navigator\./.test(fs.readFileSync(path.join(base,'digital-health/digital-app-registry-v515.js'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'')),'registry makes no API/network/data access');
});
test('production renderer preserves totals, profile isolation, source and icon fallback',()=>{
 const registryIdx=page.indexOf('digital-app-registry-v515.js?v=515-verified-app-icons');
 const liveIdx=page.indexOf('digital-live-v507.js?v=515-global-name-and-icon-registry');
 assert.ok(registryIdx>0&&liveIdx>registryIdx,'registry loaded before renderer');
 assert.match(live,/root\.HH_DW_APP_REGISTRY_V515/);
 assert.match(live,/image\.onerror=\(\)=>\{node\.replaceChildren\(\);node\.textContent=info\[1\]/);
 assert.match(live,/label\.title='Eredeti Android-csomagnév: '\+id/);
 assert.match(live,/summary\(doc,days\)/);
 assert.match(live,/if\(id!==generation\)return/,'outdated prior-profile async result cannot paint');
 assert.match(page,/\.appicon-original-v515/);
});
