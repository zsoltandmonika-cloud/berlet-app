'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
test('supplement module is syntactically valid and keeps private profile storage',()=>{
 const src=read('hh-supplements-v700.js');
 new Function(src);
 assert.match(src,/profiles\[p\]\.supplements/);
 assert.match(src,/healthhub:private-supplements-saved/);
 assert.match(src,/hhMasterStructuredSync304/);
 assert.match(src,/nem igazolt/);
 assert.doesNotMatch(src,/profiles\[p\]\.medications\s*=/);
});
test('all 8 user-specified supplements are present as templates, not consumed records',()=>{
 const s=read('hh-supplements-v700.js');
 const names=['JutaVit Ashwagandha KSM-66','Multi4u C + D3','ZeinPharma Wild Yams Plus','JutaVit Mg-biszglicinát','Dr. Chen Omega-3 Forte Plus','WOW TEA SlimFit Berry','PureGold CreaWomen','PureGold Lady Shape'];
 names.forEach(n=>assert.ok(s.includes("name:'"+n+"'"),n));
 assert.equal((s.match(/\{name:'[^']+',strength:/g)||[]).length,8);
 assert.match(s,/Katalógustétel, nem rögzített szedés/);
});
test('canonical medications route, Home label, scroll and AI context stay connected',()=>{
 assert.match(read('index.html'),/hh-supplements-v700\.js\?v=700/);
 assert.match(read('premium-glass-home-v520.js'),/Gyógyszerek & Supplement/);
 assert.match(read('live-v126.js'),/medications:'HealthHub Gyógyszerek \+ Supplements'/);
 assert.match(read('live-v289.js'),/supplements:supplementList\(rs\[4\],p\)/);
 assert.match(read('live-v331.js'),/domain:'supplement'|put\('supplement'/);
});
test('Ask Lena research monitor is half height initially and grows until capped',()=>{
 const s=read('live-v340.js');
 new Function(s);
 assert.match(s,/min-height:142px!important/);
 assert.match(s,/height:auto!important/);
 assert.match(s,/max-height:min\(48vh,420px\)/);
 assert.doesNotMatch(s,/height:284px/);
});

test('Supplements appear before the pharmacy alternatives in every Medications rerender',()=>{
 const src=read('hh-supplements-v700.js');
 assert.match(src,/parent\.querySelector\('#hhPharmacyGuide'\)/);
 assert.match(src,/parent\.insertBefore\(sec,guide\)/);
 assert.match(src,/parent\.insertBefore\(sec,medicationCard\.nextSibling\)/);
 assert.doesNotMatch(src,/refresh\(\);parent\.appendChild\(sec\)/);
});
test('the visible Ask Léna input composer is compact and grows with typed text',()=>{
 const js=read('live-v340.js'),css=read('ask-lena-chat-glass-v566.css');
 assert.match(js,/min-height:100px/);
 assert.match(js,/q\.scrollHeight,limit/);
 assert.match(js,/height','34px','important'/);
 assert.doesNotMatch(js,/height:190px/);
 assert.match(css,/#hhLenaComposer340\{height:auto!important;min-height:100px!important\}/);
 assert.doesNotMatch(css,/#hhLenaComposer340\{height:190px/);
 const entry=read('index.html');
 assert.match(entry,/hh-supplements-v700\.js\?v=701/);
 assert.match(entry,/live-v340\.js\?v=701/);
 assert.match(entry,/ask-lena-chat-glass-v566\.css\?v=701/);
});
