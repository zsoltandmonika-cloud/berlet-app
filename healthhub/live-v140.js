(function(){
'use strict';
/* HealthHub v1.40 — measurement CRUD parity */
var DB='healthhub-healthradar-v2';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function toast(s){try{window.toast&&window.toast(s)}catch(e){}}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
async function one(id){var db=await openDb();try{return await reqP(db.transaction('measurements').objectStore('measurements').get(id))}finally{db.close()}}
async function put(x){var db=await openDb();try{await reqP(db.transaction('measurements','readwrite').objectStore('measurements').put(x))}finally{db.close()}}
async function del(id){var db=await openDb();try{await reqP(db.transaction('measurements','readwrite').objectStore('measurements').delete(id))}finally{db.close()}}
function n(v){if(v==null||String(v).trim()==='')return null;var x=Number(String(v).replace(',','.'));return Number.isFinite(x)?x:null}
function localValue(iso){var d=iso?new Date(iso):new Date();if(isNaN(d.getTime()))d=new Date();var z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)}
function summary(x){var a=[];if(x.systolic!=null||x.diastolic!=null)a.push((x.systolic??'—')+'/'+(x.diastolic??'—')+' Hgmm');if(x.pulse!=null)a.push('pulzus '+x.pulse+'/perc');if(x.weightKg!=null)a.push(x.weightKg+' kg');if(x.bloodGlucose!=null)a.push(x.bloodGlucose+' mmol/l');if(x.oxygenSaturation!=null)a.push('SpO₂ '+x.oxygenSaturation+'%');return a.join(' · ')||'Mérés'}
function ensure(){
 if(document.getElementById('hhMeasCrudOverlay'))return;
 var s=document.createElement('style');s.id='hh-v140-style';s.textContent=
 '.hhMeasCrudBar{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.hhCrudBtn{border:0;border-radius:12px;padding:8px 11px;background:#173f62;color:#fff;font-weight:850;font-size:8px;cursor:pointer}.hhCrudBtn.alt{background:#eef5fa;color:#31536f;border:1px solid #d9e5ee}.hhCrudBtn.danger{background:#fff0f1;color:#a94352;border:1px solid #f2cfd5}'+
 '.hhCrudOv{position:fixed;inset:0;background:#08203388;display:none;align-items:flex-end;z-index:260}.hhCrudOv.on{display:flex}.hhCrudSheet{width:min(100vw,680px);max-height:92vh;overflow:auto;margin:auto;background:#f8fbfd;border-radius:24px 24px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom))}.hhCrudHead{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.hhCrudHead h2{margin:3px 0 0}.hhCrudClose{border:0;background:#eaf0f5;width:32px;height:32px;border-radius:50%;font-size:18px}.hhCrudGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.hhCrudGrid label{font-size:8px;font-weight:800;color:#526b80}.hhCrudGrid input,.hhCrudGrid select,.hhCrudFull input,.hhCrudFull textarea{width:100%;box-sizing:border-box;margin-top:4px;border:1px solid #dbe5ed;border-radius:11px;background:#fff;padding:9px;font:inherit;font-size:9px}.hhCrudFull{margin-top:9px}.hhCrudActions{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}';
 document.head.appendChild(s);
 var o=document.createElement('div');o.id='hhMeasCrudOverlay';o.className='hhCrudOv';o.onclick=function(e){if(e.target===o)o.classList.remove('on')};o.innerHTML='<div class="hhCrudSheet"><div class="hhCrudHead"><div><small>HEALTHRADAR · MÉRÉS</small><h2 id="hhMcTitle">Új mérés</h2></div><button class="hhCrudClose" onclick="hhCloseMeasurement()">×</button></div><div id="hhMcBody"></div></div>';document.body.appendChild(o);
}
function form(x){
 x=x||{profile:pkey(),measuredAt:new Date().toISOString(),systolic:null,diastolic:null,pulse:null,weightKg:null,bloodGlucose:null,oxygenSaturation:null,notes:''};
 var isEdit=!!x.id;
 document.getElementById('hhMcTitle').textContent=isEdit?'Mérés szerkesztése':'Új mérés rögzítése';
 document.getElementById('hhMcBody').innerHTML=
 '<div class="hhCrudGrid"><label>Személy<select id="hhMcProfile"><option value="monika"'+(x.profile==='monika'?' selected':'')+'>Mónika</option><option value="zsolt"'+(x.profile==='zsolt'?' selected':'')+'>Zsolt</option></select></label><label>Időpont<input id="hhMcAt" type="datetime-local" value="'+esc(localValue(x.measuredAt))+'"></label>'+
 '<label>Szisztolés<input id="hhMcSys" inputmode="decimal" value="'+esc(x.systolic??'')+'" placeholder="pl. 120"></label><label>Diasztolés<input id="hhMcDia" inputmode="decimal" value="'+esc(x.diastolic??'')+'" placeholder="pl. 80"></label>'+
 '<label>Pulzus<input id="hhMcPulse" inputmode="decimal" value="'+esc(x.pulse??'')+'" placeholder="/perc"></label><label>Testsúly<input id="hhMcWeight" inputmode="decimal" value="'+esc(x.weightKg??'')+'" placeholder="kg"></label>'+
 '<label>Vércukor<input id="hhMcGlucose" inputmode="decimal" value="'+esc(x.bloodGlucose??'')+'" placeholder="mmol/l"></label><label>SpO₂<input id="hhMcSpo2" inputmode="decimal" value="'+esc(x.oxygenSaturation??'')+'" placeholder="%"></label></div>'+
 '<div class="hhCrudFull"><label>Megjegyzés<textarea id="hhMcNotes" rows="3">'+esc(x.notes||'')+'</textarea></label></div>'+
 '<div class="hhCrudActions"><button class="hhCrudBtn" onclick="hhSaveMeasurement(''+esc(x.id||'')+'')">Mentés</button><button class="hhCrudBtn alt" onclick="hhCloseMeasurement()">Mégse</button>'+(isEdit?'<button class="hhCrudBtn danger" onclick="hhDeleteMeasurement(''+esc(x.id)+'')">Mérés törlése</button>':'')+'</div>'+
 '<p class="privacyNote">Csak a ténylegesen megmért mezőket töltsd ki. A módosítás azonnal megjelenik a trendgrafikonon.</p>';
}
window.hhOpenMeasurement=async function(id){ensure();var x=id?await one(id):null;form(x);document.getElementById('hhMeasCrudOverlay').classList.add('on')};
window.hhCloseMeasurement=function(){document.getElementById('hhMeasCrudOverlay')?.classList.remove('on')};
window.hhSaveMeasurement=async function(id){
 try{
  var at=document.getElementById('hhMcAt').value;if(!at){toast('A mérés időpontja szükséges.');return}
  var old=id?await one(id):null;
  var x=old||{id:(crypto.randomUUID?crypto.randomUUID():'m-'+Date.now()),createdAt:new Date().toISOString()};
  x.profile=document.getElementById('hhMcProfile').value;x.measuredAt=new Date(at).toISOString();
  x.systolic=n(document.getElementById('hhMcSys').value);x.diastolic=n(document.getElementById('hhMcDia').value);x.pulse=n(document.getElementById('hhMcPulse').value);x.weightKg=n(document.getElementById('hhMcWeight').value);x.bloodGlucose=n(document.getElementById('hhMcGlucose').value);x.oxygenSaturation=n(document.getElementById('hhMcSpo2').value);x.notes=(document.getElementById('hhMcNotes').value||'').trim();x.source=x.source||'healthhub_manual';x.updatedAt=new Date().toISOString();
  if([x.systolic,x.diastolic,x.pulse,x.weightKg,x.bloodGlucose,x.oxygenSaturation].every(function(v){return v==null})){toast('Adj meg legalább egy mérési értéket.');return}
  await put(x);hhCloseMeasurement();toast(id?'Mérés módosítva':'Mérés elmentve');if(window.renderHealthSection)await window.renderHealthSection();window.hhSyncFullMigrationDashboard&&window.hhSyncFullMigrationDashboard();
 }catch(e){console.error(e);toast('A mérés nem menthető.')}
};
window.hhDeleteMeasurement=async function(id){
 if(!id)return;
 if(!confirm('Biztosan törlöd ezt a mérést? A bejegyzés eltűnik a naplóból és a grafikonról.'))return;
 try{await del(id);hhCloseMeasurement();toast('Mérés törölve');if(window.renderHealthSection)await window.renderHealthSection();window.hhSyncFullMigrationDashboard&&window.hhSyncFullMigrationDashboard()}catch(e){toast('A mérés nem törölhető.')}
};
function decorate(){
 if(window.healthSectionKind!=='measurements')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var card=root.querySelector('.hrSectionCard');if(card&&!card.querySelector('.hhMeasCrudBar')){
  var b=document.createElement('div');b.className='hhMeasCrudBar';b.innerHTML='<button class="hhCrudBtn" onclick="hhOpenMeasurement()">＋ Új mérés</button>';card.insertBefore(b,card.firstChild);
 }
 root.querySelectorAll('.hhMeasList .hrRow[onclick*="measurement"]').forEach(function(r){
  var m=(r.getAttribute('onclick')||'').match(/measurement','([^']+)'/);if(!m)return;
  r.onclick=function(){window.hhOpenMeasurement(m[1])};
 });
}
var legacyDetail=window.openHrDetail;
window.openHrDetail=async function(kind,id){if(kind==='measurement')return window.hhOpenMeasurement(id);return legacyDetail&&legacyDetail.apply(this,arguments)};
var prev=window.renderHealthSection;
if(typeof prev==='function')window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);decorate();return r};
ensure();setTimeout(decorate,120);
document.documentElement.dataset.healthhubMeasurementCrud='1.40';
window.HH_LIVE_BUILD='v1.40-measurement-crud';
})();