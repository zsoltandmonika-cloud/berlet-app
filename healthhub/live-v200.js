(function(){
'use strict';
/* HealthHub v1.100 — documents-only TAR recovery */

var DB='healthhub-healthradar-v2', VER=1, META_KEY='full-migration';

function toastMsg(s){try{window.toast&&window.toast(s)}catch(e){}}
function reqP(req){return new Promise(function(resolve,reject){req.onsuccess=function(){resolve(req.result)};req.onerror=function(){reject(req.error)}})}
function openDb(){
 return new Promise(function(resolve,reject){
  var r=indexedDB.open(DB,VER);
  r.onupgradeneeded=function(){
   var db=r.result;
   if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'});
   if(!db.objectStoreNames.contains('documents')){var s=db.createObjectStore('documents',{keyPath:'id'});s.createIndex('profile','profile',{unique:false})}
   if(!db.objectStoreNames.contains('documentBlobs'))db.createObjectStore('documentBlobs',{keyPath:'id'});
  };
  r.onsuccess=function(){resolve(r.result)};
  r.onerror=function(){reject(r.error)};
 })
}
function tarString(bytes,off,len){var end=off;while(end<off+len&&bytes[end]!==0)end++;return new TextDecoder().decode(bytes.subarray(off,end)).trim()}
function tarOct(bytes,off,len){var s=tarString(bytes,off,len).replace(/\0/g,'').trim();return parseInt(s||'0',8)||0}
function parseTar(buf){
 var bytes=new Uint8Array(buf),out=[],off=0;
 while(off+512<=bytes.length){
  var zero=true;for(var i=off;i<off+512;i++){if(bytes[i]!==0){zero=false;break}}if(zero)break;
  var name=tarString(bytes,off,100),size=tarOct(bytes,off+124,12),type=String.fromCharCode(bytes[off+156]||48);
  var start=off+512,end=start+size;if(end>bytes.length)throw new Error('A TAR fájl csonka vagy sérült.');
  if(name&&type!=='5')out.push({name:name,size:size,bytes:bytes.slice(start,end)});
  off=start+Math.ceil(size/512)*512;
 }
 return out;
}
function jsonEntry(entries,name){
 var e=entries.find(function(x){return x.name===name});
 if(!e)throw new Error('Hiányzó fájl: '+name);
 return JSON.parse(new TextDecoder().decode(e.bytes));
}
function ensureInput(){
 if(document.getElementById('hhDocsRecoveryFile'))return;
 var i=document.createElement('input');i.type='file';i.id='hhDocsRecoveryFile';i.accept='.tar,application/x-tar';i.style.display='none';
 i.addEventListener('change',async function(ev){
  var file=ev.target.files&&ev.target.files[0];if(!file)return;
  try{
   toastMsg('Leletek helyreállítása…');
   var entries=parseTar(await file.arrayBuffer());
   var docJson=jsonEntry(entries,'data/documents.json'),docs=docJson.documents||[];
   if(!docs.length)throw new Error('A documents.json nem tartalmaz leleteket.');
   var blobById=new Map();
   entries.forEach(function(e){
    if(e.name.indexOf('documents/')!==0)return;
    var m=e.name.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if(m)blobById.set(m[0],new Blob([e.bytes],{type:'application/pdf'}));
   });
   var db=await openDb(),oldMeta=null;
   try{oldMeta=await reqP(db.transaction('meta','readonly').objectStore('meta').get(META_KEY))}catch(_){}
   await new Promise(function(ok,no){
    var tx=db.transaction(['meta','documents','documentBlobs'],'readwrite'),ds=tx.objectStore('documents'),bs=tx.objectStore('documentBlobs');
    docs.forEach(function(d){ds.put(d);var b=blobById.get(d.id);if(b)bs.put({id:d.id,blob:b})});
    var counts=Object.assign({},oldMeta&&oldMeta.counts||{});
    counts.documents=docs.length;counts.documentFiles=blobById.size;counts.documentFilesMissing=docs.length-blobById.size;
    tx.objectStore('meta').put(Object.assign({},oldMeta||{},{
      key:META_KEY,
      importedAt:new Date().toISOString(),
      sourceFileName:file.name,
      recoveryMode:'documents-only',
      counts:counts
    }));
    tx.oncomplete=ok;tx.onerror=function(){no(tx.error)};tx.onabort=function(){no(tx.error||new Error('A helyreállítás megszakadt.'))};
   });
   db.close();
   toastMsg('Leletek helyreállítva: '+docs.length+' tétel · '+blobById.size+' PDF');
   setTimeout(function(){try{window.renderHealthSection&&window.renderHealthSection()}catch(e){}},80);
  }catch(e){console.error(e);toastMsg('Lelet-helyreállítási hiba: '+(e.message||e))}
  finally{try{ev.target.value=''}catch(_){}}
 });
 document.body.appendChild(i);
}
function recoveryCard(){
 return '<div id="hhDocsRecoveryCard" class="hrSectionCard" style="border:1px solid #ffd3df;background:linear-gradient(180deg,#fff,#fff9fb)">'+
 '<h3>🛟 Leletek helyreállítása</h3>'+
 '<p class="privacyNote" style="margin-top:4px">Csak a lelet-indexet és az eredeti dokumentumfájlokat állítja vissza a teljes TAR mentésből. A Health Connect / Activity, mérések, időpontok és profiladatok nem kerülnek felülírásra.</p>'+
 '<button class="vaultBtn primary" style="width:100%;margin-top:8px" onclick="hhRestoreDocumentsOnly()">Csak leletek visszaállítása (.tar)</button>'+
 '</div>';
}
function decorate(){
 ensureInput();
 if(window.healthSectionKind!=='records'&&window.healthSectionKind!=='more')return;
 var c=document.getElementById('healthSubContent');if(!c||document.getElementById('hhDocsRecoveryCard'))return;
 c.insertAdjacentHTML('afterbegin',recoveryCard());
}
window.hhRestoreDocumentsOnly=function(){ensureInput();document.getElementById('hhDocsRecoveryFile').click()};

var prev=window.renderHealthSection;
if(typeof prev==='function'){
 window.renderHealthSection=async function(){
  var r=await prev.apply(this,arguments);setTimeout(decorate,20);return r;
 };
}
setTimeout(decorate,500);
document.documentElement.dataset.healthhubDocumentRecovery='1.100.1';
window.HH_LIVE_BUILD='v1.100-documents-recovery';
})();