// HealthHub v396: date-aware chronology + story-first verified output.
// Synthetic patient and event examples only, no personal medical documents.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('healthhub/live-v364-evidence.js','utf8');
const plans=fs.readFileSync('healthhub/live-v393-research.js','utf8');
const sandbox={console,window:{addEventListener(){}},
 document:{getElementById:()=>null},localStorage:{getItem:k=>k==='hh-profile'?'m':null},
 Blob,Map,Set,Date,Promise,Uint8Array};
vm.createContext(sandbox);
vm.runInContext(plans,sandbox,{filename:'healthhub/live-v393-research.js'});
vm.runInContext(src,sandbox,{filename:'healthhub/live-v364-evidence.js'});
const e=sandbox.window.HH_ASK_LENA_EVIDENCE_V364,p=sandbox.window.HH_DEEP_RESEARCH_V393;
for(const question of ['Mi történt velem 2024. június 17-én?','Mi történt velem 2024.06.17-én?']){
 const mode=p.decide(question);
 assert.equal(mode.mode,'deep');
 assert.equal(mode.clinical,true);
 assert.equal(mode.chronology,true);
 assert.equal(mode.documents,true);
 assert.equal(mode.historicalDateQuery,true);
 assert.equal(e.dateQuery(question),'2024-06-17');
}
assert.equal(e.dateQuery('Mi történt velem 2024. február 31-én?'),null,'invalid dates must not be silently normalized');
function doc(id,title,date,summary){
 return {id,profile:'monika',title,category:'kórházi dokumentum',date,dateSource:'document',
  explanation:summary?{summary}:undefined};
}
const cases=[
 doc('dec','Decemberi járóbeteg EKG lelet','2024-12-19','Rutin kontroll'),
 doc('june','Kórházi elbocsátó zárójelentés','2024-06-19','2024.06.17 mentőellátás és intenzív kezelés'),
 doc('nov','Novemberi kardiológiai vizsgálat','2024-11-23',''),
 doc('ambulance','OMSZ mentési lap','2024-06-17',''),
 doc('intensive','Intenzív osztályos lelet','2024-06-27',''),
 doc('july','Júliusi beültetési jelentés','2024-07-15','')
];
const ranked=e.rank(cases,'Mi történt velem 2024. június 17-én?',p.decide('Mi történt velem 2024. június 17-én?'));
const ids=ranked.map(x=>x.id);
assert.ok(ids.indexOf('ambulance')>=0&&ids.indexOf('june')>=0&&ids.indexOf('intensive')>=0);
assert.ok(ids.indexOf('ambulance')<ids.indexOf('dec'));
assert.ok(ids.indexOf('june')<ids.indexOf('nov'));
assert.ok(ids.indexOf('july')<ids.indexOf('dec'));
const guided=p.instruction(p.decide('Mi történt velem 2024. június 17-én?'),{originals:4});
assert.ok(/hiteles időrend|időrendi/.test(guided));
assert.ok(!guided.includes('Tagold: (1) dokumentált tények'));
assert.ok(!guided.includes('(4) hiányzó bizonyítékok'));
assert.ok(/forrásolt|forrásokkal igazolt/.test(guided));

(async()=>{
 const x=await import('../../supabase/functions/smooth-endpoint-v395/audit.mjs');
 const original=[
  {type:'original_pdf_extract',documentId:'hospital',title:'Szintetikus sürgősségi lap',date:'2024-06-19',page:2,
   text:'2024.06.17-én 17:30-kor személygépkocsi utasánál eszméletvesztést észleltek. A helyszíni újraélesztés után a keringés helyreállt.'},
  {type:'original_pdf_extract',documentId:'intervention',title:'Szintetikus beavatkozási lap',date:'2024-06-19',page:3,
   text:'2024.06.17-én 19:13-kor sürgős beavatkozás történt. A vizsgálatot Dr. Próba Anna végezte. Akut elzáródást a szintetikus lelet nem jelzett.'}
 ];
 const idx=x.buildEvidenceIndex(original,'monika');
 const extract=x.verifyExtractedFacts({facts:[
  {sourceId:'D1:p2',quote:'2024.06.17-én 17:30-kor személygépkocsi utasánál eszméletvesztést észleltek.',fact:'2024.06.17-én 17:30-kor eszméletvesztést dokumentáltak.'},
  {sourceId:'D2:p3',quote:'2024.06.17-én 19:13-kor sürgős beavatkozás történt. A vizsgálatot Dr. Próba Anna végezte.',fact:'2024.06.17-én 19:13-kor Dr. Próba Anna vizsgálatot végzett.'}
 ]},idx);
 assert.equal(extract.facts.length,2);
 const candidates=x.buildEventCandidates(extract);
 assert.equal(candidates.length,2);
 assert.equal(candidates[0].eventDate,'2024-06-17');
 assert.equal(candidates[0].eventTime,'17:30','clock time is extracted from the original page quote');
 assert.equal(candidates[1].eventTime,'19:13','second event is ordered by real clock time, not the discharge date');
 assert.equal(candidates[0].sourceId,'D1:p2');
 assert.equal(candidates[1].sourceId,'D2:p3');
 assert.ok(candidates[1].documentDate==='2024-06-19');
 const draft={sections:[
  {heading:'🚑 2024. június 17. – A rosszullét',paragraphs:[
   {kind:'documented',text:'2024.06.17-én 17:30-kor eszméletvesztés történt. A bejegyzés személygépkocsiban utazó betegről szól.',sourceIds:['D1:p2']},
   {kind:'documented',text:'A mentők kiérkezése előtt legalább 20 percig nem volt agyi keringés.',sourceIds:['D1:p2']},
   {kind:'documented',text:'A helyszínen Dr. Kitalált Béla intézkedett 2024.06.17-én 17:30-kor.',sourceIds:['D1:p2']}
  ]},
  {heading:'🏥 A beavatkozás',paragraphs:[
   {kind:'documented',text:'2024.06.17-én 19:13-kor Dr. Próba Anna végezte a vizsgálatot.',sourceIds:['D2:p3']},
   {kind:'general',text:'A sürgős vizsgálatok célja a kiváltó ok tisztázása és az életfontosságú működések követése.',sourceIds:[]},
   {kind:'unknown',text:'Nem tudjuk, milyen színű volt az autó.',sourceIds:[]}
  ]}
 ]};
 const audited=x.auditClinicalDraft(draft,idx,extract);
 assert.equal(audited.stats.demoted,2,'fabricated duration and doctor are both silently removed');
 assert.ok(audited.stats.unsupportedDoctors>=1);
 assert.equal(audited.stats.documented,2);
 const answer=x.formatClinicalAnswer(audited,idx);
 assert.ok(answer.includes('🚑 2024. június 17. – A rosszullét'));
 assert.ok(answer.indexOf('🚑')<answer.indexOf('🏥'));
 assert.ok(answer.includes('**Forrás:** Szintetikus sürgősségi lap (2024-06-19, 2. oldal)'));
 assert.ok(answer.includes('Dr. Próba Anna'));
 assert.ok(!answer.includes('Dr. Kitalált Béla'));
 assert.ok(!answer.includes('legalább 20 percig'));
 assert.ok(!answer.includes('Nem tudjuk, milyen színű'));
 assert.ok(!answer.includes('**Dokumentált tény**'));
 assert.ok(!answer.includes('Bizonyítékellenőrzés'));
 console.log('PASS v396: date-targeted deep research, chronological sources, vivid story, verified names, quiet safety filtering');
})().catch(e=>{console.error(e);process.exitCode=1});
