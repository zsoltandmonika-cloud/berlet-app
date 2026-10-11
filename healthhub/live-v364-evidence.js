(function(){
'use strict';
// RAG-lite: rank explicit prior record summaries, optionally read SMALL EXCERPTS from authorized original PDFs.
// This module does NOT upload whole PDFs or cache extracted original text.
var PDF='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
var WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
var libPromise=null;
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function el(id){return document.getElementById(id)}
function norm(x){return String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ')}
function words(s){return [...new Set(norm(s).split(' ').filter(function(x){return x.length>=4}).slice(0,28))]}
function field(x){return String(x||'').slice(0,2600)}
var MONTHS={januar:1,februar:2,marcius:3,aprilis:4,majus:5,junius:6,julius:7,
 augusztus:8,szeptember:9,oktober:10,november:11,december:12};
function validDay(y,m,d){
 var t=Date.UTC(Number(y),Number(m)-1,Number(d));
 var a=new Date(t);
 return Number.isFinite(t)&&a.getUTCFullYear()===Number(y)&&
  a.getUTCMonth()+1===Number(m)&&a.getUTCDate()===Number(d)?
  a.toISOString().slice(0,10):null;
}
function dateQuery(text){
 var s=norm(text),m=s.match(/\b((?:19|20)\d{2})\s+(\d{1,2})\s+(\d{1,2})\b/);
 if(m)return validDay(m[1],m[2],m[3]);
 var years=[...s.matchAll(/\b((?:19|20)\d{2})\b/g)];
 for(var j=0;j<years.length;j++){
  var year=years[j][1],tail=s.slice(years[j].index+4,years[j].index+50);
  for(var month in MONTHS){
   var mm=tail.match(new RegExp('^\\s*'+month+'\\s+(\\d{1,2})\\b'));
   if(mm){var result=validDay(year,MONTHS[month],mm[1]);if(result)return result}
  }
 }
 return null;
}
function datedMetadata(s){
 var date=String(s||''),m=date.match(/\b((?:19|20)\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/);
 if(m)return validDay(m[1],m[2],m[3]);
 return dateQuery(date);
}
function dateDistance(a,b){
 var x=Date.parse(String(a)+'T00:00:00Z'),y=Date.parse(String(b)+'T00:00:00Z');
 return Number.isFinite(x)&&Number.isFinite(y)?Math.round((x-y)/86400000):null;
}
function rank(docs,question,options){
 var q=norm(question),terms=words(question),deep=options&&options.mode==='deep';
 var desiredDate=dateQuery(question),history=!!(options&&options.historicalDateQuery);
 var chronology=history||/(korhaz|mento|omsz|ujraeleszt|intenziv|eszmelet|koma|tortenet|tortent|esemeny|idosor|kronolog|beultetes|mutet|szedal|emlekezet)/.test(q);
 var synonyms=[];
 if(/sziv|kardio|fibrill|ritmus|defibr|crt|pacemaker|ujraeleszt|szivmegall/.test(q))
  synonyms.push('sziv','szivmegall','kardi','ekg','crt','ritmus','defibr','osztaly','zaro','omsz');
 if(/koma|szedal|eszmelet|neurolog|emlekezet|intenziv|agy|felbreszt/.test(q))
  synonyms.push('intenziv','neurolog','szedal','eszmelet','anesthes','agy','epikr','zaro','mento');
 if(history) synonyms.push('mento','omsz','korhaz','intenziv','zaro','epikriz','ellatas','surgoss');
 if(/alvas|farad|kimerult/.test(q))synonyms.push('alvas','sleep');
 if(/bok|bokaj|labfej|ficam|randul/.test(q))synonyms.push('boka','bokaj','ficam','randul','szalag','ortoped');
 var yr=q.match(/\b(?:19|20)\d{2}\b/g)||[];
 var termsUnique=Array.from(new Set(terms.concat(synonyms))).slice(0,45);
 var max=options&&options.maxDocs|| (deep?16:8);
 return (docs||[]).filter(function(d){return d&&d.id&&d.title}).map(function(d){
  var explain=d.explanation||{};
  var title=norm([d.title,d.category,d.sourceType].join(' ')),description=norm([explain.summary,
   ...(Array.isArray(explain.keyFindings)?explain.keyFindings:[])].join(' '));
  var date=datedMetadata(d.date),titleDate=datedMetadata(d.title);
  var score=termsUnique.reduce(function(a,t){return a+
   (title.indexOf(t)>=0?6:0)+(description.indexOf(t)>=0?3:0)},0);
  if(chronology&&/(zaro|korhaz|intenziv|surgoss|surg|omsz|mento|anamnez|epikriz)/.test(title))score+=9;
  if(desiredDate){
   // A discharge summary dated 2–30 days AFTER the event is more
   // relevant than a distant outpatient record from the same year.
   var gap=dateDistance(date,desiredDate),titleGap=dateDistance(titleDate,desiredDate);
   if(gap!==null){
    score+=gap===0?125:gap>0&&gap<=14?78:gap>14&&gap<=45?44:
     gap<0&&gap>=-5?20:Math.abs(gap)<=70?12:0;
   }
   if(titleGap===0)score+=95;
   var dateLabel=desiredDate.replace(/-/g,'[.\\/-]?');
   if(explain.summary&&new RegExp(dateLabel).test(String(explain.summary)))score+=75;
  }else if(yr.some(function(y){return String(d.date||'').slice(0,4)===y})){
   score+=14;
  }
  return {d:d,score:score,chronologyGap:desiredDate?dateDistance(date,desiredDate):null};
 }).filter(function(x){return x.score>0}).sort(function(a,b){
  return b.score-a.score||
   (Math.abs(a.chronologyGap==null?1e6:a.chronologyGap)-
    Math.abs(b.chronologyGap==null?1e6:b.chronologyGap))||
   String(a.d.date||'').localeCompare(String(b.d.date||''));
 }).slice(0,max).map(function(x){return x.d});
}
function datePrecision(s){
 s=String(s||'').trim();
 if(/^\d{4}[-./]\d{1,2}[-./]\d{1,2}\.?(?:[T\s]\d{1,2}:\d{2})/.test(s))return'minute';
 if(/^\d{4}[-./]\d{1,2}[-./]\d{1,2}/.test(s))return'day';
 if(/^\d{4}[-./]\d{1,2}$/.test(s))return'month';
 if(/^\d{4}$/.test(s))return'year';
 return'unknown';
}
function dateMentions(text){
 var found=new Set(),raw=String(text||'');
 // Only possible calendar dates, not assumed injury dates.
 var patterns=[/\b(?:19|20)\d{2}[-./]\d{1,2}[-./]\d{1,2}\.?(?:[ T]\d{1,2}:\d{2})?/g,
  /\b\d{1,2}[-./]\d{1,2}[-./](?:19|20)\d{2}(?:\s+\d{1,2}:\d{2})?/g];
 patterns.forEach(function(rx){var match;while((match=rx.exec(raw))&&found.size<12)found.add(match[0])});
 return Array.from(found).slice(0,8);
}
function historicalText(e){
 // Treatment information is not interchangeable with diagnosis.
 // Preserve recommendations and original mention dates even in short AI packets.
 var parts=[
  e.summary?'Korábbi összefoglaló: '+String(e.summary).slice(0,1050):'',
  Array.isArray(e.keyFindings)&&e.keyFindings.length?'Leletmegállapítások: '+e.keyFindings.join('; ').slice(0,520):'',
  Array.isArray(e.meaning)&&e.meaning.length?'Értelmezés: '+e.meaning.join('; ').slice(0,310):'',
  Array.isArray(e.attention)&&e.attention.length?'A JSON értelmezés figyelmeztetései (nem feltétlen korábbi terápia): '+e.attention.join('; ').slice(0,480):''
 ];
 return parts.filter(Boolean).join(' · ').slice(0,2420);
}
function consentKey(p){return 'hh-ask-original-excerpts-allowed-v365-'+p}
function approved(p){try{return localStorage.getItem(consentKey(p))==='yes'}catch(e){return false}}
function syncIcon(){
 var b=el('hhAskDocuments365');if(!b)return;
 var on=approved(profile());
 b.textContent=on?'📚✓':'📚';
 b.title=on?'Eredeti PDF-kivonatok engedélyezve. Koppints a visszavonáshoz.':'Eredeti PDF-kivonatok kikapcsolva. Koppints az engedélyezéshez.';
 b.setAttribute('aria-label',b.title);
 b.setAttribute('aria-pressed',String(on));
}
function mount(){
 var comp=el('hhLenaComposer340');if(!comp)return;
 var host=comp.closest('.askCard')||comp.parentNode;
 host.style.position='relative';
 if(!el('hhAskDocuments365')){
  var b=document.createElement('button');b.id='hhAskDocuments365';b.type='button';
  b.style.cssText='position:absolute;top:8px;right:13px;z-index:4;border:1px solid var(--lena-ui-border,#c9dce7);border-radius:9px;background:#fff;font-size:13px;min-width:37px;height:30px;cursor:pointer';
  b.onclick=function(){
   var p=profile();
   if(approved(p)){
    localStorage.setItem(consentKey(p),'no');syncIcon();return;
   }
   var yes=window.confirm('Engedélyezed, hogy az Ask Léna a kérdéshez kapcsolódó eredeti egészségügyi PDF-ek rövid kivonatait elküldje az OpenAI elemzőnek? A teljes PDF nem kerül elküldésre. A beállítás később itt visszavonható.');
   if(yes)localStorage.setItem(consentKey(p),'yes');
   syncIcon();
  };
  host.appendChild(b);
 }
 syncIcon();
}
function status(msg){var e=el('hhAskEvidenceStatus364');if(e)e.textContent=msg||''}
async function pdfLib(){
 if(window.pdfjsLib&&window.pdfjsLib.getDocument)return window.pdfjsLib;
 if(!libPromise)libPromise=import(PDF).then(function(z){if(z.GlobalWorkerOptions)z.GlobalWorkerOptions.workerSrc=WORKER;return z});
 return libPromise;
}
function idbOriginal(id,p){
 return new Promise(function(resolve){
  var settled=false;
  function finish(v){if(!settled){settled=true;resolve(v)}}
  try{
   var r=indexedDB.open('healthhub-healthradar-v2',1);
   r.onerror=function(){finish({blob:null,reason:'local_db_unavailable'})};
   r.onsuccess=function(){
    var db=r.result;
    if(!db.objectStoreNames.contains('documentBlobs')||!db.objectStoreNames.contains('documents')){
     db.close();finish({blob:null,reason:'local_document_store_missing'});return;
    }
    var tx=db.transaction(['documents','documentBlobs'],'readonly'),metadata=null,blobs=null,ready=0;
    function done(){
     if(++ready!==2)return;
     db.close();
     if(!metadata){finish({blob:null,reason:'local_document_missing'});return}
     if(metadata.profile!==p){finish({blob:null,reason:'profile_mismatch'});return}
     finish({blob:blobs&&blobs.blob instanceof Blob?blobs.blob:null,
      reason:blobs&&blobs.blob instanceof Blob?'local_original':'local_pdf_missing'});
    }
    var m=tx.objectStore('documents').get(id),b=tx.objectStore('documentBlobs').get(id);
    m.onsuccess=function(){metadata=m.result;done()};
    b.onsuccess=function(){blobs=b.result;done()};
    m.onerror=b.onerror=function(){db.close();finish({blob:null,reason:'local_db_read_error'})};
   };
  }catch(e){finish({blob:null,reason:'local_db_unavailable'})}
 });
}
async function originalBlob(d,p){
 if(p!==profile())throw Error('Profilváltás: PDF-kutatás leállítva.');
 var local=await idbOriginal(d.id,p);
 if(local.reason==='profile_mismatch')return {blob:null,reason:'profile_mismatch'};
 if(local.blob&&local.blob.size<=15000000)return {blob:local.blob,reason:'local_original'};
 if(local.blob&&local.blob.size>15000000)return {blob:null,reason:'local_pdf_too_large'};
 // External originals are only ever fetched by the already explicitly
 // authorized same-profile Google Drive token. Dropbox structured vault
 // holds JSON records, NOT a verified mirror of original PDF files.
 var map=window.hhGetLenaArchiveMap294&&window.hhGetLenaArchiveMap294()||{};
 var archive=d.driveArchive||map[String(d.id)]||null;
 if(archive&&archive.profile&&archive.profile!==p)return {blob:null,reason:'profile_mismatch'};
 if(typeof window.hhGetGoogleDriveToken292!=='function')
  return {blob:null,reason:'google_drive_not_authorized'};
 var tok=null;
 try{tok=await window.hhGetGoogleDriveToken292(false)}catch(e){}
 if(!tok)return {blob:null,reason:'google_drive_reconnect_required'};
 if(p!==profile())throw Error('Profilváltás: PDF-kutatás leállítva.');
 try{
  var fileId=archive&&archive.fileId||'';
  if(!fileId){
   // The cross-device local archive map is not guaranteed to exist on
   // another browser. Search ONLY files explicitly created by the HealthHub
   // document archive and tagged for THIS document and THIS patient.
   var key=String(d.id||'');
   if(!/^[A-Za-z0-9-]{6,140}$/.test(key))
    return {blob:null,reason:local.reason||'drive_archive_locator_missing'};
   var q="trashed = false and appProperties has { key = 'documentId' and value = '"+key+
    "' } and appProperties has { key = 'profile' and value = '"+p+"' }";
   var list=await fetch('https://www.googleapis.com/drive/v3/files?spaces=drive&pageSize=10&fields=files(id,name,appProperties),nextPageToken&q='+encodeURIComponent(q),
    {headers:{Authorization:'Bearer '+tok},cache:'no-store'});
   if(!list.ok)return {blob:null,reason:list.status===401?'google_drive_reconnect_required':'drive_archive_search_failed'};
   var found=(await list.json()).files||[];
   var matched=found.find(function(x){
    return x&&x.id&&x.appProperties&&x.appProperties.profile===p&&x.appProperties.documentId===key;
   });
   if(!matched)return {blob:null,reason:'drive_archive_file_missing'};
   fileId=matched.id;
  }
  if(p!==profile())throw Error('Profilváltás: PDF-kutatás leállítva.');
  // Never trust only a locally cached Drive map ID. The remote metadata
  // must bind the file to the exact patient and clinical document.
  var metadataResult=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+
   '?fields=id,appProperties,mimeType,trashed',{headers:{Authorization:'Bearer '+tok},cache:'no-store'});
  if(!metadataResult.ok)return {blob:null,reason:'drive_archive_metadata_failed'};
  var metadata=await metadataResult.json();
  if(metadata.trashed||!metadata.appProperties||
    metadata.appProperties.profile!==p||metadata.appProperties.documentId!==String(d.id))
   return {blob:null,reason:'drive_archive_identity_mismatch'};
  if(p!==profile())throw Error('Profilváltás: PDF-kutatás leállítva.');
  var resp=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+'?alt=media',
   {headers:{Authorization:'Bearer '+tok},cache:'no-store'});
  if(!resp.ok)return {blob:null,reason:resp.status===403||resp.status===401?'google_drive_no_permission':'google_drive_unavailable'};
  var b=await resp.blob();
  if(b.size>15000000)return {blob:null,reason:'remote_pdf_too_large'};
  return {blob:b,reason:'authorized_google_drive'};
 }catch(e){return {blob:null,reason:'google_drive_download_failed'}}
}
async function extractText(d,question,p,plan){
 var checked=await originalBlob(d,p),blob=checked.blob;
 if(!blob)return {pages:[],reason:checked.reason};
 if(!/pdf/i.test(blob.type||'')&&!/\.pdf$/i.test(d.title||''))return {pages:[],reason:'not_pdf'};
 var pdf=null;
 try{
  var lib=await pdfLib(),buf=new Uint8Array(await blob.arrayBuffer());
  if(p!==profile())throw Error('Profilváltás: PDF-olvasás megszakítva.');
  pdf=await lib.getDocument({data:buf}).promise;
  var terms=words(question),yearMatch=String(question||'').match(/\b(?:19|20)\d{2}\b/g)||[];
  var limit=Math.min(pdf.numPages,plan&&plan.pagesPerDocument||12),candidates=[];
  for(var page=1;page<=limit;page++){
   if(p!==profile())throw Error('Profilváltás: PDF-olvasás megszakítva.');
   var obj=await pdf.getPage(page);
   var raw=(await obj.getTextContent()).items.map(function(x){return x.str||''}).join(' ').replace(/\s+/g,' ');
   if(raw.length<80)continue;
   var text=raw.slice(0,12000),n=norm(text);
   var score=terms.reduce(function(sum,t){return sum+(n.indexOf(t)>=0?2:0)},0);
   score+=yearMatch.some(function(y){return n.indexOf(y)>=0})?6:0;
   var requested=dateQuery(question),pageDates=dateMentions(raw);
   if(requested&&pageDates.some(function(t){return datedMetadata(t)===requested}))score+=50;
   if(/mento|omsz|cpr|rosc|fibrill|szedal|eszmelet|defibr|intenziv/.test(norm(question)))
    score+=(n.match(/cpr|rosc|fibrill|omsz|mento|intenziv|szedal|eszmelet|ujraeleszt|defibr/g)||[]).length;
   candidates.push({page:page,text:text.slice(0,plan&&plan.excerptMax||1950),score:score});
  }
  candidates.sort(function(a,b){return b.score-a.score||a.page-b.page});
  // Chronological reconstruction needs distinct records for each stage.
  var take=plan&&plan.chronology?1:plan&&plan.mode==='deep'?2:1;
  return {pages:candidates.slice(0,take),reason:candidates.length?'pdf_text_extracted':'no_searchable_pdf_text',
   scannedPages:limit,totalPages:pdf.numPages,origin:checked.reason};
 }catch(e){
  if(p!==profile())throw Error('Profilváltás: PDF-kutatás leállítva.');
  return {pages:[],reason:'pdf_read_failed'};
 }finally{if(pdf)try{pdf.destroy()}catch(e){}}
}
async function prepare(question,p,options){
 if(p!==profile())throw Error('Profilváltás miatt a leletkutatás megszakadt.');
 var planner=window.HH_DEEP_RESEARCH_V393;
 var plan=options&&options.plan||planner&&planner.decide(question)||{mode:'standard',documents:true,maxOriginalDocs:3,pagesPerDocument:12,excerptMax:1950};
 // Refresh the already-authorized local document index before research.
 if(typeof window.hhRefreshLenaHealthContext289==='function'){
  try{await window.hhRefreshLenaHealthContext289(p,'ask-lena-original-document-retrieval')}
  catch(e){console.warn('Leletindex nem frissíthető, helyi adatokból folytatjuk.')}
 }
 if(p!==profile())throw Error('Profilváltás: előzménykutatás megszakítva.');
 var ctx=window.hhGetLenaHealthContext289&&window.hhGetLenaHealthContext289(p);
 var empty={items:[],originals:0,summaries:0,originalConsent:approved(p),
  diagnostics:{matched:0,attempted:0,pagesScanned:0,missing:[],status:'no_context'}};
 if(!ctx||ctx.profile!==p)return empty;
 if(!plan.documents){empty.diagnostics.status='non_document_question';return empty}
 var scoped=(ctx.documents&&ctx.documents.index||[]).filter(function(d){return d&&(!d.profile||d.profile===p)});
 var docs=rank(scoped,question,plan),allowed=approved(p);
 var targetDate=dateQuery(question),inventory=docs.slice(0,10).map(function(d){
  var documentDate=d.dateSource==='upload'?'':datedMetadata(d.date);
  return {documentId:String(d.id),title:field(d.title).slice(0,105),
   date:documentDate||'',kind:field(d.category||'').slice(0,45),
   summaryAvailable:!!d.explanation,originalFileAvailable:'not_checked',
   nearTarget:!!(targetDate&&documentDate&&
    dateDistance(documentDate,targetDate)>=0&&dateDistance(documentDate,targetDate)<=45)};
 });
 var originals=[],summaries=[],reasons=[],attempted=0,pagesScanned=0;
 if(allowed){
  // Bounded work, but inspect more than the old top-three PDFs. Each doc
  // may contribute two page-level records, maximum eight evidence items.
  for(var i=0;i<Math.min(docs.length,plan.maxOriginalDocs||3);i++){
   if(p!==profile())throw Error('Profilváltás: leletkutatás leállítva.');
   status('📚 Eredeti PDF-ek keresése: '+(i+1)+'/'+Math.min(docs.length,plan.maxOriginalDocs||3));
   attempted++;
   var extraction=await extractText(docs[i],question,p,plan);
   pagesScanned+=extraction.scannedPages||0;
   if(!extraction.pages||!extraction.pages.length){
    reasons.push(extraction.reason||'unavailable_original');continue;
   }
   extraction.pages.forEach(function(page){
    if(originals.length>=6)return;
    if(!page||!page.page||!page.text||page.text.length<80)return;
    originals.push({
     type:'original_pdf_extract',documentId:String(docs[i].id),title:field(docs[i].title),
     date:docs[i].dateSource==='upload'?'':field(docs[i].date),
     datePrecision:docs[i].dateSource==='upload'?'unknown':datePrecision(docs[i].date),
     uploadDate:docs[i].uploadedAt?String(docs[i].uploadedAt).slice(0,35):'',
     datesMentioned:dateMentions([docs[i].title||'',page.text].join(' ')),
     page:page.page,text:page.text.slice(0,plan.excerptMax||1950)
    });
   });
   if(originals.length>=6)break;
  }
 }else if(docs.length){
  reasons.push('original_pdf_consent_disabled');
 }
 // The original excerpts go first. Historical assistant summaries are
 // secondary and cannot silently crowd out all genuine PDF pages.
 // Search across the complete ranked candidate set for prior explanations;
 // the first eight matching original-file references may have no summary.
 docs.filter(function(d){return !!d.explanation}).slice(0,12).forEach(function(d){
  var e=d.explanation;
  if(!e)return;
  var v=historicalText(e);if(!v)return;
  summaries.push({
   type:'json_summary',documentId:String(d.id),title:field(d.title),
   date:d.dateSource==='upload'?'':field(d.date),
   datePrecision:d.dateSource==='upload'?'unknown':datePrecision(d.date),
   uploadDate:d.uploadedAt?String(d.uploadedAt).slice(0,35):'',
   datesMentioned:dateMentions([d.title||'',v].join(' ')),
   text:v.slice(0,plan.mode==='deep'?1900:1550)
  });
 });
 var items=originals.concat(summaries.slice(0,Math.max(0,8-originals.length))).slice(0,8);
 var countSummaries=items.filter(function(x){return x.type==='json_summary'}).length;
 var reasonsByCode={};
 reasons.forEach(function(r){reasonsByCode[r]=(reasonsByCode[r]||0)+1});
 status('');
 return {items:items,originals:originals.length,summaries:countSummaries,originalConsent:allowed,
  inventory:inventory,requestedDate:targetDate||'',
  diagnostics:{matched:docs.length,totalIndexed:scoped.length,
   attempted:attempted,pagesScanned:pagesScanned,rankedWithExplanation:docs.filter(function(d){return!!d.explanation}).length,
   reasonsByCode:reasonsByCode,requestedDate:targetDate||'',
   missing:reasons.slice(0,8),status:!allowed?'no_original_consent':
    originals.length?'original_pages_available':'original_pages_unavailable',
   planMode:plan.mode,
   locallyAvailable:originals.length>0}};
}
window.addEventListener('healthhub:ask-lena-open',function(){mount();status('')});
window.addEventListener('healthhub:profile-changed',function(){syncIcon();status('')});
window.HH_ASK_LENA_EVIDENCE_V364={prepare:prepare,rank:rank,dateQuery:dateQuery,
 dateMentions:dateMentions,datePrecision:datePrecision,version:'396-dated-chronology'};
})();
