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
function rank(docs,question){
 var terms=words(question),synonyms=[];
 var q=norm(question);
 if(/fej|migren|szedul|headach/.test(q))synonyms.push('fej','migr','neurolog','vernyomas');
 if(/sziv|mellkas|ritmus|pulzus|kardio|crt|defibr/.test(q))synonyms.push('kardio','sziv','ekg','crt','ritmus');
 if(/alvas|alud|farad|kimerult/.test(q))synonyms.push('alvas','sleep','apno');
 // Hungarian inflections: bokám/bokája ≠ 'boka' as a literal search token.
 // Include both injury records when multiple ankle sprains occurred in one year.
 if(/bok|bokaj|labfej|ficam|randul|kibicsak|bokaszalag/.test(q))
  synonyms.push('boka','bokaj','ficam','randul','kibicsak','szalag','rogzit','gipsz','ortoped','rontgen');
 terms=terms.concat(synonyms);
 return (docs||[]).map(function(d){
  var explain=d.explanation||{};
  var name=norm(d.title||''),summary=norm(explain.summary||''),
   findings=norm([...(Array.isArray(explain.keyFindings)?explain.keyFindings:[]),
    ...(Array.isArray(explain.meaning)?explain.meaning:[]),
    ...(Array.isArray(explain.attention)?explain.attention:[])].join(' '));
  var score=terms.reduce(function(a,t){return a+(name.includes(t)?6:0)+(summary.includes(t)?3:0)+(findings.includes(t)?2:0)},0);
  return {d:d,score:score};
 }).filter(function(x){return x.score>=3}).sort(function(a,b){return b.score-a.score||String(b.d.date||'').localeCompare(String(a.d.date||''))}).slice(0,8).map(function(x){return x.d});
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
function idbBlob(id){
 return new Promise(function(ok){
  try{
   var r=indexedDB.open('healthhub-healthradar-v2',1);
   r.onerror=function(){ok(null)};
   r.onsuccess=function(){
    var db=r.result;
    if(!db.objectStoreNames.contains('documentBlobs')){db.close();ok(null);return}
    var q=db.transaction('documentBlobs','readonly').objectStore('documentBlobs').get(id);
    q.onsuccess=function(){var x=q.result;db.close();ok(x&&x.blob||null)};
    q.onerror=function(){db.close();ok(null)};
   }
  }catch(e){ok(null)}
 });
}
async function originalBlob(d){
 var local=await idbBlob(d.id);if(local instanceof Blob)return local;
 var map=window.hhGetLenaArchiveMap294&&window.hhGetLenaArchiveMap294()||{};
 var archive=d.driveArchive||map[String(d.id)]||null;
 if(!archive||!archive.fileId||typeof window.hhGetGoogleDriveToken292!=='function')return null;
 var tok=await window.hhGetGoogleDriveToken292(false); // Never display OAuth account chooser here.
 var res=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(archive.fileId)+'?alt=media',
   {headers:{Authorization:'Bearer '+tok},cache:'no-store'});
 if(!res.ok)return null;
 var buf=await res.blob();return buf.size<=10000000?buf:null;
}
async function extractText(d,question){
 var blob=await originalBlob(d);
 if(!blob||blob.size>10000000||!(blob.type==='application/pdf'||/\.pdf$/i.test(d.title||'')))return null;
 var pdf=null;
 try{
  var lib=await pdfLib();pdf=await lib.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;
  var terms=words(question),best=null,bestScore=-1;
  for(var page=1;page<=Math.min(pdf.numPages,12);page++){
   var obj=await pdf.getPage(page),raw=(await obj.getTextContent()).items.map(function(x){return x.str||''}).join(' ').replace(/\s+/g,' ');
   var txt=raw.slice(0,3800);if(txt.length<80)continue;
   var lower=norm(txt),score=terms.reduce(function(a,t){return a+(lower.includes(t)?1:0)},0);
   if(score>bestScore){bestScore=score;best={text:txt.slice(0,2200),page:page}};
   if(score>=5)break;
  }
  return best;
 }catch(e){return null}
 finally{if(pdf)try{pdf.destroy()}catch(e){}}
}
async function prepare(question,p){
 if(p!==profile())throw Error('Profilváltás miatt a leletkutatás megszakadt.');
 // Refresh IndexedDB-backed provenance before researching historical medical dates.
 if(typeof window.hhRefreshLenaHealthContext289==='function'){
  try{await window.hhRefreshLenaHealthContext289(p,'ask-lena-date-precision')}
  catch(e){console.warn('Leletindex frissítés nem sikerült:',e)}
 }
 if(p!==profile())throw Error('Profilváltás: előzménykutatás megszakítva.');
 var ctx=window.hhGetLenaHealthContext289&&window.hhGetLenaHealthContext289(p);
 if(!ctx||ctx.profile!==p)return {items:[],originals:0,summaries:0};
 var docs=rank(ctx.documents&&ctx.documents.index,question),
  allowed=approved(p),items=[];
 // JSON explanations are already HealthHub data; their provenance is explicitly labelled.
 docs.slice(0,5).forEach(function(d){
  var e=d.explanation||null;if(!e)return;
  var v=historicalText(e);
  if(v)items.push({
   type:'json_summary',documentId:String(d.id||''),title:field(d.title),
   date:d.dateSource==='upload'?'':field(d.date),
   datePrecision:d.dateSource==='upload'?'unknown':datePrecision(d.date),
   uploadDate:d.uploadedAt?String(d.uploadedAt).slice(0,35):'',
   datesMentioned:dateMentions([d.title||'',v].join(' ')),
   text:v
  });
 });
 var originalCount=0;
 if(allowed){
  for(var i=0;i<Math.min(docs.length,3);i++){
   if(p!==profile())throw Error('Profilváltás: leletolvasás leállítva.');
   status('📚 Eredeti leletek ellenőrzése: '+(i+1)+'/'+Math.min(docs.length,3));
   var full=null;
   try{full=await extractText(docs[i],question)}catch(e){console.warn('Eredeti PDF nem olvasható:',e)}
   if(full&&full.text.length>=80){
    items.push({
     type:'original_pdf_extract',documentId:String(docs[i].id||''),title:field(docs[i].title),
     date:docs[i].dateSource==='upload'?'':field(docs[i].date),
     datePrecision:docs[i].dateSource==='upload'?'unknown':datePrecision(docs[i].date),
     uploadDate:docs[i].uploadedAt?String(docs[i].uploadedAt).slice(0,35):'',
     datesMentioned:dateMentions([docs[i].title||'',full.text].join(' ')),
     page:full.page,text:full.text.slice(0,2200)
    });
    originalCount++;
   }
  }
 }
 status('');
 return {items:items.slice(0,8),originals:originalCount,summaries:items.length-originalCount,originalConsent:allowed};
}
window.addEventListener('healthhub:ask-lena-open',function(){mount();status('')});
window.addEventListener('healthhub:profile-changed',function(){syncIcon();status('')});
window.HH_ASK_LENA_EVIDENCE_V364={prepare:prepare,rank:rank,dateMentions:dateMentions,datePrecision:datePrecision};
})();
