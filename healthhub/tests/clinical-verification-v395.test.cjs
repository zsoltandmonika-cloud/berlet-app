// All inputs are synthetic. Never commit identifiable patient details.
'use strict';
const assert=require('node:assert/strict');
(async()=>{
 const x=await import('../../supabase/functions/smooth-endpoint-v395/audit.mjs');
 const orig=[
  {type:'original_pdf_extract',documentId:'A',title:'Szintetikus kórházi lap',date:'2024-06-17',
   page:3,text:'2024.06.17-én hirtelen eszméletvesztés történt. Három defibrillációt alkalmaztak a helyszínen. Az EF 20-25%-os volt a korai vizsgálaton. A percenkénti mentési eseménynapló nem ismert.'},
  {type:'original_pdf_extract',documentId:'B',title:'Intenzív lap',date:'2024-06-27',
   page:2,text:'Az intenzív ellátás során intubáció történt és gyógyszeres szedációt alkalmaztak. A pontos szedálási időtartam ebben a szintetikus lapban nem szerepel.'}
 ];
 const idx=x.buildEvidenceIndex(orig,'monika');
 assert.equal(idx.length,2);
 assert.equal(idx[0].id,'D1:p3');
 assert.equal(idx[1].id,'D2:p2');
 const raw={facts:[
  {sourceId:'D1:p3',quote:'2024.06.17-én hirtelen eszméletvesztés történt.',fact:'2024.06.17-én hirtelen eszméletvesztést dokumentáltak.'},
  {sourceId:'D1:p3',quote:'Az EF 20-25%-os volt a korai vizsgálaton.',fact:'Az agy legalább 20 percig oxigénhiányos volt.'},
  {sourceId:'D1:p3',quote:'A dokumentumban nem létező szó szerinti idézet, mégis tényként állítva.',fact:'A beteg pontosan 20 percig oxigénhiányos volt.'},
  {sourceId:'D7:p4',quote:'Nincsen ilyen oldal a források között.',fact:'Újraélesztés igazolt.'}
 ]};
 const vetted=x.verifyExtractedFacts(raw,idx);
 assert.equal(vetted.facts.length,1,'only actual quote-supported fact should pass');
 assert.equal(vetted.facts[0].sourceId,'D1:p3');
 assert.equal(vetted.rejected,3,'exclude invented source, quote or unsupported time');
 let res=x.auditClinicalDraft({sections:[
  {heading:'Dokumentált tények',paragraphs:[
   {kind:'documented',text:'2024.06.17-én hirtelen eszméletvesztés történt.',sourceIds:['D1:p3']},
   {kind:'documented',text:'Az agy legalább 20 percig nem kapott megfelelő vért.',sourceIds:['D1:p3']},
   {kind:'documented',text:'A beteg 2024.08.19-én hazaérkezett.',sourceIds:['D1:p3']},
   {kind:'documented',text:'A későbbi EF 65%-os lett.',sourceIds:['D1:p3']},
   {kind:'documented',text:'Biztosan intubációt végeztek.',sourceIds:['D17:p5']},
  ]},
  {heading:'Élettani értelmezés',paragraphs:[
   {kind:'general',text:'Kamrafibrillációban a szív pumpafunkciója hatástalanná válhat.',sourceIds:[]},
   {kind:'possible',text:'Az esemény előtti emlékek hozzáférése csökkenhet.',sourceIds:[]},
   {kind:'unknown',text:'A mentő kiérkezési időpontja nem ismert.',sourceIds:[]}
  ]}
 ]},idx,vetted);
 assert.equal(res.stats.documented,1,'only cited verified historic assertion remains');
 assert.equal(res.stats.demoted,4);
 assert.ok(res.stats.unsupportedClinicalNumbers>=1,'fabricated EF 65% must be blocked');
 assert.ok(res.stats.unsupportedDurations>=1,'20 minutes rejected, EF 20% irrelevant');
 assert.ok(res.stats.unsupportedDates>=1,'fabricated date removed');
 assert.equal(res.stats.badCitations,1);
 assert.equal(res.sections[0].paragraphs.length,1,'unsafe paragraphs are silently withheld');
 assert.ok(res.sections[0].paragraphs.every(x=>!x.text.includes('20 perc')));
 assert.ok(res.sections[1].paragraphs[1].text.startsWith('Lehetséges, hogy'));
 const formatted=x.formatClinicalAnswer(res,idx);
 assert.ok(formatted.includes('Forrás: Szintetikus kórházi lap (2024-06-17, 3. oldal)'));
 assert.ok(!formatted.includes('D17:p5'));
 assert.ok(!formatted.includes('2024.08.19'));
 assert.ok(formatted.includes('legalább 20 perc')===false);
 assert.ok(!formatted.includes('Bizonyítékellenőrzés'),'audit is not another public lecture');
 assert.ok(!formatted.includes('A mentő kiérkezési időpontja nem ismert.'),'avoid repetitive missing-data sections');
 assert.ok(!formatted.includes('**📄 Dokumentált tény**'),'narrative does not have stamped labels');
 // A newly synthesized claim matching the numerical VALUE but not unit
 // is invalid: EF 20% is never a 20-minute unconsciousness report.
 const fake=x.verifyExtractedFacts({facts:[{
  sourceId:'D1:p3',quote:'Az EF 20-25%-os volt a korai vizsgálaton.',
  fact:'Legalább 20 percig nem kapott vért az agy.'}]},idx);
 assert.equal(fake.facts.length,0);
 assert.ok(fake.issues.includes('unsupported_numeric_claim'));
 // Explicit documented duration in a valid excerpt CAN pass.
 const withDuration=x.buildEvidenceIndex([{type:'original_pdf_extract',documentId:'C',title:'Szintetikus időnapló',page:7,
  text:'A helyszínen a dokumentált oxigénellátás 3 percig csökkent a jelen szintetikus példában. Egyéb időtartam nem szerepel.'}],'zsolt');
 const supported=x.verifyExtractedFacts({facts:[{sourceId:'D1:p7',
  quote:'A helyszínen a dokumentált oxigénellátás 3 percig csökkent a jelen szintetikus példában.',
  fact:'3 percig csökkent az oxigénellátás a szintetikus példában.'}]},withDuration);
 assert.equal(supported.facts.length,1);
 const validated=x.auditClinicalDraft({sections:[{heading:'Időtartam',paragraphs:[{kind:'documented',
  text:'3 percig csökkent az oxigénellátás a szintetikus példában.',sourceIds:['D1:p7']}]}]},withDuration,supported);
 assert.equal(validated.stats.documented,1);
 assert.equal(validated.stats.demoted,0);
 assert.throws(()=>x.buildEvidenceIndex(orig,'unknown'),/profile/);
 assert.equal(x.buildEvidenceIndex([{type:'json_summary',page:1,documentId:'Z',text:'Rövid.'}],'monika').length,0,
  'saved AI interpretation is not an original PDF');
 console.log('PASS v395: quote-grounded facts, original-only refs, EF-vs-minutes safety, dated claims, uncertainty and cross-profile bounds');
})().catch(e=>{console.error(e);process.exitCode=1;});
