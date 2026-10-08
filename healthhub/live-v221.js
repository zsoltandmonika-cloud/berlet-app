(function(){
'use strict';

/* HealthHub v1.232 — robust cross-device sync for HealthRadar device library. */

var DB='healthhub-device-library-v1', STORE='devices';
var syncing=false, editingId=null, observer=null;

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function pathFor(p){return '/HealthHub/devices/'+p+'-devices.json'}
function tombKey(p){return 'hh-device-deleted-'+p}
function lastKey(p){return 'hh-device-cloud-last-'+p}
function vault(){try{return window.HH_DROPBOX_VAULT||null}catch(e){return null}}
function connected(){var v=vault();try{return !!(v&&v.connected&&v.connected())}catch(e){return false}}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){
  var r=indexedDB.open(DB,1);
  r.onupgradeneeded=function(){
    var db=r.result;
    if(!db.objectStoreNames.contains(STORE)){
      var s=db.createObjectStore(STORE,{keyPath:'id'});
      s.createIndex('profile','profile',{unique:false});
    }
  };
  r.onsuccess=function(){ok(r.result)};
  r.onerror=function(){no(r.error)};
})}
async function allLocal(p){
  var db=await openDb();
  try{return await reqP(db.transaction(STORE,'readonly').objectStore(STORE).index('profile').getAll(p))||[]}
  finally{db.close()}
}
async function getLocal(id){
  var db=await openDb();
  try{return await reqP(db.transaction(STORE,'readonly').objectStore(STORE).get(id))}
  finally{db.close()}
}
async function putLocal(x){
  var db=await openDb();
  try{await reqP(db.transaction(STORE,'readwrite').objectStore(STORE).put(x))}
  finally{db.close()}
}
async function removeLocal(id){
  var db=await openDb();
  try{await reqP(db.transaction(STORE,'readwrite').objectStore(STORE).delete(id))}
  finally{db.close()}
}
function readTombs(p){try{return JSON.parse(localStorage.getItem(tombKey(p))||'{}')||{}}catch(e){return {}}}
function writeTombs(p,x){localStorage.setItem(tombKey(p),JSON.stringify(x||{}))}
function markDeleted(p,id){var t=readTombs(p);t[id]=new Date().toISOString();writeTombs(p,t)}
function clearDeleted(p,id){var t=readTombs(p);if(t[id]){delete t[id];writeTombs(p,t)}}
function dts(x){var n=Date.parse((x&&x.updatedAt)||(x&&x.deletedAt)||(x&&x.createdAt)||'');return Number.isFinite(n)?n:0}
function sts(s){var n=Date.parse(s||'');return Number.isFinite(n)?n:0}

function blobToDataUrl(blob){return new Promise(function(ok,no){
  if(!blob){ok('');return}
  var r=new FileReader();
  r.onload=function(){ok(String(r.result||''))};
  r.onerror=function(){no(r.error||new Error('Kép kódolási hiba'))};
  r.readAsDataURL(blob);
})}
function dataUrlToBlob(s){
  if(!s||typeof s!=='string'||s.indexOf('data:')!==0)return null;
  var m=s.match(/^data:([^;,]+)?(;base64)?,(.*)$/);if(!m)return null;
  try{
    var mime=m[1]||'application/octet-stream';
    var bin=m[2]?atob(m[3]||''):decodeURIComponent(m[3]||'');
    var a=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i)&255;
    return new Blob([a],{type:mime});
  }catch(e){return null}
}
async function serialize(x){
  var y=Object.assign({},x);
  if(y.imageBlob){y.imageDataUrl=await blobToDataUrl(y.imageBlob);delete y.imageBlob}
  return y;
}
function hydrate(x){
  var y=Object.assign({},x);
  if(y.imageDataUrl){
    var b=dataUrlToBlob(y.imageDataUrl);
    if(b)y.imageBlob=b;
    delete y.imageDataUrl;
  }
  return y;
}

async function folderMeta(path,token){
  var r=await fetch('https://api.dropboxapi.com/2/files/get_metadata',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({path:path,include_media_info:false,include_deleted:false})
  });
  if(r.ok){
    var j={};try{j=await r.json()}catch(e){}
    return j&&j['.tag']==='folder'?j:null;
  }
  if(r.status===409)return null;
  var txt='';try{txt=await r.text()}catch(e){}
  var er=new Error('Dropbox mappa ellenőrzési hiba (HTTP '+r.status+')'+(txt?' · '+txt.slice(0,500):''));
  er.status=r.status;er.body=txt;throw er;
}
async function ensureFolder(path){
  var v=vault();if(!v||!v.accessToken)return;
  var token=await v.accessToken();

  /* If it already exists, do not ask Dropbox to create it again. */
  var existing=await folderMeta(path,token);
  if(existing)return true;

  var r=await fetch('https://api.dropboxapi.com/2/files/create_folder_v2',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({path:path,autorename:false})
  });
  if(r.ok)return true;

  var txt='';try{txt=await r.text()}catch(e){}

  /* Dropbox may return 409 when another sync created the folder between
     get_metadata and create_folder_v2. Re-check instead of treating that as
     a hard failure. */
  if(r.status===409){
    try{if(await folderMeta(path,token))return true}catch(e){}
  }

  var er=new Error('Dropbox mappa létrehozási hiba: '+path+' (HTTP '+r.status+')'+(txt?' · '+txt.slice(0,500):''));
  er.status=r.status;er.body=txt;er.path=path;
  try{window.hhErrorLogRecord&&window.hhErrorLogRecord('error','device-cloud:ensureFolder',er.message,txt)}catch(e){}
  throw er;
}
async function ensureFolders(){await ensureFolder('/HealthHub');await ensureFolder('/HealthHub/devices')}
async function downloadRemote(p){
  var v=vault();if(!v||!v.downloadJson)return null;
  try{return await v.downloadJson(pathFor(p))}
  catch(e){if(e&&e.status===409)return null;throw e}
}
async function uploadRemote(p,data){
  var v=vault();if(!v||!v.uploadJson)throw new Error('Dropbox Vault API nem elérhető');
  await ensureFolders();
  return await v.uploadJson(pathFor(p),data);
}

async function mergeSnapshots(p,remote){
  var local=await allLocal(p),lmap=new Map(),rmap=new Map();
  local.forEach(function(x){if(x&&x.id)lmap.set(x.id,x)});
  ((remote&&Array.isArray(remote.devices))?remote.devices:[]).forEach(function(raw){
    var x=hydrate(raw);if(x&&x.id&&x.profile===p)rmap.set(x.id,x);
  });
  var lt=readTombs(p),rt=(remote&&remote.deleted&&typeof remote.deleted==='object')?remote.deleted:{};
  var ids=new Set();
  lmap.forEach(function(_,id){ids.add(id)});
  rmap.forEach(function(_,id){ids.add(id)});
  Object.keys(lt).forEach(function(id){ids.add(id)});
  Object.keys(rt).forEach(function(id){ids.add(id)});
  var out=[],deleted={};

  for(const id of ids){
    var ld=lmap.get(id)||null,rd=rmap.get(id)||null,c=[];
    if(ld)c.push({kind:'device',src:'local',time:dts(ld),value:ld});
    if(rd)c.push({kind:'device',src:'remote',time:dts(rd),value:rd});
    if(lt[id])c.push({kind:'deleted',src:'local',time:sts(lt[id]),value:lt[id]});
    if(rt[id])c.push({kind:'deleted',src:'remote',time:sts(rt[id]),value:rt[id]});
    c.sort(function(a,b){
      if(a.time!==b.time)return b.time-a.time;
      if(a.kind!==b.kind)return a.kind==='deleted'?-1:1;
      return a.src==='remote'?-1:1;
    });
    var win=c[0];if(!win)continue;
    if(win.kind==='deleted'){
      deleted[id]=win.value||new Date(win.time||Date.now()).toISOString();
      if(ld)await removeLocal(id);
    }else{
      if(win.src==='remote'&&(!ld||dts(win.value)>=dts(ld)))await putLocal(win.value);
      out.push(win.value);
    }
  }
  writeTombs(p,deleted);
  return {devices:out,deleted:deleted};
}

async function sync(silent,profileOverride){
  if(syncing||!connected())return false;
  syncing=true;
  var p=profileOverride==='monika'?'monika':profileOverride==='zsolt'?'zsolt':pkey();
  try{
    var remote=await downloadRemote(p);
    var merged=await mergeSnapshots(p,remote);
    var devices=[];
    for(var i=0;i<merged.devices.length;i++)devices.push(await serialize(merged.devices[i]));
    var payload={
      schemaVersion:'healthhub.devices/1.0',
      profile:p,
      exportedAt:new Date().toISOString(),
      devices:devices,
      deleted:merged.deleted
    };
    await uploadRemote(p,payload);
    var now=new Date().toISOString();
    localStorage.setItem(lastKey(p),now);
    localStorage.setItem('hh-device-cloud-path-'+p,pathFor(p));
    decorate();
    if(p===pkey()&&window.healthSectionKind==='devices'&&typeof window.renderHealthSection==='function')await window.renderHealthSection();
    if(!silent)toast(pname(p)+' eszközei szinkronizálva');
    return true;
  }catch(e){
    console.error('HealthHub device cloud sync',e);
    if(!silent)toast(e.message||'Eszköz szinkronizálási hiba');
    return false;
  }finally{syncing=false}
}
window.hhDeviceCloudSync=function(silent){return sync(!!silent)};
window.hhDeviceCloudSyncProfile=function(profile,silent){return sync(!!silent,profile)};

function fmtLast(p){
  var s=localStorage.getItem(lastKey(p));if(!s)return 'még nem';
  var d=new Date(s);
  return isNaN(d)?'még nem':d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}
function decorate(){
  var card=document.getElementById('hhUnifiedCloudVaultCard');if(!card)return;
  var grid=card.querySelector('.hhUcGrid');if(!grid)return;
  var p=pkey(),el=document.getElementById('hhUcDeviceMetric');
  if(!el){
    el=document.createElement('div');
    el.className='hhUcMetric';el.id='hhUcDeviceMetric';
    el.innerHTML='<span>Eszközök Cloud</span><b></b><small></small>';
    var daily=Array.from(grid.children).find(function(x){return /Daily Cloud/i.test(x.textContent||'')});
    if(daily)grid.insertBefore(el,daily);else grid.appendChild(el);
  }
  var b=el.querySelector('b'),s=el.querySelector('small');
  if(b)b.textContent=pathFor(p);
  if(s)s.textContent='Utolsó sync: '+fmtLast(p);
}
function observe(){
  if(observer)return;
  var root=document.getElementById('healthSubContent');
  if(!root){setTimeout(observe,500);return}
  observer=new MutationObserver(function(){
    if(document.getElementById('hhUnifiedCloudVaultCard')&&!document.getElementById('hhUcDeviceMetric')){
      setTimeout(decorate,20);
    }
  });
  observer.observe(root,{childList:true,subtree:true});
}

var oldEdit=window.hhEditDevice;
if(typeof oldEdit==='function')window.hhEditDevice=function(id){editingId=id;return oldEdit.apply(this,arguments)};
var oldAdd=window.hhAddDevice;
if(typeof oldAdd==='function')window.hhAddDevice=function(){editingId=null;return oldAdd.apply(this,arguments)};
var oldSave=window.hhSaveDevice;
if(typeof oldSave==='function')window.hhSaveDevice=async function(){
  var p=pkey(),id=editingId,r=await oldSave.apply(this,arguments);
  if(id){
    var x=await getLocal(id);
    if(x)clearDeleted(p,id);
  }
  if(connected())setTimeout(function(){sync(true)},100);
  return r;
};
var oldDelete=window.hhDeleteDevice;
if(typeof oldDelete==='function')window.hhDeleteDevice=async function(){
  var p=pkey(),id=editingId,r=await oldDelete.apply(this,arguments);
  if(id){
    var x=await getLocal(id);
    if(!x){markDeleted(p,id);if(connected())setTimeout(function(){sync(true)},100)}
  }
  editingId=null;
  return r;
};

var oldSet=window.setProfile;
if(typeof oldSet==='function')window.setProfile=function(){
  var r=oldSet.apply(this,arguments);
  editingId=null;
  setTimeout(decorate,80);
  return r;
};

/* Performance: Device Cloud sync is explicit/manual or save-triggered.
   Do not sync merely because the profile changed or the app regained focus. */
window.addEventListener('healthhub:profile-changed',function(){editingId=null;setTimeout(decorate,80)});
observe();
setTimeout(decorate,1700);
window.addEventListener('focus',function(){setTimeout(decorate,250)});
document.documentElement.dataset.healthhubDeviceCloud='1.232.2';
window.HH_LIVE_BUILD='v1.232-device-cloud-sync';
})();