'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=source('sh9/wallet/index.html'),theme=source('sh9/wallet/smart-valet-sho-theme-v2.css');
const hero=source('sh9/wallet/smart-valet-hero-v2.svg'),icons=source('sh9/wallet/smart-valet-icons-v2.svg');
const app=source('sh9/wallet/smart-valet-v1.js'),old=source('sh9/wallet/smart-valet-v1.css');
test('approved navy/purple SHO Travel theme overrides, preserves original Golden controls and does not widen past mobile shell',()=>{
 assert.match(theme,/background:#0b1425/);
 assert.match(theme,/width:min\(100%,510px\)/);
 assert.match(theme,/rgba\(8,42,80,\.60\)/);
 assert.match(theme,/\.sv-feature-card/);
 assert.match(theme,/\.sv-category\.active/);
 assert.match(theme,/\.sv-bottom/);
 assert.match(theme,/--sv-plate:linear-gradient/);
 assert.match(theme,/#9b81df/);
 assert.match(theme,/@media\(max-width:390px\)/);
 assert.match(html,/smart-valet-sho-theme-v2\.css\?v=3-bkk-montage/);
 assert.match(html,/sh9-golden-controls-v1\.js/);
 assert.match(html,/sh9-golden-bottom-nav-v924\.js/);
 assert.match(html,/data-sh9-golden-bottom-nav="on"/);
 assert.match(old,/\.sv-categories/,'base styles remain intact for safe fallback');
});
test('HD Wallet hero is local, resolution-independent, no external image trackers or public ticket QR',()=>{
 assert.match(html,/class="sv-hero-art"/);
 assert.match(html,/src="\.\/smart-valet-hero-v2\.svg"/);
 assert.match(hero,/width="1920" height="1080"/);
 assert.match(hero,/<linearGradient/);
 assert.match(hero,/filter id="glow"/);
 assert.match(hero,/viewBox="0 0 1920 1080"/);
 assert.doesNotMatch(hero,/(?:href|src)=\"https?:\/\//);
 assert.doesNotMatch(html,/<img[^>]+https?:\/\//);
});
test('eight attractive category tiles use local scalable iconpack including all requested identity, licence, health, finance and document kinds',()=>{
 const categories=[...html.matchAll(/data-kind="([a-z]+)"/g)].map(a=>a[1]);
 assert.deepEqual(categories,['all','identity','license','health','card','ticket','pass','document']);
 const symbolIds=[...icons.matchAll(/<symbol id="([^"]+)"/g)].map(m=>m[1]);
 for(const name of ['all','identity','license','health','payment','ticket','pass','document','bus','train','sport']){
  assert.ok(symbolIds.includes(name),name);
 }
 assert.equal((html.match(/class="sv-cat-icon"/g)||[]).length,8);
 assert.match(theme,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(theme,/\.sv-category \.sv-cat-icon/);
 assert.match(app,/function symbol\(name\)/);
 assert.match(app,/createElementNS/);
 assert.match(app,/sv-item-glyph/);
 assert.match(app,/sv-feature-art/);
 assert.match(app,/svDialogIcon'\)\.replaceChildren/);
});
test('no changed checkout, bank card upload, unsafe QR reproduction or session data leaks',()=>{
 assert.match(html,/id="svAdd" disabled/);
 assert.match(html,/Nem érvényes belépőkód/);
 assert.match(html,/nem érvényesek/);
 assert.doesNotMatch(html,/<input[^>]*type="file"/i);
 assert.doesNotMatch(app,/fetch\(|supabase|createClient|FileReader|BarcodeDetector/);
 assert.match(app,/sho-smart-valet-demo-pin-v1:/);
 assert.match(app,/w\.localStorage\.setItem\(pinKey\(\),value\)/);
 assert.doesNotThrow(()=>new vm.Script(app));
});
test('profile colour and language still follow SHO settings and remain localized',()=>{
 assert.match(theme,/:root\[data-sh9-golden-profile="m"\]/);
 assert.match(app,/identity:'Azonosítók'/);
 assert.match(app,/license:'Jogosítvány'/);
 assert.match(app,/card:'Bankkártyák'/);
 assert.match(app,/identity:'Identity'/);
 assert.match(app,/license:'Driver licence'/);
 assert.match(app,/w\.addEventListener\('sh9:languagechange'/);
 assert.match(app,/w\.addEventListener\('hh-family-profile-changed'/);
});
