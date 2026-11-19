'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('guardian/index.html');
const css=read('guardian/guardian-map-search-premium-dark-v1198.css');
const code=read('guardian/guardian-map-search-v819.js');

test('v1198 is the last head stylesheet and the legacy pastel override is retired',()=>{
 const token='guardian-map-search-premium-dark-v1198.css?v=1198-map-suggestions-dark';
 assert.equal(html.split(token).length,2,'exactly one v1198 stylesheet');
 const head=html.slice(0,html.indexOf('</head>'));
 const styles=[...head.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)];
 assert.equal(styles.at(-1)[0].includes(token),true,'dark map search must cascade LAST');
 assert.doesNotMatch(head,/<style id="guardian-map-search-soft-pastel-v977">/);
});

test('dark styles cover the ORIGINAL map tray, results, actions and selected profile',()=>{
 const selectors=[
  '#guardianMapSearchV819.hh-map-search-v819',
  '#guardianMapSearchInputV819',
  '#guardianMapSearchResultsV819.hh-map-search-hits-v819',
  '#guardianMapSearchResultsV819 .hh-map-search-hit-v819',
  '#guardianMapSearchResultsV819 .hh-map-search-hit-text-v819 strong',
  '#guardianMapSearchResultsV819 .hh-map-search-hit-text-v819 small',
  '#guardianMapSearchResultsV819 .hh-map-search-hit-icon-v823',
  '#guardianMapSearchResultsV819 .hh-map-search-hit-tag-v823'
 ];
 for(const selector of selectors)assert.ok(css.includes(selector),selector);
 assert.match(css,/:root:not\(\[data-sh9-transit="on"\]\)\[data-guardian-profile="m"\]/);
 assert.match(css,/#guardianMapSearchResultsV819\[hidden\]/);
 assert.match(css,/color:#e0eafa!important/);
 assert.match(css,/color:#ffffff!important/);
 assert.match(css,/prefers-reduced-transparency:reduce/);
});

test('visual-only patch leaves overlay geometry, GPS, input and navigation untouched',()=>{
 assert.match(code,/input\.addEventListener\('input',type\)/);
 assert.match(code,/suggestions\.append\(row\)/);
 assert.match(code,/go\.addEventListener\('click'/);
 assert.match(code,/mic\.addEventListener\('click'/);
 const allowed = css.replace(/\/\*[\s\S]*?\*\//g,'');
 assert.doesNotMatch(allowed,/\b(position|top|bottom|left|right|z-index|width|height|max-height|min-height|pointer-events|display|overflow-y)\s*:/);
 assert.doesNotMatch(allowed,/fetch\(|geolocation|localStorage|watchPosition|setInterval|@import/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
 assert.doesNotMatch(css,/#hhBkkKeyboardDockV964|#hhSmartHubNativeResultsV803|\.maplibregl-ctrl|#guardianFollow/);
});
