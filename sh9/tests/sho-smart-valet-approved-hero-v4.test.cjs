'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const home=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(home,p),'utf8');
const html=read('sh9/wallet/index.html');
const css=read('sh9/wallet/smart-valet-sho-theme-v2.css');
test('user-approved full-frame cinematic Hero asset is valid local AVIF with matching bytes',()=>{
 const bin=fs.readFileSync(path.join(home,'sh9/wallet/smart-valet-approved-hero-v4.avif'));
 assert.equal(bin.length,37499);
 assert.equal(bin.toString('ascii',4,12),'ftypavif');
 assert.equal(crypto.createHash('sha256').update(bin).digest('hex'),
 '3d9e99d4750b3c00b252e21dfa51ebca737c3bf5b69b7e6ede92c32cc7e2195b');
});
test('responsive Hero uses the approved image, preserves SVG fallback and no external tracking',()=>{
 assert.match(html,/<picture class="sv-hero-picture">/);
 assert.match(html,/<source srcset="\.\/smart-valet-approved-hero-v4\.avif" type="image\/avif">/);
 assert.match(html,/<img class="sv-hero-art" src="\.\/smart-valet-hero-v2\.svg"/);
 assert.match(css,/\.sv-hero\{\s*height:auto!important;\s*min-height:0!important;\s*aspect-ratio:16 \/ 9;/);
 assert.match(css,/\.sv-hero-picture/);
 assert.match(css,/\.sv-hero-picture \.sv-hero-art/);
 assert.match(css,/object-fit:cover;object-position:center/);
 assert.doesNotMatch(html,/<source[^>]+https?:\/\//);
});
test('hero does not double-display the already baked SHO logo and Smart Valet heading',()=>{
 assert.match(css,/\.sv-hero-copy,\.sv-hero-glow,\.sv-hero-illustration,\.sv-orbit\{display:none!important\}/);
 assert.match(css,/\.sv-hero::after\{display:none!important;content:none\}/);
 assert.match(css,/@media\(max-width:390px\)\{\.sv-hero\{height:auto!important\}\}/);
});
test('the existing Golden top dock, bottom nav and BKK quick-access montage remain unchanged',()=>{
 assert.match(html,/sh9-golden-controls-v1\.js/);
 assert.match(html,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(html,/data-sh9-golden-bottom-nav="on"/);
 assert.match(html,/smart-valet-sho-theme-v2\.css\?v=9-loyalty-club-tile/);
 assert.match(html,/smart-valet-v1\.js\?v=9-loyalty-club-filters/);
 assert.match(css,/\.sv-feature-art\.sv-feature-bkk/);
 assert.match(html,/id="svFeatured"/);
 assert.match(html,/id="svCards"/);
});
