(function(root){
'use strict';
/* Medical Knowledge Base v675: ephemeral read-only source attestation.
 * "text_verified" verifies bytes/Unicode/provenance, NOT clinical truth.
 * Everything runs locally over Vault-authorized response rows.
 */
function audit(facts,evidences,sources,documents,pages,digest){
 var sourceMap=new Map((sources||[]).map(x=>[x.id,x]));
 var docs=new Map();
 for(var d of documents||[]){
  if(d&&d.id&&d.mkb_source_id&&!d.duplicate_of){
   if(!docs.has(d.mkb_source_id))docs.set(d.mkb_source_id,[]);
   docs.get(d.mkb_source_id).push(d);
  }
 }
 var pageMap=new Map((pages||[]).map(p=>[p.document_id+'|'+p.page_no,p]));
 var factMap=new Map((facts||[]).map(f=>[f.id,f]));
 return Promise.all((evidences||[]).map(async e=>{
  var id=String(e&&e.id||'');
  var bad=(reason)=>({id,verified:false,reason});
  if(!id||!e||e.evidence_role!=='supports'||!e.excerpt||!Number.isInteger(Number(e.page_no))||
    Number(e.page_no)<1)return bad('Hiányos vagy nem támogató bizonyíték');
  var f=factMap.get(e.fact_id);
  if(!f||f.profile_key!==e.profile_key||f.source_id!==e.source_id||
     f.review_status==='rejected')return bad('Eltérő profil, tény vagy forrás');
  var source=sourceMap.get(e.source_id);
  if(!source||source.profile_key!==e.profile_key||source.parse_status!=='complete'||
     source.origin!=='google_drive'||source.source_kind!=='pdf'||
     source.source_metadata&&source.source_metadata.ingest_scope==='excluded'||
     !/^[a-f0-9]{64}$/i.test(source.sha256||''))return bad('Nem ellenőrzött vagy kizárt eredeti forrás');
  var related=docs.get(source.id)||[];
  if(related.length!==1)return bad('Hiányzó vagy nem egyértelmű eredeti dokumentum');
  var d=related[0];
  if(d.profile_key!==e.profile_key||d.sha256!==source.sha256||
   d.status!=='complete'||d.text_integrity_status!=='verified'||
   !Number.isInteger(Number(d.total_pages))||Number(d.total_pages)<1||
   Number(d.pages_verified)!==Number(d.total_pages)||Number(e.page_no)>Number(d.total_pages))
   return bad('A dokumentum szövegintegritása nem igazolt');
  var page=pageMap.get(d.id+'|'+e.page_no);
  if(!page||!page.page_text||!page.text_sha256||
   !/^[a-f0-9]{64}$/i.test(page.text_sha256)||!page.page_text.includes(e.excerpt))
   return bad('A forrásoldal vagy a pontos idézet hiányzik');
  try{
   var actual=await digest(page.page_text);
   if(actual!==page.text_sha256)return bad('Az oldalszöveg SHA-256 nem egyezik');
  }catch(_){return bad('Az SHA-256 visszaellenőrzése sikertelen')}
  return {id,verified:true,reason:'Szöveges forrásintegritás igazolt; klinikai felülvizsgálat szükséges'};
 })).then(rows=>new Map(rows.map(r=>[r.id,r])));
}
var api=Object.freeze({audit});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.HH_MKB_EVIDENCE_AUDIT_V675=api;
})(typeof window!=='undefined'?window:globalThis);