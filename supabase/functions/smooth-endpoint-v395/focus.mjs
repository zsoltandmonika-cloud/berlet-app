/* HealthHub v404 · I-06 Question Intent / Narrative Priority / Context Relevance
 * Pure, generic, evidence-bound operations; no patient profiles or persistence.
 * Analyze only the ORIGINAL user question, never model prompt instructions.
 */
const fold=s=>String(s==null?'':s).toLocaleLowerCase('hu-HU')
 .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
const LIMIT_PHASES=['start','rescue','hospital','intervention','discharge'];
const PHASES={
 start:/(rosszullet|rosszul lett|osszees|szivmegall|kamrafibrill|eset kezdete|eszmeletveszt|elajul)/,
 rescue:/(ujraeleszt|defibrill|aed|cpr|mento|mellkaskompresszio|sokk)/,
 hospital:/(korhazi felvetel|intenziv osztaly|korhazi ellatas|kateter|szivultrahang|korhazi vizsgalat)/,
 intervention:/(beultet|implant|crt.d|pacemaker|ritmusszabalyozo|mutet|beavatkozas)/,
 discharge:/(hazabocsat|hazaenged|hazaadas|kienged|korhazbol haza|otthonaba tavoz|elbocsat|haza tavoz)/
};
const MEM=/(emlekezet|memoria|amnezi|emleksz|nem emleksz|emlekieses|emlekezes|kognitiv|neurolog)/;
export function analyzeQuestionIntent(question){
 const original=String(question==null?'':question).trim();
 if(original.length<3||original.length>2400)throw Error('focus_invalid_original_question');
 const q=fold(original);
 const chronology=/(mi tortent|hogyan zajlott|hogyan tortent|idovonal|kronolog|esemenysor|tortenet|mi vezetett|a rosszullettol|az elejetol|a kezdettol)/.test(q) ||
  (/(-tol|-tol |tol |ota |kezdetetol|egeszen)/.test(q)&&/(ig|vegig|haza|felepules)/.test(q));
 const explicitlyMemory=MEM.test(q),explicitStart=/(rosszullet|rosszul|osszees|szivmegall|junius|elso pillanat)/.test(q);
 const explicitEnd=/(hazabocsat|hazaad|hazaenged|korhazbol haza|kienged|elbocsat|kikerul|felepulesig)/.test(q);
 return Object.freeze({
  schema:'healthhub.narrative_focus/1',
  chronology:!!chronology,
  explicitMemory:!!explicitlyMemory,
  explicitStart:!!explicitStart,
  explicitEnd:!!explicitEnd,
  userQuestion:original,
  priority:chronology?'requested_timeline':'direct_question'
 });
}
export function evidencePhases(verified,secondary){
 const list=[...(Array.isArray(verified?.facts)?verified.facts:[]),
  ...(Array.isArray(secondary?.facts)?secondary.facts:[])];
 const availability=Object.fromEntries(LIMIT_PHASES.map(p=>[p,false]));
 const refs=Object.fromEntries(LIMIT_PHASES.map(p=>[p,[]]));
 for(const f of list){
  if(!f||typeof f.quote!=='string'||typeof f.sourceId!=='string')continue;
  const phrase=fold(f.quote+' '+String(f.fact||''));
  for(const p of LIMIT_PHASES){
   if(PHASES[p].test(phrase)){availability[p]=true;if(refs[p].length<5)refs[p].push(f.sourceId)}
  }
 }
 return {availability,refs,sourcedFacts:list.length};
}
export function narrativeCoverage(report,focus,available){
 const found=Object.fromEntries(LIMIT_PHASES.map(p=>[p,false]));
 const paras=(report?.sections||[]).flatMap(s=>(s.paragraphs||[])
  .filter(p=>p&&['reported','documented'].includes(p.kind)));
 for(const para of paras){
  const phrase=fold(para.text),refs=Array.isArray(para.sourceIds)?para.sourceIds:[];
  for(const phase of LIMIT_PHASES){
   // A phase is covered only if the paragraph cites an already verified
   // excerpt that actually mentions that phase. A random document reference
   // attached to a plausible sentence is not timeline coverage.
   if(PHASES[phase].test(phrase)&&refs.some(id=>(available.refs?.[phase]||[]).includes(id)))
    found[phase]=true;
  }
 }
 const important=['start','rescue','hospital','intervention','discharge'].filter(p=>
  (p!=='start'||focus.explicitStart)&&(p!=='discharge'||focus.explicitEnd));
 const omitted=focus.chronology?important.filter(p=>available.availability[p]&&!found[p]):[];
 const grounded=important.filter(p=>available.availability[p]&&found[p]);
 return {found,omitted,grounded,score:grounded.length};
}
function sentence(text){
 const s=String(text||'').trim();
 const m=s.match(/^[\s\S]{15,350}?[.!?](?=\s|$)/);
 if(m)return m[0].trim();
 return s.length<=240?s:'';
}
function recoveryHeading(s){
 return /(felepul|hazabocsat|hazater|korhazi napok|ebredes|otthoni|allapot|utokezel|tavozas)/.test(fold(s));
}
function isMemoryHeading(s){return MEM.test(fold(s))}
function dedicatedMemoryParagraph(s){
 const t=fold(s),mentions=(t.match(/emlekezet|memoria|amnezi|emleksz|kognitiv|neurolog/g)||[]).length;
 return mentions>0&&(mentions>=2&&t.length>195||
  /^(az? )?(emlekezet|memoria|amnezi|kognitiv|neurolog)/.test(t)&&t.length>210);
}
export function enforceContextRelevance(report,focus){
 if(!report||!Array.isArray(report.sections))throw Error('focus_invalid_audited_report');
 if(!focus?.chronology||focus.explicitMemory)
  return {report,trimmed:0,briefMentions:0};
 // The audit must run FIRST: this operation never invents or upgrades evidence.
 const sections=report.sections.map(s=>({...s,paragraphs:(s.paragraphs||[]).map(p=>({...p}))}));
 let stored=null,trimmed=0;
 for(const sec of sections){
  const wholeSection=isMemoryHeading(sec.heading);
  const memory=(sec.paragraphs||[]).filter(p=>p&&MEM.test(fold(p.text))&&
   (wholeSection||dedicatedMemoryParagraph(p.text)));
  if(!memory.length)continue;
  trimmed+=Math.max(0,memory.length-1);
  if(!stored){
   const snippet=sentence(memory[0].text);
   if(snippet){
    stored={...memory[0],text:snippet};trimmed+=snippet!==memory[0].text?1:0;
   }else trimmed++;
  }else trimmed+=memory.length;
  // Preserve non-memory recovery/clinical facts even if the model used a
  // mixed heading such as "Ébredés és emlékezet". Never erase these facts.
  sec.paragraphs=sec.paragraphs.filter(p=>!memory.includes(p));
  if(wholeSection&&sec.paragraphs.length)sec.heading='A felépülés további eseményei';
 }
 let cleaned=sections.filter(s=>s.paragraphs.length>0);
 let briefMentions=0;
 if(stored){
  // Put the note into the existing recovery stage, not as a new answer.
  let dest=-1;for(let i=0;i<cleaned.length;i++)if(recoveryHeading(cleaned[i].heading))dest=i;
  if(dest<0&&cleaned.length)dest=cleaned.length-1;
  if(dest>=0){
   cleaned[dest].paragraphs.push(stored);briefMentions++;
  }
 }
 // Reported and documented facts keep their original sourceIds intact.
 return {report:{...report,sections:cleaned},trimmed,briefMentions};
}
export function focusInstruction(focus,phaseInfo){
 if(!focus?.chronology)return 'Kizárólag a felhasználó eredeti kérdését válaszold meg, ne a kapcsolódó témák listáját.';
 const ends=focus.explicitEnd?
  'A történet végét a felhasználó által kért hazabocsátás/hazatérés jelenti, ha forrásból alátámasztható.': '';
 const coverage=LIMIT_PHASES.filter(p=>phaseInfo?.availability?.[p]).join(', ')||'nincs idézett eseményfázis';
 const aside=focus.explicitMemory?
  'Az emlékezettel kapcsolatos kérdést részletesen is megválaszolhatod.':
  'Az emlékezetzavar, amnézia vagy idegrendszeri hatás NEM külön kérdés: ha egyáltalán releváns, legfeljebb egy rövid említés a felépülésnél, külön fejezet és részletes okmagyarázat nélkül.';
 return [
  'KÖTELEZŐ KÉRDÉSFÓKUSZ: időrend és a kérés teljes időszaka az elsődleges feladat.',
  'Először a rosszullét/kezdet, majd az ellátás, kórházi napok, beavatkozások, végül a kért időszak vége.',
  ends,
  'Idézett forrásokban érintett fázisok: '+coverage+'. A forrásban nem szereplő szakaszokat TILOS kigondolni.',
  'Ne cseréld fel az esemény sorrendjét a lelet keltezése alapján.',
  'Ne emelj ki olyan részproblémát, amelyet a kérdés nem tett középpontba.',
  aside
 ].filter(Boolean).join(' ').slice(0,1320);
}
