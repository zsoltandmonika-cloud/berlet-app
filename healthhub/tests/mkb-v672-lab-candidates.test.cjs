'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'mkb-lab-rules-v672.js'),'utf8');
const admin=fs.readFileSync(path.join(root,'hh-mkb-facts-admin-v670.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const mod={exports:{}};
new Function('module',script)(mod);
const rules=mod.exports;
const sample=[
 'Mintavétel ________: 2026.03.27. 14:37:00',
 'Minta _____________: Vizelet (tenyésztés)',
 'Baktérium aerob tenyésztése',
 'Baktérium __________________: Escherichia coli   Citrobacter koseri    Staphylococcus',
 ' aureus',
 "Eredmény ___________________: Csíraszám: 10'4  Csíraszám: 10'4  Csíraszám: 10'4",
 'Validálás ideje: 2026.04.01.'
].join('\n');
test('three species in a specimen-dated culture become exact pending source quotes',()=>{
 const result=rules.candidates(sample);
 assert.equal(result.length,3);
 assert.deepEqual(result.map(x=>x.observed_date),['2026-03-27','2026-03-27','2026-03-27']);
 assert.deepEqual(result.map(x=>x.fact_type),['laboratory','laboratory','laboratory']);
 assert.equal(result.every(x=>x.review_status==='pending'&&x.assertion_type==='reported'),true);
 assert.equal(result.every(x=>sample.includes(x.excerpt)&&x.excerpt.startsWith('Baktérium')),true);
 assert.equal(result.every(x=>x.excerpt.includes('Csíraszám')&&x.excerpt.length<650),true);
 assert.equal(result.every(x=>!x.excerpt.includes('Mintavétel')&&!x.excerpt.includes('Orvos')),true);
 assert.equal(result.every(x=>x.value_number===null&&x.original_unit===null),true);
 assert.equal(result.every(x=>!(/fertőzés|antibiotikum/i.test(x.value_text))),true);
});
test('PDF text-layer that merges bacteria and colony-count row is also supported',()=>{
 const text=sample.replace(/(Baktérium __________________:[^\n]+)\n aureus\nEredmény/, '$1 aureus Eredmény');
 assert.equal(rules.candidates(text).length,3);
});
test('sample date must be explicit and valid; document validation date is not substituted',()=>{
 assert.deepEqual(rules.candidates(sample.replace('2026.03.27.','2026.02.30.')),[]);
 assert.deepEqual(rules.candidates(sample.replace('Mintavétel ________:', 'Lelet kelte:')),[]);
 assert.deepEqual(rules.candidates(sample+'\nMintavétel: 2026.03.28.'),[]);
});
test('missing sample evidence, non-urine specimen, absent culture or absent growth proof fail closed',()=>{
 assert.deepEqual(rules.candidates(sample.replace('Vizelet','Vér')),[]);
 assert.deepEqual(rules.candidates(sample.replace('Baktérium aerob tenyésztése','Vizsgálat')),[]);
 assert.deepEqual(rules.candidates(sample.replace(/Csíraszám/g,'Ismeretlen')),[]);
 assert.deepEqual(rules.candidates('2026.03.27 Escherichia coli'),[]);
});
test('viewer keeps existing rules and activates strict lab rules in the right script order',()=>{
 assert.doesNotThrow(()=>new Function(script));
 assert.doesNotThrow(()=>new Function(admin));
 assert.match(index,/mkb-lab-rules-v672\.js\?v=673-minimal-evidence/);
 assert.match(index,/v677-one-shot-mkb-ai-consent/);
 assert.ok(index.indexOf('mkb-fact-rules-v670.js')<index.indexOf('mkb-lab-rules-v672.js'));
 assert.ok(index.indexOf('mkb-lab-rules-v672.js')<index.indexOf('hh-mkb-facts-admin-v670.js'));
 assert.match(admin,/rules\.candidates\(page\.page_text\)\.concat\(labs\.candidates\(page\.page_text\)\)/);
 assert.match(admin,/await digest\(page\.page_text\)!==page\.text_sha256/);
 assert.match(admin,/review_status:'pending'/);
});