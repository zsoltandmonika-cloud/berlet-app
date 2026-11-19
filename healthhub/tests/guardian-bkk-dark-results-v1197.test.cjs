'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('guardian/index.html');
const css=read('guardian/guardian-bkk-keyboard-dock-v964.css');
const code=read('guardian/guardian-bkk-keyboard-dock-v964.js');

test('the canonical BKK modal CSS is cache-busted for v1197 results',()=>{
 assert.match(html,/guardian-bkk-keyboard-dock-v964\.css\?v=1197-dark-results-core/);
 assert.match(html,/guardian-bkk-keyboard-premium-dark-v1196\.css\?v=1196-golden-standard/);
 const block=css.slice(css.indexOf('/* Premium Dark Glass v1197'));
 assert.ok(block.length>4000,'missing canonical premium results block');
 assert.match(block,/#hhBkkKeyboardDockV964\.hh-bkk-keyboard-v964/);
 assert.match(block,/rgba\(22,42,87,\.96\)/);
 assert.match(block,/#hhSmartHubNativeResultsV803\.hh-smart-hub-results-v803:not\(:empty\)/);
 assert.match(block,/#hhSmartHubNativeResultsV803\.hh-smart-hub-results-v803:empty/);
 assert.match(block,/white-space:normal!important/);
 assert.match(block,/overflow-y:auto!important/);
 const braces=[...css].reduce((n,ch)=>n+(ch==='{')-(ch==='}'),0);
 assert.equal(braces,0,'invalid CSS braces');
});

test('the input, results and GPS actions still use original nodes and handlers',()=>{
 assert.match(code,/slot\.appendChild\(field\)/);
 assert.match(code,/dock\.appendChild\(results\)/);
 assert.match(code,/results\.addEventListener\('click'/);
 assert.match(code,/gps\.addEventListener\('click'/);
 const block=css.slice(css.indexOf('/* Premium Dark Glass v1197'));
 assert.doesNotMatch(block,/fetch\(|watchPosition|geolocation|addEventListener|setInterval|@import/);
 assert.doesNotMatch(block,/position:\s*(?:fixed|absolute)|pointer-events:\s*none/);
});

test('saved-place names, addresses and badges remain legible in the dark list',()=>{
 const block=css.slice(css.indexOf('/* Premium Dark Glass v1197'));
 for(const s of ['.hh-smart-hub-result-copy-v803 strong',
  '.hh-smart-hub-result-copy-v803 small',
  '.hh-smart-hub-result-tag-v824',
  '.hh-smart-hub-result-icon-v803',
  '.hh-smart-hub-result-v803'])assert.ok(block.includes(s),s);
 assert.match(block,/color:#fff!important/);
 assert.match(block,/color:#e5eafb!important/);
 assert.match(block,/opacity:1!important/);
 assert.match(block,/prefers-reduced-transparency:reduce/);
});
