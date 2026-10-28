/* SH9 BKK PDF viewer v923. Reuses the HealthHub PDF.js 4.10.38 renderer technology.
 * Does NOT import the medical document viewer, its private records, or IndexedDB.
 * No background polling, no stored PDF snapshots. User chooses official BKK PDF source.
 */
(function(w,d){'use strict';
const ROOT='https://bkk.hu/menetrendek/';
const PDFJS='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const WORKER='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
const $=id=>d.getElementById(id);
let libPromise=null,documentPdf=null,page=1,scale=1,serial=0,activeRender=null,lastFocus=null;
function validateOfficialPdf(raw){
 try{const url=new URL(String(raw||'').trim());
  if(url.protocol!=='https:'||!['bkk.hu','www.bkk.hu'].includes(url.hostname)||!url.pathname.toLowerCase().endsWith('.pdf')||url.username||url.password)return null;
  return url.href;
 }catch(_){return null}
}
function status(message){if($('bkkPdfStatus'))$('bkkPdfStatus').textContent=message}
function reset(){serial++;try{activeRender?.cancel()}catch(_){}activeRender=null;
 try{documentPdf?.destroy()}catch(_){}documentPdf=null;page=1;scale=1;
 const c=$('bkkPdfCanvas');if(c){c.width=0;c.height=0}
 if($('bkkPdfReader'))$('bkkPdfReader').hidden=true;
 if($('bkkPdfUrl'))$('bkkPdfUrl').value='';status('');}
function open(id){const overlay=$('bkkPdfOverlay');if(!overlay)return;
 reset();lastFocus=d.activeElement;
 const safe=String(id||'').slice(0,16).replace(/[^\p{L}\p{N}-]/gu,'');
 $('bkkPdfTitle').textContent=(safe||'BKK')+' · menetrend';
 $('bkkPdfHint').textContent='A '+(safe||'kiválasztott')+' járat aktuális hivatalos menetrendjét a BKK oldalán válaszd ki. A PDF-link a HealthHub olvasójában is megnyitható, ha a forrás engedi.';
 $('bkkPdfOfficial').href=ROOT;overlay.hidden=false;d.body.classList.add('bkk-pdf-open');$('bkkPdfClose').focus();
}
function close(){const overlay=$('bkkPdfOverlay');if(!overlay)return;
 reset();overlay.hidden=true;d.body.classList.remove('bkk-pdf-open');lastFocus?.focus?.();}
function engine(){if(!libPromise)libPromise=import(PDFJS).then(lib=>{lib.GlobalWorkerOptions.workerSrc=WORKER;return lib}).catch(e=>{libPromise=null;throw e});return libPromise}
async function render(){const doc=documentPdf;if(!doc)return;const thisSerial=serial;
 if(activeRender){try{activeRender.cancel()}catch(_){}activeRender=null}
 const p=await doc.getPage(page);if(thisSerial!==serial||doc!==documentPdf)return;
 const canvas=$('bkkPdfCanvas'),wrap=canvas.parentElement,base=p.getViewport({scale:1});
 const width=Math.max(280,wrap.clientWidth-20);const ratio=(width/base.width)*scale;
 const viewport=p.getViewport({scale:ratio}),dpr=Math.min(w.devicePixelRatio||1,2);
 canvas.width=Math.round(viewport.width*dpr);canvas.height=Math.round(viewport.height*dpr);
 canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
 const ctx=canvas.getContext('2d');const task=p.render({canvasContext:ctx,viewport,transform:[dpr,0,0,dpr,0,0]});activeRender=task;
 try{await task.promise}catch(err){if(err?.name!=='RenderingCancelledException')status('A PDF-oldal megjelenítése nem sikerült.')}
 if(activeRender===task)activeRender=null;
 $('bkkPdfPages').textContent=page+' / '+doc.numPages;
 $('bkkPdfZoom').textContent=Math.round(scale*100)+'%';
 $('bkkPdfPrev').disabled=page<=1;$('bkkPdfNext').disabled=page>=doc.numPages;
}
async function load(){const url=validateOfficialPdf($('bkkPdfUrl').value);
 if(!url){status('Csak a BKK hivatalos, https://bkk.hu/… végű PDF-hivatkozása nyitható meg.');return}
 const self=++serial;status('Hivatalos PDF beolvasása…');$('bkkPdfReader').hidden=true;
 try{const resp=await fetch(url,{cache:'no-store',credentials:'omit',redirect:'follow'});
  if(!resp.ok)throw Error('A BKK PDF-forrás '+resp.status+' hibát adott.');
  if(!/^https:\/\/(?:www\.)?bkk\.hu\//.test(resp.url))throw Error('A PDF nem engedélyezett oldalra irányított át.');
  const len=Number(resp.headers.get('content-length'))||0;if(len>15*1024*1024)throw Error('A PDF túl nagy (max. 15 MB).');
  const bytes=new Uint8Array(await resp.arrayBuffer());
  if(self!==serial)return;
  if(bytes.length>15*1024*1024||bytes.length<5||String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw Error('A BKK nem érvényes PDF-et adott vissza.');
  const lib=await engine();if(self!==serial)return;
  documentPdf=await lib.getDocument({data:bytes}).promise;if(self!==serial)return;
  page=1;scale=1;$('bkkPdfReader').hidden=false;status('Hivatalos BKK PDF · csak ideiglenes memóriában.');await render();
 }catch(e){if(self!==serial)return;status('A PDF itt nem nyitható meg ('+(e instanceof TypeError?'a forrás böngészős hozzáférése blokkolt':e.message||'ismeretlen hiba')+'). A hivatalos BKK-oldalt továbbra is megnyithatod.');}
}
function init(){if(!$('bkkPdfOverlay'))return;
 d.addEventListener('click',e=>{const b=e.target.closest?.('[data-bkk-schedule]');if(b){e.preventDefault();open(b.dataset.routeId)}});
 $('bkkPdfClose').addEventListener('click',close);
 $('bkkPdfLoad').addEventListener('click',load);
 $('bkkPdfUrl').addEventListener('keydown',e=>{if(e.key==='Enter')load()});
 $('bkkPdfPrev').addEventListener('click',()=>{if(documentPdf&&page>1){page--;render()}});
 $('bkkPdfNext').addEventListener('click',()=>{if(documentPdf&&page<documentPdf.numPages){page++;render()}});
 $('bkkPdfMinus').addEventListener('click',()=>{if(documentPdf){scale=Math.max(.7,scale-.15);render()}});
 $('bkkPdfPlus').addEventListener('click',()=>{if(documentPdf){scale=Math.min(2.5,scale+.15);render()}});
 d.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('bkkPdfOverlay').hidden)close()});
 $('bkkPdfOverlay').addEventListener('click',e=>{if(e.target===$('bkkPdfOverlay'))close()});
}
if(d){if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();}
if(typeof module==='object'&&module.exports)module.exports={validateOfficialPdf};
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);