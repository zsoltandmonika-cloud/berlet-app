/* HealthHub Narrative v406 · complete outsider-readable story (preview only).
 * Pure helpers. Clinical claims must still pass the existing source audit.
 * We cannot promise every phase if no excerpt supports it.
 */
import {analyzeQuestionIntent,evidencePhases,narrativeCoverage} from './focus.mjs';
import {extractOriginalQuestion} from './focus-guard-v405.mjs';
const PHASES=[
 ['start','A rosszullét kezdete'],
 ['rescue','Az életmentés és mentőellátás'],
 ['hospital','A kórházi felvétel és az intenzív kezelés'],
 ['intervention','A dokumentált beavatkozások'],
 ['discharge','Hazabocsátás és további felépülés']
];
const n=s=>String(s==null?'':s).replace(/\s+/g,' ').trim();
function factsOf(a){return Array.isArray(a?.facts)?a.facts:[]}
function idType(id){return /^D\d+:p\d+$/.test(id)?'documented':/^S\d+$/.test(id)?'reported':null}
function supportedBy(phase,f,outline){
 return (outline.refs[phase]||[]).includes(f.sourceId);
}
function note(f){
 const kind=idType(f.sourceId),quote=n(f.quote).slice(0,470);
 if(!kind||quote.length<18)return null;
 return {kind,sourceId:f.sourceId,quote,sourceIds:[f.sourceId]};
}
export function buildStoryContract(question,original,secondary){
 const originalQuestion=extractOriginalQuestion(question);
 const focus=analyzeQuestionIntent(originalQuestion);
 const availability=evidencePhases(original||{facts:[]},secondary||{facts:[]});
 const raw=[...factsOf(original),...factsOf(secondary)];
 const unique=new Set(),events=[];
 for(const [phase,heading] of PHASES){
  const matches=raw.filter(f=>supportedBy(phase,f,availability));
  for(const f of matches){
   const item=note(f);if(!item)continue;
   const key=phase+'|'+item.sourceId+'|'+item.quote;
   if(unique.has(key))continue;unique.add(key);
   if(events.filter(e=>e.phase===phase).length>=8)continue;
   events.push({...item,phase,heading});
  }
 }
 const supportedPhases=PHASES.filter(([key])=>availability.availability[key]).map(([key])=>key);
 const mandatory=focus.chronology?supportedPhases:[];
 return {originalQuestion,focus,availability,events:events.slice(0,28),
  supportedPhases,mandatory,totalFacts:raw.length};
}
function groundedParagraphs(report){
 const result=[];
 for(const section of (Array.isArray(report?.sections)?report.sections:[])){
  for(const p of (Array.isArray(section.paragraphs)?section.paragraphs:[]))
   if(p&&idType((p.sourceIds||[])[0])===p.kind&&n(p.text).length>10)
    result.push({heading:n(section.heading),text:n(p.text),kind:p.kind,sourceIds:p.sourceIds});
 }
 return result;
}
export function assessCompleteStory(report,contract){
 const focus=contract.focus,found=narrativeCoverage(report,focus,contract.availability);
 const grounded=groundedParagraphs(report);
 const full=(report?.sections||[]).flatMap(s=>s.paragraphs||[]).filter(p=>n(p?.text));
 const generals=full.filter(p=>p.kind==='general'||p.kind==='possible');
 const genericShare=full.length?generals.length/full.length:1;
 const missing=focus.chronology?contract.mandatory.filter(k=>!found.found[k]):[];
 // An introduction that begins with a mid-treatment fact is not an introduction.
 const first=grounded[0]||null;
 const textFold=first?first.text.toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,''):'';
 const startWords=/(rosszull|osszees|kamrafibrill|szivmegall|eszmeletveszt|elajul)/;
 const rescueWords=/(ujraeleszt|aed|cpr|defibrill|mento)/;
 const hospitalWords=/(intenziv|korhazi felvetel|korhazi ellatas|kateter|szivultrahang)/;
 const interventionWords=/(beultet|implant|crt.d|pacemaker|mutet)/;
 const dischargeWords=/(hazabocsat|hazaenged|hazaadas|hazater|elbocsat)/;
 const match=[startWords,rescueWords,hospitalWords,interventionWords,dischargeWords];
 const leadingPhase=first?PHASES.find(([phase],i)=>
   match[i].test(textFold)&&contract.events.some(e=>e.phase===phase&&
   first.sourceIds.includes(e.sourceId)))?.[0]||null:null;
 const firstVisible=full.find(p=>p.kind!=='unknown')||null;
 const opensWithExplanation=firstVisible&&['general','possible'].includes(firstVisible.kind);
 const badOpening=focus.chronology&&contract.availability.availability.start&&
  (leadingPhase!=='start'||!!opensWithExplanation);
 const missingClosing=focus.chronology&&focus.explicitEnd&&
  contract.availability.availability.discharge&&!found.found.discharge;
 const onlyGeneric=grounded.length===0;
 const reason=onlyGeneric?'no_personal_story':badOpening?'starts_mid_story':
  missing.length?'timeline_gaps':genericShare>0.5&&grounded.length<3?'explanations_dominate':null;
 return {passes:!reason,reason,grounded:grounded.length,
  totalParagraphs:full.length,genericShare,missing,
  badOpening,missingClosing,found:found.found};
}
/* Deterministic last-resort output from literally quoted, already checked facts.
 * No inferred scene/chronology date; narrative form with true provenance.
 * This is only for EMPTY/GLOBAL explanations and only if cited facts exist.
 */
export function sourcedLastResort(contract){
 if(!contract.focus.chronology||contract.events.length<2)return null;
 const phases=[],used=new Set();
 for(const [phase,heading] of PHASES){
  const events=contract.events.filter(e=>e.phase===phase);
  if(!events.length)continue;
  const paragraphs=[];
  for(const e of events){
   const key=e.kind+'|'+e.sourceId+'|'+e.quote;
   if(used.has(key))continue;used.add(key);
   const pre=e.kind==='documented'?
    'Az eredeti kórházi dokumentum szó szerinti részlete: ':
    'A korábban rögzített HealthHub-összefoglaló szövege szerint: ';
   paragraphs.push({kind:e.kind,sourceIds:e.sourceIds.slice(),text:pre+'„'+e.quote+'”'});
  }
  if(paragraphs.length)phases.push({heading,paragraphs:paragraphs.slice(0,5)});
 }
 return phases.length>=2?{sections:phases,stats:{mode:'source_only_fallback'}}:null;
}
export function narrativeInstructions(contract){
 if(!contract.focus.chronology)return '';
 const phaseNames=PHASES.filter(([p])=>contract.supportedPhases.includes(p)).map(([,label])=>label);
 return [
  'ÖNÁLLÓ, IDEGEN OLVASÓ SZÁMÁRA IS ÉRTHETŐ TÖRTÉNETET ÍRJ.',
  'A legelső bekezdés indítsa el az eseményt: ki az érintett, mikor és mi történt az elején, ha és csak ha van rá ellenőrzött forrás.',
  'Ne kezdj szívultrahanggal, intubációval, beültetéssel, vagy egy élettani magyarázattal, ha a rosszullét és mentés korábban történt és az idézetek ezt lefedik.',
  'A kért események okát, lefolyását, sorrendjét és következményeit kapcsolódó prózában vezesd végig.',
  'Minden lényeges átmenet érthető legyen annak is, aki soha nem hallott a betegről.',
  'A vázlat forrásokból lefedett szakaszai: '+(phaseNames.join(' → ')||'nincs idézett eseménysor')+'.',
  'A felépülés és hazabocsátás csak idézett konkrét információval szerepelhet. Ha nincs adat, ne találj ki lezárást.',
  'Az élettani magyarázatokat a hozzájuk tartozó történeti eseménynél, legfeljebb rövid kiegészítésként add meg; ne helyettesítsék a történetet.',
  contract.focus.explicitMemory?'Az emlékezet kérdésére is válaszolj.':
   'A memóriazavar nem önálló kérdés, legfeljebb röviden említsd a felépülésnél.',
  'A személyes tényekhez továbbra is eredeti D vagy másodlagos S forrásazonosító kell; semmi új adat, kitalált idő vagy szereplő.'
 ].join(' ').slice(0,2350);
}
