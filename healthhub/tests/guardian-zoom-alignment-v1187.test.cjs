'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('guardian/index.html');
const css=read('guardian/guardian-zoom-alignment-v1187.css');
const old=read('guardian/guardian-controls-v782.css');
const top=read('guardian/guardian-satellite-v1033.css');
const mapJS=read('guardian/guardian.js');

test('V1187 is loaded once after existing Premium styles',()=>{
 const base='guardian-bkk-readable-controls-v1185.css?v=1186-dark-glass-header';
 const link='guardian-zoom-alignment-v1187.css?v=1187-align-zoom-9px';
 assert.equal(html.split(link).length,2);
 assert.ok(html.indexOf(link)>html.indexOf(base),'last visual override wins');
 assert.match(html,/id="guardianFollow"/);
 assert.match(html,/id="guardian3D"/);
 assert.match(html,/id="guardianSatelliteV1033"/);
});
test('MapLibre zoom control moves left by nine pixels and buttons match 36px upper controls',()=>{
 assert.match(old,/\.maplibregl-ctrl-bottom-right\{\s*right:2px!important/);
 assert.match(top,/height:36px!important;min-height:36px!important/);
 assert.match(css,/\.maplibregl-ctrl-bottom-right\{\s*right:11px!important/);
 assert.match(css,/right:11px!important; \/\* old: 2px; move cluster 9px to the left \*\//);
 assert.match(css,/width:38px!important/,'zoom outer group remains compact');
 assert.match(css,/width:36px!important;min-width:36px!important/);
 assert.match(css,/height:36px!important;min-height:36px!important/);
 assert.match(css,/place-items:center!important/);
 assert.match(css,/border-radius:13px!important/);
});
test('Isolated visual changes never mutate GPS, MapLibre positioning or native actions',()=>{
 assert.match(css,/@media \(max-width:600px\) and \(orientation:portrait\)/);
 assert.match(css,/:not\(\.hh-map-full-v819\)/);
 assert.match(css,/html:not\(\[data-sh9-transit="on"\]\)/);
 assert.match(css,/\[data-hh-skin="lena-premium"\]/);
 assert.match(css,/\[data-guardian-profile="m"\]/);
 assert.doesNotMatch(css,/top:|bottom:|transform:|translate|position:|display:none|pointer-events:none/);
 assert.doesNotMatch(css,/guardianFollow|guardian3D|guardianSatelliteV1033|guardianMapSearch|maplibregl-canvas|maplibregl-ctrl-attrib/);
 assert.doesNotMatch(css,/fetch\(|XMLHttpRequest|localStorage|indexedDB|requestPermissions|@import|@font-face|https?:\/\//);
 assert.match(mapJS,/new w\.maplibregl\.NavigationControl\(\{showCompass:true\}\),'native zoom and compass actions retained');
 let level=0;
 for(const c of css){if(c==='{')level++;if(c==='}')level--;assert.ok(level>=0)}
 assert.equal(level,0);
});
