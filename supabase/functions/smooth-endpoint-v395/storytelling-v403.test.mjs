import assert from 'node:assert/strict';
import {
 buildEvidenceIndex,verifyExtractedFacts,buildSecondaryIndex,verifySecondaryFacts,
 auditClinicalDraft,formatClinicalAnswer
} from './audit.mjs';

/* v403: completely fictional test facts. No real patient documents. */
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name)}
const pdf=[{
 type:'original_pdf_extract',documentId:'pdf-a',title:'Kórházi záró',
 page:2,date:'2024-06-18',text:'A vizsgálat 2024.06.17-én történt. A páciens pulzusa 72 /perc volt az ellátás kezdetén.'
}];
const json=[{
 type:'json_summary',documentId:'sum-a',title:'Korábbi tesztmagyarázat',
 date:'2024-06-18',
 text:'Az összefoglaló szerint 2024.06.17-én Mónikánál kamrafibrilláció történt. Ezt a korábbi értelmezésben laikus újraélesztés és három AED-sokk követte. A beszámoló nem eredeti lelet.'
}];
const si=buildSecondaryIndex(json,'monika');
const goodQuote='Az összefoglaló szerint 2024.06.17-én Mónikánál kamrafibrilláció történt.';
const sf=verifySecondaryFacts({facts:[{sourceId:'S1',quote:goodQuote,
 fact:'2024.06.17-én Mónikánál kamrafibrilláció történt.'}]},si);
const originals=buildEvidenceIndex(pdf,'monika');
const originalQuote='A vizsgálat 2024.06.17-én történt. A páciens pulzusa 72 /perc volt az ellátás kezdetén.';
const vf=verifyExtractedFacts({facts:[{sourceId:'D1:p2',quote:originalQuote,
 fact:'A 2024.06.17-i vizsgálat alatt a pulzus 72 /perc volt.'}]},originals);
test('Original and secondary evidence are separately indexed',()=>{
 assert.equal(si.length,1);assert.equal(si[0].id,'S1');assert.equal(originals[0].id,'D1:p2');
 assert.equal(sf.facts.length,1);assert.equal(vf.facts.length,1);
});
test('Secondary quote must literally exist in the summary',()=>{
 assert.equal(verifySecondaryFacts({facts:[{sourceId:'S1',quote:'2024-ben Mónikánál valami teljesen más történhetett.',
 fact:'Mónikánál valami történt'}]},si).facts.length,0);
});
test('Summary cannot claim an unquoted shock count or duration',()=>{
 const x=verifySecondaryFacts({facts:[{sourceId:'S1',quote:goodQuote,
 fact:'2024.06.17-én 7 AED-sokk történt.'}]},si);
 assert.equal(x.facts.length,0);
});
test('Summary cannot manufacture doctors',()=>{
 const x=verifySecondaryFacts({facts:[{sourceId:'S1',quote:goodQuote,
 fact:'Dr. Éva Kovács beavatkozott 2024.06.17-én.'}]},si);
 assert.equal(x.facts.length,0);
});
test('Original extractor does not accept a secondary source ID',()=>{
 assert.equal(verifyExtractedFacts({facts:[{sourceId:'S1',quote:originalQuote,
 fact:'A 2024.06.17-i vizsgálat alatt a pulzus 72 /perc volt.'}]},originals).facts.length,0);
});
test('No-original PDF case retains an accurately attributed secondary narrative',()=>{
 const sections=[{heading:'A korábbi összefoglaló eseménysora',
  paragraphs:[{kind:'reported',sourceIds:['S1'],
   text:'A korábbi HealthHub-összefoglaló szerint 2024.06.17-én Mónikánál kamrafibrilláció történt. [S1]'}]}];
 const result=auditClinicalDraft({sections},[],{facts:[]},si,sf);
 const story=formatClinicalAnswer(result,[],si);
 assert.equal(result.stats.reported,1);assert.equal(result.stats.documented,0);
 assert.match(story,/2024\.06\.17/);assert.match(story,/Másodlagos forrás/);
 assert.match(story,/nem eredeti lelet/);
});
test('Secondary facts cannot be represented as original documented',()=>{
 const x=auditClinicalDraft({sections:[{heading:'Tény',
  paragraphs:[{kind:'documented',sourceIds:['S1'],text:'Mónikánál 2024.06.17-én kamrafibrilláció történt.'}]}]},
 [],{facts:[]},si,sf);
 assert.equal(x.stats.documented,0);assert.ok(x.stats.demoted>=1);
});
test('Wrong secondary citation is excluded',()=>{
 const x=auditClinicalDraft({sections:[{heading:'Tény',
  paragraphs:[{kind:'reported',sourceIds:['S9'],text:'Mónikánál 2024.06.17-én kamrafibrilláció történt.'}]}]},
 [],{facts:[]},si,sf);
 assert.equal(x.stats.reported,0);assert.ok(x.stats.badCitations>=1);
});
test('Numeric invented clinical value inside narrative is rejected',()=>{
 const x=auditClinicalDraft({sections:[{heading:'Tény',
  paragraphs:[{kind:'reported',sourceIds:['S1'],
   text:'A korábbi összefoglaló szerint 2024.06.17-én Mónikánál kamrafibrilláció történt és 250 mg gyógyszert kapott.'}]}]},
 [],{facts:[]},si,sf);
 assert.equal(x.stats.reported,0);assert.ok(x.stats.unsupportedClinicalNumbers>=1);
});
test('Correct original PDF fact still works with a citation marker',()=>{
 const x=auditClinicalDraft({sections:[{heading:'Vizsgálat',
  paragraphs:[{kind:'documented',sourceIds:['D1:p2'],
   text:'A 2024.06.17-i vizsgálat alatt a pulzus 72 /perc volt. [D1:p2]'}]}]},
 originals,vf,si,sf);
 assert.equal(x.stats.documented,1);assert.equal(x.stats.demoted,0);
 assert.match(formatClinicalAnswer(x,originals,si),/Kórházi záró/);
});
test('Invalid inline citation is caught even when removed from display',()=>{
 const x=auditClinicalDraft({sections:[{heading:'Esemény',
  paragraphs:[{kind:'reported',sourceIds:['S1'],
   text:'Mónikánál 2024.06.17-én kamrafibrilláció történt. [S9]'}]}]},
 [],{facts:[]},si,sf);
 assert.equal(x.stats.reported,0);assert.ok(x.stats.badCitations>=1);
});
test('Cross-patient secondary evidence index fails closed',()=>{
 assert.throws(()=>buildSecondaryIndex(json,'unknown'),/unknown_profile/);
});
test('Summary duplicate document index does not overcount',()=>{
 const x=buildSecondaryIndex([...json,...json],'monika');
 assert.equal(x.length,1);
});
test('General physiology is not silently promoted to a personal event',()=>{
 const x=auditClinicalDraft({sections:[{heading:'Élettan',
  paragraphs:[{kind:'general',sourceIds:[],
   text:'A kamrafibrilláció a szív elektromos működésének súlyos zavara.'}]}]},
 [],{facts:[]},si,sf);
 assert.equal(x.stats.documented,0);assert.equal(x.stats.reported,0);
 assert.match(formatClinicalAnswer(x,[],si),/elektromos/);
});
console.log('OK '+count+' clinical storytelling checks');
