(function(){
'use strict';
/* HealthHub v1.47 — Health Connect Bridge JSON receiver */
var DB='healthhub-healthradar-v2', BRIDGE_DB='healthhub-connect-v1', SCHEMA='healthhub.healthconnect.bridge/1.0', SCHEMA11='healthhub.healthconnect.bridge/1.1', pending=null;
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function txDone(t){return new Promise(function(ok,no){t.oncomplete=ok;t.onerror=function(){no(t.error)};t.onabort=function(){no(t.error||new Error('A művelet megszakadt'))}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openBridgeDb(){return new Promise(function(ok,no){var r=indexedDB.open(BRIDGE_DB,1);r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains('imports'))d.createObjectStore('imports',{keyPath:'id'});if(!d.objectStoreNames.contains('activity'))d.createObjectStore('activity',{keyPath:'id'})};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16)}
function validIso(s){var d=new Date(s);return Number.isFinite(d.getTime())?d.toISOString():null}
function clamp(v,min,max){v=Number(v);return Number.isFinite(v)&&v>=min&&v<=max?v:null}
function arr(o,k){try{var v=o&&o[k];return Array.isArray(v)?v:[]}catch(e){return[]}}
function sourceNote(pkg){return 'Health Connect'+(pkg?' · '+pkg:'')}
function recordId(type,r,at){return 'hc-'+type+'-'+(r.id||hash(type+'|'+at+'|'+JSON.stringify(r)))}
function flattenHeart(records){
 var out=[];
 records.forEach(function(r){arr(r,'samples').forEach(function(s){var at=validIso(s.time),b=clamp(s.bpm,25,250);if(at&&b!=null)out.push({at:at,bpm:Math.round(b),sourcePackage:r.sourcePackage||''})})});
 out.sort(function(a,b){return Date.parse(a.at)-Date.parse(b.at)});return out;
}
function nearestPulse(at,heart){
 var t=Date.parse(at),best=null,bd=300001;
 heart.forEach(function(h){var d=Math.abs(Date.parse(h.at)-t);if(d<bd){bd=d;best=h}});
 return bd<=300000?best:null;
}
function normalize(raw){
 if(!raw||(raw.schemaVersion!==SCHEMA&&raw.schemaVersion!==SCHEMA11))throw new Error('Ez nem támogatott HealthHub Health Connect exportfájl.');
 var profile=String(raw.profile||'').toLowerCase();
 if(profile!=='zsolt'&&profile!=='monika')throw new Error('Hiányzó vagy hibás profil az exportban.');
 var r=raw.records||{}, heart=flattenHeart(arr(r,'heartRate')), ms=[];
 arr(r,'bloodPressure').forEach(function(x){
  var at=validIso(x.time),sys=clamp(x.systolic,50,300),dia=clamp(x.diastolic,30,200);if(!at||sys==null||dia==null)return;
  var hp=nearestPulse(at,heart);
  ms.push({id:recordId('bp',x,at),profile:profile,measuredAt:at,systolic:Math.round(sys),diastolic:Math.round(dia),pulse:hp?hp.bpm:null,weightKg:null,bloodGlucose:null,oxygenSaturation:null,source:'health_connect',sourceRecordId:x.id||null,notes:sourceNote(x.sourcePackage),createdAt:raw.exportedAt||new Date().toISOString()});
 });
 arr(r,'weight').forEach(function(x){var at=validIso(x.time),v=clamp(x.kg,20,400);if(at&&v!=null)ms.push({id:recordId('weight',x,at),profile:profile,measuredAt:at,systolic:null,diastolic:null,pulse:null,weightKg:Math.round(v*10)/10,bloodGlucose:null,oxygenSaturation:null,source:'health_connect',sourceRecordId:x.id||null,notes:sourceNote(x.sourcePackage),createdAt:raw.exportedAt||new Date().toISOString()})});
 arr(r,'bloodGlucose').forEach(function(x){var at=validIso(x.time),v=clamp(x.mmolL,0.1,60);if(at&&v!=null)ms.push({id:recordId('glucose',x,at),profile:profile,measuredAt:at,systolic:null,diastolic:null,pulse:null,weightKg:null,bloodGlucose:Math.round(v*10)/10,oxygenSaturation:null,source:'health_connect',sourceRecordId:x.id||null,notes:sourceNote(x.sourcePackage),createdAt:raw.exportedAt||new Date().toISOString()})});
 arr(r,'oxygenSaturation').forEach(function(x){var at=validIso(x.time),v=clamp(x.percent,50,100);if(at&&v!=null)ms.push({id:recordId('spo2',x,at),profile:profile,measuredAt:at,systolic:null,diastolic:null,pulse:null,weightKg:null,bloodGlucose:null,oxygenSaturation:Math.round(v*10)/10,source:'health_connect',sourceRecordId:x.id||null,notes:sourceNote(x.sourcePackage),createdAt:raw.exportedAt||new Date().toISOString()})});
 var steps=arr(r,'dailySteps').map(function(x){var d=/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||''))?String(x.date):null,c=clamp(x.count,0,200000);return d&&c!=null?{id:'hc-steps-'+profile+'-'+d,profile:profile,date:d,steps:Math.round(c),source:'health_connect',updatedAt:raw.exportedAt||new Date().toISOString()}:null}).filter(Boolean);
 return {raw:raw,profile:profile,measurements:ms,steps:steps,heart:heart};
}
async function existingIds(ids){
 var db=await openDb(),set=new Set();try{var st=db.transaction('measurements').objectStore('measurements');for(var i=0;i<ids.length;i++){if(await reqP(st.get(ids[i])))set.add(ids[i])}return set}finally{db.close()}
}
async function importRawDirect(raw,fileName){
 var n=normalize(raw);
 if(n.profile!==pkey())throw new Error('A Dropboxból érkező Health Connect adat '+pname(n.profile)+' profiljához tartozik.');
 var old=await existingIds(n.measurements.map(function(x){return x.id}));
 n.newMeasurements=n.measurements.filter(function(x){return !old.has(x.id)});
 n.duplicates=n.measurements.length-n.newMeasurements.length;
 n.fileName=fileName||('dropbox-'+n.profile+'.json');
 pending=n;
 await commit();
 return {profile:n.profile,newMeasurements:n.newMeasurements.length,duplicates:n.duplicates};
}
async function prepare(file){
 var raw=JSON.parse(await file.text()),n=normalize(raw);
 if(n.profile!==pkey())throw new Error('Ez a fájl '+pname(n.profile)+' profiljához tartozik. Előbb válts át erre a profilra.');
 var old=await existingIds(n.measurements.map(function(x){return x.id}));
 n.newMeasurements=n.measurements.filter(function(x){return !old.has(x.id)});
 n.duplicates=n.measurements.length-n.newMeasurements.length;
 n.fileName=file.name;pending=n;showPreview();
}
async function commit(){
 if(!pending)return;var p=pending,now=new Date().toISOString(),db=await openDb();
 try{var tx=db.transaction('measurements','readwrite'),st=tx.objectStore('measurements');p.measurements.forEach(function(x){x.updatedAt=now;st.put(x)});await txDone(tx)}finally{db.close()}
 var b=await openBridgeDb();
 try{
  var t=b.transaction(['imports','activity'],'readwrite'),im=t.objectStore('imports'),ac=t.objectStore('activity');
  p.steps.forEach(function(x){ac.put(x)});
  im.put({id:'imp-'+Date.now()+'-'+hash(p.fileName),profile:p.profile,importedAt:now,fileName:p.fileName,schemaVersion:p.raw.schemaVersion||SCHEMA,measurementCount:p.measurements.length,stepDays:p.steps.length,heartSamples:p.heart.length,exerciseSessions:arr(p.raw.records,'exerciseSessions').length,sleepSessions:arr(p.raw.records,'sleepSessions').length,nutritionDays:arr(p.raw.records,'dailyNutrition').length,bundle:p.raw});
  await txDone(t);
 }finally{b.close()}
 var dropboxOk=false;
 if(window.hhDropboxPushCurrentProfile){try{dropboxOk=!!(await window.hhDropboxPushCurrentProfile())}catch(e){console.error(e);toast('Health Connect import kész · Dropbox sync sikertelen')}}
 toast(p.newMeasurements.length+' új Health Connect mérés · '+p.steps.length+' lépésnap frissítve'+(dropboxOk?' · Dropbox Vault frissítve':''));
 pending=null;closePreview();if(window.renderHealthSection)await window.renderHealthSection();window.hhSyncFullMigrationDashboard&&window.hhSyncFullMigrationDashboard();
 try{window.dispatchEvent(new CustomEvent('healthhub:healthconnect-imported',{detail:{profile:p.profile,importedAt:now,fileName:p.fileName}}))}catch(e){}
}
function ensure(){
 if(document.getElementById('hhHealthConnectInput'))return;
 var s=document.createElement('style');s.id='hh-v147-style';s.textContent='.hhHcBtn{border:1px solid #b7d9e9;background:#eaf8ff;color:#145b7d;border-radius:12px;padding:8px 10px;font-size:8px;font-weight:850;cursor:pointer}.hhHcOv{position:fixed;inset:0;background:#08203388;display:none;align-items:flex-end;z-index:275}.hhHcOv.on{display:flex}.hhHcSheet{width:min(100vw,700px);max-height:92vh;overflow:auto;margin:auto;background:#f8fbfd;border-radius:24px 24px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom))}.hhHcStats{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin:10px 0}.hhHcStats div{background:#fff;border:1px solid #edf1f4;border-radius:13px;padding:10px}.hhHcStats small{display:block;color:#7b8d9d;font-size:7px}.hhHcStats b{display:block;color:#173f62;font-size:13px;margin-top:2px}';
 document.head.appendChild(s);
 var i=document.createElement('input');i.id='hhHealthConnectInput';i.type='file';i.accept='.json,application/json';i.hidden=true;i.onchange=function(e){var f=e.target.files&&e.target.files[0];e.target.value='';if(f)prepare(f).catch(function(err){console.error(err);toast(err.message||'A Health Connect fájl nem olvasható.')})};document.body.appendChild(i);
 var o=document.createElement('div');o.id='hhHealthConnectOverlay';o.className='hhHcOv';o.onclick=function(e){if(e.target===o)closePreview()};o.innerHTML='<div class="hhHcSheet"><div style="display:flex;justify-content:space-between;gap:10px"><div><small>HEALTHHUB · HEALTH CONNECT</small><h2 style="margin:3px 0">Import előnézet</h2></div><button class="hhCrudClose" onclick="hhCloseHealthConnectPreview()">×</button></div><div id="hhHealthConnectBody"></div></div>';document.body.appendChild(o);
}
function showPreview(){
 ensure();var p=pending;if(!p)return;
 var rr=p.raw.records||{}, ex=arr(rr,'exerciseSessions').length, sl=arr(rr,'sleepSessions').length, nu=arr(rr,'dailyNutrition').filter(function(x){return Number(x.energyKcal)||Number(x.proteinGrams)||Number(x.carbsGrams)||Number(x.fatGrams)}).length;
 document.getElementById('hhHealthConnectBody').innerHTML='<p class="privacyNote">'+esc(p.fileName)+' · '+esc(pname(p.profile))+'</p><div class="hhHcStats"><div><small>ÚJ MÉRÉS</small><b>'+p.newMeasurements.length+'</b></div><div><small>MÁR MEGLÉVŐ</small><b>'+p.duplicates+'</b></div><div><small>LÉPÉSNAP</small><b>'+p.steps.length+'</b></div><div><small>PULZUSMINTA</small><b>'+p.heart.length+'</b></div><div><small>EDZÉS</small><b>'+ex+'</b></div><div><small>ALVÁS</small><b>'+sl+'</b></div><div><small>TÁPLÁLKOZÁSI NAP</small><b>'+nu+'</b></div></div><p class="privacyNote">A nagy sűrűségű pulzus-, aktivitás-, alvás- és táplálkozási adatokat nem tesszük ezrével a Mérések listába. A teljes Health Connect csomag a bridge tárban marad, a HealthHub ebből készít összesített nézeteket.</p><div class="hhCrudActions"><button class="hhCrudBtn" onclick="hhCommitHealthConnectImport()">Importálás most</button><button class="hhCrudBtn alt" onclick="hhCloseHealthConnectPreview()">Mégse</button></div>';
 document.getElementById('hhHealthConnectOverlay').classList.add('on');
}
function closePreview(){document.getElementById('hhHealthConnectOverlay')?.classList.remove('on')}
window.hhOpenHealthConnectImport=function(){ensure();document.getElementById('hhHealthConnectInput').click()};
window.hhCommitHealthConnectImport=commit;window.hhCloseHealthConnectPreview=closePreview;window.hhImportHealthConnectRaw=importRawDirect;
function decorate(){
 if(window.healthSectionKind!=='measurements')return;var root=document.getElementById('healthSubContent');if(!root)return;var card=root.querySelector('.hrSectionCard');if(!card||card.querySelector('.hhHcBtn'))return;
 var host=card.querySelector('.hhImportTools')||card.querySelector('.hhMeasCrudBar');if(host){var b=document.createElement('button');b.className='hhHcBtn';b.textContent='♥ Health Connect JSON';b.onclick=window.hhOpenHealthConnectImport;host.appendChild(b)}
}
var prev=window.renderHealthSection;if(typeof prev==='function')window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);decorate();return r};
ensure();setTimeout(decorate,150);
document.documentElement.dataset.healthhubHealthConnect='1.47';
window.HH_HEALTH_CONNECT_BRIDGE={schema:SCHEMA,openImport:window.hhOpenHealthConnectImport};
})();
