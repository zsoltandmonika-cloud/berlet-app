/* HealthHub v405 · Focus experiment, NEVER replaces production v403 by itself.
 * Operates only on already-audited paragraphs, never on unverified model text.
 * Immutable baseline and fail-safe rollback for model output regressions.
 */
import {analyzeQuestionIntent,evidencePhases,narrativeCoverage,enforceContextRelevance} from './focus.mjs';
const supported=p=>p&&['documented','reported'].includes(p.kind);
const allParas=r=>(Array.isArray(r?.sections)?r.sections:[]).flatMap(s=>Array.isArray(s.paragraphs)?s.paragraphs:[]);
const srcKey=p=>[p.kind,(Array.isArray(p.sourceIds)?p.sourceIds:[]).slice().sort().join('|')].join('/');
function paragraphAllowed(p,baseline){
 const text=String(p?.text||'').trim(),key=srcKey(p);
 if(!text||!p?.kind)return false;
 return baseline.some(b=>srcKey(b)===key&&String(b.text||'').trim().startsWith(text));
}
function usefulReport(r){
 const ps=allParas(r).filter(p=>p.kind!=='unknown'&&String(p.text||'').trim().length>=12);
 const chars=ps.reduce((n,p)=>n+String(p.text||'').length,0);
 return {paras:ps,grounded:ps.filter(supported),chars};
}
function memorySections(r){
 return (r.sections||[]).filter(s=>/(emlekezet|memoria|amnezi|kognitiv|neurolog)/i.test(
  String(s.heading||'').toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,''))).length;
}
/** Experiment result includes the v403 baseline intact if the candidate is unsafe.
 *  Reasons are internal QA labels, never a reason to discard the story.
 */
export function chooseNonRegressingFocus(question,baseline,originalFacts,secondaryFacts){
 const status={mode:'v403_baseline',reason:'unchanged',baselineGrounded:0,candidateGrounded:0,
  focusApplied:false,omittedBefore:[],omittedAfter:[]};
 const base=usefulReport(baseline);
 status.baselineGrounded=base.grounded.length;
 if(!base.paras.length||!base.grounded.length){
  return {report:baseline,status:{...status,reason:'baseline_has_no_grounded_story'}};
 }
 let intent;
 try{intent=analyzeQuestionIntent(question)}
 catch(e){return {report:baseline,status:{...status,reason:'invalid_question'}}}
 if(!intent.chronology||intent.explicitMemory){
  return {report:baseline,status:{...status,reason:'question_does_not_need_tangent_trimming'}};
 }
 const phases=evidencePhases(originalFacts||{facts:[]},secondaryFacts||{facts:[]});
 const before=narrativeCoverage(baseline,intent,phases);
 status.omittedBefore=before.omitted;
 let result;
 try{result=enforceContextRelevance(baseline,intent)}
 catch(e){return {report:baseline,status:{...status,reason:'focus_transform_failed'}}}
 const candidate=result.report,now=usefulReport(candidate);
 status.candidateGrounded=now.grounded.length;
 const after=narrativeCoverage(candidate,intent,phases);
 status.omittedAfter=after.omitted;
 const originalKeys=new Set(base.paras.map(srcKey));
 const sourceValid=now.paras.every(p=>originalKeys.has(srcKey(p))&&paragraphAllowed(p,base.paras));
 const lostPhase=Object.keys(before.found).some(phase=>before.found[phase]&&!after.found[phase]);
 const lostGrounded=base.grounded.length-now.grounded.length;
 const maxDiscard=Math.max(1,Math.floor(base.grounded.length*0.28));
 const stillSubstantial=now.chars>=Math.min(230,base.chars*0.56);
 const noNewMissing=after.omitted.every(phase=>before.omitted.includes(phase));
 if(!sourceValid||lostPhase||lostGrounded>maxDiscard||!stillSubstantial||!noNewMissing){
  return {report:baseline,status:{...status,reason:!sourceValid?'invalid_provenance':
   lostPhase?'lost_grounded_timeline_stage':
   lostGrounded>maxDiscard?'too_many_grounded_paragraphs_removed':
   !stillSubstantial?'narrative_collapsed':'new_timeline_gap'}};
 }
 if(!result.trimmed&&JSON.stringify(candidate)===JSON.stringify(baseline))
  return {report:baseline,status:{...status,reason:'no_change_needed'}};
 if(memorySections(candidate)>memorySections(baseline))
  return {report:baseline,status:{...status,reason:'new_memory_tangent'}};
 return {report:candidate,status:{...status,mode:'v405_focus_preview',
  reason:'strictly_non_regressing',focusApplied:true,trimmed:result.trimmed,
  originalCharacters:base.chars,focusedCharacters:now.chars}};
}
