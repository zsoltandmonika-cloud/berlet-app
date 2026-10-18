(function(){
'use strict';
/* v407 background-on-open ingestion. Patient data only sent via existing
 * authenticated HealthHub profile vault, NEVER to public GitHub or analytics.
 */
var API='https://www.googleapis.com/drive/v3/files';
var PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
var PDFWORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
var TESS='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
var CORE=window.HH_KB_CORE_V407,st={running:false,stop:false,done:0,total:0,error:'',current:'',last:null},
 pdfLibPromise=null,ocrWorker=null,ocrLoader=null,folderCache={},listeners=[];
function profile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function active(p){if(p!==profile())throw Error('Profilváltás: a feldolgozás leállt.');
 var service=window.HH_DAILY_HEALTH_SYNC_V319,auth=service&&service.getStatus&&service.getStatus();
 if(!service||!auth||!auth.authenticated)throw Error('Előbb lépj be a Központi Health Vaultba.');
 if(auth.authorizedProfiles&&!auth.authorizedProfiles.includes(p))throw Error('A profil nem engedélyezett.');
 return service}
function emit(){var detail={running:st.running,stop:st.stop,done:st.done,total:st.total,
 current:st.current,error:st.error,last:st.last};
 window.dispatchEvent(new CustomEvent('healthhub:kb-progress',{detail:detail}));
}
function title(s){return String(s||'').slice(0,340)}
function escapeQuery(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
async function drive(url,options,p){
 active(p);var get=window.hhGetGoogleDriveToken292;
 if(typeof get!=='function')throw Error('Google Drive csatlakozás szükséges.');
 var token=await get(false);if(!token)throw Error('A Google Drive csatlakozás lejárt.');
 active(p);var r=await fetch(url,Object.assign({cache:'no-store'},options||{},{
 headers:Object.assign({},options&&options.headers||{},{Authorization:'Bearer '+token})
 }));
 if(!r.ok)throw Error('Google Drive HTTP '+r.status);
 return r;
}
async function filesByQuery(q,p,fields,one){
 var out=[],page='';
 do{
  var params=new URLSearchParams({q:q,spaces:'drive',fields:fields||'nextPageToken,files(id,name,mimeType,size,modifiedTime,md5Checksum,appProperties,parents)',pageSize:'1000'});
  if(page)params.set('pageToken',page);
  var response=await drive(API+'?'+params.toString(),{},p),data=await response.json();
  out.push(...(data.files||[]));page=data.nextPageToken||'';
  if(one)break;
 }while(page&&out.length<5000);
 return out;
}
async function archiveFolder(p){
 if(folderCache[p])return folderCache[p];
 var key='hh-lena-doc-drive-v294-'+p+'-folder';
 var id='';
 // Cached folder IDs alone cannot establish profile identity; verify by parent lookup.
 // Read existing archive only. Never create a new folder during ingestion.
 var roots=await filesByQuery("name='HealthHub Lena Archive' and mimeType='application/vnd.google-apps.folder' and trashed=false",p,null,true);
 if(roots.length!==1)throw Error('A Drive HealthHub-archívummappája nem egyértelmű. Előbb ellenőrizd az archívumot.');
 var name=p==='monika'?'Monika':'Zsolt';
 var folders=await filesByQuery("name='"+name+"' and '"+escapeQuery(roots[0].id)+"' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",p,null,true);
 if(folders.length!==1)throw Error('A profilhoz tartozó Drive-mappa nem egyértelmű.');
 id=folders[0].id;folderCache[p]=id;
 try{localStorage.setItem(key,id)}catch(_){}
 return id;
}
async function listFiles(p){
 var folder=await archiveFolder(p);
 var q="'"+escapeQuery(folder)+"' in parents and mimeType='application/pdf' and trashed=false";
 var rows=await filesByQuery(q,p);
 return rows.filter(x=>x&&x.id&&x.mimeType==='application/pdf'&&(!x.appProperties?.profile||x.appProperties.profile===p))
 .map(x=>({id:x.id,name:title(x.name),size:Number(x.size)||null,modified:x.modifiedTime||null,
  documentId:x.appProperties&&x.appProperties.documentId||null,parent:folder,sha256:x.appProperties&&x.appProperties.sha256||null}));
}
async function blobFor(file,p){
 active(p);
 const id=encodeURIComponent(file.id);
 // Verify the file still resides under the authorized patient archive folder.
 var metaResp=await drive(API+'/'+id+'?fields=id,name,mimeType,size,parents,appProperties,modifiedTime',{},p);
 var m=await metaResp.json(),folder=await archiveFolder(p);
 if(m.mimeType!=='application/pdf'||!Array.isArray(m.parents)||!m.parents.includes(folder)||
    m.appProperties&&m.appProperties.profile&&m.appProperties.profile!==p)
  throw Error('A dokumentum archív/profil-azonossága nem ellenőrizhető.');
 if(Number(m.size)>25000000)throw Error('25 MB feletti PDF: külön feldolgozás szükséges.');
 var response=await drive(API+'/'+id+'?alt=media',{},p);
 var bytes=await response.arrayBuffer();
 if(Number(m.size)!==bytes.byteLength||file.size!=null&&Number(file.size)!==bytes.byteLength||
    (file.modified&&Date.parse(file.modified)!==Date.parse(m.modifiedTime||'')))
  throw Error('Az eredeti PDF a leltár óta módosult, vagy a letöltés hiányos. Új audit szükséges.');
 if(!CORE.isPdfSignature(new Uint8Array(bytes)))
  throw Error('A fájl nem érvényes PDF.');
 return bytes;
}
async function hash(bytes){
 if(!crypto||!crypto.subtle)throw Error('SHA-256 ellenőrzéshez HTTPS szükséges.');
 return CORE.checksumBytes(await crypto.subtle.digest('SHA-256',bytes));
}
async function pdfjs(){
 if(pdfLibPromise)return pdfLibPromise;
 pdfLibPromise=import(PDFJS).then(lib=>{lib.GlobalWorkerOptions.workerSrc=PDFWORKER;return lib})
 .catch(e=>{pdfLibPromise=null;throw e});
 return pdfLibPromise;
}
async function readDocuments(p){
 return await active(p).request('/rest/v1/hh_kb_documents?select=id,profile_key,source_file_id,source_modified_at,size_bytes,sha256,status,total_pages,pages_indexed,duplicate_of,visual_pages,source_class,classification_status,mkb_source_id,extracted_characters,stored_characters,pages_verified,text_integrity_status&profile_key=eq.'+p+'&limit=1000',{method:'GET'});
}

function rawText(items){
 // Preserve the complete Unicode text layer and PDF.js line boundaries.
 // Do not compress spaces or drop punctuation from medical tables.
 return (items||[]).map(x=>(typeof x.str==='string'?x.str:'')+(x.hasEOL?'\n':' ')).join('')
  .replace(/\r/g,'').trim();
}
function flags(page,lib){
 var ops=page&&page.fnArray||[],o=lib.OPS||{},images=0,paths=0;
 var imageOps=[o.paintImageXObject,o.paintInlineImageXObject,o.paintJpegXObject,
  o.paintImageXObjectRepeat,o.paintInlineImageXObjectGroup];
 ops.forEach(k=>{if(imageOps.includes(k))images++;if(k===o.constructPath)paths++});
 return {images:images,paths:paths};
}
async function loadOcr(){
 if(ocrWorker)return ocrWorker;
 if(!ocrLoader)ocrLoader=(async function(){
  if(!window.Tesseract){
   await new Promise((resolve,reject)=>{
    var el=document.createElement('script');el.src=TESS;el.async=true;
    el.onload=resolve;el.onerror=()=>reject(Error('A magyar OCR betöltése sikertelen.'));
    document.head.appendChild(el);
   });
  }
  // OCR runs locally in the browser: only language models are downloaded.
  // No page images sent to a third-party OCR API.
  ocrWorker=await window.Tesseract.createWorker('hun+eng',1);
  return ocrWorker;
 })().catch(e=>{ocrLoader=null;throw e});
 return ocrLoader;
}
async function canvasPage(page){
 var start=page.getViewport({scale:1}),factor=Math.min(2.4,3000/start.width,4000/start.height);
 var first=Math.max(1,factor),lastError;
 // Samsung Watch ECG PDFs often have thousands of vector drawing operations.
 // Retry on smaller canvases on memory-constrained Android, without truncating graphics.
 for(const scale of [...new Set([first,Math.min(first,1.65),Math.min(first,1.15)])]){
  var canvas=null;
  try{
   var viewport=page.getViewport({scale:scale});
   canvas=document.createElement('canvas');canvas.width=Math.round(viewport.width);
   canvas.height=Math.round(viewport.height);
   if(canvas.width*canvas.height>12000000)throw Error('Túl nagy képfelület.');
   var ctx=canvas.getContext('2d',{alpha:false});
   if(!ctx)throw Error('A dokumentum-képrenderelő nem elérhető.');
   await page.render({canvasContext:ctx,viewport:viewport}).promise;
   canvas.hhRenderedScale=scale;
   return canvas;
  }catch(e){lastError=e;clearCanvas(canvas)}
 }
 var error=new Error('Az oldal képi renderelése mindhárom minőségi szinten sikertelen.');
 error.cause=lastError;
 throw error;
}
function png(canvas){
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Képkivonat nem hozható létre.')),'image/png'));
}
function clearCanvas(canvas){
 if(canvas){canvas.width=0;canvas.height=0}
}
function srcClass(name){
 return CORE.classify(name).sourceClass;
}
async function sourceFor(p,file,sha){
 var svc=active(p);
 var query='/rest/v1/hh_mkb_sources?select=id,profile_key,source_version,origin_ref,original_bytes,original_observed_at,sha256,parse_status,duplicate_of'+
  '&profile_key=eq.'+encodeURIComponent(p)+'&origin=eq.google_drive&origin_ref=eq.'+
  encodeURIComponent(file.id)+'&order=source_version.desc&limit=1';
 var rows=await svc.request(query,{method:'GET'}),s=rows&&rows[0];
 if(s){
  if(s.profile_key!==p||s.origin_ref!==file.id||
     (s.original_bytes!==null&&Number(s.original_bytes)!==Number(file.size))||
     (s.sha256&&s.sha256!==sha)||
     (s.original_observed_at&&file.modified&&Date.parse(s.original_observed_at)!==Date.parse(file.modified)))
   throw Error('MKB 2.0 forrásadat-eltérés: emberi vagy verzióellenőrzés szükséges.');
 }else{
  // Unlisted but authorized PDF: keep a versioned source record with original Drive identity.
  var out=await svc.request('/rest/v1/hh_mkb_sources?on_conflict=profile_key,origin,origin_ref,source_version',{
   method:'POST',prefer:'resolution=ignore-duplicates,return=representation',data:{
    profile_key:p,origin:'google_drive',origin_ref:file.id,source_version:1,
    source_kind:'pdf',mime_type:'application/pdf',original_name:file.name,
    original_bytes:file.size,original_observed_at:file.modified,sha256:sha,
    parse_status:'discovered',source_metadata:{importedBy:'healthhub-v407-mkb2'}
   }
  });
  s=out&&out[0];
  if(!s||!s.id){
   rows=await svc.request(query,{method:'GET'});s=rows&&rows[0];
  }
  if(!s||!s.id)throw Error('A dokumentum privát forrásnyilvántartása nem hozható létre.');
 }
 if(!s.sha256){
  await svc.request('/rest/v1/hh_mkb_sources?id=eq.'+encodeURIComponent(s.id)+
   '&profile_key=eq.'+encodeURIComponent(p)+'&sha256=is.null',{
   method:'PATCH',prefer:'return=minimal',data:{sha256:sha,updated_at:new Date().toISOString()}
  });
  var confirmed=await svc.request(query,{method:'GET'});
  if(!Array.isArray(confirmed)||!confirmed[0]||confirmed[0].sha256!==sha)
   throw Error('A PDF SHA-256 módosítása nem ellenőrizhető; feldolgozás megszakítva.');
  s=confirmed[0];
 }
 return s;
}
async function sourceStatus(p,source,quality,canonicalSourceId){
 if(!source||!source.id)return;
 var patch={parse_status:quality==='complete'?'complete':quality==='failed'?'failed':'partial',
  indexed_at:quality==='complete'?new Date().toISOString():null,updated_at:new Date().toISOString()};
 if(canonicalSourceId&&canonicalSourceId!==source.id)patch.duplicate_of=canonicalSourceId;
 await active(p).request('/rest/v1/hh_mkb_sources?id=eq.'+encodeURIComponent(source.id)+
  '&profile_key=eq.'+encodeURIComponent(p),{method:'PATCH',prefer:'return=minimal',data:patch});
}
async function upsertDocument(p,file,sha,existing,duplicate,source){
 var svc=active(p);
 if(existing&&existing.sha256===sha&&existing.status==='complete'&&existing.text_integrity_status==='verified'&&!duplicate){
  if(!compareMeta(file,existing)){
   await docStatus(p,existing.id,{source_modified_at:file.modified,size_bytes:file.size,mkb_source_id:source.id});
  }
  if(existing.mkb_source_id!==source.id)
   await docStatus(p,existing.id,{mkb_source_id:source.id});
  return existing;
 }
 var obj={profile_key:p,mkb_source_id:source.id,source_file_id:'drive_'+file.id,source_document_id:file.documentId||null,
  original_name:file.name,source_modified_at:file.modified,
  size_bytes:file.size,sha256:sha,status:duplicate?'complete':'processing',
  source_class:existing&&existing.classification_status==='reviewed'?
   existing.source_class:srcClass(file.name),
  classification_status:existing&&existing.classification_status==='reviewed'?'reviewed':'pending',
  total_pages:duplicate?duplicate.total_pages:0,pages_indexed:0,
  pages_needing_ocr:0,visual_pages:0,
  duplicate_of:duplicate?duplicate.id:null,notes:duplicate?'Azonos SHA-256 eredeti másik fájlban.':''
 };
 // Profile-specific upsert, RLS prevents cross-profile replacements.
 var rows=await svc.request('/rest/v1/hh_kb_documents?on_conflict=profile_key,source_file_id',{
  method:'POST',prefer:'resolution=merge-duplicates,return=representation',data:obj
 });
 if(!Array.isArray(rows)||!rows[0]?.id)throw Error('Nem sikerült nyilvántartásba venni a leletet.');
 return rows[0];
}
async function savePage(docId,p,info){
 await active(p).request('/rest/v1/hh_kb_pages?on_conflict=document_id,page_no',{
  method:'POST',prefer:'resolution=merge-duplicates,return=minimal',
  data:Object.assign({document_id:docId},info)
 });
}
async function saveVisual(p,docId,pageNo,blob,canvas){
 if(blob.size>=12000000)throw Error('A kép 12 MB felett van, tömörítés szükséges.');
 var b=await blob.arrayBuffer(),digest=await hash(b);
 var path=p+'/'+docId+'/'+pageNo+'-'+digest.slice(0,16)+'.png';
 try{
  await active(p).binary('/storage/v1/object/hh-kb-visuals/'+path,'POST',blob,'image/png');
 }catch(e){if(e.httpStatus!==409)throw e} // Idempotent reprocessing.
 await active(p).request('/rest/v1/hh_kb_visuals?on_conflict=document_id,page_no',{
  method:'POST',prefer:'resolution=merge-duplicates,return=minimal',data:{
   document_id:docId,page_no:pageNo,storage_path:path,kind:'visual_candidate',
   bytes:blob.size,mime_type:'image/png',pixel_width:canvas.width,pixel_height:canvas.height
  }
 });
}
async function docStatus(p,docId,patch){
 await active(p).request('/rest/v1/hh_kb_documents?id=eq.'+encodeURIComponent(docId),{
  method:'PATCH',prefer:'return=minimal',
  data:Object.assign({updated_at:new Date().toISOString()},patch)
 });
}
function codepoints(s){return Array.from(String(s||'')).length}
async function verifySavedPages(p,docId,expected,totalPages){
 var all=[],offset=0;
 while(offset<Math.max(1,totalPages)){
  active(p);
  var part=await active(p).request('/rest/v1/hh_kb_pages?select=page_no,page_text,text_sha256'+
   '&document_id=eq.'+encodeURIComponent(docId)+'&order=page_no.asc&limit=100&offset='+offset,{method:'GET'});
  if(!Array.isArray(part))throw Error('Nem ellenőrizhető a privát szövegtár visszaolvasása.');
  all.push(...part);
  if(part.length<100)break;
  offset+=100;
 }
 var byNo=new Map(all.map(x=>[x.page_no,x])),wanted=new Map(expected.map(x=>[x.pageNo,x]));
 var charsOriginal=0,charsStored=0,pagesVerified=0,issues=0;
 expected.forEach(x=>{charsOriginal+=x.characters});
 for(const row of all){
  if(!wanted.has(row.page_no)){issues++;continue}
  charsStored+=codepoints(row.page_text);
 }
 for(const item of expected){
  var stored=byNo.get(item.pageNo);
  if(!stored){issues++;continue}
  var newHash=stored.page_text?await hash(new TextEncoder().encode(stored.page_text)):null;
  if(newHash!==item.sha||stored.text_sha256!==item.sha||
     codepoints(stored.page_text)!==item.characters){issues++;continue}
  pagesVerified++;
 }
 return {extractedCharacters:charsOriginal,storedCharacters:charsStored,
  pagesVerified,matched:issues===0&&expected.length===totalPages&&
  all.length===totalPages&&pagesVerified===totalPages&&charsOriginal===charsStored,
  issues};
}
async function extractDocument(p,file,bytes,docId){
 var lib=await pdfjs(),pdf=await lib.getDocument({data:new Uint8Array(bytes)}).promise;
 var result={totalPages:pdf.numPages,pagesIndexed:0,pagesNeedingOcr:0,ocrPagesPendingReview:0,visualPages:0,
  failedPages:0,visualFailed:0,expected:[],extractedCharacters:0,storedCharacters:0,pagesVerified:0,textIntegrityStatus:'pending'},reasons=[];
 if(pdf.numPages>3000)throw Error('A PDF 3000 oldalnál hosszabb; kézi audit kell.');
 try{
  for(var pageNo=1;pageNo<=pdf.numPages;pageNo++){
   if(st.stop)break;active(p);
   st.current=file.name+' · '+pageNo+'/'+pdf.numPages+'. oldal';emit();
   var page=await pdf.getPage(pageNo),text='',method='none',needOcr=false;
   var can=null,visual=false,signal={capture:false,hint:'none'};
   try{
    var raw=await page.getTextContent();
    text=rawText(raw.items);
    method=text.length>=80?'embedded':'none';
    var ops={images:0,paths:0};
    try{ops=flags(await page.getOperatorList(),lib)}
    catch(_){reasons.push('PDF grafikus operátorok kiolvasása sikertelen: '+pageNo+'. oldal')}
    signal=CORE.visualSignals(file.name,text,ops);
    visual=signal.capture;
    needOcr=text.length<80;
    if(needOcr||visual){
     try{can=await canvasPage(page)}
     catch(_){
      // Never lose valid embedded clinical text just because a vector-heavy
      // ECG page cannot be rasterized. Keep the source flagged for visual review.
      result.visualFailed++;
      reasons.push('Az oldal képi renderelése nem sikerült: '+pageNo+'. oldal');
     }
     if(needOcr&&can){
      try{
       var worker=await loadOcr(),recognized=await worker.recognize(can);
       var candidate=String(recognized.data?.text||'').trim();
       if(candidate.length>=80){text=candidate;method='ocr';needOcr=false}
      }catch(e){reasons.push('OCR függőben: '+pageNo+'. oldal')}
     }
    }
    if(text.length>60000){
     // Never label a clipped source page fully processed.
     reasons.push('Nagyon hosszú szöveges oldal: '+pageNo);result.failedPages++;
     text=text.slice(0,60000);
    }
    var digest=text?await hash(new TextEncoder().encode(text)):null;
    await savePage(docId,p,{page_no:pageNo,page_text:text,extraction_method:method,
      visual_candidate:visual,visual_hint:signal.hint,
      needs_review:needOcr||visual||method==='ocr',
      text_sha256:digest});
    result.pagesIndexed++;
    result.expected.push({pageNo:pageNo,sha:digest,characters:codepoints(text)});
    if(method==='ocr'){
     result.ocrPagesPendingReview++;
     reasons.push('OCR ellenőrzendő: '+pageNo+'. oldal');
    }
    if(needOcr){result.pagesNeedingOcr++;reasons.push('Nem kiolvasható oldal: '+pageNo)}
    if(visual&&can){
     try{
      var picture=await png(can);await saveVisual(p,docId,pageNo,picture,can);
      result.visualPages++;
     }catch(e){result.visualFailed++;reasons.push('Képi melléklet mentési hiba: '+pageNo)}
    }
   }catch(e){result.failedPages++;reasons.push('Oldal feldolgozási hiba: '+pageNo)}
   finally{clearCanvas(can);try{page.cleanup()}catch(e){}}
  }
 }finally{try{await pdf.destroy()}catch(e){}}
 try{
  var check=await verifySavedPages(p,docId,result.expected,result.totalPages);
  result.extractedCharacters=check.extractedCharacters;
  result.storedCharacters=check.storedCharacters;
  result.pagesVerified=check.pagesVerified;
  result.textIntegrityStatus=check.matched?'verified':'mismatch';
  if(!check.matched){result.failedPages++;reasons.push('Szövegellenőrzés: oldal-, karakter- vagy SHA-256 eltérés.')}
 }catch(e){
  result.failedPages++;
  result.textIntegrityStatus='partial';
  reasons.push('A szövegek privát adatbázisból való visszaellenőrzése sikertelen.');
 }
 if(result.textIntegrityStatus==='verified'&&
    (result.pagesNeedingOcr>0||result.pagesIndexed!==result.totalPages))
  result.textIntegrityStatus='partial';
 delete result.expected;
 result.reasons=reasons.slice(0,8);
 return result;
}

function enabled(p){try{return localStorage.getItem('hh-kb-v407-enabled-'+p)==='yes'}catch(e){return false}}
function enable(p,value){
 if(!CORE.allowedProfile(p))return;
 try{localStorage.setItem('hh-kb-v407-enabled-'+p,value?'yes':'no')}catch(e){}
 emit();
}
function compareMeta(file,existing){
 return !!(existing&&existing.status==='complete'&&
  (existing.duplicate_of||existing.text_integrity_status==='verified')&&
  Number(existing.size_bytes)===Number(file.size)&&
  Number.isFinite(Date.parse(existing.source_modified_at||''))&&
  Date.parse(existing.source_modified_at)===Date.parse(file.modified||''));
}
function isPdfDocument(file){return !!file&&file.id&&/\.pdf$/i.test(file.name||'')}
async function audit(p){
 active(p);
 var files=await listFiles(p),indexed=await readDocuments(p);
 var known=new Map(indexed.map(r=>[r.source_file_id,r]));
 var newCount=0,complete=0,partial=0,duplicates=0;
 files.forEach(f=>{
  var record=known.get('drive_'+f.id);
  if(!record)newCount++;
  else if(record.status==='complete'&&compareMeta(f,record))complete++;
  else partial++;
  if(record&&record.duplicate_of)duplicates++;
 });
 var stat={profile:p,drive:files.length,knowledgeBase:indexed.length,new:newCount,
  complete:complete,partial:partial,duplicates:duplicates,
  visualPages:indexed.reduce((n,x)=>n+Number(x.visual_pages||0),0),
  pagesIndexed:indexed.filter(x=>!x.duplicate_of).reduce((n,x)=>n+Number(x.pages_indexed||0),0),
  batchRunning:st.running};
 st.last=stat;emit();return stat;
}
async function run(p,opts){
 opts=opts||{};
 if(st.running)return null;
 p=p||profile();active(p);if(!CORE.allowedProfile(p))throw Error('Érvénytelen profil.');
 st.running=true;st.stop=false;st.error='';st.done=0;st.current='Archívum egyeztetése…';emit();
 try{
  var files=(await listFiles(p)).filter(isPdfDocument),existing=await readDocuments(p);
  var mapped=new Map(existing.map(x=>[x.source_file_id,x]));
  // Process originals with known nonduplicate records first; deduplicate by SHA-256 later.
  var remaining=files.filter(f=>!compareMeta(f,mapped.get('drive_'+f.id)));
  if(opts.pilotType){
   if(!['watch-ekg','omsz'].includes(opts.pilotType))
    throw Error('Ismeretlen próbafeldolgozási dokumentumtípus.');
   remaining=CORE.pilotCandidates(remaining,opts.pilotType);
   if(!remaining.length)throw Error('Nincs feldolgozatlan ilyen típusú PDF az ellenőrzött archívumban.');
  }
  st.total=Math.min(remaining.length,opts.pilotType?1:(opts.maxDocs||1000));emit();
  for(const file of remaining.slice(0,st.total)){
   if(st.stop)break;active(p);
   st.current=file.name;emit();
   var record=mapped.get('drive_'+file.id),id=record&&record.id;
   try{
    var bytes=await blobFor(file,p),sha=await hash(bytes),source=await sourceFor(p,file,sha);
    if(record&&record.sha256&&record.sha256!==sha&&record.pages_indexed>0){
     // Do not contaminate the knowledge base with stale pages after a Drive overwrite.
     await docStatus(p,record.id,{status:'changed_needs_review',
      notes:'Az archív eredeti SHA-256 ellenőrzőösszege megváltozott; külön verzióellenőrzés szükséges.'});
     st.done++;emit();continue;
    }
    var canonical=existing.find(x=>x.profile_key===p&&x.source_file_id!=='drive_'+file.id&&
     x.sha256===sha&&x.status==='complete'&&x.text_integrity_status==='verified'&&!x.duplicate_of);
    // A repeated binary has one canonical, searchable page set.
    var saved=await upsertDocument(p,file,sha,record,canonical||null,source);
    id=saved.id;
    if(canonical){await sourceStatus(p,source,'complete',canonical.mkb_source_id||null);mapped.set('drive_'+file.id,saved);existing.push(saved);st.done++;emit();continue}
    if(record&&record.sha256===sha&&record.status==='complete'&&
      (record.duplicate_of||record.text_integrity_status==='verified')){await sourceStatus(p,source,'complete');st.done++;continue}
    var result=await extractDocument(p,file,bytes,id),quality=CORE.readiness(result);
    if(st.stop)quality='partial';
    await docStatus(p,id,{status:quality,total_pages:result.totalPages,
     pages_indexed:result.pagesIndexed,pages_needing_ocr:result.pagesNeedingOcr,
     visual_pages:result.visualPages,
      extracted_characters:result.extractedCharacters,stored_characters:result.storedCharacters,
      pages_verified:result.pagesVerified,text_integrity_status:result.textIntegrityStatus,
      text_verified_at:result.textIntegrityStatus==='verified'?new Date().toISOString():null,
      notes:(result.reasons||[]).join('; ').slice(0,1100)});
    await sourceStatus(p,source,quality);
    var row=Object.assign({},saved,{status:quality,total_pages:result.totalPages,
     pages_indexed:result.pagesIndexed,visual_pages:result.visualPages});
    mapped.set('drive_'+file.id,row);existing.push(row);
   }catch(e){
    // Never put sensitive PDF text or tokens in logs or error messages.
    if(id&&(!record||record.status!=='complete'))try{
     await docStatus(p,id,{status:'failed',notes:'Feldolgozási hiba; ismételt ellenőrzés szükséges.'})
    }catch(_){}
    st.error=String(e&&e.message||'PDF feldolgozási hiba').slice(0,135);
   }
   st.done++;emit();
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  return await audit(p);
 }finally{st.running=false;st.current='';emit()}
}
async function listVisuals(p,docId){
 if(!/^[a-f0-9-]{36}$/i.test(String(docId||'')))throw Error('Hibás dokumentumazonosító.');
 active(p);
 return await active(p).request('/rest/v1/hh_kb_visuals?select=document_id,page_no,storage_path,kind,pixel_width,pixel_height&document_id=eq.'+
  encodeURIComponent(docId)+'&order=page_no.asc&limit=200',{method:'GET'});
}
async function imageBlob(p,path){
 if(!String(path).startsWith(p+'/'))throw Error('Eltérő profilhoz tartozó kép.');
 return active(p).binary('/storage/v1/object/hh-kb-visuals/'+path,'GET');
}
var autoTimer=null;
function scheduleAuto(){
 clearTimeout(autoTimer);var p=profile();
 if(!enabled(p)||st.running)return;
 autoTimer=setTimeout(function(){
  if(enabled(p)&&p===profile()&&!st.running)run(p,{maxDocs:4,auto:true}).catch(()=>{});
 },4500);
}
window.addEventListener('healthhub:lena-archive-complete',scheduleAuto);
window.addEventListener('healthhub:lena-context-updated',scheduleAuto);
window.addEventListener('healthhub:central-auth-changed',scheduleAuto);
window.HH_KB_INGEST_V407={run:run,stop:function(){st.stop=true;emit()},audit:audit,
 listFiles:listFiles,listVisuals:listVisuals,imageBlob:imageBlob,
 enable:enable,enabled:enabled,getState:function(){return Object.assign({},st)}};
})();
