'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../guardian/guardian-satellite-v1033.css'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../guardian/index.html'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'../guardian/guardian-satellite-v1033.js'),'utf8');
const logo=css.match(/\.map-card #guardianSatelliteLogoV1033\{([\s\S]*?)\}/)?.[1]||'';
const image=css.match(/\.map-card #guardianSatelliteLogoV1033 img\{([\s\S]*?)\}/)?.[1]||'';

test('MapTiler official linked logo stays mounted with source attribution',()=>{
 assert.match(html,/<a id="guardianSatelliteLogoV1033" hidden href="https:\/\/www\.maptiler\.com\/"[^>]*>/);
 assert.match(html,/id="guardianSatelliteLogoImgV1033" data-src="https:\/\/api\.maptiler\.com\/resources\/logo\.svg"/);
 assert.match(js,/logo\.hidden=!on/);
 assert.match(js,/© MapTiler/);
 assert.match(js,/© OpenStreetMap/);
});

test('large opaque white badge becomes translucent premium glass, not hidden',()=>{
 assert.match(logo,/background:rgba\(247,251,255,\.72\)!important/);
 assert.match(logo,/backdrop-filter:blur\(9px\)/);
 assert.match(logo,/display:flex!important/);
 assert.match(logo,/z-index:73!important/);
 assert.doesNotMatch(logo,/opacity:0|display:none|visibility:hidden|filter:opacity\(0\)/);
 assert.match(css,/#guardianSatelliteLogoV1033\[hidden\]\{display:none!important\}/);
});

test('official wordmark remains full-scale, crisp and clickable',()=>{
 assert.match(image,/width:85px!important/);
 assert.match(image,/opacity:1!important/);
 assert.match(image,/filter:none!important/);
 assert.match(css,/#guardianSatelliteLogoV1033:focus-visible/);
 assert.match(html,/aria-label="MapTiler műholdas térkép"/);
});

test('change is isolated to stylesheet presentation, not satellite behavior',()=>{
 assert.match(html,/guardian-satellite-v1033\.css\?v=1052-compact-maptiler-mobile/);
 assert.match(html,/guardian-satellite-v1033\.js\?v=1052-compact-attribution-mobile/);
 assert.doesNotMatch(css,/navigator\.geolocation|fetch\(|supabase|dropbox|localStorage|sessionStorage/i);
});
