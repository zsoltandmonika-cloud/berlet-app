import assert from 'node:assert/strict';
import {buildStoryContract,assessCompleteStory,sourcedLastResort,narrativeInstructions}
 from './story-contract-v406.mjs';
import {auditClinicalDraft,formatClinicalAnswer} from './audit.mjs';

let passed=0;
function test(label,fn){fn();passed++;console.log('PASS '+label)}
const q='Mi történt Mónikával 2024. június 17-én a rosszulléttől a kórházi hazabocsátásig?';
const facts={facts:[
 {sourceId:'S1',fact:'A rosszullét során Mónika összeesett.',quote:'2024. június 17-én a rosszullét során Mónika összeesett.'},
 {sourceId:'S2',fact:'A mentők megkezdték az újraélesztést.',quote:'A mentők megkezdték az újraélesztést, AED-t alkalmaztak.'},
 {sourceId:'S3',fact:'Az intenzív osztályon kezelték.',quote:'A kórházi intenzív osztályon kezelték az esemény után.'},
 {sourceId:'S4',fact:'CRT-D-t ültettek be.',quote:'Az egészségügyi összefoglaló szerint CRT-D készüléket ültettek be.'},
 {sourceId:'S5',fact:'Hazabocsátás történt.',quote:'Az osztályos ellátást követően a kórházi hazabocsátás megtörtént.'}
]};
const sources=facts.facts.map((f,i)=>({id:f.sourceId,title:'Szintetikus magyarázat '+(i+1),
 text:f.quote,documentId:'dummy-'+i,profile:'monika'}));
const base=buildStoryContract(q,{facts:[]},facts);
const para=(id,text)=>({kind:'reported',sourceIds:[id],text});
const full={sections:[
 {heading:'A rosszullét',paragraphs:[para('S1','A korábbi összefoglaló szerint Mónika a rosszullét során összeesett.')]},
 {heading:'A mentés',paragraphs:[para('S2','A mentők az újraélesztést megkezdték, AED-t alkalmaztak.')]},
 {heading:'Kórházi intenzív osztály',paragraphs:[para('S3','A kórházi intenzív osztályon folytatódott az ellátása.')]},
 {heading:'A beavatkozás',paragraphs:[para('S4','CRT-D készüléket ültettek be a korábbi leírás szerint.')]},
 {heading:'A hazabocsátás',paragraphs:[para('S5','A kórházi hazabocsátás megtörtént az ellátást követően.')]}
]};
test('Question asks for full chronological arc',()=>{
 assert.equal(base.focus.chronology,true);assert.equal(base.focus.explicitStart,true);
 assert.equal(base.focus.explicitEnd,true);
});
test('All five distinct evidence-backed phases are enumerated',()=>{
 assert.equal(base.supportedPhases.length,5);
 assert.equal(base.events.length,5);
});
test('Sourced full timeline passes',()=>{
 const v=assessCompleteStory(full,base);
 assert.equal(v.passes,true,JSON.stringify(v));assert.equal(v.grounded,5);
});
test('A physiological explanation instead of a story fails',()=>{
 const v=assessCompleteStory({sections:[{heading:'Az események élettani háttere',
  paragraphs:[{kind:'general',sourceIds:[],text:'Defibrillálás során a szív elektromos működését igyekeznek helyreállítani.'}]}]},base);
 assert.equal(v.passes,false);assert.equal(v.reason,'no_personal_story');
 assert.equal(v.missing.length,5);
});
test('Mechanism-before-actual-event introduction fails, even with full story later',()=>{
 const wrong={sections:[{heading:'Általános magyarázat',paragraphs:[
  {kind:'general',sourceIds:[],text:'A kamrafibrilláció veszélyes ritmuszavar.'}]},...full.sections]};
 const v=assessCompleteStory(wrong,base);
 assert.equal(v.passes,false);assert.equal(v.reason,'starts_mid_story');
});
test('Beginning at intensive care rather than original collapse fails',()=>{
 const v=assessCompleteStory({sections:full.sections.slice(2)},base);
 assert.equal(v.badOpening,true);assert.ok(v.missing.includes('start'));
});
test('Missing discharge is detected only when a discharge source exists',()=>{
 const v=assessCompleteStory({sections:full.sections.slice(0,4)},base);
 assert.ok(v.missing.includes('discharge'));
 assert.equal(v.missingClosing,true);
});
test('Citation to unrelated phase does not satisfy discharge coverage',()=>{
 const wrong={sections:[...full.sections.slice(0,4),{heading:'Befejezés',
  paragraphs:[para('S1','A kórházi hazabocsátás megtörtént.')]}]};
 assert.ok(assessCompleteStory(wrong,base).missing.includes('discharge'));
});
test('Empty sources do not magically become a 5-stage patient history',()=>{
 const empty=buildStoryContract(q,{facts:[]},{facts:[]});
 assert.equal(empty.supportedPhases.length,0);
 assert.equal(sourcedLastResort(empty),null);
});
test('Original D pages remain original while S summaries remain secondary',()=>{
 const c=buildStoryContract(q,{facts:[
  {sourceId:'D1:p3',quote:'A beteg rosszullét miatt került ellátásra.'}
 ]},facts);
 const f=sourcedLastResort(c);
 assert.ok(f.sections.some(s=>s.paragraphs.some(p=>p.kind==='documented')));
 assert.ok(f.sections.some(s=>s.paragraphs.some(p=>p.kind==='reported')));
});
test('Reconstruction references literal quotes and never fabricates patient data',()=>{
 const f=sourcedLastResort(base);
 const text=f.sections.flatMap(s=>s.paragraphs.map(p=>p.text)).join(' ');
 for(const a of facts.facts)assert.ok(text.includes(a.quote));
 assert.ok(!text.includes('25 perc'));assert.ok(!text.includes('Dr. '));
});
test('Auditor accepts source-only fallback with exact evidence IDs',()=>{
 const f=sourcedLastResort(base);
 const audited=auditClinicalDraft(f,[],{facts:[]},sources,facts);
 const text=formatClinicalAnswer(audited,[],sources);
 assert.ok(audited.stats.reported>=4,JSON.stringify(audited.stats));
 assert.match(text,/rosszullét/);assert.match(text,/hazabocsátás/);
 assert.match(text,/Másodlagos forrás/);
});
test('Story instructions insist on outsider-readable full arc without fabricated phases',()=>{
 const ins=narrativeInstructions(base);
 assert.match(ins,/IDEGEN OLVASÓ/);assert.match(ins,/legelső bekezdés/);
 assert.match(ins,/tilos|nem szerepelhet|nem találj/i);
});
test('Generic nonhistorical question receives no forced hospital chronology',()=>{
 const v=buildStoryContract('Mire való a CRT-D készülék?',{facts:[]},facts);
 assert.equal(v.focus.chronology,false);assert.equal(v.mandatory.length,0);
 assert.equal(narrativeInstructions(v),'');assert.equal(sourcedLastResort(v),null);
});
test('Model-added I-06 instructions cannot alter original user intent',()=>{
 const appended=q+'\n\n[I-06 · Válaszstílus] Írj az amnézia lehetséges okairól!';
 const c=buildStoryContract(appended,{facts:[]},facts);
 assert.equal(c.originalQuestion,q);assert.equal(c.focus.explicitMemory,false);
});
test('No mutation of original fact arrays and source identities',()=>{
 const before=JSON.stringify(facts);
 sourcedLastResort(buildStoryContract(q,{facts:[]},facts));
 assert.equal(JSON.stringify(facts),before);
});
console.log('OK '+passed+' complete-story contract checks');
