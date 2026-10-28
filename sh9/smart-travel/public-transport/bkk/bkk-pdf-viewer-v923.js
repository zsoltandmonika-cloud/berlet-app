/* SH9 BKK PDF viewer v924. Reuses the HealthHub PDF.js 4.10.38 renderer technology.
 * Does NOT import the medical document viewer, its private records, or IndexedDB.
 * No background polling, no stored PDF snapshots. User chooses official BKK PDF source.
 */
(function(w,d){'use strict';
const ROOT='https://bkk.hu/menetrendek/';
const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
const $=id=>d.getElementById(id);
let libPromise=null,documentPdf=null,page=1,scale=1,serial=0,activeRender=null,lastFocus=null;
let currentRoute='',downloadBytes=null,abortPdf=null,renderEpoch=0;
function validateOfficialPdf(raw){
 try{const url=new URL(String(raw||'').trim());
  if(url.protocol!=='https:'||!['bkk.hu','www.bkk.hu'].includes(url.hostname)||!url.pathname.toLowerCase().endsWith('.pdf')||url.username||url.password||url.port)return null;
  return url.href;
 }catch(_){return null}
}
function status(message){if($('bkkPdfStatus'))$('bkkPdfStatus').textContent=message}
function reset(){serial++;renderEpoch++;
 try{abortPdf?.abort()}catch(_){}abortPdf=null;
 try{activeRender?.cancel()}catch(_){}activeRender=null;
 try{documentPdf?.destroy()}catch(_){}documentPdf=null;
 downloadBytes=null;page=1;scale=1;
 const c=$('bkkPdfCanvas');if(c){c.width=0;c.height=0;c.style.width='';c.style.height=''}
 if($('bkkPdfReader'))$('bkkPdfReader').hidden=true;
 if($('bkkPdfDownload'))$('bkkPdfDownload').hidden=true;
 if($('bkkPdfUrl'))$('bkkPdfUrl').value='';status('');}
function open(id){const overlay=$('bkkPdfOverlay');if(!overlay)return;
 reset();lastFocus=d.activeElement;
 const safe=String(id||'').slice(0,16).replace(/[^\p{L}\p{N}-]/gu,'');
 currentRoute=safe||'BKK';
 $('bkkPdfTitle').textContent=currentRoute+' · menetrend';
 $('bkkPdfSelectedRoute').textContent=currentRoute;
 $('bkkPdfHint').textContent='A '+(safe||'kiválasztott')+' járat aktuális hivatalos menetrendjét a BKK oldalán válaszd ki. A PDF-link a HealthHub olvasójában is megnyitható, ha a forrás engedi.';
 $('bkkPdfOfficial').href=ROOT;overlay.hidden=false;d.body.classList.add('bkk-pdf-open');$('bkkPdfClose').focus();
}
function close(){const overlay=$('bkkPdfOverlay');if(!overlay)return;
 reset();overlay.hidden=true;d.body.classList.remove('bkk-pdf-open');lastFocus?.focus?.();}
function engine(){if(!libPromise)libPromise=import(PDFJS).then(lib=>{lib.GlobalWorkerOptions.workerSrc=WORKER;return lib}).catch(e=>{libPromise=null;throw e});return libPromise}
async function render(){const doc=documentPdf;if(!doc)return;
 const thisSerial=serial,thisEpoch=++renderEpoch,thisPage=page,thisScale=scale;
 const old=activeRender;if(old){try{old.cancel()}catch(_){}try{await old.promise}catch(_){}if(thisEpoch!==renderEpoch)return}
 const p=await doc.getPage(thisPage);
 if(thisSerial!==serial||thisEpoch!==renderEpoch||doc!==documentPdf)return;
 const canvas=$('bkkPdfCanvas'),wrap=canvas.parentElement,base=p.getViewport({scale:1});
 const width=Math.max(220,wrap.clientWidth-20);const ratio=(width/base.width)*thisScale;
 const viewport=p.getViewport({scale:ratio}),dpr=Math.min(w.devicePixelRatio||1,2);
 canvas.width=Math.round(viewport.width*dpr);canvas.height=Math.round(viewport.height*dpr);
 canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
 const ctx=canvas.getContext('2d');const task=p.render({canvasContext:ctx,viewport,transform:[dpr,0,0,dpr,0,0]});activeRender=task;
 try{await task.promise}catch(err){if(err?.name!=='RenderingCancelledException'&&thisSerial===serial)status('A PDF-oldal megjelenítése nem sikerült.')}
 if(activeRender===task)activeRender=null;
 if(thisSerial!==serial||thisEpoch!==renderEpoch||doc!==documentPdf)return;
 $('bkkPdfPages').textContent=thisPage+' / '+doc.numPages;
 $('bkkPdfZoom').textContent=Math.round(thisScale*100)+'%';
 $('bkkPdfPrev').disabled=thisPage<=1;$('bkkPdfNext').disabled=thisPage>=doc.numPages;
}
async function load(){const url=validateOfficialPdf($('bkkPdfUrl').value);
 if(!url){status('Csak a BKK hivatalos HTTPS PDF-hivatkozása nyitható meg.');return}
 // Abort any previous request and invalidate its asynchronous response.
 try{abortPdf?.abort()}catch(_){};try{activeRender?.cancel()}catch(_){}
 try{documentPdf?.destroy()}catch(_){}documentPdf=null;downloadBytes=null;renderEpoch++;
 $('bkkPdfDownload').hidden=true;$('bkkPdfReader').hidden=true;
 const ctrl=new AbortController();abortPdf=ctrl;
 const self=++serial;status('Hivatalos PDF beolvasása…');
 try{const resp=await fetch(url,{cache:'no-store',credentials:'omit',redirect:'error',signal:ctrl.signal});
  if(!resp.ok)throw Error('A BKK PDF-forrás '+resp.status+' hibát adott.');
  if(validateOfficialPdf(resp.url)!==url)throw Error('A PDF-forrás címe megváltozott.');
  const len=Number(resp.headers.get('content-length'))||0;if(len>15*1024*1024)throw Error('A PDF túl nagy (max. 15 MB).');
  const bytes=new Uint8Array(await resp.arrayBuffer());
  if(self!==serial)return;
  if(bytes.length>15*1024*1024||bytes.length<5||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Error('A BKK nem érvényes PDF-et adott vissza.');
  const lib=await engine();if(self!==serial)return;
  const task=lib.getDocument({data:bytes.slice()});
  const parsed=await task.promise;
  if(self!==serial){try{parsed.destroy()}catch(_){}return}
  documentPdf=parsed;downloadBytes=bytes;
  page=1;scale=1;$('bkkPdfReader').hidden=false;$('bkkPdfDownload').hidden=false;
  status('Hivatalos BKK PDF · csak ideiglenes memóriában.');await render();
 }catch(e){if(self!==serial)return;
  downloadBytes=null;$('bkkPdfDownload').hidden=true;
  status('A PDF itt nem nyitható meg ('+(e instanceof TypeError?'a forrás böngészős hozzáférése blokkolt':e.message||'ismeretlen hiba')+'). A hivatalos BKK-oldalt továbbra is megnyithatod.');
 }finally{if(abortPdf===ctrl)abortPdf=null}
}
async function pasteOfficialLink(){
 const clipboard=w.navigator?.clipboard;
 if(!clipboard?.readText){status('A böngésző nem támogatja a vágólap olvasását. A PDF-hivatkozás kézzel is beilleszthető.');return}
 try{const value=await clipboard.readText();
  const url=validateOfficialPdf(value);
  if(!url){status('A vágólapon nem szerepel érvényes BKK PDF-hivatkozás.');return}
  $('bkkPdfUrl').value=url;status('A hivatalos BKK PDF-hivatkozás beillesztve. Koppints a Megnyitás gombra.');
 }catch(_){status('A vágólap olvasását a böngésző letiltotta. A hivatkozás kézzel is beilleszthető.')}
}
async function copyRoute(){
 try{if(!w.navigator?.clipboard?.writeText)throw Error('unsupported');
  await w.navigator.clipboard.writeText(currentRoute);
  status('A '+currentRoute+' járatszáma a vágólapra került. A BKK keresőjében beillesztheted.');
 }catch(_){status('Járatszám: '+currentRoute+'. A böngésző nem engedte a másolást.')}
}
function download(){
 if(!documentPdf||!downloadBytes?.byteLength)return;
 const uri=w.URL.createObjectURL(new Blob([downloadBytes],{type:'application/pdf'}));
 const a=d.createElement('a');a.href=uri;a.download='BKK-'+currentRoute+'-menetrend.pdf';
 a.hidden=true;d.body.appendChild(a);a.click();a.remove();
 w.setTimeout(()=>w.URL.revokeObjectURL(uri),60000);
 status('A PDF letöltését elindítottuk a te koppintásodra.');
}
function init(){if(!$('bkkPdfOverlay'))return;
 d.addEventListener('click',e=>{const b=e.target.closest?.('[data-bkk-schedule]');if(b){e.preventDefault();open(b.dataset.routeId)}});
 $('bkkPdfClose').addEventListener('click',close);
 $('bkkPdfLoad').addEventListener('click',load);
 $('bkkPdfPaste').addEventListener('click',pasteOfficialLink);
 $('bkkPdfCopyRoute').addEventListener('click',copyRoute);
 $('bkkPdfDownload').addEventListener('click',download);
 $('bkkPdfUrl').addEventListener('keydown',e=>{if(e.key==='Enter')load()});
 $('bkkPdfPrev').addEventListener('click',()=>{if(documentPdf&&page>1){page--;render()}});
 $('bkkPdfNext').addEventListener('click',()=>{if(documentPdf&&page<documentPdf.numPages){page++;render()}});
 $('bkkPdfMinus').addEventListener('click',()=>{if(documentPdf){scale=Math.max(.7,scale-.15);render()}});
 $('bkkPdfPlus').addEventListener('click',()=>{if(documentPdf){scale=Math.min(2.5,scale+.15);render()}});
 d.addEventListener('keydown',e=>{
  const overlay=$('bkkPdfOverlay');if(overlay.hidden)return;
  if(e.key==='Escape'){e.preventDefault();close();return}
  if(e.key==='Tab'){
   const targets=[...overlay.querySelectorAll('a[href],button:not([disabled]),input')].filter(el=>!el.hidden&&el.getClientRects().length>0);
   if(!targets.length)return;
   const first=targets[0],last=targets[targets.length-1];
   if(e.shiftKey&&d.activeElement===first){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&d.activeElement===last){e.preventDefault();first.focus()}
  }
 });
 $('bkkPdfOverlay').addEventListener('click',e=>{if(e.target===$('bkkPdfOverlay'))close()});
 w.addEventListener('resize',()=>{if(documentPdf&&!$('bkkPdfOverlay').hidden&&!$('bkkPdfReader').hidden)render()});
}
if(d){if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();}
if(typeof module==='object'&&module.exports)module.exports={validateOfficialPdf};
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);