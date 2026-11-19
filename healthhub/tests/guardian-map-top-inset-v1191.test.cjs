'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('guardian/index.html');
const css=read('guardian/guardian-map-top-inset-v1191.css');
const sat=read('guardian/guardian-satellite-v1033.css');
const mapSize=read('guardian/guardian-map-size-v864.css');
const zoom=read('guardian/guardian-zoom-alignment-v1187.css');
const guardianJS=read('guardian/guardian.js');

test('V1192 loads last after zoom v1190 without changing zoom width',()=>{
 const zoomLink='guardian-zoom-alignment-v1187.css?v=1190-40px-right';
 const insetLink='guardian-map-top-inset-v1191.css?v=1192-visible-36x36';
 assert.equal(html.split(insetLink).length,2);
 assert.ok(html.indexOf(insetLink)>html.indexOf(zoomLink));
 assert.match(zoom,/width:40px!important;min-width:40px!important;max-width:40px!important/);
 assert.match(zoom,/right:4px!important/);
});

test('Left fullscreen visible glass is 36px high, top and bottom line up with Follow',()=>{
 assert.match(sat,/#guardianFollow\.map-follow\{top:3px!important\}/);
 assert.match(sat,/height:36px!important;min-height:36px!important/);
 assert.match(sat,/#guardian3D\.map-3d\{top:41px!important\}/);
 assert.match(sat,/#guardianSatelliteV1033\.map-satellite\{top:79px!important/);
 assert.match(sat,/right:4px!important/);
 assert.match(sat,/#guardianMapSizeToggleV864\.hh-map-size-toggle-v864\{top:17px!important\}/,'satellite skin owns the former 17px override');
 assert.match(css,/#guardianMapSizeToggleV864\.hh-map-size-toggle-v864\{\s*top:3px!important;\s*left:4px!important;/);
 const patch=css.slice(css.indexOf('/* V1192 · equal VISIBLE height'));
 assert.ok(patch.length>100,'V1192 actually loaded');
 assert.match(patch,/#guardianMapSizeToggleV864\.hh-map-size-toggle-v864::before\{/);
 assert.match(patch,/top:0!important;left:0!important/);
 assert.match(patch,/width:36px!important;height:36px!important/);
 assert.match(patch,/font-size:22px!important/);
 assert.match(patch,/transform:translate\(-4px,-4px\)!important/);
 assert.match(html,/id="guardianMapSizeToggleV864"/);
});

test('Visual size reduces map occlusion without shrinking the full 44px hit area',()=>{
 const patch=css.slice(css.indexOf('/* V1192 · equal VISIBLE height'));
 assert.match(patch,/width:44px!important;height:44px!important/);
 assert.match(patch,/min-width:44px!important;min-height:44px!important/);
 assert.match(patch,/background:transparent!important/);
 assert.match(patch,/border-color:transparent!important/);
 assert.match(patch,/pointer-events:none!important/);
 assert.match(patch,/focus-visible::before\{/);
 assert.match(patch,/\[data-guardian-profile="m"\]/);
 assert.match(css,/@media \(max-width:600px\) and \(orientation:portrait\)/);
 assert.match(css,/:not\(\.hh-map-full-v819\):not\(:fullscreen\)/);
 assert.match(css,/html:not\(\[data-sh9-transit="on"\]\)/);
 assert.match(css,/\[data-hh-skin="lena-premium"\]/);
 assert.doesNotMatch(patch,/#guardianFollow|#guardian3D|#guardianSatelliteV1033|#guardianMapSearchV819|maplibregl-ctrl-bottom-right/);
 assert.ok(guardianJS.includes('new w.maplibregl.NavigationControl({showCompass:true})'));
 assert.doesNotMatch(patch,/fetch\(|XMLHttpRequest|localStorage|indexedDB|requestPermissions|@import/);
 let n=0;for(const c of css){if(c==='{')n++;else if(c==='}')n--;assert.ok(n>=0)}assert.equal(n,0);
});
