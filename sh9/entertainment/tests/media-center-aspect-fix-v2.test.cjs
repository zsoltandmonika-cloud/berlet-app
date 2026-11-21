'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/entertainment/media-center/index.html');
const art=read('sh9/entertainment/media-center/reference-art-v1.css');
const od=read('sh9/entertainment/media-center/onedrive-media-v2.js');

test('Three marked Media Center tiles preserve image aspect ratios and only one visible frame',()=>{
 assert.match(art,/background-size:100% 100%, 130% auto, 100% 100%/);
 assert.match(art,/background-position:center,center -8px,center/);
 assert.match(art,/\.tile\.videos\.tile-art-baked-v4::before\s*\{\s*background-size:cover!important/);
 assert.match(art,/transform:scale\(1\.10\)!important/);
 assert.match(art,/\.tile\.videos\.tile-art-baked-v4\s*\{[^}]*box-shadow:0 5px 16px/s);
 assert.match(art,/\.tile\.videos\.tile-art-baked-v4::after\{display:none!important\}/);
});
test('Card geometry, existing photos and OneDrive routes remain unchanged',()=>{
 const tileNames=['cinema','photos','videos','music','matches','security'];
 for(const name of tileNames){
  assert.equal((html.match(new RegExp('class="tile '+name+'"','g'))||[]).length,1);
 }
 assert.match(html,/reference-art-v1\.css\?v=20261121-crop-fix-v2/);
 assert.match(html,/class="media-tiles-glass"/);
 assert.match(html,/id="mediaViewer"/);
 assert.match(od,/sho-tile-homevideos-approved-v3\.webp/);
 for(const name of ['photos','videos','music'])assert.match(html,new RegExp('data-library="'+name+'"'));
});
