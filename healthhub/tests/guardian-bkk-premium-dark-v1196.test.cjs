'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('guardian/guardian-bkk-keyboard-premium-dark-v1196.css');
const html=read('guardian/index.html');
const dock=read('guardian/guardian-bkk-keyboard-dock-v964.js');

test('approved dark glass is loaded last after the existing BKK and Léna skins',()=>{
 const marker='guardian-bkk-keyboard-premium-dark-v1196.css?v=1196-golden-standard';
 assert.equal(html.split(marker).length,2,'one stylesheet include');
 assert.ok(html.indexOf(marker)>html.indexOf('guardian-bkk-keyboard-dock-v964.css'));
 assert.ok(html.indexOf(marker)>html.indexOf('guardian-lena-premium-v1182.css'));
 assert.ok(html.indexOf(marker)>html.indexOf('guardian-search-screen-portal-v1195.css'));
});

test('glass styling is scoped to the existing one real BKK search modal',()=>{
 assert.match(css,/#hhBkkKeyboardDockV964\.hh-bkk-keyboard-v964/);
 for(const id of ['hhBkkKeyboardGpsV964','hhSmartHubNativeResultsV803']){
  assert.ok(css.includes('#'+id),id);
 }
 for(const selector of ['hh-bkk-keyboard-head-v964','hh-bkk-keyboard-caption-v964',
   'hh-bkk-keyboard-input-slot-v964','hh-smart-hub-result-v803',
   'hh-smart-hub-result-copy-v803','hh-smart-hub-result-icon-v803',
   'hh-smart-hub-result-tag-v824'])assert.ok(css.includes(selector),selector);
 assert.match(css,/:root\[data-guardian-profile="m"\]/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
 assert.match(css,/color-scheme:dark!important/);
 assert.match(css,/scrollbar-width:thin!important/);
 // This stylesheet must never restyle pages or change focus/selection logic.
 assert.doesNotMatch(css,/html\s*\{|body\s*\{|#guardianMap\s*\{|\.hhBottomNav|#sh9GlobalNavV24|@import/);
 assert.doesNotMatch(css,/position:fixed|position:absolute|left:|right:|top:|bottom:|height:|min-height:|max-height:|pointer-events:none/i);
 const opens=(css.match(/\{/g)||[]).length,closes=(css.match(/\}/g)||[]).length;
 assert.equal(opens,closes);
});

test('the original input, GPS and suggestion handlers remain intact',()=>{
 assert.match(dock,/slot\.appendChild\(field\)/);
 assert.match(dock,/dock\.appendChild\(results\)/);
 assert.match(dock,/results\.addEventListener\('click'/);
 assert.match(dock,/gps\.addEventListener\('click'/);
 assert.match(dock,/field\.dispatchEvent\(new Event\('focus'\)\)/);
 assert.doesNotMatch(css,/fetch\(|watchPosition|navigator\.geolocation|localStorage|indexedDB|setInterval/);
});
