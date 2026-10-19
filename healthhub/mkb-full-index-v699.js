(function(root){
'use strict';
/* I-11 v699. Read-only full MKB catalog + source-verified page retrieval.
 * All 164/43 user-authorized originals can be browsed; only up to five
 * byte-integrity-checked short page excerpts can enter a consented request.
 * This module does not fetch, log, persist, classify or diagnose.
 */
var uuid=/^[a-f0-9-]{36}$/i,sha=/^[a-f0-9]{64}$/i;
function day(v){
 var s=typeof v==='string'?v.slice(0,10):'';
 if(!/^20\d\d-\d\d-\d\d$/.test(s))return '';
 var d=Date.parse(s+'T12:00:00Z');
 return Number.isFinite(d)&&new Date(d).toISOString().slice(0,10)===s?s:'';
}
function norm(s){return String(s||'').toLocaleLowerCase('hu-HU')
 .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
function catalog(docs,sources,p){
 if(!['monika','zsolt'].includes(p))throw Error('invalid_patient_profile');
 var sourcesById=new Map();
 for(const s of Array.isArray(sources)?sources:[]){
  if(s&&s.profile_key===p&&uuid.test(s.id)&&
    s.origin==='google_drive'&&s.source_kind==='pdf'&&
    s.parse_status==='complete'&&s.source_metadata?.ingest_scope!=='excluded'&&
    !s.duplicate_of&&sha.test(s.sha256||''))
   sourcesById.set(s.id,s);
 }
 var seen=new Set(),rows=[];
 for(const d of Array.isArray(docs)?docs:[]){
  if(!d||d.profile_key!==p||!uuid.test(d.id)||!uuid.test(d.mkb_source_id)||
     d.duplicate_of||d.status!=='complete'||d.text_integrity_status!=='verified'||
     !Number.isInteger(Number(d.total_pages))||Number(d.total_pages)<1||
     Number(d.pages_verified)!==Number(d.total_pages)||!sha.test(d.sha256||'')||
     seen.has(d.id))continue;
  var s=sourcesById.get(d.mkb_source_id);
  if(!s||s.sha256!==d.sha256)continue;
  seen.add(d.id);
  rows.push({
   id:d.id,sourceId:s.id,
   title:String(s.original_name||d.original_name||'Névtelen PDF').slice(0,170),
   profile:p,pageCount:Number(d.total_pages),
   date:day(s.original_observed_at),
   originalHash:d.sha256,
   state:'forrásintegritás_igazolt_szakmai_review_nem',
  });
 }
 rows.sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title,'hu')||a.id.localeCompare(b.id));
 return rows;
}
function filterCatalog(rows,search){
 var query=norm(search);if(!query)return rows.slice();
 var pieces=query.split(' ').filter(x=>x.length>=2);
 return rows.filter(d=>pieces.every(t=>norm(d.title).includes(t)||d.date.includes(t)));
}
function excerpt(text,terms){
 var source=String(text||'');
 if(source.length<32)return '';
 // The unmodified contiguous excerpt remains a literal substring of the
 // separately hashed original indexed page text.
 var positions=[];
 for(const t of terms){
  if(t.length<3)continue;
  // Approximate diacritic-normalized position; no rewriting source bytes.
  var at=norm(source).indexOf(t);if(at>=0)positions.push(at);
 }
 var start=positions.length?Math.max(0,Math.min(...positions)-85):0;
 return source.slice(start,start+400);
}
async function rankPages(rows,pages,question,digest,ranker){
 if(!ranker||typeof ranker.rank!=='function'||typeof digest!=='function')
  throw Error('missing_verified_page_ranker');
 var terms=typeof ranker.tokens==='function'?ranker.tokens(question):[];
 var byDoc=new Map((rows||[]).map(x=>[x.id,x]));
 var candidates=[];
 for(const page of Array.isArray(pages)?pages:[]){
  var doc=page&&byDoc.get(page.document_id);
  if(!doc||!Number.isInteger(Number(page.page_no))||
     Number(page.page_no)<1||Number(page.page_no)>doc.pageCount||
     typeof page.page_text!=='string'||!sha.test(page.text_sha256||''))continue;
  var quote=excerpt(page.page_text,terms);
  if(quote.length<32)continue;
  candidates.push({
   sourceId:doc.sourceId,date:doc.date,title:doc.title,
   source:doc.title,page:Number(page.page_no),quote,
   review:'pending',dateKind:'source_metadata',_documentId:doc.id,
   _fullText:page.page_text,_expected:page.text_sha256,
  });
 }
 // Rank all authorized and eligible source pages, then independently verify
 // the strongest candidates. No failed-hash excerpt enters the AI request.
 var ranked=ranker.rank(candidates,question,{max:Math.min(3000,candidates.length||1)});
 var selected=[],considered=0,failures=0;
 for(const row of ranked.selected){
  if(selected.length===5||considered>=40)break;
  considered++;
  if(!row.relevanceScore)continue;
  try{
   if(await digest(row._fullText)!==row._expected){failures++;continue}
  }catch(_){failures++;continue}
  // Identity is from the authorized and verified document/source pairing,
  // not the page text, filename or user input.
  var safe={};
  for(const key of ['date','title','source','sourceId','page','quote','review','dateKind','caution'])
   if(row[key]!==undefined)safe[key]=row[key];
  selected.push(safe);
 }
 return {selected,documents:rows.length,eligiblePages:candidates.length,
  reviewed:considered,integrityRejected:failures,kind:'quoted_pages_pending_clinical_review'};
}
var api=Object.freeze({catalog,filterCatalog,rankPages,norm});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.HH_MKB_FULL_INDEX_V699=api;
})(typeof window!=='undefined'?window:globalThis);
