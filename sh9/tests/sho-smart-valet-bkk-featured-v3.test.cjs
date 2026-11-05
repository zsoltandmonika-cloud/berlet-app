'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const base=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const js=read('sh9/wallet/smart-valet-v1.js');
const css=read('sh9/wallet/smart-valet-sho-theme-v2.css');
const html=read('sh9/wallet/index.html');
test('actual user-supplied BKK montage is stored locally as a valid transparent high-quality WebP',()=>{
 const asset=fs.readFileSync(path.join(base,'sh9/wallet/bkk-featured-v1.webp'));
 assert.equal(asset.toString('ascii',0,4),'RIFF');
 assert.equal(asset.toString('ascii',8,12),'WEBP');
 assert.equal(asset.length,10204);
 assert.equal(crypto.createHash('sha256').update(asset).digest('hex'),
  '37629136557d662289b000e607a7f7cac053fe37bb22d5fa1ded1e7e2462c5b6');
});
test('only featured Budapest BKK pass uses montage; all other sample tickets retain vector artwork',()=>{
 assert.match(js,/const isBudapestPass=target\.provider==='BKK'&&target\.kind==='pass'/);
 assert.match(js,/const art=elt\('div','sv-feature-art'\+\(isBudapestPass\?' sv-feature-bkk':''\)\)/);
 assert.match(js,/if\(isBudapestPass\)/);
 assert.match(js,/image\.src=w\.SHO_VALET_BKK_APPROVED_V5\|\|'\.\/bkk-featured-v1\.webp'/);
 assert.match(js,/image\.width=420/);
 assert.match(js,/image\.height=280/);
 assert.match(js,/image\.addEventListener\('error',\(\)=>\{/);
 assert.match(js,/else art\.append\(symbol\(iconType\(target\)\)\)/);
 assert.match(js,/host\.append\(copy,art\)/);
 assert.match(js,/z-bkk/);assert.match(js,/m-bkk/);
});
test('BKK montage keeps responsive frame, no colored square, and all card controls',()=>{
 assert.match(css,/\.sv-feature-art\.sv-feature-bkk\{/);
 assert.match(css,/\.sv-feature-bkk-image\{/);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/background:none;border:0;border-radius:0/);
 assert.match(css,/sv-feature-bkk::after\{display:none/);
 assert.match(css,/@media\(max-width:390px\)/);
 assert.match(js,/btn\(t\('open'\),'sv-btn sv-btn-primary',\(\)=>modal\(target\.id\)\)/);
 assert.match(js,/btn\(\(pinned\(target\.id\)\?'★ ':'☆ '\)/);
 assert.match(js,/const target=list\(\)\.find\(x=>x\.id===pinId\(\)\)\|\|list\(\)\[0\]/);
});
test('cache-bust prevents old Edge script and css hiding the new featured image',()=>{
 assert.match(html,/smart-valet-v1\.js\?v=9-igazolvanyok-label/);
 assert.match(html,/smart-valet-sho-theme-v2\.css\?v=9-loyalty-club-tile/);
 assert.match(html,/sh9-golden-controls-v1\.js/);
 assert.match(html,/sh9-golden-bottom-nav-v924\.js/);
});
