(function(root){
'use strict';
/* HealthHub v407: determinate document classification and visual screening.
 * Candidate classifications are NEVER clinical validation or diagnosis.
 */
function norm(v){return String(v||'').toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function classify(name){
 var n=norm(name);
 if(/samsung watch|galaxy watch|watch ekg|okosora|wearable|watch ecg/.test(n))
  return {sourceClass:'device',hint:'ekg_candidate',review:true};
 if(/lena|chatgpt|ai[- _]?osszefoglal|sajat jegyzet|magyarázat|magyarazat|sajat osszefoglal/.test(n))
  return {sourceClass:'secondary_summary',hint:'none',review:true};
 if(/omsz|mento/.test(n))return {sourceClass:'unverified',hint:'ekg_candidate',review:true};
 return {sourceClass:'unverified',hint:/ekg|ecg|elektrokardi/.test(n)?'ekg_candidate':'none',review:true};
}
function visualSignals(title,text,ops){
 var n=norm(title+' '+String(text||'').slice(0,1400));
 var imageOps=Number(ops&&ops.images)||0,paths=Number(ops&&ops.paths)||0;
 var ekg=/(ekg|ecg|elektrokardi|ritmuscsik|rhythm strip)/.test(n);
 var omzs=/(omsz|orszagos mentoszolgalat)/.test(n);
 var wanted=ekg||omzs||imageOps>0||paths>240;
 return {capture:wanted,review:wanted,
  hint:ekg||omzs?'ekg_candidate':imageOps?'image_or_chart':paths>240?'image_or_chart':'none',
  reason:ekg||omzs?'clinical_context':imageOps?'embedded_image':paths>240?'vector_drawing':'text_only'};
}
function readiness(state){
 var total=Number(state.totalPages)||0,done=Number(state.pagesIndexed)||0;
 var missing=Number(state.pagesNeedingOcr)||0,failed=Number(state.failedPages)||0;
 var visualsMissing=Number(state.visualFailed)||0;
 return total>0&&done===total&&missing===0&&failed===0&&visualsMissing===0?'complete':done?'partial':'failed';
}
function checksumBytes(a){return Array.from(new Uint8Array(a)).map(b=>b.toString(16).padStart(2,'0')).join('')}
function allowedProfile(p){return p==='monika'||p==='zsolt'}
var exported={norm:norm,classify:classify,visualSignals:visualSignals,readiness:readiness,checksumBytes:checksumBytes,allowedProfile:allowedProfile};
if(typeof module==='object'&&module.exports)module.exports=exported;
else root.HH_KB_CORE_V407=exported;
})(typeof window!=='undefined'?window:globalThis);
