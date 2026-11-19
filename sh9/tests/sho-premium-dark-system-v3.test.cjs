'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const skin=read('shared/sho-premium-dark-system-v3.css');
const pages=['shopping/index.html','sport/index.html'];
const href='sho-premium-dark-system-v3.css?v=3-shopping-sport-20261119';

test('shopping and sport opt in AFTER approved Lena V2 wave, once each',()=>{
 for(const p of pages){
  const h=read(p);
  assert.equal(h.split(href).length,2,p+' exactly one v3 reference');
  const head=h.slice(0,h.indexOf('</head>'));
  assert.ok(head.indexOf('lena-premium-wave-v2.css')<head.indexOf(href),p+' v3 last');
  assert.equal(head.match(/sho-premium-dark-system-v3\.css/g)?.length,1,p);
  const mod=p.split('/')[0];
  assert.match(h,new RegExp('data-lp-v2="on" data-lp-module="'+mod+'"'));
 }
});

test('the two-module skin uses existing classes, no sizing/positioning/routing or data changes',()=>{
 assert.match(skin,/body\[data-lp-v2="on"\]\[data-lp-module="shopping"\]/);
 assert.match(skin,/body\[data-lp-v2="on"\]\[data-lp-module="sport"\]/);
 for(const s of ['#searchForm.search-bar','#searchInput','.categories .cat',
  '.sho-store','.sho-product','.quick-panel','.workspace','.sport-menu','.sport-frame']){
  assert.ok(skin.includes(s),s);
 }
 const stripped=skin.replace(/\/\*[\s\S]*?\*\//g,'');
 assert.doesNotMatch(stripped,/(?:^|[\s;{])(?:position|top|right|bottom|left|width|height|min-height|max-height|grid-template-columns|flex-basis|overflow|object-fit|object-position|z-index|pointer-events|display)\s*:/m);
 assert.doesNotMatch(stripped,/#mecsradarFull|\.sport-frame\s+iframe|\.hero-image\s*\{|\.cat\s+img\s*\{|fetch\(|localStorage|postMessage|geolocation|@import/);
 assert.equal((skin.match(/\{/g)||[]).length,(skin.match(/\}/g)||[]).length);
});

test('search, saved shopping lists, sport live bridge and all hero art are unchanged',()=>{
 const shop=read('shopping/index.html');
 const sport=read('sport/index.html');
 assert.match(shop,/id="searchForm"/);
 assert.match(shop,/id="shoStoreGrid"/);
 assert.match(shop,/id="shoProducts"/);
 assert.match(shop,/id="workspace"/);
 assert.match(shop,/hero-lena-ai-shopping-hub-v1\.avif/);
 assert.match(sport,/id="mecsradarFull"/);
 assert.match(sport,/postMessage\(/);
 assert.match(sport,/SHO_Sport_hero_1672x941\.webp/);
 assert.match(sport,/data-sport-nav="program"/);
 assert.match(skin,/prefers-reduced-transparency:reduce/);
 assert.match(skin,/--sho3-line-pink/);
 assert.match(skin,/--sho3-line-cyan/);
});
