'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const rulesSource=fs.readFileSync(path.join(root,'mkb-fact-rules-v670.js'),'utf8');
const adminSource=fs.readFileSync(path.join(root,'hh-mkb-facts-admin-v670.js'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const moduleStub={exports:{}};
new Function('module',rulesSource)(moduleStub);
const rules=moduleStub.exports;
test('pure, local medical rule candidates require explicitly dated, direct statements',()=>{
 assert.deepEqual(rules.candidates('2024.06.17: kamrafibrilláció miatt reanimacio')
  .map(x=>x.rule),['vf']);
 assert.deepEqual(rules.candidates('A műtét neme: Coronarographia\nA műtét ideje: 2024.06.17. 19:13')
  .map(x=>x.rule),['cath']);
 assert.deepEqual(rules.candidates('33110 Coronarographia 2024.06.17. 19:13 1')
  .map(x=>x.rule),['cath']);
 // A VF date on a narrative line is NOT a verified coronarography date.
 assert.deepEqual(rules.candidates(
  '2024.06.17-én kamrafibrilláció miatt történt reanimáció. Coronarographia: negatív.'
 ).map(x=>x.rule),['vf']);
 assert.deepEqual(rules.candidates('2024.06.17: Coronarographia: negatív.')
  .map(x=>x.rule),[]);
 assert.deepEqual(rules.candidates('2024.06.17 coronarographia céljából átadás')
  .map(x=>x.rule),[]);
 assert.deepEqual(rules.candidates('2024.07.13 CRT-D beültetés megtörtént')
  .map(x=>x.rule),['device']);
 assert.equal(rules.candidates('2025.10.02 EF: 57 %')[0].value_number,57);
});
test('negation, impossible dates, undated statements and EF ranges never become facts',()=>{
 const invalid=[
  '2024.06.17 nem történt kamrafibrilláció miatt reanimáció',
  '2024.02.30 kamrafibrilláció miatt reanimáció',
  'kamrafibrilláció miatt reanimáció',
  '2025.10.02 EF: 55-60%',
  '2025.10.02 EF: 5-25%',
  '2024.07.13 tervezett CRT-D beültetés',
  '2024.07.13 javasolt CRT-D implantáció'
 ];
 for(const item of invalid)assert.deepEqual(rules.candidates(item),[],item);
});
test('source excerpt is an unchanged exact substring and every extracted item is pending',()=>{
 const page='2024.06.17: kamrafibrilláció miatt reanimáció\n';
 const result=rules.candidates(page);
 assert.equal(result.length,1);
 const x=result[0];
 assert.equal(page.includes(x.excerpt),true);
 assert.equal(x.review_status,'pending');
 assert.equal(x.assertion_type,'historical');
 assert.equal(x.time_precision,'day');
 assert.equal(x.observed_date,'2024-06-17');
 assert.equal(x.extraction_method,'embedded_text');
});
test('strict per-profile SHA and source gate precedes every preview/save; clinical reviews remain unchanged',()=>{
 assert.doesNotThrow(()=>new Function(adminSource));
 assert.match(adminSource,/authorizedProfiles/);
 assert.match(adminSource,/profile_key=eq/);
 assert.match(adminSource,/text_integrity_status==='verified'/);
 assert.match(adminSource,/source_metadata\.ingest_scope==='excluded'/);
 assert.match(adminSource,/source_class!=='device'/);
 assert.match(adminSource,/page\.needs_review/);
 assert.match(adminSource,/await digest\(page\.page_text\)!==page\.text_sha256/);
 assert.match(adminSource,/if\(previous&&previous\.status==='rejected'\)/);
 assert.match(adminSource,/resolution=ignore-duplicates/);
 assert.match(adminSource,/independentReadback/);
 assert.match(adminSource,/page\.page_text\.includes\(c\.excerpt\)/);
 assert.match(adminSource,/review_status:'pending'/);
 assert.doesNotMatch(adminSource,/review_status:\s*'verified'/);
 assert.doesNotMatch(adminSource,/fetch\('https:\/\/api\.openai\.com/);
});
test('content is private and only exact reviewable evidence gets written',()=>{
 for(const fragment of ['hh_mkb_sources','hh_kb_documents','hh_kb_pages',
   'hh_mkb_facts','hh_mkb_evidence','Health Vault']){
  assert.ok(adminSource.includes(fragment),fragment);
 }
 assert.match(index,/mkb-fact-rules-v670\.js/);
 assert.match(index,/hh-mkb-facts-admin-v670\.js/);
 assert.match(index,/v673-lab-evidence-minimized/);
 assert.match(adminSource,/confirm\(preview\.candidates\.length/);
 assert.match(adminSource,/crypto\.subtle\.digest\('SHA-256'/);
 assert.doesNotMatch(adminSource,/(?:localStorage\.setItem|sessionStorage\.setItem)/);
});
