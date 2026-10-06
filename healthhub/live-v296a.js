(function(){
'use strict';
/* HealthHub v1.296a — Document Retrieval Engine.
   Reads only ranked Drive documents, sequentially, extracts PDF text, builds compact research bundle. */
var REQ='hh-lena-research-v295-last';
var BUNDLE='hh-lena-research-v296-bundle';
var BFID='hh-lena-research-v296-drive-id';
var PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
var PDFJS_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
var MAX_DOCS=5,MAX_DOC_CHARS=50000,MAX_TOTAL_CHARS=180000;
var pdfjsPromise=null,running=false;

function read(k,d){try{return JSON.parse(localStorage.getItem(k)||'null')||d}catch(e){return d}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
function trim(s,n){s=String(s||'').replace(/\u0000/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();return s.length>n?s.slice(0,n)+'\n[TRUNCATED]':s}
function emit(type,detail){try{window.dispatchEvent(new CustomEvent(type,{detail:detail||{}}))}catch(e){}}
async function token(interactive){
 if(typeof window.hhGetGoogleDriveToken292!=='function')throw Error('Google Drive kapcsolat nem érhető el.');
 return await window.hhGetGoogleDriveToken292(!!interactive);
}
async function gfetch(url,opt,interactive){
 var t=await token(!!interactive);opt=opt||{};opt.headers=Object.assign({},opt.headers||{},{Authorization:'Bearer '+t});
 var r=await fetch(url,opt);
 if(r.status===401&&interactive===false){t=await token(true);opt.headers.Authorization='Bearer '+t;r=await fetch(url,opt)}
 return r;
}
async function pdfjs(){
 if(window.pdfjsLib&&window.pdfjsLib.getDocument)return window.pdfjsLib;
 if(pdfjsPromise)return pdfjsPromise;
 pdfjsPromise=import(PDFJS_URL).then(function(lib){if(lib&&lib.GlobalWorkerOptions)lib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;window.pdfjsLib=lib;return lib}).catch(function(e){pdfjsPromise=null;throw e});
 return pdfjsPromise;
}
async function fileMeta(id){
 var r=await gfetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,size,modifiedTime,webViewLink',{},false);
 if(!r.ok)throw Error('Drive metaadat hiba ('+r.status+')');
 return await r.json();
}
async function fileBytes(id){
 var r=await gfetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media',{},false);
 if(!r.ok)throw Error('Drive dokumentum letöltési hiba ('+r.status+')');
 return await r.arrayBuffer();
}
async function pdfText(buf){
 var lib=await pdfjs(),pdf=await lib.getDocument({data:new Uint8Array(buf)}).promise,parts=[],chars=0,pages=pdf.numPages;
 for(var i=1;i<=pages;i++){
  var page=await pdf.getPage(i),tc=await page.getTextContent(),line=tc.items.map(function(x){return x.str||''}).join(' ').replace(/\s+/g,' ').trim();
  if(line){var chunk='[Page '+i+']\n'+line+'\n';parts.push(chunk);chars+=chunk.length}
  try{page.cleanup()}catch(e){}
  if(chars>=MAX_DOC_CHARS)break;
 }
 try{pdf.cleanup()}catch(e){}try{pdf.destroy()}catch(e){}
 return{pages:pages,text:trim(parts.join('\n'),MAX_DOC_CHARS)};
}
async function extract(doc,index,total,currentChars){
 var ar=doc&&doc.driveArchive,id=ar&&ar.fileId;
 if(!id)return{status:'missing-drive-file',document:doc,text:'',needsOcr:false};
 emit('healthhub:lena-retrieval-progress',{index:index,total:total,title:doc.title,status:'fetching'});
 var meta=await fileMeta(id),buf=await fileBytes(id),res={pages:null,text:''};
 var mime=String(meta.mimeType||'').toLowerCase(),name=String(meta.name||doc.title||'');
 if(mime==='application/pdf'||/\.pdf$/i.test(name)){
  res=await pdfText(buf);
 }else if(/^text\//.test(mime)||/json/.test(mime)){
  res.text=trim(new TextDecoder().decode(buf),MAX_DOC_CHARS);
 }else{
  return{status:'unsupported',document:doc,file:{id:id,name:name,mimeType:mime,webViewLink:meta.webViewLink||null},text:'',needsOcr:false};
 }
 var remain=Math.max(0,MAX_TOTAL_CHARS-currentChars);
 res.text=trim(res.text,Math.min(MAX_DOC_CHARS,remain));
 var o={
  status:res.text.length>=80?'ok':'no-searchable-text',
  document:{id:doc.id,date:doc.date,category:doc.category,title:doc.title,score:doc.score},
  file:{id:id,name:name,mimeType:mime,size:meta.size||null,modifiedTime:meta.modifiedTime||null,webViewLink:meta.webViewLink||null},
  pages:res.pages,text:res.text,chars:res.text.length,needsOcr:res.text.length<80
 };
 emit('healthhub:lena-retrieval-progress',{index:index,total:total,title:doc.title,status:o.status,chars:o.chars});
 buf=null;return o;
}
async function saveDrive(bundle,interactive){
 var t=await token(!!interactive),id=localStorage.getItem(BFID)||'',name='HealthHub-Lena-Research-Bundle.json';
 if(!id){
  var cr=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({name:name,mimeType:'application/json',description:'Private HealthHub Léna research bundle with extracted source text',appProperties:{healthhub:'lena-research-bundle',schema:'1.0'}})});
  if(!cr.ok)throw Error('Research bundle fájl létrehozási hiba ('+cr.status+')');
  id=(await cr.json()).id;localStorage.setItem(BFID,id);
 }
 var up=await fetch('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,name,modifiedTime,webViewLink',{method:'PATCH',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json; charset=UTF-8'},body:JSON.stringify(Object.assign({},bundle,{driveMirror:{mirroredAt:new Date().toISOString(),filename:name}}))});
 if(up.status===404){localStorage.removeItem(BFID);return saveDrive(bundle,interactive)}
 if(!up.ok)throw Error('Research bundle Drive sync hiba ('+up.status+')');
 var j=await up.json();bundle.driveMirror={fileId:j.id,fileName:j.name,modifiedTime:j.modifiedTime,webViewLink:j.webViewLink||null};write(BUNDLE,bundle);return bundle;
}
async function prepare(packet,interactive){
 if(running)return running;
 packet=packet||read(REQ,null);if(!packet)throw Error('Nincs v295 kutatási terv.');
 var cand=(packet.route&&packet.route.candidateDocuments||[]).filter(function(x){return x&&x.driveArchive&&x.driveArchive.fileId}).slice(0,MAX_DOCS);
 if(!cand.length)throw Error('A v295 nem adott Drive-on elérhető dokumentum-jelöltet.');
 running=(async function(){
  var out=[],chars=0,failed=0;
  emit('healthhub:lena-retrieval-start',{total:cand.length,question:packet.question});
  for(var i=0;i<cand.length;i++){
   if(chars>=MAX_TOTAL_CHARS)break;
   try{var x=await extract(cand[i],i+1,cand.length,chars);out.push(x);chars+=x.chars||0;if(x.status!=='ok')failed++}
   catch(e){failed++;out.push({status:'error',document:cand[i],text:'',needsOcr:false,error:String(e&&e.message||e)});emit('healthhub:lena-retrieval-progress',{index:i+1,total:cand.length,title:cand[i].title,status:'error',error:String(e&&e.message||e)})}
  }
  var c=null;try{c=typeof window.hhGetLenaHealthContext289==='function'?window.hhGetLenaHealthContext289(packet.profile):null}catch(e){}
  var bundle={
   schema:'healthhub.lena.research-bundle/1.0',createdAt:new Date().toISOString(),
   profile:packet.profile,profileName:packet.profileName,question:packet.question,route:packet.route,
   healthContext:{generatedAt:c&&c.generatedAt||null,summary:c&&c.summary||null,signals:c&&c.signals||[],metrics:c&&c.metrics||null,sleep:c&&c.sleep||null,activity:c&&c.activity||null,heartRate:c&&c.heartRate||null,medications:c&&c.medications||[]},
   retrieval:{requested:cand.length,retrieved:out.length,failed:failed,totalExtractedChars:chars,maxDocuments:MAX_DOCS,maxDocumentChars:MAX_DOC_CHARS,maxTotalChars:MAX_TOTAL_CHARS,documents:out},
   answerRules:[
    'Elsődleges forrásként az extracted original document text mezőket használd.',
    'A Health Context friss méréseit dátummal együtt értékeld; a latest nem jelent automatikusan frisset.',
    'Ha egy dokumentumnál needsOcr=true, ne állíts olyan részletet, amely csak abból lenne igazolható.',
    'Különítsd el a dokumentált tényt, az orvosi értelmezést és a bizonytalan összefüggést.',
    'A válasz végén sorold fel a ténylegesen felhasznált dokumentumok címét és dátumát.'
   ]
  };
  write(BUNDLE,bundle);
  bundle=await saveDrive(bundle,interactive!==false);
  emit('healthhub:lena-retrieval-complete',{bundle:bundle});
  return bundle;
 })().finally(function(){running=false});
 return running;
}
window.hhPrepareLenaResearchBundle296=function(packet,interactive){return prepare(packet,interactive)};
window.hhGetLenaResearchBundle296=function(){return read(BUNDLE,null)};
document.documentElement.dataset.healthhubLenaRetrievalCore='1.296';
})();