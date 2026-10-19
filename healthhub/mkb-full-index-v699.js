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
function dateFromTitle(title){
 var m=String(title||'').match(/(?:^|[^0-9])(20\d{2})[-._ ](0[1-9]|1[0-2])[-._ ](0[1-9]|[12]\d|3[01])(?=$|[^0-9])/);
 return m?day(m[1]+'-'+m[2]+'-'+m[3]):'';
}
function recentReportsIntent(question){
 var q=norm(question);
 return /(lelet|labor|dokumentum|pdf|vizsgalat|eredmeny)/.test(q)&&
  /(legutobb|legfriss|legujabb|utolso|legutolso|friss lelet|osszefoglal.*lelet|leleteim.*osszefoglal)/.test(q);
}
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
  var title=String(s.original_name||d.original_name||'Névtelen PDF').slice(0,170);
  var titleDate=dateFromTitle(title);
  rows.push({
   id:d.id,sourceId:s.id,
   title,
   profile:p,pageCount:Number(d.total_pages),
   date:titleDate||day(s.original_observed_at),
   dateKind:titleDate?'filename':'source_metadata',
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
   review:'pending',dateKind:doc.dateKind||'source_metadata',_documentId:doc.id,
   _fullText:page.page_text,_expected:page.text_sha256,
  });
 }
 // Rank all authorized and eligible source pages, then independently verify
 // the strongest candidates. No failed-hash excerpt enters the AI request.
 // Historical PDF reports were indexed later; do not confuse ingestion
 // time with dates indicated in original filenames. This is ordering, not
 // verification of a clinical examination date.
 var recent=recentReportsIntent(question);
 var ranked=recent?{selected:candidates.slice().sort((a,b)=>
  b.date.localeCompare(a.date)||a.page-b.page).slice(0,40)}:
  (typeof ranker.rankCandidates==='function'?ranker.rankCandidates(candidates,question,40):ranker.rank(candidates,question,{max:5}));
 var selected=[],considered=0,failures=0,seenDocs=new Set();
 for(const row of ranked.selected){
  if(selected.length===5||considered>=40)break;
  if(seenDocs.has(row._documentId))continue;
  considered++;
  if(!recent&&!row.relevanceScore)continue;
  try{
   if(await digest(row._fullText)!==row._expected){failures++;continue}
  }catch(_){failures++;continue}
  // Identity is from the authorized and verified document/source pairing,
  // not the page text, filename or user input.
  var safe={};
  for(const key of ['date','title','source','sourceId','page','quote','review','dateKind','caution'])
   if(row[key]!==undefined)safe[key]=row[key];
  selected.push(safe);seenDocs.add(row._documentId);
 }
 return {selected,documents:rows.length,eligiblePages:candidates.length,
  reviewed:considered,integrityRejected:failures,
  selectionMode:recent?'recent_original_reports':'question_lexical_relevance',
  kind:'quoted_pages_pending_clinical_review'};
}

/* Plan B: full original corpus is stored in one authorized, read-only VIEW.
 * Rank the complete page_text of EVERY eligible page (not a 400-character
 * extract and not the six curated fact-evidence rows). Only the chosen
 * source windows, verbatim, enter one explicitly requested AI call.
 */
function variants(w){var a=[w];for(const x of ['ban','ben','bol','rol','hoz','hez','on','en','an','ba','be','ra','re','n'])if(w.endsWith(x)&&w.length>x.length+4)a.push(w.slice(0,-x.length));return a;}
async function rankCorpus(all,question,digest){
 if(typeof digest!=='function')throw Error('page_digest_required');
 var active=Array.isArray(all)?all:[];
 var userQuestion=norm(question),tokens=userQuestion.split(' ').filter(t=>t.length>=3);
 var latest=/(legutobb|legfriss|legujabb|utolso|legutolso|legutobbi|legfrissebb)/.test(userQuestion);
 var related=new Set(tokens);
 if(/sziv|kardio|cardio|keringes|pulzus|ritmus/.test(userQuestion))
  ['sziv','kardio','ekg','echo','szivultrahang','ritmus','concor','entresto','ef'].forEach(x=>related.add(x));
 if(/ver|labor|cukor|koleszterin|vese/.test(userQuestion))
  ['labor','hemoglobin','ver','cukor','koleszterin','kreatinin','egfr'].forEach(x=>related.add(x));
 var entries=[],ids=new Set(),catalog=new Map(),bytes=0;
 for(const raw of active){
  if(!raw||!['monika','zsolt'].includes(raw.profile_key)||
    typeof raw.full_text!=='string'||!raw.document_id||!raw.source_id||
    !Number.isInteger(Number(raw.page_no))||Number(raw.page_no)<1)continue;
  var p=String(raw.profile_key),documentId=String(raw.document_id),key=p+'|'+documentId+'|'+raw.page_no;
  if(ids.has(key))continue;ids.add(key);
  var title=String(raw.document_name||'').slice(0,180),date=
    day(raw.filename_date)||day(raw.source_observed_date);
  var record={profile:p,documentId,sourceId:String(raw.source_id),title,
    date,dateKind:day(raw.filename_date)?'filename':'source_metadata',
    category:String(raw.category||'Egyéb').slice(0,70),
    page:Number(raw.page_no),text:raw.full_text,hash:String(raw.text_sha256||''),
    duplicate:raw.duplicate_source===true};
  var current=catalog.get(p+'|'+documentId);
  if(!current)catalog.set(p+'|'+documentId,{id:documentId,sourceId:record.sourceId,
    title,profile:p,date,dateKind:record.dateKind,category:record.category,
    pageCount:0,duplicate:record.duplicate});
  catalog.get(p+'|'+documentId).pageCount++;
  bytes+=raw.full_text.length;
  if(!/^[a-f0-9]{64}$/i.test(record.hash)||record.text.length<30)continue;
  var hay=norm(title+' '+record.category),body=norm(record.text);
  var score=0;
  for(const t of related){
   if(variants(t).some(v=>hay.includes(v)))score+=10;
   if(variants(t).some(v=>body.includes(v)))score+=3;
  }
  entries.push(Object.assign(record,{score}));
 }
 var allDocs=Array.from(catalog.values()).sort((a,b)=>
  b.date.localeCompare(a.date)||a.title.localeCompare(b.title,'hu')||a.id.localeCompare(b.id));
 entries.sort((a,b)=>
  (latest?b.date.localeCompare(a.date)||b.score-a.score:
    b.score-a.score||b.date.localeCompare(a.date))||
   a.page-b.page||a.documentId.localeCompare(b.documentId));
 var selected=[],failed=0,used=new Set(),considered=0;
 for(const r of entries){
  if(selected.length===12||considered>=100)break;
  if(used.has(r.documentId))continue;
  if(!latest&&r.score===0)continue;
  considered++;
  var verified=false;
  try{verified=(await digest(r.text)).toLowerCase()===r.hash.toLowerCase()}catch(_){}
  if(!verified){failed++;continue}
  used.add(r.documentId);
  // The index never loses characters. This AI request carries an unmodified
  // contiguous window of the selected page to fit the active backend (2450).
  var location=0;
  if(r.text.length>2300&&!latest){
   for(const t of related){
    var at=norm(r.text).indexOf(t);
    if(at>=0){location=Math.max(0,at-300);break}
   }
  }
  var excerpt=r.text.slice(location,location+2300);
  selected.push({sourceId:r.sourceId,date:r.date,dateKind:r.dateKind,
   title:r.title,source:r.title,page:r.page,quote:excerpt,review:'pending',
   category:r.category,fullCorpus:true,profile:r.profile,
   completePageLength:r.text.length,selectedStart:location});
 }
 return {selected,catalog:allDocs,documents:allDocs.length,
  eligiblePages:entries.length,allPages:ids.size,
  totalCharacters:bytes,integrityRejected:failed,
  selectionMode:latest?'latest_original_docs':'whole_page_question_search'};
}
var api=Object.freeze({catalog,filterCatalog,rankPages,rankCorpus,norm});
if(typeof module==='object'&&module.exports)module.exports=api;
else root.HH_MKB_FULL_INDEX_V699=api;
})(typeof window!=='undefined'?window:globalThis);
