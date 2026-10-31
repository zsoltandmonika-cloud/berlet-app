'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../guardian');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'guardian-family-live-control-v962.css'),'utf8');
const originalCss=fs.readFileSync(path.join(root,'guardian-final-panels-glass-v861.css'),'utf8');
const guardian=fs.readFileSync(path.join(root,'guardian.js'),'utf8');
const live=fs.readFileSync(path.join(root,'guardian-live-v785.js'),'utf8');

test('v962 exactly one shared Family Live + GPS glass shell contains BOTH intact panels',()=>{
 for(const id of ['guardianFamilyLiveControlV962','guardianFamilyPanel','guardianMeCard',
  'guardianOtherCard','guardianCorkyCard','guardianStart','guardianStop','guardianClear',
  'guardianRetryGps812','guardianNativeGps','guardianAccuracy','guardianDistance',
  'guardianUpdated','guardianLiveStart','guardianLiveStop','guardianLiveLogout',
  'guardianLiveStatus','guardianLiveAuth','guardianLiveInterval','guardianLiveOwnSpeed']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.match(html,/<section class="family-live-control-v962" id="guardianFamilyLiveControlV962"/);
 const wrapper=html.indexOf('id="guardianFamilyLiveControlV962"');
 const family=html.indexOf('id="guardianFamilyPanel"',wrapper);
 const familyEnd=html.indexOf(' </section>\n <section class="gps-panel"',family);
 const gps=html.indexOf('<section class="gps-panel"',familyEnd);
 const gpsEnd=html.indexOf(' </section>\n </section>\n <p class="privacy">',gps);
 assert.ok(wrapper<family && family<familyEnd && familyEnd<gps && gps<gpsEnd,'Family and GPS are sibling children inside the one outer wrapper');
 assert.match(html,/guardian-family-live-control-v962\.css\?v=962-one-card/);
 assert.ok(html.indexOf('guardian-family-live-control-v962.css')>html.indexOf('guardian-final-panels-glass-v861.css'));
 assert.equal((html.match(/<section\b/g)||[]).length,(html.match(/<\/section>/g)||[]).length);
 assert.equal((html.match(/<details\b/g)||[]).length,(html.match(/<\/details>/g)||[]).length);
});

test('v1070 native Család control belongs to Admin and preserves GPS stop/retry',()=>{
 assert.match(guardian,/familyPanel\.hidden=false/);
 assert.match(html,/<summary id="guardianFamilyButton" class="family-live-control-head-v962"/);
 assert.doesNotMatch(guardian,/\$\('guardianFamilyButton'\)\.addEventListener\('click'/);
 assert.match(html,/aria-controls="guardianFamilyPanel"/);
 assert.match(css,/#guardianFamilyLiveControlV962 > #guardianFamilyPanel\.family-panel\[hidden\]\{\s*display:none!important/);
 assert.match(css,/#guardianFamilyLiveControlV962 > \.gps-panel\{/);
 assert.doesNotMatch(css,/#guardianFamilyLiveControlV962\[hidden\]/);
 assert.match(css,/#guardianFamilyLiveControlV962 > #guardianFamilyPanel\.family-panel\[hidden\]\+\.gps-panel/);
 for(const id of ['guardianStart','guardianStop','guardianClear','guardianRetryGps812']){
  assert.ok(html.indexOf('id="'+id+'"')>html.indexOf('<section class="gps-panel"'));
 }
});

test('v962 one card is theme-aware, preserves permissions, alerts and member status rows',()=>{
 assert.match(css,/:root\[data-guardian-profile="m"\] #guardianFamilyLiveControlV962/);
 assert.match(css,/#guardianFamilyLiveControlV962\.family-live-control-v962\{/);
 assert.match(css,/#guardianFamilyLiveControlV962 > #guardianFamilyPanel\.family-panel/);
 assert.match(css,/box-shadow:none!important/);
 assert.match(css,/border-top:1px solid var\(--fg-seam\)!important/);
 assert.match(css,/min-height:44px!important/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(css, /prefers-reduced-transparency/);
 assert.match(originalCss,/\.family-panel,\.gps-panel/);
 assert.match(html,/guardianLiveOwnerHelp811/);
 assert.match(html,/guardianLiveGpsDetail811/);
 assert.match(html,/guardianLiveDisableAuto/);
 assert.match(html,/guardianLiveResetDevice/);
 assert.match(html,/id="guardianLiveLogin"/);
 assert.match(html,/class="guardian-live-help"/);
 assert.match(html,/class="privacy">🔒/);
 assert.match(live,/guardianLiveStop/);
 assert.doesNotMatch(css,/fetch\(|XMLHttpRequest|setInterval\(|watchPosition\(|getCurrentPosition\(|sendBeacon|supabase\.co|maplibregl/);
});
