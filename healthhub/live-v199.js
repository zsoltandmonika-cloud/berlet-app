(function(){
'use strict';
/* HealthHub v1.99 — in-app original document viewer */

var DB_NAME='healthhub-healthradar-v2';
var current={id:null,name:'document.pdf',url:null,blob:null,type:null};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toastMsg(s){try{window.toast&&window.toast(s)}catch(e){}}
function reqP(req){return new Promise(function(resolve,reject){req.onsuccess=function(){resolve(req.result)};req.onerror=function(){reject(req.error)}})}
function openDb(){return new Promise(function(resolve,reject){var r=indexedDB.open(DB_NAME,1);r.onsuccess=function(){resolve(r.result)};r.onerror=function(){reject(r.error)}})}
async function one(store,key){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).get(key))}finally{db.close()}}
function ext(name){var m=String(name||'').toLowerCase().match(/\.([a-z0-9]+)$/);return m?m[1]:''}
function closeUrl(){if(current.url){try{URL.revokeObjectURL(current.url)}catch(e){}current.url=null}}
function pdfBlob(blob,name){
 var t=String((blob&&blob.type)||'').toLowerCase();
 if(ext(name)==='pdf'&&t!=='application/pdf')return new Blob([blob],{type:'application/pdf'});
 return blob;
}

function ensure(){
 if(document.getElementById('hhOriginalDocViewer'))return;
 var o=document.createElement('div');o.id='hhOriginalDocViewer';o.className='hhOriginalDocViewer';
 o.innerHTML='<div class="hhDocViewerShell">'+
  '<div class="hhDocViewerTop"><div class="hhDocViewerTitle"><small>EREDETI LELET</small><b id="hhDocViewerName">Dokumentum</b></div>'+
  '<div class="hhDocViewerActions"><button type="button" onclick="hhOriginalDocExternal()" title="Megnyitás külön nézetben">↗</button><button type="button" onclick="hhOriginalDocDownload()" title="Letöltés">⬇</button><button type="button" class="close" onclick="hhCloseOriginalDoc()">×</button></div></div>'+
  '<div id="hhDocViewerBody" class="hhDocViewerBody"></div>'+
  '<div class="hhDocViewerBottom"><button type="button" onclick="hhOriginalDocExternal()">↗ Külön megnyitás</button><button type="button" onclick="hhOriginalDocDownload()">⬇ Letöltés</button></div>'+
  '</div>';
 document.body.appendChild(o);
}
function style(){
 if(document.getElementById('hh-v199-style'))return;
 var s=document.createElement('style');s.id='hh-v199-style';s.textContent=
 '.hhOriginalDocViewer{position:fixed;inset:0;z-index:12000;display:none;background:#eaf2f7;color:#173f62;font-family:system-ui,-apple-system,Segoe UI,sans-serif}.hhOriginalDocViewer.on{display:block}.hhDocViewerShell{height:100dvh;display:grid;grid-template-rows:auto 1fr auto;max-width:900px;margin:0 auto;background:#fff;box-shadow:0 0 35px rgba(18,48,72,.16)}.hhDocViewerTop{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:calc(9px + env(safe-area-inset-top)) 10px 9px;background:linear-gradient(180deg,#fff,#f6fbfe);border-bottom:1px solid #dfe8ee}.hhDocViewerTitle{min-width:0}.hhDocViewerTitle small{display:block;font-size:6.5px;letter-spacing:.12em;font-weight:900;color:#ff2f7f}.hhDocViewerTitle b{display:block;max-width:62vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;color:#173f62;margin-top:2px}.hhDocViewerActions{display:flex;gap:5px}.hhDocViewerActions button{width:34px;height:34px;border:0;border-radius:11px;background:#eef6fa;color:#315f7d;font-size:17px;font-weight:800}.hhDocViewerActions .close{background:#fff0f5;color:#e62f70;font-size:21px}.hhDocViewerBody{min-height:0;background:#dce5eb;position:relative;overflow:auto;-webkit-overflow-scrolling:touch}.hhDocViewerBody iframe{display:block;width:100%;height:100%;border:0;background:#fff}.hhDocViewerBody img{display:block;max-width:100%;height:auto;margin:0 auto;background:#fff}.hhDocViewerFallback{height:100%;display:grid;place-items:center;text-align:center;padding:24px;background:#f7fbfd}.hhDocViewerFallback div{max-width:320px}.hhDocViewerFallback b{display:block;font-size:16px;margin-bottom:7px}.hhDocViewerFallback p{font-size:10px;line-height:1.45;color:#71879a}.hhDocViewerBottom{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:8px 9px calc(8px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #dfe8ee}.hhDocViewerBottom button{height:40px;border:0;border-radius:12px;background:#eef6fa;color:#315f7d;font-size:8.5px;font-weight:900}.hhDocViewerBottom button:first-child{background:linear-gradient(135deg,#ff2f7f,#ff6a9f);color:#fff}@media(min-width:700px){.hhDocViewerTitle b{max-width:600px}.hhDocViewerBottom{display:none}}';
 document.head.appendChild(s);
}

window.openHrDocument=async function(id){
 ensure();style();
 try{
  var pair=await Promise.all([one('documents',id),one('documentBlobs',id)]),d=pair[0],x=pair[1];
  if(!x||!x.blob){toastMsg('A dokumentumfájl nem található.');return}
  closeUrl();
  var name=(d&&d.originalName)||'dokumentum.pdf',blob=pdfBlob(x.blob,name),type=String(blob.type||'').toLowerCase();
  current={id:id,name:name,url:URL.createObjectURL(blob),blob:blob,type:type};
  var n=document.getElementById('hhDocViewerName'),b=document.getElementById('hhDocViewerBody'),o=document.getElementById('hhOriginalDocViewer');
  if(n)n.textContent=name;
  if(type==='application/pdf'||ext(name)==='pdf'){
   b.innerHTML='<iframe title="'+esc(name)+'" src="'+current.url+'#toolbar=1&navpanes=0&view=FitH"></iframe>';
  }else if(type.indexOf('image/')===0||['jpg','jpeg','png','heic','heif','webp'].indexOf(ext(name))>=0){
   b.innerHTML='<img alt="'+esc(name)+'" src="'+current.url+'">';
  }else{
   b.innerHTML='<div class="hhDocViewerFallback"><div><b>Ez a fájl nem jeleníthető meg beágyazva.</b><p>Használd a Külön megnyitás vagy Letöltés gombot.</p></div></div>';
  }
  o.classList.add('on');
 }catch(e){console.error(e);toastMsg('A dokumentum nem nyitható meg.')}
};

window.hhCloseOriginalDoc=function(){
 var o=document.getElementById('hhOriginalDocViewer');if(o)o.classList.remove('on');
 var b=document.getElementById('hhDocViewerBody');if(b)b.innerHTML='';
 setTimeout(closeUrl,100);
};
window.hhOriginalDocDownload=function(){
 if(!current.url||!current.blob)return;
 var a=document.createElement('a');a.href=current.url;a.download=current.name||'dokumentum.pdf';a.style.display='none';
 document.body.appendChild(a);a.click();setTimeout(function(){a.remove()},50);
};
window.hhOriginalDocExternal=function(){
 if(!current.url)return;
 var w=window.open(current.url,'_blank');
 if(!w)toastMsg('A böngésző letiltotta az új ablakot.');
};

document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('hhOriginalDocViewer')?.classList.contains('on'))window.hhCloseOriginalDoc()});
ensure();style();
document.documentElement.dataset.healthhubDocumentViewer='1.99';
window.HH_LIVE_BUILD='v1.99-document-viewer';
})();
