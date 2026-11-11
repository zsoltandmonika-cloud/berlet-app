'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../guardian');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');

test('legacy conditional BKK focus button stays hidden when verified vehicles arrive',()=>{
 const pilot=read('guardian-live-pilot-v793.js');
 const unified=read('guardian-bkk-watch-unified-v1.css');
 const html=read('index.html');
 assert.match(pilot,/function updateLiveButton\(\)\{[\s\S]*?focusButton\.hidden=true;/);
 assert.match(pilot,/focusButton\.tabIndex=-1/);
 assert.match(pilot,/focusButton\.setAttribute\('aria-hidden','true'\)/);
 assert.doesNotMatch(pilot,/focusButton\.hidden=!lastVehicles\.length/);
 assert.match(unified,/#hhBkkFocusV796:not\(\[hidden\]\)[\s\S]*?display:none!important/);
 assert.match(html,/guardian-bkk-watch-unified-v1\.css\?v=1\.1-remove-obsolete-live-button/);
 assert.match(html,/guardian-transit-v791\.js\?v=963-retire-legacy-live-button/);
});
test('live data and one-button route control remain available without new polling',()=>{
 const pilot=read('guardian-live-pilot-v793.js');
 const route=read('guardian-bkk-watchlist-v814.js');
 const loader=read('guardian-transit-v791.js');
 assert.match(pilot,/renderLiveFromSnapshot\(lastSourceSnapshot\)/);
 assert.match(route,/hh-bkk-watch-unified-v1/);
 assert.match(route,/hh-bkk-live-verified-v815/);
 assert.match(loader,/ui','963-retire-legacy-live-button'/);
 assert.doesNotMatch(route,/navigator\.geolocation|fetch\(/);
});
