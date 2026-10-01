(function(){
'use strict';
/* HealthHub v1.67 — Health Connect aware measurement deletion */
var DB='healthhub-healthradar-v2', IGNORE_KEY='hh-hc-ignore-v1';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function one(id){var db=await openDb();try{return await reqP(db.transaction('measurements').objectStore('measurements').get(id))}finally{db.close()}}
async function del(id){var db=await openDb();try{await reqP(db.transaction('measurements','readwrite').objectStore('measurements').delete(id))}finally{db.close()}}
function readIgnore(){try{var x=JSON.parse(localStorage.getItem(IGNORE_KEY)||'null');return x&&typeof x==='object'?x:{zsolt:[],monika:[]}}catch(e){return {zsolt:[],monika:[]}}}
function saveIgnore(x){localStorage.setItem(IGNORE_KEY,JSON.stringify(x))}
function ignoreToken(x){return String(x&&x.sourceRecordId||x&&x.id||'')}
function addIgnore(x){
 var all=readIgnore(),p=x.profile==='monika'?'monika':'zsolt',token=ignoreToken(x);if(!token)return;
 all[p]=Array.isArray(all[p])?all[p]:[];
 if(!all[p].some(function(i){return i.token===token}))all[p].push({token:token,sourceRecordId:x.sourceRecordId||null,id:x.id||null,deletedAt:new Date().toISOString(),notes:x.notes||''});
 saveIgnore(all);
}
window.hhShouldIgnoreHealthConnect=function(profile,x){
 var all=readIgnore(),a=Array.isArray(all[profile])?all[profile]:[],token=ignoreToken(x);
 return !!token&&a.some(function(i){return i.token===token||i.sourceRecordId&&i.sourceRecordId===x.sourceRecordId||i.id&&i.id===x.id});
};
window.hhGetHealthConnectIgnoreList=function(profile){var a=readIgnore();return Array.isArray(a[profile])?a[profile]:[]};
window.hhMergeHealthConnectIgnoreList=function(profile,items){
 var all=readIgnore(),cur=Array.isArray(all[profile])?all[profile]:[];
 (Array.isArray(items)?items:[]).forEach(function(i){if(i&&i.token&&!cur.some(function(x){return x.token===i.token}))cur.push(i)});
 all[profile]=cur;saveIgnore(all);
};
async function purgeIgnored(profile){
 var all=window.hhGetHealthConnectIgnoreList(profile);if(!all.length)return;
 var db=await openDb();try{
  var tx=db.transaction('measurements','readwrite'),st=tx.objectStore('measurements'),rows=await reqP(st.getAll());
  rows.forEach(function(x){if(x&&x.profile===profile&&x.source==='health_connect'&&window.hhShouldIgnoreHealthConnect(profile,x))st.delete(x.id)});
  await new Promise(function(ok,no){tx.oncomplete=ok;tx.onerror=function(){no(tx.error)};tx.onabort=function(){no(tx.error)}});
 }finally{db.close()}
}
window.hhPurgeIgnoredHealthConnect=purgeIgnored;

function ensure(){
 if(document.getElementById('hhSmartDeleteOverlay'))return;
 var s=document.createElement('style');s.id='hh-v167-style';s.textContent=
 '.hhHcSourceBox{margin-top:10px;padding:10px;border-radius:12px;background:#eef7fb;border:1px solid #cfe2ed;color:#31536f;font-size:8px;line-height:1.45}.hhHcSourceBox b{display:block;color:#173f62;font-size:9px;margin-bottom:3px}.hhSmartDelOv{position:fixed;inset:0;background:#08203388;display:none;align-items:flex-end;z-index:290}.hhSmartDelOv.on{display:flex}.hhSmartDelSheet{width:min(100vw,680px);margin:auto;background:#f8fbfd;border-radius:24px 24px 0 0;padding:16px 14px calc(20px + env(safe-area-inset-bottom))}.hhSmartDelSheet h3{margin:4px 0 8px}.hhSmartDelSheet p{font-size:9px;line-height:1.5;color:#526b80}.hhSmartDelActions{display:grid;gap:7px;margin-top:12px}.hhSmartDelActions button{border:0;border-radius:12px;padding:10px;font-weight:850;font-size:9px}.hhSmartDelKeep{background:#eef5fa;color:#31536f}.hhSmartDelBlock{background:#a94352;color:#fff}.hhSmartDelCancel{background:#fff;border:1px solid #d9e5ee!important;color:#60788d}';
 document.head.appendChild(s);
 var o=document.createElement('div');o.id='hhSmartDeleteOverlay';o.className='hhSmartDelOv';o.onclick=function(e){if(e.target===o)o.classList.remove('on')};o.innerHTML='<div class="hhSmartDelSheet"><small>HEALTH CONNECT · TÖRLÉS</small><h3>Téves mérés kezelése</h3><div id="hhSmartDeleteBody"></div></div>';document.body.appendChild(o);
}
var pending=null;
window.hhDeleteMeasurementSmart=async function(id){
 var x=await one(id);if(!x)return;
 if(x.source!=='health_connect'){
  if(!confirm('Biztosan törlöd ezt a mérést? A bejegyzés eltűnik a naplóból és a grafikonról.'))return;
  await finishDelete(x,false);return;
 }
 ensure();pending=x;
 var src=x.notes||'Health Connect',rid=x.sourceRecordId||x.id||'nincs';
 document.getElementById('hhSmartDeleteBody').innerHTML=
  '<p><b>Forrás:</b> '+esc(src)+'<br><b>Forrás rekordazonosító:</b> '+esc(rid)+'</p>'+
  '<p>Ez a mérés Health Connectből érkezett. Ha az eredeti forrásban még létezik, egy későbbi szinkron újra behozhatja.</p>'+
  '<div class="hhSmartDelActions">'+
  '<button class="hhSmartDelKeep" onclick="hhConfirmSmartDelete(false)">Törlés csak HealthHubból</button>'+
  '<button class="hhSmartDelBlock" onclick="hhConfirmSmartDelete(true)">Törlés + ne importáld újra</button>'+
  '<button class="hhSmartDelCancel" onclick="hhCloseSmartDelete()">Mégse</button></div>';
 document.getElementById('hhSmartDeleteOverlay').classList.add('on');
};
window.hhCloseSmartDelete=function(){pending=null;document.getElementById('hhSmartDeleteOverlay')?.classList.remove('on')};
window.hhConfirmSmartDelete=async function(block){
 if(!pending)return;var x=pending;pending=null;document.getElementById('hhSmartDeleteOverlay')?.classList.remove('on');
 await finishDelete(x,!!block);
};
async function finishDelete(x,block){
 try{
  if(block)addIgnore(x);
  await del(x.id);
  if(window.hhCloseMeasurement)window.hhCloseMeasurement();
  if(window.hhDropboxPushCurrentProfile){try{await window.hhDropboxPushCurrentProfile()}catch(e){console.warn(e)}}
  toast(block?'Mérés törölve · újraimportálás tiltva':'Mérés törölve a HealthHubból');
  if(window.renderHealthSection)await window.renderHealthSection();
  if(window.hhSyncFullMigrationDashboard)window.hhSyncFullMigrationDashboard();
 }catch(e){console.error(e);toast('A mérés nem törölhető.')}
}
var originalOpen=window.hhOpenMeasurement;
if(typeof originalOpen==='function'){
 window.hhOpenMeasurement=async function(id){
  var r=await originalOpen.apply(this,arguments);
  if(!id)return r;
  var x=await one(id),body=document.getElementById('hhMcBody');if(!x||!body)return r;
  if(x.source==='health_connect'){
   var source=document.createElement('div');source.className='hhHcSourceBox';
   source.innerHTML='<b>Health Connect forrás</b>'+esc(x.notes||'Health Connect')+'<br>Rekordazonosító: '+esc(x.sourceRecordId||x.id||'nincs')+'<br><span>Ha az eredeti forrásban még megvan, sima törlés után visszatérhet.</span>';
   var actions=body.querySelector('.hhCrudActions');if(actions)body.insertBefore(source,actions);
  }
  var delBtn=body.querySelector('.hhCrudBtn.danger');
  if(delBtn){delBtn.setAttribute('onclick',"hhDeleteMeasurementSmart('"+String(id).replace(/'/g,"\\'")+"')");delBtn.textContent=x.source==='health_connect'?'Health Connect mérés törlése':'Mérés törlése'}
  return r;
 };
}
ensure();
document.documentElement.dataset.healthhubSmartDelete='1.67';
})();