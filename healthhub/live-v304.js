(function(){
'use strict';
/* HealthHub v304 — Central Structured Vault.
   Dropbox /HealthHub/master is the canonical JSON source.
   IndexedDB/localStorage remain local cache/offline state only. */

var BUILD='1.304', ROOT='/HealthHub/master', DB='healthhub-healthradar-v2';
var busy=false, lastRunAt=0, deferredTimer=null;
var FILES={
 manifest:ROOT+'/manifest.json',
 documents:ROOT+'/documents.json',
 explanations:ROOT+'/explanations.json',
 medications:ROOT+'/medications.json',
 profiles:ROOT+'/profiles.json',
 appointments:ROOT+'/appointments.json'
};
function now(){return new Date().toISOString()}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function vault(){try{return window.HH_DROPBOX_VAULT||null}catch(e){return null}}
function connected(){var v=vault();try{return !!(v&&v.connected&&v.connected())}catch(e){return false}}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function txDone(t){return new Promise(function(ok,no){t.oncomplete=ok;t.onerror=function(){no(t.error)};t.onabort=function(){no(t.error||new Error('A művelet megszakadt.'))}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function all(store){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).getAll())||[]}finally{db.close()}}
async function one(store,key){var db=await openDb();try{return await reqP(db.transaction(store,'readonly').objectStore(store).get(key))}finally{db.close()}}
async function putAll(store,rows){if(!rows||!rows.length)return;var db=await openDb();try{var tx=db.transaction(store,'readwrite'),st=tx.objectStore(store);rows.forEach(function(x){st.put(x)});await txDone(tx)}finally{db.close()}}
async function putMeta(x){var db=await openDb();try{var tx=db.transaction('meta','readwrite');tx.objectStore('meta').put(x);await txDone(tx)}finally{db.close()}}

function clone(x){return x==null?x:JSON.parse(JSON.stringify(x))}
function stamp(x){
 if(!x||typeof x!=='object')return 0;
 var s=x.updatedAt||x.modifiedAt||x.uploadedAt||x.importedAt||x.createdAt||x.documentDate||'';
 var n=Date.parse(s||'');return Number.isFinite(n)?n:0;
}
function richness(x){try{return JSON.stringify(x||{}).length}catch(e){return 0}}
function mergeEntity(local,remote){
 if(!local)return clone(remote);if(!remote)return clone(local);
 var lt=stamp(local),rt=stamp(remote);
 if(rt>lt)return Object.assign({},clone(local),clone(remote));
 if(lt>rt)return Object.assign({},clone(remote),clone(local));
 return richness(remote)>=richness(local)?Object.assign({},clone(local),clone(remote)):Object.assign({},clone(remote),clone(local));
}
function mergeById(local,remote,key){
 key=key||'id';var m=new Map();
 (local||[]).forEach(function(x){if(x&&x[key]!=null)m.set(String(x[key]),clone(x))});
 (remote||[]).forEach(function(x){if(!x||x[key]==null)return;var k=String(x[key]);m.set(k,mergeEntity(m.get(k),x))});
 return Array.from(m.values());
}
function docBase(d){
 var x=clone(d)||{};delete x.lenaExplanationManual;delete x.lenaExplanationImported;delete x.lenaExplanationImportedSource;return x;
}
function explanationRow(d){
 if(!d||!d.id)return null;
 if(!d.lenaExplanationManual&&!d.lenaExplanationImported)return null;
 return {id:d.id,profile:d.profile||null,updatedAt:d.updatedAt||d.uploadedAt||now(),
  manual:clone(d.lenaExplanationManual||null),
  imported:clone(d.lenaExplanationImported||null),
  importedSource:d.lenaExplanationImportedSource||null};
}
function applyExplanation(d,e){
 if(!d||!e)return d;
 var x=clone(d);
 if(e.manual)x.lenaExplanationManual=clone(e.manual);
 if(e.imported)x.lenaExplanationImported=clone(e.imported);
 if(e.importedSource)x.lenaExplanationImportedSource=e.importedSource;
 return x;
}

async function ensureFolder(path){
 var v=vault();if(!v||typeof v.accessToken!=='function')throw new Error('Dropbox Vault API nem érhető el.');
 var token=await v.accessToken();
 async function exists(){
  var r=await fetch('https://api.dropboxapi.com/2/files/get_metadata',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({path:path,include_media_info:false,include_deleted:false})});
  if(r.ok){var j={};try{j=await r.json()}catch(e){};return !!(j&&j['.tag']==='folder')}
  if(r.status===409)return false;
  throw new Error('Dropbox mappa ellenőrzési hiba ('+r.status+').');
 }
 if(await exists())return true;
 var r=await fetch('https://api.dropboxapi.com/2/files/create_folder_v2',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({path:path,autorename:false})});
 if(r.ok)return true;
 if(r.status===409&&await exists())return true;
 throw new Error('Dropbox mappa létrehozási hiba: '+path);
}
async function download(path){
 var v=vault();if(!v||typeof v.downloadJson!=='function')throw new Error('Dropbox Vault API nem érhető el.');
 try{return await v.downloadJson(path)}catch(e){if(e&&e.status===409)return null;throw e}
}
async function upload(path,data){
 var v=vault();if(!v||typeof v.uploadJson!=='function')throw new Error('Dropbox Vault API nem érhető el.');
 return v.uploadJson(path,data);
}

async function localSnapshot(){
 var docs=await all('documents'),profiles=await all('profiles'),appointments=await all('appointments');
 var ref=await one('meta','private-reference').catch(function(){return null});
 return {
  documents:docs.map(docBase),
  explanations:docs.map(explanationRow).filter(Boolean),
  profiles:profiles,
  appointments:appointments,
  medications:ref&&ref.payload?clone(ref.payload):null
 };
}
function remoteArray(pkg,key){
 if(!pkg)return[];
 var a=pkg[key];return Array.isArray(a)?a:[];
}
async function remoteSnapshot(){
 var r=await Promise.all([download(FILES.documents),download(FILES.explanations),download(FILES.medications),download(FILES.profiles),download(FILES.appointments),download(FILES.manifest)]);
 return {documents:r[0],explanations:r[1],medications:r[2],profiles:r[3],appointments:r[4],manifest:r[5]};
}
function makePackages(local,remote){
 var docs=mergeById(local.documents,remoteArray(remote.documents,'documents'));
 var exps=mergeById(local.explanations,remoteArray(remote.explanations,'explanations'));
 var profiles=mergeById(local.profiles,remoteArray(remote.profiles,'profiles'),'profile');
 var apps=mergeById(local.appointments,remoteArray(remote.appointments,'appointments'));
 var localMed=local.medications,remoteMed=remote.medications&&remote.medications.privateReference;
 var meds=mergeEntity(localMed,remoteMed);
 var t=now();
 return {
  documents:{schema:'healthhub.master.documents/1',updatedAt:t,documents:docs},
  explanations:{schema:'healthhub.master.explanations/1',updatedAt:t,explanations:exps},
  medications:{schema:'healthhub.master.medications/1',updatedAt:t,privateReference:meds||null},
  profiles:{schema:'healthhub.master.profiles/1',updatedAt:t,profiles:profiles},
  appointments:{schema:'healthhub.master.appointments/1',updatedAt:t,appointments:apps}
 };
}
async function applyLocal(pkgs){
 var em=new Map((pkgs.explanations.explanations||[]).map(function(x){return [String(x.id),x]}));
 var docs=(pkgs.documents.documents||[]).map(function(d){return applyExplanation(d,em.get(String(d.id)))});
 await putAll('documents',docs);
 await putAll('profiles',pkgs.profiles.profiles||[]);
 await putAll('appointments',pkgs.appointments.appointments||[]);
 if(pkgs.medications.privateReference)await putMeta({key:'private-reference',importedAt:now(),payload:clone(pkgs.medications.privateReference)});
 return {documents:docs.length,explanations:em.size,profiles:(pkgs.profiles.profiles||[]).length,appointments:(pkgs.appointments.appointments||[]).length,medications:pkgs.medications.privateReference?1:0};
}
async function pushAll(pkgs,counts){
 await upload(FILES.documents,pkgs.documents);
 await upload(FILES.explanations,pkgs.explanations);
 await upload(FILES.medications,pkgs.medications);
 await upload(FILES.profiles,pkgs.profiles);
 await upload(FILES.appointments,pkgs.appointments);
 var manifest={schema:'healthhub.master.manifest/1',updatedAt:now(),root:ROOT,sourceOfTruth:'dropbox',
  files:{documents:FILES.documents,explanations:FILES.explanations,medications:FILES.medications,profiles:FILES.profiles,appointments:FILES.appointments},
  counts:counts||{},localCache:'IndexedDB'};
 await upload(FILES.manifest,manifest);
 return manifest;
}
async function sync(reason,silent){
 if(busy||!connected())return false;
 var n=Date.now();if(reason==='startup'&&n-lastRunAt<30000)return false;
 busy=true;lastRunAt=n;
 try{
  await ensureFolder('/HealthHub');await ensureFolder(ROOT);
  var local=await localSnapshot(),remote=await remoteSnapshot(),pkgs=makePackages(local,remote);
  var counts=await applyLocal(pkgs);
  var manifest=await pushAll(pkgs,counts);
  localStorage.setItem('hh-master-vault-last-sync',manifest.updatedAt);
  localStorage.setItem('hh-master-vault-root',ROOT);
  try{window.dispatchEvent(new CustomEvent('healthhub:master-vault-synced',{detail:{reason:reason||'manual',updatedAt:manifest.updatedAt,counts:counts}}))}catch(e){}
  if(!silent)toast('✓ Central Structured Vault szinkronizálva');
  if(window.renderHealthSection)try{await window.renderHealthSection()}catch(e){}
  return true;
 }catch(e){
  console.error('Central Structured Vault sync',e);
  try{window.hhErrorLogRecord&&window.hhErrorLogRecord('error','master-vault-sync',e&&e.message||e,e&&e.stack||e)}catch(_){}
  if(!silent)toast('Central Structured Vault sync hiba: '+(e.message||e));
  throw e;
 }finally{busy=false}
}
window.hhMasterStructuredSync304=function(silent){return sync('manual',!!silent)};
window.hhMasterStructuredSyncState304=function(){return {connected:connected(),busy:busy,lastSync:localStorage.getItem('hh-master-vault-last-sync')||null,root:ROOT,files:clone(FILES)}};

function scheduleLocalChange(reason){
 clearTimeout(deferredTimer);
 deferredTimer=setTimeout(function(){if(connected())sync(reason||'local-change',true).catch(function(){})},700);
}
function wrap(name,reason){
 var old=window[name];if(typeof old!=='function'||old.__hh304)return;
 var fn=async function(){var r=await old.apply(this,arguments);scheduleLocalChange(reason||name);return r};
 fn.__hh304=true;window[name]=fn;
}
function installWriters(){
 ['hhCommitDocumentUpload','hhSaveDocumentMeta','hhSaveLenaExplanation','hhResetLenaExplanation','hhImportExplanationPackage','hhImportPrivateReference'].forEach(function(n){wrap(n,n)});
}
installWriters();
setTimeout(installWriters,500);

function startup(){
 if(!connected())return;
 var run=function(){sync('startup',true).catch(function(){})};
 if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:5000});else setTimeout(run,3500);
}
setTimeout(startup,1800);

document.documentElement.dataset.healthhubMasterVault='1.304';
})();