import assert from 'node:assert/strict';
import {chooseNonRegressingFocus} from './focus-guard-v405.mjs';
import {narrativeCoverage,analyzeQuestionIntent,evidencePhases} from './focus.mjs';
import {auditClinicalDraft,formatClinicalAnswer} from './audit.mjs';
let passes=0;
function t(label,fn){fn();passes++;console.log('PASS '+label)}
const question='Mi történt 2024. június 17-én a rosszulléttől egészen a kórházi hazabocsátásig?';
const examples=[
 ['S1','Rosszul lett és összeesett.','A korábbi leletmagyarázat szerint a beteg rosszul lett és összeesett.'],
 ['S2','A mentők újraélesztést végeztek.','A leírás szerint a mentők megkezdték az újraélesztést.'],
 ['S3','A kórházi intenzív osztályon ellátták.','A korábbi összefoglaló szerint a kórházi intenzív osztályon ellátták.'],
 ['S4','CRT-D készüléket ültettek be.','A korábbi összefoglaló szerint CRT-D készüléket ültettek be.'],
 ['S5','Kórházi hazabocsátása megtörtént.','A korábbi összefoglaló szerint a kórházi hazabocsátása megtörtént.'],
 ['S6','Emlékezetzavart tapasztalt.','A korábbi összefoglaló szerint emlékezetzavart tapasztalt, amelyről külön magyarázat készült.'],
 ['S7','A memória működését több tényező befolyásolhatja.','A memória működését több tényező befolyásolhatja. Ezt a hosszú magyarázat elemzi.'],
 ['S8','A memóriazavar és az amnézia témáját külön tárgyalta.','A memóriazavar és az amnézia témáját külön tárgyalta. Több hosszú részben ismételte.']
];
const secondary={facts:examples.map(([sourceId,quote,fact])=>({sourceId,quote,fact}))};
const original={facts:[]};
const mk=(idx,heading)=>({heading,paragraphs:[{kind:'reported',text:examples[idx][2],sourceIds:[examples[idx][0]]}]});
const complete={sections:[
 mk(0,'A rosszullét'),mk(1,'A mentés'),mk(2,'A kórházi kezelés'),
 mk(3,'A beavatkozás'),mk(4,'A hazabocsátás és a felépülés'),
 {heading:'Az emlékezetzavar és a memória magyarázata',paragraphs:examples.slice(5).map((v)=>({
  kind:'reported',text:v[2],sourceIds:[v[0]]
 }))}
],stats:{paragraphs:8,reported:8,documented:0,demoted:0}};
t('v403 baseline is substantively usable with five chronological phases',()=>{
 const phases=evidencePhases(original,secondary);
 const c=narrativeCoverage(complete,analyzeQuestionIntent(question),phases);
 assert.equal(c.omitted.length,0);
 assert.equal(c.grounded.length,5);
});
t('v405 trims unrelated long memory discussion, retains timeline',()=>{
 const x=chooseNonRegressingFocus(question,complete,original,secondary);
 assert.equal(x.status.mode,'v405_focus_preview',JSON.stringify(x.status));
 assert.equal(x.report.sections.length,5);
 const text=x.report.sections.map(s=>s.paragraphs.map(p=>p.text).join(' ')).join(' ');
 for(const p of ['rosszul lett','újraélesztést','intenzív osztályon','CRT-D','hazabocsátása']){
  assert.ok(text.includes(p),p);
 }
 assert.equal(x.status.omittedAfter.length,0);
 assert.equal(x.report.sections.at(-1).paragraphs.at(-1).sourceIds[0],'S6');
});
t('never mutates existing validated baseline report',()=>{
 const before=JSON.stringify(complete);
 chooseNonRegressingFocus(question,complete,original,secondary);
 assert.equal(JSON.stringify(complete),before);
});
t('memory explicitly requested is preserved',()=>{
 const x=chooseNonRegressingFocus(question+' Miért van memóriazavar?',complete,original,secondary);
 assert.equal(x.status.mode,'v403_baseline');
 assert.equal(x.report,complete);
});
t('ordinary medical query never triggers timeline editing',()=>{
 const x=chooseNonRegressingFocus('Mit jelent a kamrafibrilláció?',complete,original,secondary);
 assert.equal(x.report,complete);
});
t('documented or reported source IDs are never changed',()=>{
 const x=chooseNonRegressingFocus(question,complete,original,secondary).report;
 const expected=new Set(examples.map(r=>r[0]));
 for(const s of x.sections)for(const p of s.paragraphs){
  assert.equal(p.kind,'reported');
  assert.ok(p.sourceIds.every(i=>expected.has(i)));
 }
});
t('fake generic fallback is NOT accepted as a focused improvement',()=>{
 const generic={sections:[{heading:'Bizonyítékok és korlátok',paragraphs:[{
  kind:'unknown',sourceIds:[],text:'A kivonatok alapján nem sikerült személyes eseményleírást készíteni.'
 }]}]};
 const x=chooseNonRegressingFocus(question,generic,original,secondary);
 assert.equal(x.status.reason,'baseline_has_no_grounded_story');
 assert.equal(x.report,generic);
});
t('full memory essay that dominates baseline is rejected, not converted to skeletal reply',()=>{
 const s={sections:[{heading:'Emlékezetzavar',paragraphs:[
  ...Array(8).fill(0).map((_,i)=>({kind:'reported',text:'A memóriazavar részletes elemzésének '+i+'. szakasza. '+('Kiterjedt részletezés. '.repeat(6)),
   sourceIds:['S6']}))
 ]}]};
 const x=chooseNonRegressingFocus(question,s,original,secondary);
 assert.equal(x.status.mode,'v403_baseline');
 assert.equal(x.report,s);
});
t('source-empty baseline does not promote a synthetic made-up discharge',()=>{
 const s={sections:[{heading:'Általános',paragraphs:[{
  kind:'general',text:'A szív elektromos zavaránál általánosságban kezelést alkalmazhatnak.',sourceIds:[]
 }]}]};
 const x=chooseNonRegressingFocus(question,s,original,secondary);
 assert.equal(x.report,s);
});
t('even mixed clinical-memory title does not erase non-memory treatment facts',()=>{
 const s={sections:[mk(0,'Rosszullét'),mk(1,'Mentés'),mk(2,'Intenzív kezelés'),
  {heading:'Az ébredés és az emlékezetzavar',paragraphs:[
   {kind:'reported',text:'A beavatkozás során CRT-D készüléket ültettek be.',sourceIds:['S4']},
   {kind:'reported',text:examples[5][2],sourceIds:['S6']}
  ]},mk(4,'Hazabocsátás')]};
 const x=chooseNonRegressingFocus(question,s,original,secondary);
 const after=JSON.stringify(x.report);
 assert.match(after,/CRT-D/);
 assert.match(after,/hazabocsátás/);
});
t('a fake discharge in the draft cannot manufacture coverage without matching citation',()=>{
 const bad={sections:[mk(0,'Rosszullét'),{
  heading:'Elbocsátás',paragraphs:[{kind:'reported',text:'Kórházi hazabocsátása megtörtént.',sourceIds:['S1']}]}
 ]};
 const phases=evidencePhases(original,secondary);
 const c=narrativeCoverage(bad,analyzeQuestionIntent(question),phases);
 assert.ok(c.omitted.includes('discharge'));
});
t('roundtrip audit -> focus guard -> output retains source notice',()=>{
 const summaries=examples.map(([id,quote],i)=>({id,documentId:'doc-'+i,title:'Szintetikus leletmagyarázat '+i,text:quote,profile:'monika'}));
 const draft={sections:[{heading:'Hazabocsátás',paragraphs:[{kind:'reported',
  sourceIds:['S5'],text:'A korábbi összefoglaló szerint a kórházi hazabocsátása megtörtént.'}]}]};
 const report=auditClinicalDraft(draft,[],{facts:[]},summaries,secondary);
 assert.equal(report.stats.reported,1);
 const focused=chooseNonRegressingFocus(question,report,original,secondary);
 const txt=formatClinicalAnswer(focused.report,[],summaries);
 assert.match(txt,/hazabocsátása/);assert.match(txt,/Másodlagos forrás/);
});
console.log('OK '+passes+' narrative nonregression tests');
