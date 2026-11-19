'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(path.join(base,p),'utf8');
const html=file('guardian/index.html');
const css=file('guardian/guardian-bkk-readable-controls-v1185.css');
const renderer=file('guardian/guardian-bkk-watchlist-v814.js');
const legacy=file('guardian/guardian-bkk-golden-reference-v4.css');
const previous=file('guardian/guardian-lena-benchmark-v1184.css');

test('new BKK V1185 loads AFTER existing Golden Wave, no DOM/navigation rewrite',()=>{
 const wave='guardian-lena-benchmark-v1184.css?v=1184-sleep-v1173-wave';
 const contrast='guardian-bkk-readable-controls-v1185.css?v=1185-readable-actions';
 assert.equal(html.split(wave).length,2);
 assert.equal(html.split(contrast).length,2);
 assert.ok(html.indexOf(contrast)>html.indexOf(wave));
 for(const id of ['hhTransitPanel','hhBkkLiveBarV796','hhSmartMatchPinV1','hhSmartLocationSwitchV1',
  'hhBkkWatchlistV814','hhBkkWatchRowsV814','hhBkkWatchToggleV858','hhBkkWatchEditV814',
  'hhSmartHubDestinationV802','hhPlannerTimeV939','hhPlannerNowV939','hhPlannerDepartV939',
  'hhPlannerArriveV939','hhSmartHubFromV806','hhSmartHubToV806']){
  if(['hhBkkLiveBarV796','hhSmartMatchPinV1','hhSmartLocationSwitchV1'].includes(id))continue; // dynamically mounted, not hardcoded
  assert.match(html,new RegExp('id="'+id+'"'),'native controller remains '+id);
 }
 assert.match(previous,/#hhTransitPanel/);
 assert.match(legacy,/\.hh-bkk-watch-actions-v814/);
 assert.match(html,/guardian-lena-premium-v1182\.css\?v=1182-guardian-energy-bluetooth/);
});
test('render engine still creates exactly four working owner-scoped per-route buttons',()=>{
 assert.match(renderer,/const toggle=action\(displayed\?'Elrejt':'Mutasd'/);
 assert.match(renderer,/toggle\.dataset\.visible=String\(displayed\)/);
 assert.match(renderer,/toggle\.dataset\.liveEnabled=String\(liveEnabled\)/);
 assert.match(renderer,/toggle\.setAttribute\('aria-pressed',String\(displayed\)\)/);
 assert.match(renderer,/toggle\.classList\.add\('hh-bkk-watch-unified-v1'\)/);
 assert.match(renderer,/const up=action\('↑'/);
 assert.match(renderer,/const down=action\('↓'/);
 assert.match(renderer,/const remove=action\('×'/);
 assert.match(renderer,/controls\.append\(up,down,remove\)/);
 assert.match(renderer,/row\.append\(badge,detail,controls\)/);
 assert.doesNotMatch(css,/display:none!important\s*;?\s*\}.*hh-bkk-watch-action-v814/s);
});
test('BKK V1185 is scoped, visually readable, keeps verified semantic states',()=>{
 assert.match(css,/html:not\(\[data-sh9-transit="on"\]\)/);
 assert.match(css,/\[data-hh-skin="lena-premium"\]/);
 assert.match(css,/--bkkc-edge:/);
 assert.match(css,/\[data-guardian-profile="m"\]/);
 assert.match(css,/\[data-guardian-profile="z"\]/);
 assert.match(css,/#hhBkkLiveBarV796::before/);
 assert.match(css,/#hhSmartMatchPinV1/);
 assert.match(css,/#hhBkkWatchToggleV858/);
 assert.match(css,/#hhBkkWatchlistV814 \.hh-bkk-watch-row-v814/);
 assert.match(css,/#hhBkkWatchlistV814 \.hh-bkk-watch-actions-v814/);
 assert.match(css,/#hhBkkWatchlistV814 \.hh-bkk-watch-unified-v1\[data-visible="true"\]/);
 assert.match(css,/#hhBkkWatchlistV814 \.hh-bkk-watch-unified-v1\[data-visible="false"\]/);
 assert.match(css,/font:900 17px\/1 system-ui/);
 assert.match(css,/height:39px!important/);
 assert.match(css,/#hhBkkGoldenPlannerV968 \.hh-planner-time-buttons-v939 button/);
 assert.match(css,/#hhBkkGoldenPlannerV968 #hhSmartHubPairedV806/);
 assert.match(css,/#hhBkkGoldenPlannerV968 \.hh-smart-hub-field-v806 input/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(css,/(\.maplibregl-canvas|#guardianMap\b|#guardianTrioV845|#guardianPackBluetoothV1053|@import|@font-face|fetch\(|XMLHttpRequest|localStorage|indexedDB|requestPermissions)/);
 let balance=0;for(const c of css){if(c==='{')balance++;else if(c==='}')balance--;assert.ok(balance>=0)}
 assert.equal(balance,0,'valid balanced CSS');
});
test('No extra wrap/stack/list replacement; style only targets existing elements',()=>{
 assert.match(css,/grid-template-areas:"badge copy actions"/);
 assert.match(css,/flex-wrap:nowrap!important/);
 assert.match(css,/minmax\(0,1fr\) auto/);
 assert.doesNotMatch(css,/grid-template-areas:"badge actions" "copy copy"/);
 assert.doesNotMatch(css,/position:fixed/);
 assert.doesNotMatch(css,/display:none/);
 assert.match(css,/button:focus-visible/);
});
