'use strict';
// SHO Wallet v5: approved BKK image and native-shaped Golden bottom taskbar.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/wallet/index.html');
const js=read('sh9/wallet/smart-valet-v1.js');
const css=read('sh9/wallet/smart-valet-sho-theme-v2.css');
const asset=read('sh9/wallet/smart-valet-bkk-approved-v5.js');
test('user-approved transparent Budapest pass is a real local AVIF and never a fabricated ticket',()=>{
 const runtime={window:{}};vm.runInNewContext(asset,runtime,{filename:'approved-bkk'});
 const uri=runtime.window.SHO_VALET_BKK_APPROVED_V5;
 assert.match(uri,/^data:image\/avif;base64,[A-Za-z0-9+/=]+$/);
 const bytes=Buffer.from(uri.slice('data:image/avif;base64,'.length),'base64');
 assert.equal(bytes.toString('ascii',4,12),'ftypavif');
 assert.ok(bytes.length>=15000&&bytes.length<=40000,'keep high-quality but bounded art');
 assert.match(js,/image\.src=w\.SHO_VALET_BKK_APPROVED_V5/);
 assert.match(js,/image\.src='\.\/bkk-featured-v1\.webp'/);
 assert.match(js,/const isBudapestPass=target\.provider==='BKK'&&target\.kind==='pass'/);
 assert.match(html,/DEMO \/ TERVEZET/);
 assert.doesNotMatch(html,/class="sv-demo-notice"/);
 assert.match(html,/id="svAdd" disabled/);
 assert.match(html,/Nem érvényes belépőkód/);
 assert.doesNotMatch(asset,/fetch\(|localStorage|XMLHttpRequest|supabase/i);
});
test('the approved image loads BEFORE the render code and is isolated to the featured pass',()=>{
 const art=html.indexOf('smart-valet-bkk-approved-v5.js?v=5-approved-budapest-pass');
 const app=html.indexOf('smart-valet-v1.js?v=9-igazolvanyok-label');
 assert.ok(art>0&&app>art);
 assert.match(js,/if\(isBudapestPass\)/);
 assert.match(js,/else art\.append\(symbol\(iconType\(target\)\)\)/);
 assert.match(js,/host\.append\(copy,art\)/);
 assert.match(html,/id="svFeatured"/);
});
test('Wallet nav matches the flat flush SHO Golden bar, not the old floating pill',()=>{
 assert.match(html,/class="sv-bottom nav" aria-label="SH9 Golden Standard navigáció"/);
 assert.match(html,/data-sh9-golden-bottom-nav="on"/);
 assert.match(html,/smart-valet-sho-theme-v2\.css\?v=9-loyalty-club-tile/);
 assert.match(css,/Wallet-only GOLDEN bottom navigation alignment/);
 const end=css.slice(css.lastIndexOf('/* v5 · Wallet-only GOLDEN'));
 assert.match(end,/nav\.sv-bottom\[data-sh9-golden-bottom-nav="on"\]\{/);
 for(const declaration of [
  'position:fixed;','bottom:0;','left:50%;','transform:translateX(-50%);',
  'border-radius:0;','overflow:visible;','border-top:1px','min-height:70px;',
  'height:calc(70px + env(safe-area-inset-bottom,0px))',
  'grid-template-columns:repeat(5,minmax(0,1fr))',
 ])assert.ok(end.includes(declaration),declaration);
 assert.match(end,/>[\r\n ]*\[data-sho-notify-unread\]:not\(\[data-sho-notify-unread="0"\]\)::after\{/);
 assert.match(end,/top:1px;[\s\S]*?right:calc\(50% - 22px\)/);
 assert.doesNotMatch(end,/pointer-events:none/,'bell hitbox must stay usable');
});
test('Golden nav actions still point to correct SHO modules',()=>{
 for(const role of ['home','ask','notifications'])
  assert.match(html,new RegExp('data-sh9-bottom-role="'+role+'"'));
 assert.match(html,/id="svBack"/);
 assert.match(html,/notification-center\//);
 assert.match(html,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(html,/sh9-golden-controls-v1\.js/);
});
