'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const here=path.join(__dirname,'..');
const css=fs.readFileSync(path.join(here,'guardian/guardian-lena-premium-lower-v1183.css'),'utf8');
const upper=fs.readFileSync(path.join(here,'guardian/guardian-lena-premium-v1182.css'),'utf8');
const html=fs.readFileSync(path.join(here,'guardian/index.html'),'utf8');
const trio=fs.readFileSync(path.join(here,'guardian/guardian-live-trio-v845.js'),'utf8');
const pack=fs.readFileSync(path.join(here,'skins/lena-premium-v1.css'),'utf8');

test('below-fold premium ships separately after v1182 without rewriting approved status board',()=>{
 const upperName='guardian-lena-premium-v1182.css?v=1182-guardian-energy-bluetooth';
 const lowerName='guardian-lena-premium-lower-v1183.css?v=1183-full-scroll';
 assert.equal(html.split(upperName).length,2);
 assert.equal(html.split(lowerName).length,2);
 assert.ok(html.indexOf(lowerName)>html.indexOf(upperName));
 assert.match(upper,/#guardianPackBluetoothV1053/);
 assert.match(upper,/#guardianTrioV845/);
 assert.doesNotMatch(css,/(^|\n)\s*[^/*\n]*#guardianTrioV845\s*[>{.:{\s]/m);
 assert.doesNotMatch(css,/(^|\n)\s*[^/*\n]*#guardianPackBluetoothV1053\s*[>{.:{\s]/m);
 assert.doesNotMatch(css,/(^|\n)\s*[^/*\n]*#guardianMapSearchV819\s*[>{.:{\s]/m);
 assert.match(html,/<div class="shell" data-hh-skin="lena-premium">/);
 assert.match(pack,/--lp-accent:#f0a5d7/);
 assert.match(trio,/samsungEnergyScore\(profile,raw,stamp\)/);
});
test('lower-page CSS stays scoped to normal Family Guard and both owner palettes',()=>{
 assert.match(css,/:root:not\(\[data-sh9-transit="on"\]\)/);
 assert.match(css,/\[data-guardian-profile="m"\]/);
 assert.match(css,/--fgp-panel:/);
 assert.match(css,/var\(--lp-accent\)/);
 assert.match(css,/--fgp-glow:var\(--lp-accent-glow\)/);
 assert.doesNotMatch(css,/(^|\n)\s*(html|body|:root|#guardianMap|\.map-card)\s*\{/m);
 assert.doesNotMatch(css,/fetch\(|url\(|@import|@font-face|XMLHttpRequest|supabase|localStorage|indexedDB/);
 let balance=0;
 for(const ch of css){if(ch==='{')balance++;if(ch==='}')balance--;assert.ok(balance>=0)}
 assert.equal(balance,0);
});
test('one-card BKK and one-card settings architecture, not nested full-width duplicates',()=>{
 for(const id of ['hhTransitPanel','hhSmartHubDestinationV802','hhBkkWatchlistV814',
  'hhBkkCatalogV801','guardianAdminControlsV963','guardianLandmarks',
  'hhArrivalStudio','guardianFamilyLiveControlV962','guardianFamilyPanel',
  'guardianStart','guardianStop','guardianClear','hhSmartHubFromV806','hhSmartHubToV806']){
   assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(css,/#hhTransitPanel\.hh-transit-panel/);
 assert.match(css,/#guardianAdminControlsV963\.guardian-admin-controls-v963/);
 assert.match(css,/#hhBkkGoldenPlannerV968/);
 assert.match(css,/#hhSmartHubFromV806/);
 assert.match(css,/#hhSmartHubToV806/);
 assert.match(css,/#hhSmartHubFavoritesV806|\.hh-smart-hub-favorites-v806/);
 assert.match(css,/#guardianLandmarksSave/);
 assert.match(css,/\.hh-arrival-studio/);
 assert.match(css,/\.gps-panel/);
 assert.match(css,/\.hh-transit-choices,#hhTransitCardsV791/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/\[hidden\]/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(html,/id="guardianMap"/);
 assert.match(html,/id="guardianProfileSwitch"/);
 assert.match(html,/id="guardianGpsSourceConflictV1072"/);
});
