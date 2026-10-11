(function(){
'use strict';
/* HealthHub v392 · user-initiated Share + Print
 * Never upload source files, copy authenticated URLs, or share a private
 * HealthHub page link. A shared document is the actual local PDF/image.
 * A shared Ask Léna item is the currently displayed question + full answer.
 */
var DB='healthhub-healthradar-v2';
function activeProfile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function profileName(p){return p==='monika'?'Mónika':'Zsolt'}
function byId(x){return document.getElementById(x)}
function clean(s){return String(s==null?'':s).replace(/\r/g,'').trim()}
function html(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){
 return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
})}
function toast(msg){
 if(typeof window.toast==='function')try{window.toast(msg);return}catch(e){}
 if(typeof window.alert==='function')window.alert(msg);
}
function isCancel(error){return !!(error&&['AbortError','NotAllowedError'].includes(error.name))}
function permitted(d,p){return !!(d&&['monika','zsolt'].includes(p)&&d.profile===p)}
function answerText(record){
 if(!record||!['monika','zsolt'].includes(record.profile)||!clean(record.question)||!clean(record.answer))return '';
 return 'HEALTHHUB · ASK LÉNA\nProfil: '+profileName(record.profile)+
  (record.generatedAt?'\nIdőpont: '+record.generatedAt:'')+
  '\n\nKÉRDÉS\n'+clean(record.question)+'\n\nLÉNA VÁLASZA\n'+clean(record.answer)+
  (clean(record.sources)?'\n\nFORRÁSOK / ELLENŐRZÉSEK\n'+clean(record.sources):'');
}
function printMarkup(record){
 var parts=[
  '<!doctype html><html lang="hu"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>HealthHub · Ask Léna · '+html(profileName(record.profile))+'</title>',
  '<style>body{font-family:Arial,Helvetica,sans-serif;color:#1c3548;background:#fff;max-width:800px;margin:28px auto;padding:0 24px;line-height:1.62}',
  'h1{font-size:22px;color:#186b69;margin-bottom:4px}.meta{font-size:12px;color:#526978;padding-bottom:14px;border-bottom:2px solid #dbe8ed}',
  'h2{font-size:15px;color:#186b69;margin:25px 0 8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;font:inherit;margin:0}',
  '.sources{font-size:12px;border-top:1px solid #ddd;margin-top:24px;padding-top:10px;color:#486477}',
  '.toolbar{margin:0 0 20px}.toolbar button{padding:10px;border:1px solid #b2c8d1;background:#e9f6f8;border-radius:10px}',
  '@media print{body{max-width:none;margin:0;padding:0;font-size:11pt}.toolbar{display:none!important}h2{break-after:avoid}pre{white-space:pre-wrap}}</style>',
  '</head><body><div class="toolbar"><button onclick="window.print()">🖨️ Nyomtatás / Mentés PDF-ként</button></div>',
  '<h1>HealthHub · Ask Léna</h1><p class="meta">Profil: '+html(profileName(record.profile))+
  (record.generatedAt?' · '+html(record.generatedAt):'')+'</p>',
  '<h2>Kérdés</h2><pre>'+html(record.question)+'</pre>',
  '<h2>Léna válasza</h2><pre>'+html(record.answer)+'</pre>'
 ];
 if(record.sources)parts.push('<section class="sources"><h2>Források és ellenőrzések</h2><pre>'+html(record.sources)+'</pre></section>');
 parts.push('</body></html>');
 return parts.join('');
}
function currentAnswer(){
 var box=byId('hhAi331Answer'),q=byId('hhSQ299'),answer=byId('hhAi331Text');
 if(!box||!q||!answer||!box.classList.contains('on'))return null;
 var p=box.dataset.profile;
 if(!['monika','zsolt'].includes(p)||p!==activeProfile())return null;
 var record={profile:p,question:clean(q.value),answer:clean(answer.innerText||answer.textContent),
  sources:clean((byId('hhAi331Foot')||{}).innerText||''),generatedAt:new Date().toLocaleString('hu-HU')};
 return answerText(record)?record:null;
}
async function textShare(record){
 var value=answerText(record);if(!value){toast('Nincs kész kérdés–válasz ezen a profilon.');return false}
 try{
  if(navigator.share){await navigator.share({title:'HealthHub · Ask Léna',text:value});return true}
 }catch(e){if(isCancel(e))return false}
 try{
  if(navigator.clipboard&&navigator.clipboard.writeText){
   await navigator.clipboard.writeText(value);
   toast('A teljes kérdés és válasz a vágólapra másolva. Beillesztheted egy üzenetbe.');
   return true;
  }
  var textarea=document.createElement('textarea');
  textarea.value=value;textarea.style.cssText='position:fixed;left:-5000px;top:0';
  document.body.appendChild(textarea);textarea.select();
  var copied=document.execCommand('copy');textarea.remove();
  if(copied){toast('Kérdés és válasz másolva a vágólapra.');return true}
 }catch(e){}
 toast('Megosztás nem támogatott ezen a böngészőn. A nyomtatás funkcióval PDF-ként is mentheted.');
 return false;
}
function showPrint(record){
 if(!answerText(record))return false;
 // The window must open in the same user gesture to avoid Android popup blockers.
 var w=window.open('','_blank');
 if(!w){toast('A böngésző letiltotta a nyomtatási ablakot. Engedélyezd a felugró ablakokat.');return false}
 try{
  w.document.open();w.document.write(printMarkup(record));w.document.close();
  w.focus();setTimeout(function(){try{if(!w.closed)w.print()}catch(e){}},500);
  return true;
 }catch(e){try{w.close()}catch(_){}toast('A nyomtatási nézet nem nyitható meg.');return false}
}
function reqP(q){return new Promise(function(resolve,reject){q.onsuccess=function(){resolve(q.result)};q.onerror=function(){reject(q.error)}})}
function dbOpen(){return new Promise(function(resolve,reject){
 var q=indexedDB.open(DB,1);q.onsuccess=function(){resolve(q.result)};q.onerror=function(){reject(q.error)}
})}
async function readDoc(id,p){
 if(p!==activeProfile())throw Error('Profilváltás történt. A lelet megosztását megszakítottam.');
 var db=await dbOpen(),d,b;
 try{
  if(!db.objectStoreNames.contains('documents')||!db.objectStoreNames.contains('documentBlobs'))
   throw Error('Nem érhető el a leletek helyi tára.');
  var tx=db.transaction(['documents','documentBlobs'],'readonly');
  var results=await Promise.all([
   reqP(tx.objectStore('documents').get(id)),
   reqP(tx.objectStore('documentBlobs').get(id))
  ]);
  d=results[0];b=results[1];
 }finally{db.close()}
 if(!permitted(d,p)||p!==activeProfile())throw Error('A dokumentum másik profilhoz tartozik. Előbb válts a megfelelő profilra.');
 if(!b||!(b.blob instanceof Blob))throw Error('Az eredeti leletfájl nincs ezen az eszközön.');
 return {title:String(d.originalName||d.title||'lelet.pdf'),blob:b.blob,profile:d.profile};
}
function fileFrom(item){
 var name=item.title.replace(/[\\/\u0000-\u001f]/g,'_').slice(0,160)||'lelet.pdf';
 var pdf=/\.pdf$/i.test(name)||item.blob.type==='application/pdf';
 var type=item.blob.type||(pdf?'application/pdf':'application/octet-stream');
 return new File([item.blob],name,{type:type});
}
function downloadFile(item){
 var file=fileFrom(item),url=URL.createObjectURL(file),a=document.createElement('a');
 a.href=url;a.download=file.name;a.style.display='none';document.body.appendChild(a);
 a.click();setTimeout(function(){a.remove();URL.revokeObjectURL(url)},60000);
}
async function documentShare(id){
 var p=activeProfile();
 try{
  var item=await readDoc(id,p);
  if(p!==activeProfile())return false;
  var file=fileFrom(item),args={files:[file],title:file.name,text:'HealthHub · eredeti egészségügyi lelet'};
  if(navigator.share&&(!navigator.canShare||navigator.canShare(args))){
   try{await navigator.share(args);return true}catch(e){if(isCancel(e))return false}
  }
  if(p!==activeProfile())return false;
  downloadFile(item);
  toast('A lelet letöltve. A fájlt a telefon Megosztás funkciójával továbbíthatod.');
  return true;
 }catch(e){toast('Megosztás: '+clean(e.message||e));return false}
}
function documentPrint(id){
 var p=activeProfile();
 // Open synchronously so the mobile browser does not suppress the print tab.
 var w=window.open('','_blank');
 if(!w){toast('A böngésző letiltotta a nyomtatási ablakot.');return Promise.resolve(false)}
 try{w.document.write('<!doctype html><html lang="hu"><meta charset="utf-8"><title>Lelet nyomtatása</title><body style="font:16px Arial;padding:30px">Az eredeti lelet előkészítése nyomtatáshoz…</body></html>');w.document.close()}catch(e){}
 return readDoc(id,p).then(function(item){
  if(p!==activeProfile()){w.close();return false}
  var f=fileFrom(item),url=URL.createObjectURL(f),pdf=f.type==='application/pdf'||/\.pdf$/i.test(f.name);
  if(pdf){
   // Navigate to the FULL native PDF (all pages), never print a preview canvas.
   w.location.replace(url);
   setTimeout(function(){try{if(!w.closed){w.focus();w.print()}}catch(e){}},1800);
  }else if(/^image\//.test(f.type)){
   w.document.open();w.document.write('<!doctype html><html lang="hu"><meta charset="utf-8"><title>'+
    html(f.name)+'</title><style>body{margin:0;text-align:center}img{max-width:100%;height:auto;max-height:95vh}@media print{img{max-height:none}}</style>'+
    '<img id="doc" alt="Eredeti lelet" src="'+html(url)+'">');w.document.close();
   var img=w.document.getElementById('doc');if(img)img.onload=function(){try{w.focus();w.print()}catch(e){}};
  }else{
   w.location.replace(url);toast('A dokumentum megnyílt. Használd a böngésző Nyomtatás funkcióját.');
  }
  setTimeout(function(){URL.revokeObjectURL(url)},180000);
  return true;
 }).catch(function(e){try{w.close()}catch(_){}
  toast('Nyomtatás: '+clean(e.message||e));return false});
}
function css(){
 if(byId('hhSharePrint392Css'))return;
 var style=document.createElement('style');style.id='hhSharePrint392Css';
 style.textContent=
 '.hhSharePrintAsk392{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 15px}'+
 '.hhSharePrintAsk392 button,.hhPdfSharePrint392 button{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid #bed9e1;background:#fff;color:#246078;border-radius:12px;min-height:38px;padding:7px 12px;font-size:12px;font-weight:800;cursor:pointer}'+
 '#hhAi331Answer[data-profile="monika"] .hhSharePrintAsk392 button{border-color:#eac5d9;color:#a43f72;background:#fff8fb}'+
 '.hhPdfSharePrint392{position:absolute;z-index:5;left:9px;top:calc(10px + env(safe-area-inset-top));display:flex;gap:5px}'+
 '.hhPdfSharePrint392 button{border-radius:16px;min-height:40px;padding:6px 8px;font-size:11px;background:rgba(255,255,255,.91);box-shadow:0 2px 9px #173d5822}'+
 '@media(max-width:375px){.hhPdfSharePrint392 button{font-size:10px;padding:5px 6px}}'+
 '@media print{.hhSharePrintAsk392,.hhPdfSharePrint392{display:none!important}}';
 document.head.appendChild(style);
}
function mountAsk(){
 var box=byId('hhAi331Answer'),heading=byId('hhAi331Heading');if(!box||!heading)return;
 css();
 if(!byId('hhAskSharePrint392')){
  var bar=document.createElement('div');bar.id='hhAskSharePrint392';bar.className='hhSharePrintAsk392';
  var share=document.createElement('button');share.type='button';share.textContent='📤 Megosztás';
  share.setAttribute('aria-label','Ask Léna kérdés és válasz megosztása');
  share.onclick=function(){var r=currentAnswer();if(r)textShare(r);else toast('Nincs kész válasz a kiválasztott profilon.')};
  var print=document.createElement('button');print.type='button';print.textContent='🖨️ Nyomtatás';
  print.setAttribute('aria-label','Ask Léna kérdés és válasz nyomtatása');
  print.onclick=function(){var r=currentAnswer();if(r)showPrint(r);else toast('Nincs kész válasz a kiválasztott profilon.')};
  bar.appendChild(share);bar.appendChild(print);heading.insertAdjacentElement('afterend',bar);
 }
}
function mountViewer(){
 var hero=document.querySelector('#hhOriginalDocViewer .hhPdfHero');if(!hero||byId('hhPdfSharePrint392'))return;
 css();
 var bar=document.createElement('div');bar.id='hhPdfSharePrint392';bar.className='hhPdfSharePrint392';
 var share=document.createElement('button');share.type='button';share.textContent='📤 Megosztás';
 share.setAttribute('aria-label','Eredeti leletfájl megosztása');
 share.onclick=function(){var id=window.hhDocCurrentIdV392&&window.hhDocCurrentIdV392();if(id)documentShare(id);else toast('Előbb nyiss meg egy leletet.')};
 var print=document.createElement('button');print.type='button';print.textContent='🖨️ Nyomtatás';
 print.setAttribute('aria-label','Teljes eredeti lelet nyomtatása');
 print.onclick=function(){var id=window.hhDocCurrentIdV392&&window.hhDocCurrentIdV392();if(id)documentPrint(id);else toast('Előbb nyiss meg egy leletet.')};
 bar.appendChild(share);bar.appendChild(print);hero.appendChild(bar);
}
window.hhAskLenaShareV392=function(){var r=currentAnswer();return r?textShare(r):Promise.resolve(false)};
window.hhAskLenaPrintV392=function(){var r=currentAnswer();return !!(r&&showPrint(r))};
window.hhDocShareV392=documentShare;
window.hhDocPrintV392=documentPrint;
window.HH_SHARE_PRINT_V392={formatAnswer:answerText,printMarkup:printMarkup,permitted:permitted,
 mountAsk:mountAsk,mountViewer:mountViewer,version:'392'};
window.addEventListener('healthhub:ask-lena-open',mountAsk);
window.addEventListener('healthhub:profile-changed',function(){mountAsk();mountViewer()});
document.addEventListener('DOMContentLoaded',function(){mountViewer();mountAsk()},{once:true});
mountViewer();mountAsk();
})();