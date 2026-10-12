import assert from 'node:assert/strict';
import {analyzeQuestionIntent,evidencePhases,narrativeCoverage,enforceContextRelevance,focusInstruction}
 from './focus.mjs';

let n=0;
function test(title,run){run();n++;console.log('PASS '+title)}
const question='Mi történt a beteggel 2024. június 17-én a rosszulléttől egészen a kórházi hazabocsátásig?';
const focus=analyzeQuestionIntent(question);
const facts={
 facts:[
 {sourceId:'S1',quote:'A rosszullét során kamrafibrilláció lépett fel.',fact:'Kamrafibrilláció történt.'},
 {sourceId:'S2',quote:'A mentők megkezdték az újraélesztést, AED készülékkel.',fact:'Újraélesztést végeztek.'},
 {sourceId:'S3',quote:'Az intenzív osztályon folytatódott a kórházi ellátás.',fact:'Intenzív ellátás.'},
 {sourceId:'S4',quote:'Később CRT-D készüléket ültettek be.',fact:'CRT-D beültetés.'},
 {sourceId:'S5',quote:'A beteget kórházi hazabocsátás után otthonában ápolták.',fact:'Hazabocsátás.'}
 ]};
const docs={facts:[]};
const available=evidencePhases(docs,facts);
const p=(text,sourceId='S1')=>({kind:'reported',text,sourceIds:[sourceId]});
const story={
 sections:[
  {heading:'A rosszullét',paragraphs:[p('A korábbi összefoglaló szerint a rosszullét során kamrafibrilláció történt.')]},
  {heading:'Újraélesztés',paragraphs:[p('A mentők elkezdték az újraélesztést.','S2')]},
  {heading:'Kórházi napok',paragraphs:[p('Az intenzív osztályon folytatódott a kórházi ellátás.','S3')]},
  {heading:'Kezelés',paragraphs:[p('Később CRT-D készüléket ültettek be.','S4')]},
  {heading:'Hazabocsátás és felépülés',paragraphs:[p('A hazabocsátás után otthonában ápolták.','S5')]},
  {heading:'Az emlékezetzavar magyarázata',
   paragraphs:[
    p('A korábbi összefoglaló szerint emlékezetzavar jelentkezett. Ez egy lehetséges idegrendszeri jelenség.', 'S3'),
    p('Az emlékezetzavar lehetséges okairól hosszú elméleti fejtegetés szerepel.', 'S3'),
    p('A memória helyreállásának lehetséges jövőbeli alakulása külön elemzés.', 'S3')
   ]}
 ]};
test('Timeline start/end recognized from original user question',()=>{
 assert.equal(focus.chronology,true);assert.equal(focus.explicitStart,true);
 assert.equal(focus.explicitEnd,true);assert.equal(focus.explicitMemory,false);
});
test('Memory is explicit only for a user memory question',()=>{
 const m=analyzeQuestionIntent('Miért vannak emlékezetzavarai?');
 assert.equal(m.explicitMemory,true);assert.equal(m.chronology,false);
});
test('Memory may be primary when requested alongside the story',()=>{
 const m=analyzeQuestionIntent(question+' Mi okozhatta a memóriazavart?');
 assert.equal(m.explicitMemory,true);
});
test('Unrelated topics are not inferred from clinical records',()=>{
 assert.equal(analyzeQuestionIntent('Mi történt 2024. június 17-én?').explicitMemory,false);
});
test('All five phases have separate grounded source IDs',()=>{
 assert.equal(Object.values(available.availability).filter(Boolean).length,5);
 assert.deepEqual(available.refs.discharge,['S5']);
});
test('Missing grounded discharge is recognized for follow-up',()=>{
 const x={sections:story.sections.filter(s=>!s.heading.includes('Hazabocsátás'))};
 const v=narrativeCoverage(x,focus,available);
 assert.ok(v.omitted.includes('discharge'));
 assert.ok(!v.omitted.includes('rescue'));
});
test('Stages without evidence are not demanded',()=>{
 const small=evidencePhases({}, {facts:[facts.facts[0]]});
 const result=narrativeCoverage({sections:story.sections.slice(0,1)},focus,small);
 assert.equal(result.omitted.length,0);
});
test('Brief memory note inserted into recovery without dedicated chapter',()=>{
 const x=enforceContextRelevance(story,focus);
 assert.equal(x.report.sections.length,5);
 const last=x.report.sections.at(-1);
 assert.match(last.heading,/Hazabocsátás/);
 assert.ok(last.paragraphs.some(p=>p.text.includes('emlékezetzavar')));
 assert.ok(last.paragraphs.every(p=>p.text.length<500));
 assert.ok(x.trimmed>=2);assert.equal(x.briefMentions,1);
});
test('Memory note preserves its original source IDs and evidence class',()=>{
 const x=enforceContextRelevance(story,focus);
 const last=x.report.sections.at(-1).paragraphs.at(-1);
 assert.equal(last.kind,'reported');assert.deepEqual(last.sourceIds,['S3']);
});
test('Explicit memory question does not trim neurological details',()=>{
 const m=analyzeQuestionIntent(question+' Miért nem emlékszik az eseményre?');
 const x=enforceContextRelevance(story,m);
 assert.equal(x.trimmed,0);assert.equal(x.report.sections.length,6);
});
test('Non-timeline medical question is not forced into timeline structure',()=>{
 const x=enforceContextRelevance(story,analyzeQuestionIntent('Mit jelent a kamrafibrilláció?'));
 assert.equal(x.report.sections.length,6);
});
test('Never invent a missing discharge event from a document date',()=>{
 const y=evidencePhases({facts:[{sourceId:'D1:p2',quote:'2024. június 17-én szívultrahang készült.'}]},{facts:[]});
 assert.equal(y.availability.discharge,false);
});
test('Focus instructions limit unrequested memory explanations',()=>{
 const i=focusInstruction(focus,available);
 assert.match(i,/NEM külön kérdés/);assert.match(i,/hazabocsátás/);
});
test('Asked memory topic is not prohibited in instructions',()=>{
 const m=analyzeQuestionIntent(question+' És mi okozhatta a memóriazavart?');
 const i=focusInstruction(m,available);
 assert.match(i,/részletesen/);assert.ok(!i.includes('NEM külön kérdés'));
});
test('Unsolicited memory note is not fabricated if no source paragraph exists',()=>{
 const clean={sections:story.sections.slice(0,5)};
 const x=enforceContextRelevance(clean,focus);
 assert.equal(x.briefMentions,0);assert.equal(x.report.sections.length,5);
});
test('No alteration of caller report and source evidence',()=>{
 const before=JSON.stringify(story);enforceContextRelevance(story,focus);
 assert.equal(JSON.stringify(story),before);
});
test('Mixed neurological heading retains other medically relevant recovery facts',()=>{
 const mixed={sections:[
  {heading:'A kezelés és a felépülés',paragraphs:[p('A kórházi ellátás folytatódott.','S3')]},
  {heading:'Ébredés és emlékezetzavar',paragraphs:[
   p('A beteg az ébredés után megfigyelés alatt állt.','S3'),
   p('Az emlékezetzavarról hosszú elemzést írt a korábbi összefoglaló. A memória helyreállása külön témát érdemelne.','S3')
  ]}
 ]};
 const x=enforceContextRelevance(mixed,focus);
 assert.equal(x.report.sections.length,2);
 assert.match(x.report.sections[1].paragraphs[0].text,/ébredés/);
 assert.ok(x.report.sections.every(s=>!s.heading.includes('emlékezetzavar')));
});
test('Extended unrequested memory essay inside recovery paragraph is trimmed',()=>{
 const own={sections:[{heading:'Felépülés és hazatérés',paragraphs:[
  p('A beteg kórházi hazabocsátása megtörtént.','S5'),
  p('Az emlékezetzavar lehetséges összetett oka több tényezőre vezethető vissza. A memória tárolási problémái számos neurológiai mechanizmust érinthetnek. Ezek a részletes magyarázatok önálló választ alkotnának.','S3')
 ]}]};
 const x=enforceContextRelevance(own,focus);
 assert.ok(x.trimmed>0);
 assert.equal(x.briefMentions,1);
 assert.ok(x.report.sections[0].paragraphs.some(p=>p.text.includes('hazabocsátása')));
});
console.log('OK '+n+' focused narrative checks');
