(function(root){
'use strict';
/* v674: read-only event groups over existing source-linked facts.
 * No database mutation, diagnostic inference or clinical verification.
 * Same-day same-kind notes are GROUPED FOR DISPLAY, not asserted identical.
 * Culture organisms group only when the PDF SOURCE ID also matches.
 */
function norm(x){return String(x||'').toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
function heading(f){
 var label=String(f&&f.label||'').trim();
 var base=label.replace(/\s*\(20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}\.?\)\s*$/,'').trim();
 return base||label||'Nem besorolt forrásesemény';
}
function groups(facts,evidences){
 var result=new Map(),sourceFacts=Array.isArray(facts)?facts:[],links=Array.isArray(evidences)?evidences:[];
 for(var f of sourceFacts){
  if(!f||!f.id||!f.source_id||!f.profile_key||!f.observed_date||f.review_status==='rejected')continue;
  var kind=String(f.fact_type||'other'),label=heading(f),keyPart=norm(label);
  // One lab PDF and sample-date groups its reported culture organisms.
  var isCulture=kind==='laboratory'&&/^vizeletteny[eé]szt[eé]s:/i.test(label);
  if(isCulture)keyPart='vizelettenyésztés|'+f.source_id;
  // Other events group same label/type/date only. Do not merge distinct
  // lab results, distinct patient profiles, or differing numeric values.
  else if(f.value_number!==null&&f.value_number!==undefined)
   keyPart+='|'+String(f.value_number)+'|'+String(f.original_unit||'');
  var key=f.profile_key+'|'+f.observed_date+'|'+kind+'|'+keyPart;
  if(!result.has(key))result.set(key,{
   key,profile_key:f.profile_key,date:f.observed_date,kind,
   title:isCulture?'Vizelettenyésztés':label,records:[],evidences:[],statuses:new Set()
  });
  var event=result.get(key);
  event.records.push(f);event.statuses.add(f.review_status||'pending');
 }
 var idToGroup=new Map();
 for(const g of result.values())for(const f of g.records)idToGroup.set(f.id,g);
 for(const e of links){
  if(!e||!e.fact_id||!e.source_id||!e.profile_key)continue;
  var g=idToGroup.get(e.fact_id);
  if(!g||g.profile_key!==e.profile_key)continue;
  var fact=g.records.find(f=>f.id===e.fact_id);
  if(!fact||fact.source_id!==e.source_id)continue;
  if(e.evidence_role!=='supports')continue;
  g.evidences.push(e);
 }
 return [...result.values()].map(g=>({
  ...g, statuses:[...g.statuses],
  records:g.records.slice().sort((a,b)=>String(a.label).localeCompare(String(b.label),'hu')),
  evidences:g.evidences.slice().sort((a,b)=>String(a.source_id).localeCompare(String(b.source_id))||Number(a.page_no)-Number(b.page_no))
 })).sort((a,b)=>String(b.date).localeCompare(String(a.date))||a.title.localeCompare(b.title,'hu'));
}
var api=Object.freeze({groups,heading});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.HH_MKB_TIMELINE_V674=api;
})(typeof window!=='undefined'?window:globalThis);