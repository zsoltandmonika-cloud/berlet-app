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

test('V1192 36x36 fullscreen button loads last, retaining 40px zoom v1190',()=>{
 const zoomLink='guardian-zoom-alignment-v1187.css?v=1190-40px-right';
 const insetLink='guardian-map-top-inset-v1191.css?v=1192-36x36-aligned';
 assert.equal(html.split(insetLink).length,2);
 assert.ok(html.indexOf(insetLink)>html.indexOf(zoomLink));
 assert.match(zoom,/width:40px!important;min-width:40px!important;max-width:40px!important/);
 assert.match(zoom,/right:4px!important/);
});
test('Left fullscreen toggle is 36x36 and aligns with 36px-high Follow at top 3px',()=>{
 assert.match(mapSize,/width:44px!important;height:44px!important/);
 assert.match(sat,/#guardianFollow\.map-follow\{top:3px!important\}/);
 assert.match(sat,/#guardian3D\.map-3d\{top:41px!important\}/);
 assert.match(sat,/#guardianSatelliteV1033\.map-satellite\{top:79px!important/);
 assert.match(sat,/right:4px!important/);
 assert.match(sat,/#guardianMapSizeToggleV864\.hh-map-size-toggle-v864\{top:17px!important\}/);
 assert.match(css,/#guardianMapSizeToggleV864\.hh-map-size-toggle-v864\{\s*top:3px!important;\s*left:4px!important;/);
 assert.match(css,/width:36px!important;min-width:36px!important;max-width:36px!important/);
 assert.match(css,/height:36px!important;min-height:36px!important;max-height:36px!important/);
 assert.match(html,/id="guardianMapSizeToggleV864"/);
 assert.match(guardianJS,/new w\.maplibregl\.NavigationControl\(\{showCompass:true\}\)/);
});
test('V1192 changes only normal portrait fullscreen button dimensions and offsets, not MapLibre or fullscreen view',()=>{
 assert.match(css,/@media \(max-width:600px\) and \(orientation:portrait\)/);
 assert.match(css,/html:not\(\[data-sh9-transit="on"\]\)/);
 assert.match(css,/\[data-hh-skin="lena-premium"\]/);
 assert.match(css,/:not\(\.hh-map-full-v819\):not\(:fullscreen\)/);
 const declarations=css.slice(css.lastIndexOf('{')+1,css.lastIndexOf('}'));
 assert.match(declarations,/top:3px!important/);
 assert.match(declarations,/left:4px!important/);
 assert.match(declarations,/width:36px!important;min-width:36px!important;max-width:36px!important/);
 assert.match(declarations,/height:36px!important;min-height:36px!important;max-height:36px!important/);
 assert.doesNotMatch(declarations,/(?:right|bottom|display|transform|padding|margin|background|position|z-index)\s*:/);
 assert.doesNotMatch(css,/maplibregl-ctrl-bottom-right|#guardianFollow|#guardian3D|#guardianSatelliteV1033|#guardianMapSearchV819/);
 let n=0;for(const c of css){if(c==='{')n++;else if(c==='}')n--;assert.ok(n>=0);}assert.equal(n,0);
});
