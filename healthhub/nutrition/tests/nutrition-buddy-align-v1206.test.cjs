'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'hh-buddy-portrait-align-v1206.css'),'utf8');
const sprite=fs.readFileSync(path.join(dir,'hh-buddy-rag-fullbody-v1141.css'),'utf8');

test('only the visible mood Buddy squirrel shifts exactly five pixels right and down',()=>{
 assert.match(css,/#balanceCard #hhBuddyMood\.hh-buddy-mood \.hh-buddy-face\{\s*transform:translate\(5px, 5px\)!important;/);
 assert.doesNotMatch(css,/(?:^|[\s,{])#buddy(?:\s|[.,:{>])/);
 assert.doesNotMatch(css,/#hhBalanceQuickAdd1139|\.hh-body-dials|\.hh-body-dial|\.ring|\.hh-water/);
 assert.match(sprite,/background-image:var\(--hh-premium-rag-sprite\)!important/);
 assert.match(sprite,/#balanceCard #hhBuddyMood\.hh-buddy-mood/);
});

test('v1206 link is loaded once after Buddy sprite and before the final hydration skin',()=>{
 const head=html.slice(0,html.indexOf('</head>'));
 const buddyLink='hh-buddy-portrait-align-v1206.css?v=1206-buddy-right5-down5';
 assert.equal(head.split(buddyLink).length,2);
 assert.ok(head.indexOf('hh-buddy-rag-fullbody-v1141.css')<head.indexOf(buddyLink));
 assert.ok(head.indexOf(buddyLink)<head.indexOf('hh-hydration-showcase-v1202.css'));
 const links=[...head.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0]);
 assert.ok(links.at(-1).includes('hh-hydration-showcase-v1202.css'));
 assert.equal((html.match(/id="hhBuddyMood"/g)||[]).length,1);
 assert.equal((html.match(/id="hhBalanceQuickAdd1139"/g)||[]).length,1);
});
