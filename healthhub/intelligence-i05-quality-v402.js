(function(){
'use strict';
/* I-05 v402 - Clinical Quality Gate.
 * Pure, consent-bound preflight + transparent postflight audit-status.
 * NOT a medical fact checker; v395 server evidence audit remains authoritative
 * for the original PDF excerpts it actually received. Nothing is persisted. */
var SCHEMA='healthhub.ask-lena/1',LIMIT=5*60*1000;
function validProfile(p){return p==='zsolt'||p==='monika'}
function time(x){if(typeof x!=='string'||!x.trim())return null;var n=Date.parse(x);return Number.isFinite(n)?n:null}
function copy(s){return Object.assign({},s,{entries:Array.isArray(s.entries)?s.entries.map(function(e){return Object.assign({},e)}):[]})}
function preflight(input,profile,opts){
 if(!input||input.schema!==SCHEMA||input.consent!==true||!validProfile(profile)||input.profile!==profile)
  throw Error('I-05: nincs egyező, jóváhagyott személyes AI-kérés.');
 if(!Array.isArray(input.sources)||!Array.isArray(input.extra))throw Error('I-05: hibás adatforrás-formátum.');
 var now=opts&&Number.isFinite(opts.now)?opts.now:Date.now(),warnings=[],dropped=0;
 var sources=input.sources.slice(0,24).map(copy);
 sources.forEach(function(source){
  source.entries=source.entries.filter(function(e){
   var t=time(e.observedAt);
   if(t!=null&&t>now+LIMIT){dropped++;return false}
   return true;
  });
  if(source.status==='stale')warnings.push('Régi adatforrás: '+String(source.id||'ismeretlen').slice(0,40));
 });
 var docs=Array.isArray(input.documentEvidence)?input.documentEvidence:[];
 var seen=new Set(),rejected=0,originals=0;
 docs=docs.slice(0,16).filter(function(d){
  if(!d||!['original_pdf_extract','json_summary'].includes(d.type)||!d.documentId||!d.title||!d.text){rejected++;return false}
  if(d.type==='original_pdf_extract'){
   if(input.originalDocumentsConsent!==true||!Number.isInteger(d.page)||d.page<1){rejected++;return false}
   originals++;
  }
  var key=[d.documentId,d.type,d.page||''].join('|');
  if(seen.has(key)){rejected++;return false}seen.add(key);return true;
 });
 if(dropped)warnings.push('Jövőbe mutató mérési időbélyeggel rendelkező adat nem került továbbításra: '+dropped);
 if(rejected)warnings.push('Nem ellenőrizhető vagy nem engedélyezett dokumentumrészlet kimaradt: '+rejected);
 var payload=Object.assign({},input,{sources:sources,documentEvidence:docs});
 if(!sources.some(function(s){return s.entries.length>0})&&!docs.length)
  throw Error('I-05: nincs ellenőrizhető forrás a személyes elemzéshez.');
 return {payload:payload,profile:profile,warnings:warnings.slice(0,8),
  quality:{checkedSources:sources.length,originalPages:originals,droppedFutureMeasurements:dropped,rejectedDocuments:rejected}};
}
function finalAudit(text,report,serverAudit,clinicalPilot){
 if(!report||!validProfile(report.profile))throw Error('I-05: hiányzó minőségellenőrzési jelentés.');
 if(typeof text!=='string'||text.trim().length<20)throw Error('I-05: nincs befejezett, értelmezhető AI-válasz.');
 if(clinicalPilot){
  if(!serverAudit||serverAudit.mode!=='clinical-v395'||
   !Number.isInteger(serverAudit.checkedParagraphs)||serverAudit.checkedParagraphs<1)
   throw Error('I-05: hiányzik a klinikai szerveroldali válaszaudit. A válasz nem tekinthető késznek.');
  var issues=(Number(serverAudit.invalidCitations)||0)+(Number(serverAudit.unsupportedDurations)||0)+
   (Number(serverAudit.unsupportedDates)||0)+(Number(serverAudit.unsupportedClinicalNumbers)||0);
  return {kind:issues?'limited':'verified_excerpt_audit',
   message:issues?'I-05: klinikai szerveraudit készült, néhány állítás korlátozással szerepel.':
    'I-05: eredeti kivonatokra vonatkozó klinikai szerveraudit készült; nem teljes orvosi ellenőrzés.',
   issues:issues};
 }
 return {kind:'preflight_only',
  message:'I-05: adatforrások előellenőrizve; a generált válasz állításai nincsenek teljes körűen klinikailag igazolva.',
  issues:report.warnings.length};
}
window.HH_CLINICAL_QUALITY_GATE_I05_V402={preflight:preflight,finalAudit:finalAudit,version:'402'};
})();
