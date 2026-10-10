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
 terms=terms.concat(synonyms);
 return (docs||[]).map(function(d){
  var name=norm(d.title||''),summary=norm(d.explanation&&d.explanation.summary||''),findings=norm((d.explanation&&d.explanation.keyFindings||[]).join(' '));
  var score=terms.reduce(function(a,t){return a+(name.includes(t)?6:0)+(summary.includes(t)?3:0)+(findings.includes(t)?2:0)},0);
  return {d:d,score:score};
 }).filter(function(x){return x.score>=3}).sort(function(a,b){return b.score-a.score||String(b.d.date||'').localeCompare(String(a.d.date||''))}).slice(0,5).map(function(x){return x.d});
}
function mount(){
 var comp=el('hhLenaComposer340');if(!comp)return;
 if(el('hhAskOriginal364'))return;
 var card=document.createElement('label');card.id='hhAskOriginal364';
 card.style.cssText='display:flex;gap:9px;align-items:flex-start;margin:9px 1px 4px;padding:9px;border:1px solid var(--lena-ui-border,#c9dce7);border-radius:12px;background:var(--lena-ui-soft,#f0f8ff);font:11px/1.45 system-ui;color:#395c70';
 var tick=document.createElement('input');tick.type='checkbox';tick.id='hhAskOriginalCheckbox364';
 tick.style.cssText='width:18px;height:18px;margin:1px 0;flex:0 0 18px;accent-color:var(--lena-ui,#387bb3)';
 var note=document.createElement('span');
 note.textContent='📚 Eredeti leletek releváns szövegrészleteinek bevonása a válaszba (OpenAI-nak elküldve). Csak akkor, ha ezt külön bepipálod; a teljes PDF nem kerül elküldésre.';
 card.append(tick,note);comp.insertAdjacentElement('afterend',card);
 var status=document.createElement('p');status.id='hhAskEvidenceStatus364';status.style.cssText='font:10px/1.5 system-ui;color:#607c90;margin:3px 6px';card.insertAdjacentElement('afterend',status);
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
 var ctx=window.hhGetLenaHealthContext289&&window.hhGetLenaHealthContext289(p);
 if(!ctx||ctx.profile!==p)return {items:[],originals:0,summaries:0};
 var docs=rank(ctx.documents&&ctx.documents.index,question),allowed=!!(el('hhAskOriginalCheckbox364')&&el('hhAskOriginalCheckbox364').checked),items=[];
 // JSON explanations are already HealthHub data; their provenance is explicitly labelled.
 docs.forEach(function(d){
  var e=d.explanation||null;if(!e)return;
  var v=[e.summary||'',(e.keyFindings||[]).join('; '),(e.meaning||[]).join('; ')].filter(Boolean).join(' · ').slice(0,2350);
  if(v)items.push({type:'json_summary',documentId:String(d.id||''),title:field(d.title),date:field(d.date),text:v});
 });
 var originalCount=0;
 if(allowed){
  for(var i=0;i<Math.min(docs.length,3);i++){
   if(p!==profile())throw Error('Profilváltás: leletolvasás leállítva.');
   status('📚 Eredeti leletek ellenőrzése: '+(i+1)+'/'+Math.min(docs.length,3));
   var full=await extractText(docs[i],question);
   if(full&&full.text.length>=80){
    items.push({type:'original_pdf_extract',documentId:String(docs[i].id||''),title:field(docs[i].title),date:field(docs[i].date),page:full.page,text:full.text.slice(0,2200)});
    originalCount++;
   }
  }
 }
 status('📚 '+Math.min(items.length-originalCount,5)+' JSON-leletösszefoglaló · '+originalCount+' ellenőrzött eredeti PDF-részlet. '+(allowed?'A kivonatot elküldöm az AI-nak.':'Eredeti PDF-et nem küldök.'));
 return {items:items.slice(0,8),originals:originalCount,summaries:items.length-originalCount,originalConsent:allowed};
}
window.addEventListener('healthhub:ask-lena-open',function(){mount();status('📚 A leletösszefoglalókat kérdés alapján választom ki. Az eredeti PDF külön engedélyes.')});
window.addEventListener('healthhub:profile-changed',function(){var c=el('hhAskOriginalCheckbox364');if(c)c.checked=false;status('')});
window.HH_ASK_LENA_EVIDENCE_V364={prepare:prepare};
})();
