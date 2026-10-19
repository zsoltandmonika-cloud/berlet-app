(function(){
'use strict';
/* HealthHub v1.101 — PDF.js in-app medical document viewer */

var DB_NAME='healthhub-healthradar-v2';
var PDFJS_URL='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
var PDFJS_WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
var state={
 id:null,name:'document.pdf',blob:null,pdf:null,page:1,pages:0,
 zoom:1,renderTask:null,loadingToken:0,mode:'pdf'
};
var pdfjsPromise=null;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toastMsg(s){try{window.toast&&window.toast(s)}catch(e){}}
function reqP(req){return new Promise(function(resolve,reject){req.onsuccess=function(){resolve(req.result)};req.onerror=function(){reject(req.error)}})}
function openDb(){return new Promise(function(resolve,reject){var r=indexedDB.open(DB_NAME,1);r.onsuccess=function(){resolve(r.result)};r.onerror=function(){reject(r.error)}})}
async function one(store,key){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).get(key))}finally{db.close()}}
function ext(name){var m=String(name||'').toLowerCase().match(/\.([a-z0-9]+)$/);return m?m[1]:''}
function pdfBlob(blob,name){
 var t=String((blob&&blob.type)||'').toLowerCase();
 if(ext(name)==='pdf'&&t!=='application/pdf')return new Blob([blob],{type:'application/pdf'});
 return blob;
}
function svgHome(){
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>';
}
function svgBack(){
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/><path d="M9 12h10"/></svg>';
}
function svgPrev(){
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>';
}
function svgNext(){
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>';
}
function svgMinus(){
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>';
}
function svgPlus(){
 return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12M12 6v12"/></svg>';
}
function ensure(){
 if(document.getElementById('hh-v201-style')&&document.getElementById('hhOriginalDocViewer'))return;
 var old=document.getElementById('hhOriginalDocViewer');if(old)old.remove();
 var oldStyle=document.getElementById('hh-v199-style');if(oldStyle)oldStyle.remove();

 var s=document.createElement('style');s.id='hh-v201-style';s.textContent=
 '.hhOriginalDocViewer{position:fixed;inset:0;z-index:12000;display:none;background:#eef7fb;color:#0b2d50;font-family:system-ui,-apple-system,Segoe UI,sans-serif;overscroll-behavior:none}.hhOriginalDocViewer.on{display:block}.hhPdfShell{height:100dvh;max-width:820px;margin:0 auto;background:#f5f9fc;display:grid;grid-template-rows:132px 48px minmax(0,1fr);box-shadow:0 0 34px rgba(18,52,78,.15)}'+
 '.hhPdfHero{position:relative;overflow:hidden;background-image:var(--hh-role-atlas);background-size:100% 200%;background-position:0 0;background-repeat:no-repeat;border-radius:0 0 24px 24px;box-shadow:0 5px 18px rgba(28,74,105,.10)}.hhPdfHero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.02) 44%,rgba(255,255,255,.24) 76%,rgba(255,255,255,.52) 100%);pointer-events:none}.hhPdfHeroTitle{position:absolute;z-index:2;right:17px;bottom:15px;text-align:right;max-width:48%}.hhPdfHeroTitle small{display:block;font-size:7px;letter-spacing:.11em;font-weight:900;color:#ff2f7f;text-transform:uppercase}.hhPdfHeroTitle b{display:block;font-size:18px;line-height:1.05;color:#0b2d50;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhPdfHeroBtns{position:absolute;z-index:4;right:12px;top:calc(10px + env(safe-area-inset-top));display:flex;gap:7px}.hhPdfHeroBtn{width:42px;height:42px;border:1px solid rgba(23,63,97,.13);border-radius:0;background:rgba(255,255,255,.86);color:#173f61;display:grid;place-items:center;box-shadow:0 4px 14px rgba(40,70,100,.10);padding:0}.hhPdfHeroBtn:first-child{border-radius:20px}.hhPdfHeroBtn svg{width:24px;height:24px}.hhPdfHeroBtn:active{transform:scale(.96)}'+
 '.hhPdfTools{display:grid;grid-template-columns:36px minmax(66px,auto) 36px 1fr 36px 36px;align-items:center;gap:5px;padding:5px 10px;background:#fff;border-bottom:1px solid #dce8ef}.hhPdfToolBtn{width:34px;height:34px;border:1px solid #dce8ef;border-radius:11px;background:#f3f8fb;color:#315f7d;display:grid;place-items:center;padding:0}.hhPdfToolBtn svg{width:21px;height:21px}.hhPdfToolBtn:disabled{opacity:.28}.hhPdfPageNo{text-align:center;font-size:10px;font-weight:900;color:#315f7d;white-space:nowrap}.hhPdfZoomNo{text-align:right;font-size:8px;font-weight:850;color:#7890a1;padding-right:3px;white-space:nowrap}'+
 '.hhPdfStage{position:relative;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:#dbe5eb;padding:12px;display:flex;align-items:flex-start;justify-content:flex-start}.hhPdfCanvasWrap{margin:auto;position:relative;box-shadow:0 5px 18px rgba(22,48,68,.18);background:#fff;flex:0 0 auto}.hhPdfCanvas{display:block;background:#fff}.hhPdfStatus{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(180deg,#f9fcfe,#eef5f8);padding:24px;text-align:center;z-index:3}.hhPdfStatus.hidden{display:none}.hhPdfStatusBox{max-width:330px}.hhPdfStatus b{display:block;font-size:15px;color:#173f62;margin-bottom:7px}.hhPdfStatus p{margin:0;color:#71879a;font-size:10px;line-height:1.45}.hhPdfSpinner{width:32px;height:32px;border:3px solid #d9e8ef;border-top-color:#2d91c3;border-radius:50%;margin:0 auto 11px;animation:hhPdfSpin .8s linear infinite}@keyframes hhPdfSpin{to{transform:rotate(360deg)}}'+
 '.hhPdfImage{display:block;max-width:none;height:auto;background:#fff}.hhPdfImageMode .hhPdfTools .pageOnly{opacity:.25;pointer-events:none}@media(max-width:430px){.hhPdfShell{grid-template-rows:122px 46px minmax(0,1fr)}.hhPdfHeroTitle b{font-size:16px}.hhPdfHeroTitle{right:13px;bottom:12px}.hhPdfHeroBtn{width:40px;height:40px}.hhPdfStage{padding:9px}.hhPdfTools{padding:5px 7px;gap:4px;grid-template-columns:34px 64px 34px 1fr 34px 34px}.hhPdfToolBtn{width:32px;height:32px;border-radius:10px}}';
 document.head.appendChild(s);

 var o=document.createElement('div');o.id='hhOriginalDocViewer';o.className='hhOriginalDocViewer';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');
 o.innerHTML=
 '<div class="hhPdfShell">'+
  '<header class="hhPdfHero">'+
   '<div class="hhPdfHeroBtns">'+
    '<button class="hhPdfHeroBtn" type="button" onclick="hhDocGoHome()" title="Kezdőlap" aria-label="Kezdőlap">'+svgHome()+'</button>'+
    '<button class="hhPdfHeroBtn" type="button" onclick="hhDocBackToRecords()" title="Vissza a leletekhez" aria-label="Vissza a leletekhez">'+svgBack()+'</button>'+
   '</div>'+
   '<div class="hhPdfHeroTitle"><small>HEALTHHUB · EREDETI LELET</small><b id="hhPdfName">Dokumentum</b></div>'+
  '</header>'+
  '<div class="hhPdfTools">'+
   '<button id="hhPdfPrev" class="hhPdfToolBtn pageOnly" type="button" onclick="hhPdfPrev()" title="Előző oldal" aria-label="Előző oldal">'+svgPrev()+'</button>'+
   '<div id="hhPdfPageNo" class="hhPdfPageNo">1 / 1</div>'+
   '<button id="hhPdfNext" class="hhPdfToolBtn pageOnly" type="button" onclick="hhPdfNext()" title="Következő oldal" aria-label="Következő oldal">'+svgNext()+'</button>'+
   '<div id="hhPdfZoomNo" class="hhPdfZoomNo">Szélességhez igazítva</div>'+
   '<button id="hhPdfMinus" class="hhPdfToolBtn" type="button" onclick="hhPdfZoom(-1)" title="Kicsinyítés" aria-label="Kicsinyítés">'+svgMinus()+'</button>'+
   '<button id="hhPdfPlus" class="hhPdfToolBtn" type="button" onclick="hhPdfZoom(1)" title="Nagyítás" aria-label="Nagyítás">'+svgPlus()+'</button>'+
  '</div>'+
  '<main id="hhPdfStage" class="hhPdfStage">'+
   '<div id="hhPdfCanvasWrap" class="hhPdfCanvasWrap"><canvas id="hhPdfCanvas" class="hhPdfCanvas"></canvas></div>'+
   '<div id="hhPdfStatus" class="hhPdfStatus"><div class="hhPdfStatusBox"><div class="hhPdfSpinner"></div><b>Dokumentum betöltése…</b><p>Az eredeti lelet a HealthHubon belül nyílik meg.</p></div></div>'+
  '</main>'+
 '</div>';
 document.body.appendChild(o);
}

function setStatus(title,msg,loading){
 var x=document.getElementById('hhPdfStatus');if(!x)return;
 x.classList.remove('hidden');
 x.innerHTML='<div class="hhPdfStatusBox">'+(loading?'<div class="hhPdfSpinner"></div>':'')+'<b>'+esc(title)+'</b><p>'+esc(msg||'')+'</p></div>';
}
function hideStatus(){document.getElementById('hhPdfStatus')?.classList.add('hidden')}
function setOpen(on){
 ensure();
 var o=document.getElementById('hhOriginalDocViewer');
 if(on){o.classList.add('on');document.documentElement.style.overflow='hidden';document.body.style.overflow='hidden'}
 else{o.classList.remove('on');document.documentElement.style.overflow='';document.body.style.overflow=''}
}
async function loadPdfJs(){
 if(window.pdfjsLib&&window.pdfjsLib.getDocument)return window.pdfjsLib;
 if(pdfjsPromise)return pdfjsPromise;
 pdfjsPromise=import(PDFJS_URL).then(function(lib){
  if(lib&&lib.GlobalWorkerOptions)lib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
  window.pdfjsLib=lib;return lib;
 }).catch(function(err){pdfjsPromise=null;throw err});
 return pdfjsPromise;
}
function updateTools(){
 var p=document.getElementById('hhPdfPageNo'),prev=document.getElementById('hhPdfPrev'),next=document.getElementById('hhPdfNext'),z=document.getElementById('hhPdfZoomNo'),minus=document.getElementById('hhPdfMinus'),plus=document.getElementById('hhPdfPlus');
 if(p)p.textContent=state.mode==='pdf'?(state.page+' / '+Math.max(1,state.pages)):'Kép';
 if(prev)prev.disabled=state.mode!=='pdf'||state.page<=1;
 if(next)next.disabled=state.mode!=='pdf'||state.page>=state.pages;
 if(z)z.textContent=state.zoom===1?'Szélességhez igazítva':Math.round(state.zoom*100)+'%';
 if(minus)minus.disabled=state.zoom<=0.65;
 if(plus)plus.disabled=state.zoom>=2.5;
}
function fitScale(viewportBase){
 var stage=document.getElementById('hhPdfStage');
 var available=Math.max(240,(stage?stage.clientWidth:360)-24);
 return available/viewportBase.width;
}
async function renderPage(){
 if(!state.pdf||state.mode!=='pdf')return;
 var token=++state.loadingToken;
 if(state.renderTask){try{state.renderTask.cancel()}catch(e){}state.renderTask=null}
 setStatus('Lelet megjelenítése…','',true);
 try{
  var page=await state.pdf.getPage(state.page);if(token!==state.loadingToken)return;
  var base=page.getViewport({scale:1}),scale=fitScale(base)*state.zoom,viewport=page.getViewport({scale:scale});
  var canvas=document.getElementById('hhPdfCanvas'),wrap=document.getElementById('hhPdfCanvasWrap'),ctx=canvas.getContext('2d',{alpha:false});
  var dpr=Math.min(2.5,window.devicePixelRatio||1);
  canvas.width=Math.floor(viewport.width*dpr);canvas.height=Math.floor(viewport.height*dpr);
  canvas.style.width=Math.ceil(viewport.width)+'px';canvas.style.height=Math.ceil(viewport.height)+'px';
  wrap.style.width=Math.ceil(viewport.width)+'px';wrap.style.height=Math.ceil(viewport.height)+'px';
  var transform=dpr!==1?[dpr,0,0,dpr,0,0]:null;
  state.renderTask=page.render({canvasContext:ctx,viewport:viewport,transform:transform});
  await state.renderTask.promise;if(token!==state.loadingToken)return;
  state.renderTask=null;hideStatus();updateTools();
  var stage=document.getElementById('hhPdfStage');if(stage){stage.scrollTop=0;stage.scrollLeft=0}
 }catch(e){
  if(e&&e.name==='RenderingCancelledException')return;
  console.error(e);setStatus('A PDF oldala nem jeleníthető meg','Próbáld meg újra megnyitni a leletet.',false);
 }
}
async function renderImage(blob,name){
 state.mode='image';state.pages=1;state.page=1;state.zoom=1;
 var stage=document.getElementById('hhPdfStage'),wrap=document.getElementById('hhPdfCanvasWrap');
 var canvas=document.getElementById('hhPdfCanvas');canvas.style.display='none';
 var url=URL.createObjectURL(blob);
 var img=new Image();img.className='hhPdfImage';img.alt=name||'Dokumentumkép';
 await new Promise(function(ok,no){img.onload=ok;img.onerror=no;img.src=url});
 var available=Math.max(240,(stage?stage.clientWidth:360)-24),natural=img.naturalWidth||available,base=Math.min(1,available/natural);
 img.dataset.base=String(base);img.style.width=Math.round(natural*base)+'px';
 wrap.innerHTML='';wrap.appendChild(img);wrap.style.width=img.style.width;wrap.style.height='auto';
 wrap.dataset.imageUrl=url;hideStatus();updateTools();
}
function cleanDocument(){
 pdfOpenSerialV690++;
 state.loadingToken++;
 if(state.renderTask){try{state.renderTask.cancel()}catch(e){}state.renderTask=null}
 if(state.pdf){try{state.pdf.destroy()}catch(e){}state.pdf=null}
 var wrap=document.getElementById('hhPdfCanvasWrap');
 if(wrap&&wrap.dataset.imageUrl){try{URL.revokeObjectURL(wrap.dataset.imageUrl)}catch(e){}delete wrap.dataset.imageUrl}
 if(wrap){wrap.innerHTML='<canvas id="hhPdfCanvas" class="hhPdfCanvas"></canvas>';wrap.style.width='';wrap.style.height=''}
 state.id=null;state.blob=null;state.page=1;state.pages=0;state.zoom=1;state.mode='pdf';
}


/* v690: read-only server Drive fallback for patient-tagged originals.
   Never guess by filename or use browser Google tokens. */
var pdfOpenSerialV690=0;
function pdfProfileV690(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pdfStillCurrentV690(p,serial){return pdfOpenSerialV690===serial&&pdfProfileV690()===p}
/* v692: Ambiguous tagged copies may be resolved by an indexed SHA-256 only.
   No name, date, size, modification-time heuristic, or unverified file IDs. */
async function pdfResolveHashTaggedDriveV692(vault,p,documentId,expected,serial){
 if(!/^[a-f0-9]{64}$/.test(expected))throw Error('drive_document_hash_required');
 var response=await vault.stream('/functions/v1/hh-drive-oauth-v682',
  {action:'archive_inventory',profile:p});
 if(!pdfStillCurrentV690(p,serial))throw Error('pdf_open_cancelled');
 if(!response.ok)throw Error('drive_inventory_unavailable');
 var inventory=await response.json().catch(function(){return null});
 if(!pdfStillCurrentV690(p,serial))throw Error('pdf_open_cancelled');
 if(!inventory||inventory.profile!==p||!Array.isArray(inventory.files)||inventory.files.length>2000)
  throw Error('drive_inventory_invalid');
 var sameId=0,candidates=[];
 inventory.files.forEach(function(f){
  var props=f&&f.appProperties;
  if(!f||f.mimeType!=='application/pdf'||!props||props.profile!==p||
     props.documentId!==documentId)return;
  sameId++;
  var hash=String(props.sha256||'').toLowerCase();
  if(hash===expected&&/^[A-Za-z0-9_-]{8,200}$/.test(String(f.id||'')))
   candidates.push(f.id);
 });
 if(!sameId)throw Error('drive_document_not_indexed');
 if(!candidates.length)throw Error('drive_document_hash_unmatched');
 // Even for identical SHA labels, the chosen original is fully verified against
 // the indexed SHA after authenticated profile/folder/documentId server checks.
 candidates.sort();
 return candidates[0];
}
async function pdfFromPrivateDriveV690(d,p,serial){
 if(!/\.pdf$/i.test(String(d.originalName||''))&&
    String(d.contentType||'').toLowerCase()!=='application/pdf')
  throw Error('remote_pdf_only');
 var documentId=String(d.id||'');
 if(!/^[A-Za-z0-9-]{6,140}$/.test(documentId))throw Error('drive_document_invalid_id');
 var vault=window.HH_DAILY_HEALTH_SYNC_V319;
 var auth=vault&&vault.getStatus&&vault.getStatus();
 if(!vault||typeof vault.stream!=='function'||!auth||!auth.authenticated||
    !Array.isArray(auth.authorizedProfiles)||!auth.authorizedProfiles.includes(p))
  throw Error('health_vault_required');
 if(!pdfStillCurrentV690(p,serial))throw Error('pdf_open_cancelled');
 // This action resolves the exact documentId inside the profile's verified Drive folder.
 // No browser-provided Drive file ID, filename or archive map is used for identity.
 var response=await vault.stream('/functions/v1/hh-drive-oauth-v682',
  {action:'archive_document',profile:p,documentId:documentId});
 if(!pdfStillCurrentV690(p,serial))throw Error('pdf_open_cancelled');
 if(!response.ok){
  var failure=await response.json().catch(function(){return null});
  if(!pdfStillCurrentV690(p,serial))throw Error('pdf_open_cancelled');
  var code=failure&&String(failure.error||'');
  if(response.status===401||response.status===403)throw Error('drive_profile_forbidden');
  if(code==='drive_document_locator_ambiguous'){
   var expectedHash=String(d.sha256||'').trim().toLowerCase();
   var fileId=await pdfResolveHashTaggedDriveV692(vault,p,documentId,expectedHash,serial);
   if(!pdfStillCurrentV690(p,serial))throw Error('pdf_open_cancelled');
   response=await vault.stream('/functions/v1/hh-drive-oauth-v682',
    {action:'archive_document',profile:p,documentId:documentId,fileId:fileId});
   if(!pdfStillCurrentV690(p,serial))throw Error('pdf_open_cancelled');
   if(!response.ok){
    if(response.status===401||response.status===403)throw Error('drive_profile_forbidden');
    throw Error('drive_read_unavailable');
   }
  }else throw Error('drive_read_unavailable');
 }
 if(!/^application\/pdf\b/i.test(response.headers.get('content-type')||''))
  throw Error('drive_pdf_invalid_type');
 var buffer=await response.arrayBuffer();
 if(!pdfStillCurrentV690(p,serial))throw Error('pdf_open_cancelled');
 var b=new Uint8Array(buffer);
 if(b.length<5||b.length>15000000||b[0]!==37||b[1]!==80||
    b[2]!==68||b[3]!==70||b[4]!==45)throw Error('drive_pdf_invalid_bytes');
 var expected=String(d.sha256||'').trim().toLowerCase();
 if(/^[0-9a-f]{64}$/.test(expected)){
  var sha=new Uint8Array(await crypto.subtle.digest('SHA-256',buffer));
  if(!pdfStillCurrentV690(p,serial))throw Error('pdf_open_cancelled');
  var actual=Array.from(sha,function(n){return n.toString(16).padStart(2,'0')}).join('');
  if(actual!==expected)throw Error('drive_pdf_hash_mismatch');
 }
 return new Blob([buffer],{type:'application/pdf'});
}
function pdfGatewayMessageV690(error){
 switch(String(error&&error.message||'')){
  case 'health_vault_required':return 'A PDF csak érvényes Health Vault-bejelentkezéssel és profiljogosultsággal érhető el.';
  case 'drive_profile_forbidden':return 'A kiválasztott profilhoz nincs igazolt PDF-hozzáférés.';
  case 'drive_document_not_indexed':return 'A lelet indexe megvan, de ehhez az azonosítóhoz nem található egyértelműen hozzárendelt eredeti Drive-PDF.';
  case 'drive_document_hash_required':return 'Több eredeti Drive-fájl tartozik ehhez a lelethez, de a leletindexben nincs ellenőrzött SHA-256. Kézi forrásazonosítás szükséges.';
  case 'drive_document_hash_unmatched':return 'Több Drive-fájl van ehhez a lelethez, de egyik hitelesített SHA-256 címke sem egyezik. Nem találgatunk.';
  case 'drive_pdf_hash_mismatch':return 'Az eredeti PDF ellenőrzőösszege eltér a lelet indexétől. A fájlt biztonsági okból nem jelenítjük meg.';
  case 'drive_pdf_invalid_bytes':case 'drive_pdf_invalid_type':return 'A Drive-ból érkezett fájl nem ellenőrzött PDF.';
  case 'remote_pdf_only':return 'Ehhez a dokumentumtípushoz nem áll rendelkezésre eredeti helyi fájl.';
  default:return 'A PDF nem tölthető le a privát Drive-archívumból. Az eredeti dokumentumot nem módosítottuk.';
 }
}

window.openHrDocument=async function(id){
 ensure();cleanDocument();
 var profile=pdfProfileV690(),serial=pdfOpenSerialV690;
 setOpen(true);
 setStatus('Dokumentum betöltése…','Az eredeti lelet a HealthHubon belül nyílik meg.',true);
 try{
  var d=await one('documents',id);
  if(!pdfStillCurrentV690(profile,serial))return;
  if(!d||d.profile!==profile){
   setStatus('A lelet nem érhető el','A dokumentum nem tartozik a kiválasztott profilhoz.',false);return;
  }
  var x=await one('documentBlobs',id).catch(function(){return null});
  if(!pdfStillCurrentV690(profile,serial))return;
  var original=x&&x.blob;
  if(!original){
   setStatus('Eredeti PDF biztonságos betöltése…','Szerveroldali Google Drive-ellenőrzés folyamatban.',true);
   original=await pdfFromPrivateDriveV690(d,profile,serial);
  }
  if(!pdfStillCurrentV690(profile,serial))return;
  var name=d.originalName||'dokumentum.pdf',blob=pdfBlob(original,name),type=String(blob.type||'').toLowerCase();
  state.id=id;state.name=name;state.blob=blob;
  var n=document.getElementById('hhPdfName');if(n)n.textContent=name;
  if(type==='application/pdf'||ext(name)==='pdf'){
   state.mode='pdf';
   var lib=await loadPdfJs(),bytes=new Uint8Array(await blob.arrayBuffer());
   if(!pdfStillCurrentV690(profile,serial))return;
   var task=lib.getDocument({data:bytes});
   var openedPdf=await task.promise;
   if(!pdfStillCurrentV690(profile,serial)){try{openedPdf.destroy()}catch(_){}return;}
   state.pdf=openedPdf;state.pages=state.pdf.numPages||1;state.page=1;state.zoom=1;
   updateTools();await renderPage();
  }else if(type.indexOf('image/')===0||['jpg','jpeg','png','webp'].indexOf(ext(name))>=0){
   await renderImage(blob,name);
  }else{
   setStatus('Ez a fájlformátum nem jeleníthető meg','A HealthHub nézegető jelenleg PDF, JPG, PNG és WebP dokumentumokat kezel.',false);
  }
 }catch(e){
  if(!pdfStillCurrentV690(profile,serial)||String(e&&e.message)==='pdf_open_cancelled')return;
  console.warn('HealthHub PDF open blocked:',String(e&&e.message||'unknown').slice(0,70));
  setStatus('A dokumentum nem nyitható meg',pdfGatewayMessageV690(e),false);
  toastMsg('A dokumentum nem nyitható meg.');
 }
};
window.hhCloseOriginalDoc=function(){cleanDocument();setOpen(false)};
window.hhDocCurrentIdV392=function(){
 // Read-only share/print entry point for the currently visible original file.
 var viewer=document.getElementById('hhOriginalDocViewer');
 return viewer&&viewer.classList.contains('on')&&state.blob?state.id:null;
};
window.hhDocGoHome=function(){
 window.hhCloseOriginalDoc();try{window.closeHrDetail&&window.closeHrDetail()}catch(e){}
 try{window.show&&window.show('home')}catch(e){}
};
window.hhDocBackToRecords=function(){
 window.hhCloseOriginalDoc();try{window.closeHrDetail&&window.closeHrDetail()}catch(e){}
 try{if(window.openHealthSection)window.openHealthSection('records');else window.show&&window.show('health')}catch(e){}
};
window.hhPdfPrev=function(){if(state.mode!=='pdf'||state.page<=1)return;state.page--;renderPage()};
window.hhPdfNext=function(){if(state.mode!=='pdf'||state.page>=state.pages)return;state.page++;renderPage()};
window.hhPdfZoom=function(dir){
 var next=Math.max(.65,Math.min(2.5,Math.round((state.zoom+(dir>0?.2:-.2))*100)/100));
 if(next===state.zoom)return;state.zoom=next;updateTools();
 if(state.mode==='pdf')renderPage();
 else{
  var img=document.querySelector('#hhPdfCanvasWrap img');if(!img)return;
  var base=Number(img.dataset.base||1),w=(img.naturalWidth||300)*base*state.zoom;img.style.width=Math.round(w)+'px';img.parentElement.style.width=img.style.width;
 }
};

var pinch=null;
function touchDistance(t){var a=t[0],b=t[1],dx=a.clientX-b.clientX,dy=a.clientY-b.clientY;return Math.sqrt(dx*dx+dy*dy)}
document.addEventListener('touchstart',function(e){
 if(!document.getElementById('hhOriginalDocViewer')?.classList.contains('on')||e.touches.length!==2)return;
 pinch={distance:touchDistance(e.touches),zoom:state.zoom};
},{passive:true});
document.addEventListener('touchend',function(e){
 if(!pinch)return;
 if(e.touches.length<2)pinch=null;
},{passive:true});
document.addEventListener('touchmove',function(e){
 if(!pinch||e.touches.length!==2)return;
 var ratio=touchDistance(e.touches)/Math.max(1,pinch.distance),target=Math.max(.65,Math.min(2.5,pinch.zoom*ratio));
 var rounded=Math.round(target*10)/10;
 if(Math.abs(rounded-state.zoom)>=.2){state.zoom=rounded;updateTools();if(state.mode==='pdf')renderPage()}
 e.preventDefault();
},{passive:false});

document.addEventListener('keydown',function(e){
 if(!document.getElementById('hhOriginalDocViewer')?.classList.contains('on'))return;
 if(e.key==='Escape')window.hhDocBackToRecords();
 if(e.key==='ArrowLeft')window.hhPdfPrev();
 if(e.key==='ArrowRight')window.hhPdfNext();
 if(e.key==='+'||e.key==='=')window.hhPdfZoom(1);
 if(e.key==='-')window.hhPdfZoom(-1);
});
window.addEventListener('resize',function(){if(document.getElementById('hhOriginalDocViewer')?.classList.contains('on')&&state.mode==='pdf'&&state.pdf)setTimeout(renderPage,100)});

ensure();
document.documentElement.dataset.healthhubDocumentViewer='1.101';
window.HH_LIVE_BUILD='v1.103-sha-tagged-original-drive-fallback';
window.addEventListener('healthhub:profile-changed',function(){
 if(document.getElementById('hhOriginalDocViewer')?.classList.contains('on'))window.hhCloseOriginalDoc();
});
})();