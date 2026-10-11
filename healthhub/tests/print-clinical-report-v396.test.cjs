// Synthetic A4 print-ready clinical research layout regression.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('healthhub/live-v392-share-print.js','utf8');
const sandbox={
 console,Date,Promise,setTimeout(){return 1},URL:{createObjectURL(){return 'blob:synthetic'},revokeObjectURL(){}},
 localStorage:{getItem(){return 'm'}},navigator:{},
 window:{addEventListener(){},open(){return null}},
 document:{getElementById(){return null},querySelector(){return null},addEventListener(){},
  createElement(){return {style:{},appendChild(){},setAttribute(){}}},head:{appendChild(){}}},
 indexedDB:{open(){}},File:class File{},Blob
};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
const p=sandbox.window.HH_SHARE_PRINT_V392.printMarkup;
const record={profile:'monika',question:'Mi történt? <script>alert(1)</script>',
 answer:'## 🚑 Helyszíni segítségnyújtás\nEsemény egyik részlete.\n\nEsemény második részlete.\n\n## 🏥 Sürgősségi ellátás\nSzakorvosi részlet.',
 printSections:[
  {heading:'🚑 Helyszíni segítségnyújtás',content:'Első igazolt esemény.\n\nMásodik igazolt esemény.\n\n- Szintetikus mentési lépés\n- Második lépés'},
  {heading:'🏥 Sürgősségi ellátás',content:'Az orvosi beavatkozás részletes magyarázata, két egymást követő lépéssel.'}
 ],
 sources:'A szintetikus források kizárólag teszt célokat szolgálnak.',
 generatedAt:'2026. 10. 11. 20:00'};
const html=p(record);
assert.ok(html.includes('@page{size:A4'));
assert.ok(html.includes('page-break-before:always'),'evidence appendix starts separate printed page');
assert.ok(html.includes('🚑 Helyszíni segítségnyújtás'));
assert.ok(html.includes('🏥 Sürgősségi ellátás'));
assert.ok(html.indexOf('🚑')<html.indexOf('🏥'));
assert.ok(html.includes('<ul>'),'source answer bullets print as semantic list');
assert.ok(html.includes('<li>Szintetikus mentési lépés</li>'));
assert.ok(html.includes('Források és technikai ellenőrzések'));
assert.ok(html.includes('Első igazolt esemény.'));
assert.ok(html.includes('Második igazolt esemény.'));
assert.ok(!html.includes('<script>alert(1)</script>'),'private question never injects markup');
assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert.ok(html.includes('break-after:avoid'));
assert.ok(html.includes('font-size:10.8pt'));
const plain=p({profile:'zsolt',question:'Egy kérdés?',answer:'## Cím\nA tényszerű válasz.\n\n## További elemzés\nKövetkező gondolat.',sources:''});
assert.ok(plain.includes('Cím'));
assert.ok(plain.includes('További elemzés'));
assert.ok(!plain.includes('Források és technikai ellenőrzések'));
console.log('PASS v396: multi-page A4, chronological chapters, readable printed paragraphs, source appendix, HTML injection protection');
