(function(){
'use strict';
/* HealthHub v1.273 — Weight module phase 1: exact Beurer scale image + large LCD */
var DB='healthhub-healthradar-v2', BRIDGE='healthhub-connect-v1';
var SCALE_IMG=window.HH_WEIGHT_SCALE_V273||window.HH_WEIGHT_SCALE_V270||'';
var pageId='hhWeightPage270',sheetId='hhWeightSheet270';

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function num(v,d){v=Number(v);return Number.isFinite(v)?v.toLocaleString('hu-HU',{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function txDone(t){return new Promise(function(ok,no){t.oncomplete=ok;t.onerror=function(){no(t.error)};t.onabort=function(){no(t.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openBridge(){return new Promise(function(ok,no){var r=indexedDB.open(BRIDGE,2);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function localValue(iso){var d=iso?new Date(iso):new Date();if(isNaN(d.getTime()))d=new Date();var z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)}
function fmtDate(iso){var d=new Date(iso);if(isNaN(d.getTime()))return '';return d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'})+' · '+d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'})}
function sourceLabel(x){if(!x)return'';if(x.source==='manual_weight')return'✍️ Manuális';if(x.source==='camera_weight')return'📷 Kamera';if(x.source==='health_connect')return'⌚ Health Connect';return'↥ Import'}
function bodyFatValue(x){var v=Number(x&&x.bodyFatPercent);return Number.isFinite(v)?v:null}
function segNumber(value,fallback){
 var text;
 if(value==null||!Number.isFinite(Number(value)))text=fallback||'--.-';else text=Number(value).toFixed(1);
 var map={0:'abcedf',1:'bc',2:'abdeg',3:'abcdg',4:'bcfg',5:'acdfg',6:'acdefg',7:'abc',8:'abcdefg',9:'abcdfg'};
 map[0]='abcdef';
 var x=0,out='',advance=18;
 function rect(cls,rx,ry,rw,rh){return '<rect class="'+cls+'" x="'+rx+'" y="'+ry+'" width="'+rw+'" height="'+rh+'" rx="1"/>'}
 for(var i=0;i<text.length;i++){
  var ch=text[i];
  if(ch==='.'){out+='<circle class="on" cx="'+(x+2.4)+'" cy="25.1" r="1.75"/>';x+=6;continue}
  if(ch==='-'){out+='<g transform="translate('+x+' 0)">'+rect('off',3,1,10,2)+rect('off',13,3,2,9)+rect('off',13,15,2,9)+rect('off',3,25,10,2)+rect('off',1,15,2,9)+rect('off',1,3,2,9)+rect('on',3,13,10,2)+'</g>';x+=advance;continue}
  var on=map[ch]||'',segs={a:[3,1,10,2],b:[13,3,2,9],c:[13,15,2,9],d:[3,25,10,2],e:[1,15,2,9],f:[1,3,2,9],g:[3,13,10,2]};
  out+='<g transform="translate('+x+' 0)">';
  Object.keys(segs).forEach(function(k){var q=segs[k];out+=rect(on.indexOf(k)>=0?'on':'off',q[0],q[1],q[2],q[3])});
  out+='</g>';x+=advance;
 }
 return '<svg class="hhWSeg" viewBox="0 0 '+Math.max(1,x)+' 28" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+out+'</svg>';
}

async function measurements(profile){
 var db=await openDb();try{
  var st=db.transaction('measurements','readonly').objectStore('measurements'),all;
  if(st.indexNames.contains('profile'))all=await reqP(st.index('profile').getAll(profile));else all=(await reqP(st.getAll())).filter(function(x){return x.profile===profile});
  return (all||[]).filter(function(x){return Number.isFinite(Number(x.weightKg))}).sort(function(a,b){return Date.parse(b.measuredAt||0)-Date.parse(a.measuredAt||0)});
 }finally{db.close()}
}
async function latestBridgeBodyFat(profile){
 try{
  var db=await openBridge();try{
   var ims=await reqP(db.transaction('imports','readonly').objectStore('imports').getAll())||[],all=[];
   ims.filter(function(x){return x.profile===profile}).forEach(function(im){
    var a=im&&im.bundle&&im.bundle.records&&im.bundle.records.bodyFat;
    (Array.isArray(a)?a:[]).forEach(function(x){var v=Number(x.percent),t=Date.parse(x.time||0);if(Number.isFinite(v)&&Number.isFinite(t))all.push({percent:v,time:x.time})});
   });
   return all.sort(function(a,b){return Date.parse(b.time)-Date.parse(a.time)})[0]||null;
  }finally{db.close()}
 }catch(e){return null}
}
async function saveMeasurement(x){
 var db=await openDb();try{
  var stores=['measurements'];if(db.objectStoreNames.contains('profiles'))stores.push('profiles');
  var t=db.transaction(stores,'readwrite');t.objectStore('measurements').put(x);
  if(stores.length>1){var ps=t.objectStore('profiles'),p=await reqP(ps.get(x.profile));if(p){p.weightKg=x.weightKg;p.updatedAt=new Date().toISOString();ps.put(p)}}
  await txDone(t);
 }finally{db.close()}
}
function latestFat(rows,bridgeFat){
 for(var i=0;i<rows.length;i++){var f=bodyFatValue(rows[i]);if(f!=null)return{percent:f,time:rows[i].measuredAt,source:rows[i].source}}
 return bridgeFat;
}
function ensure(){
 if(document.getElementById(pageId))return;
 var s=document.createElement('style');s.id='hh-v270-style';s.textContent=
 '.hhWeightPage{display:none;position:fixed;inset:0;z-index:7900;width:100%;max-width:430px;height:100dvh;margin:0 auto;overflow-y:auto;overflow-x:hidden;background:linear-gradient(180deg,var(--wash2),var(--wash));color:#173f62;font-family:system-ui,-apple-system,Segoe UI,sans-serif;-webkit-overflow-scrolling:touch}.hhWeightPage.on{display:block}.hhWeightPage *{box-sizing:border-box}'+
 '.hhWTop{height:58px;display:grid;grid-template-columns:44px 1fr 92px;align-items:center;padding:8px 12px;background:rgba(255,255,255,.88);backdrop-filter:blur(12px);position:sticky;top:0;z-index:4;border-bottom:1px solid #e4edf3}.hhWBack{width:40px;height:40px;border:0;border-radius:50%;background:#eef5fa;color:#173f62;font-size:22px}.hhWTitle{text-align:center}.hhWTitle b{display:block;font-size:16px}.hhWTitle small{display:block;font-size:8px;color:var(--a);font-weight:850;letter-spacing:.09em}.hhWProfile{text-align:right;font-size:9px;font-weight:850;color:var(--a)}'+
 '.hhWBody{padding:10px 12px 28px}.hhWScale{position:relative;width:100%;max-width:406px;margin:0 auto 10px;border-radius:28px;overflow:hidden;filter:drop-shadow(0 12px 22px rgba(26,58,82,.18))}.hhWScale img{width:100%;height:auto;display:block}.hhWDisplay{position:absolute;left:40.65%;top:5.95%;width:19.05%;height:19.15%;border-radius:2px;background:radial-gradient(circle at 50% 42%,#29c8f2 0,#1ebae9 58%,#13a7dc 100%);box-shadow:inset 0 0 8px rgba(255,255,255,.18),inset 0 -7px 12px rgba(0,110,170,.10),0 0 5px rgba(16,184,235,.20);color:#eaffff;overflow:hidden;padding:7% 7% 6%;display:grid;grid-template-rows:58% 42%;gap:0}.hhWLcdTop,.hhWLcdBottom{min-height:0;display:grid;align-items:center}.hhWLcdTop{grid-template-columns:20% minmax(0,1fr) 16%;column-gap:2%}.hhWLcdBottom{grid-template-columns:29% minmax(0,1fr) 11%;column-gap:2%}.hhWLcdTag{font-size:clamp(4px,1.22vw,6.5px);font-weight:800;letter-spacing:.02em;color:rgba(235,253,255,.88);text-shadow:0 0 2px rgba(255,255,255,.55);align-self:center}.hhWLcdUnit{font-size:clamp(4px,1.08vw,6px);font-weight:700;color:rgba(235,253,255,.9);align-self:end;padding-bottom:12%}.hhWSeg{display:block;width:100%;height:100%;overflow:visible}.hhWSeg .on{fill:#eaffff;filter:drop-shadow(0 0 1.25px rgba(255,255,255,.9))}.hhWSeg .off{fill:rgba(196,247,255,.105)}.hhWLcdBottom .hhWSeg{height:82%;align-self:center}.hhWLcdBottom .hhWLcdUnit{padding-bottom:16%}.hhWDate{font-size:7.5px;color:#6d8292;text-align:center;margin:-2px 0 10px;font-weight:750}'+
 '.hhWActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 14px}.hhWActions button{min-height:48px;border:1px solid #dce8ef;background:#fff;border-radius:15px;color:#173f62;font-size:10px;font-weight:850;box-shadow:0 5px 14px rgba(38,73,99,.05)}.hhWActions button.primary{background:linear-gradient(135deg,var(--a),var(--a2));border-color:transparent;color:#fff}.hhWActions button span{display:block;font-size:17px;margin-bottom:2px}'+
 '.hhWHist{background:#fff;border:1px solid #e1ebf1;border-radius:19px;padding:12px;box-shadow:0 7px 18px rgba(38,73,99,.05)}.hhWHistHead{display:flex;justify-content:space-between;align-items:end;margin-bottom:8px}.hhWHistHead h3{font-size:14px;margin:0}.hhWHistHead small{font-size:8px;color:var(--a);font-weight:800}.hhWRow{display:grid;grid-template-columns:minmax(0,1fr) auto 38px;gap:8px;align-items:center;padding:10px 2px;border-top:1px solid #edf2f5}.hhWRow:first-of-type{border-top:0}.hhWRow b{display:block;font-size:12px}.hhWRow small{display:block;color:#73889a;font-size:8px;margin-top:3px}.hhWVal{text-align:right}.hhWVal strong{display:block;font-size:15px}.hhWVal em{font-style:normal;font-size:8px;color:#8799a6}.hhWDel{width:34px;height:34px;border:0;border-radius:11px;background:#fff0f1;color:#a94352;font-size:15px;display:grid;place-items:center;cursor:pointer}.hhWDel:active{transform:scale(.96)}.hhWEmpty{padding:18px;text-align:center;color:#8193a1;font-size:9px}'+
 '.hhWSheetOv{display:none;position:fixed;inset:0;z-index:8000;background:#08203388;align-items:flex-end}.hhWSheetOv.on{display:flex}.hhWSheet{width:min(100vw,430px);margin:auto;background:#f8fbfd;border-radius:24px 24px 0 0;padding:15px 15px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -16px 40px rgba(0,0,0,.18)}.hhWSheetHead{display:flex;justify-content:space-between;align-items:flex-start}.hhWSheetHead small{font-size:8px;color:var(--a);font-weight:900;letter-spacing:.08em}.hhWSheetHead h3{margin:3px 0 12px;font-size:18px}.hhWClose{width:36px;height:36px;border:0;border-radius:50%;background:#eaf1f5;font-size:18px}.hhWForm{display:grid;gap:10px}.hhWForm label{font-size:9px;font-weight:800;color:#45647c}.hhWForm input{width:100%;height:46px;margin-top:5px;border:1px solid #d5e3eb;border-radius:13px;background:#fff;padding:0 12px;font-size:16px;color:#173f62}.hhWFormGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.hhWSave{height:48px;border:0;border-radius:14px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-weight:900;font-size:11px}.hhWCameraSoon{border:1px dashed #bfd5e2;background:#eef7fb;border-radius:13px;padding:10px;font-size:9px;line-height:1.45;color:#4f6c80}';
 document.head.appendChild(s);
 var p=document.createElement('section');p.id=pageId;p.className='hhWeightPage';document.body.appendChild(p);
 var o=document.createElement('div');o.id=sheetId;o.className='hhWSheetOv';o.addEventListener('click',function(e){if(e.target===o)o.classList.remove('on')});document.body.appendChild(o);
}
function historyHtml(rows){
 if(!rows.length)return'<div class="hhWEmpty">Még nincs testsúlymérés ebben a profilban.</div>';
 return rows.slice(0,10).map(function(x){
  var fat=bodyFatValue(x);
  return '<div class="hhWRow"><div><b>'+esc(fmtDate(x.measuredAt))+'</b><small>'+esc(sourceLabel(x))+'</small></div><div class="hhWVal"><strong>'+num(x.weightKg,1)+' kg</strong><em>'+(fat!=null?'BF '+num(fat,1)+'%':'testzsír —')+'</em></div><button class="hhWDel" type="button" data-weight-del="'+esc(x.id)+'" aria-label="Mérés törlése">🗑</button></div>';
 }).join('');
}
async function render(){
 ensure();var page=document.getElementById(pageId),profile=pkey(),rows=await measurements(profile),bridgeFat=await latestBridgeBodyFat(profile),latest=rows[0]||null,fat=latestFat(rows,bridgeFat);
 page.innerHTML=
  '<div class="hhWTop"><button class="hhWBack" type="button" aria-label="Vissza">‹</button><div class="hhWTitle"><small>HEALTHRADAR · TESTSÚLY</small><b>Testsúly</b></div><div class="hhWProfile">'+esc(pname())+'</div></div>'+
  '<div class="hhWBody"><div class="hhWScale"><img alt="Beurer mérleg" src="'+SCALE_IMG+'"><div class="hhWDisplay"><div class="hhWLcdTop"><span class="hhWLcdTag">BF</span><span>'+segNumber(latest?latest.weightKg:0,'0.0')+'</span><span class="hhWLcdUnit">kg</span></div><div class="hhWLcdBottom"><span class="hhWLcdTag">TOTA</span><span>'+segNumber(fat?fat.percent:null,'--.-')+'</span><span class="hhWLcdUnit">%</span></div></div></div>'+
  '<div class="hhWDate">'+(latest?'Utolsó mérés · '+esc(fmtDate(latest.measuredAt)):'Még nincs rögzített mérés')+'</div>'+
  '<div class="hhWActions"><button class="primary" type="button" data-act="new"><span>📷</span>Új mérés</button><button type="button" data-act="manual"><span>✍️</span>Manuális bevitel</button><button type="button" data-act="trend"><span>📊</span>Trend</button><button type="button" data-act="history"><span>📜</span>Előzmények</button></div>'+
  '<section class="hhWHist" id="hhWeightHistory"><div class="hhWHistHead"><h3>Mérési napló</h3><small>'+rows.length+' mérés</small></div>'+historyHtml(rows)+'</section></div>';
 page.querySelector('.hhWBack').addEventListener('click',window.hhCloseWeight);
 page.querySelector('[data-act="new"]').addEventListener('click',function(){openSheet(true)});
 page.querySelector('[data-act="manual"]').addEventListener('click',function(){openSheet(false)});
 page.querySelector('[data-act="history"]').addEventListener('click',function(){document.getElementById('hhWeightHistory')?.scrollIntoView({behavior:'smooth',block:'start'})});
 page.querySelectorAll('[data-weight-del]').forEach(function(btn){btn.addEventListener('click',function(){deleteWeight(btn.getAttribute('data-weight-del'))})});
 page.querySelector('[data-act="trend"]').addEventListener('click',function(){
  window.hhCloseWeight();if(window.hhMeasurementState){window.hhMeasurementState.metric='weightKg';window.hhMeasurementState.period='90d'}
  if(typeof window.openHealthSection==='function')window.openHealthSection('measurements');
  else if(typeof window.show==='function'){window.healthSectionKind='measurements';window.show('healthSection');window.renderHealthSection&&window.renderHealthSection()}
 });
}
async function measurementById(id){
 var db=await openDb();try{return await reqP(db.transaction('measurements','readonly').objectStore('measurements').get(id))||null}finally{db.close()}
}
async function updateProfileWeightFromHistory(profile){
 var rows=await measurements(profile),next=rows[0]||null,db=await openDb();try{
  if(!db.objectStoreNames.contains('profiles'))return;
  var t=db.transaction('profiles','readwrite'),st=t.objectStore('profiles'),p=await reqP(st.get(profile));
  if(p){p.weightKg=next?Number(next.weightKg):null;p.updatedAt=new Date().toISOString();st.put(p)}
  await txDone(t);
 }finally{db.close()}
}
async function deleteWeight(id){
 var x=await measurementById(id);if(!x)return;
 if(x.source==='health_connect'&&typeof window.hhDeleteMeasurementSmart==='function'){
  window.hhDeleteMeasurementSmart(id);return;
 }
 if(!confirm('Törlöd ezt a testsúlymérést?\n\n'+num(x.weightKg,1)+' kg · '+fmtDate(x.measuredAt)))return;
 try{
  var db=await openDb();try{var t=db.transaction('measurements','readwrite');t.objectStore('measurements').delete(id);await txDone(t)}finally{db.close()}
  await updateProfileWeightFromHistory(x.profile);
  try{if(window.hhDropboxPushCurrentProfile)await window.hhDropboxPushCurrentProfile()}catch(e){console.warn('Weight delete Dropbox sync',e)}
  window.hhRenderLiveKpis&&window.hhRenderLiveKpis();window.hhSyncFullMigrationDashboard&&window.hhSyncFullMigrationDashboard();
  try{window.dispatchEvent(new CustomEvent('healthhub:measurement-deleted',{detail:{profile:x.profile,type:'weight',id:id}}))}catch(e){}
  window.toast&&window.toast('Testsúlymérés törölve');await render();
 }catch(e){console.error(e);window.toast?window.toast('A mérés törlése nem sikerült.'):alert('Törlési hiba.')}
}
function wrapSmartDelete(){
 if(typeof window.hhConfirmSmartDelete!=='function'||window.hhConfirmSmartDelete.__hhWeight271)return;
 var prev=window.hhConfirmSmartDelete;
 var wrapped=async function(){var out=await prev.apply(this,arguments);var p=document.getElementById(pageId);if(p&&p.classList.contains('on'))setTimeout(render,80);return out};
 wrapped.__hhWeight271=true;window.hhConfirmSmartDelete=wrapped;
}

function openSheet(fromCamera){
 ensure();var o=document.getElementById(sheetId),now=localValue();
 o.innerHTML='<div class="hhWSheet"><div class="hhWSheetHead"><div><small>HEALTHRADAR · '+esc(pname())+'</small><h3>Új testsúlymérés</h3></div><button type="button" class="hhWClose">×</button></div>'+
  (fromCamera?'<div class="hhWCameraSoon">📷 <b>Kamera + OCR</b> a következő fázisban érkezik. Most ugyanitt manuálisan véglegesíthető a mérés, így az adatkezelést már élesben teszteljük.</div>':'')+
  '<div class="hhWForm"><label>Időpont<input id="hhWAt" type="datetime-local" value="'+esc(now)+'"></label><div class="hhWFormGrid"><label>Testsúly (kg)<input id="hhWKgInput" inputmode="decimal" placeholder="pl. 77,6"></label><label>Testzsír (%)<input id="hhWFatInput" inputmode="decimal" placeholder="pl. 28,8"></label></div><button class="hhWSave" type="button">Mérés mentése</button></div></div>';
 o.classList.add('on');o.querySelector('.hhWClose').addEventListener('click',function(){o.classList.remove('on')});o.querySelector('.hhWSave').addEventListener('click',saveForm);
 setTimeout(function(){document.getElementById('hhWKgInput')?.focus()},80);
}
function parseDec(id){var el=document.getElementById(id),s=String(el&&el.value||'').trim().replace(',','.');if(!s)return null;var n=Number(s);return Number.isFinite(n)?n:null}
async function saveForm(){
 var kg=parseDec('hhWKgInput'),fat=parseDec('hhWFatInput'),at=document.getElementById('hhWAt')?.value;
 if(!(kg>=20&&kg<=400)){window.toast?window.toast('Adj meg érvényes testsúlyt 20–400 kg között.'):alert('Érvénytelen testsúly.');return}
 if(fat!=null&&!(fat>=1&&fat<=75)){window.toast?window.toast('A testzsír legyen 1–75% között.'):alert('Érvénytelen testzsír.');return}
 var measuredAt=at?new Date(at).toISOString():new Date().toISOString(),now=new Date().toISOString(),profile=pkey();
 var x={id:'weight-manual-'+profile+'-'+Date.now(),profile:profile,measuredAt:measuredAt,systolic:null,diastolic:null,pulse:null,weightKg:Math.round(kg*10)/10,bodyFatPercent:fat==null?null:Math.round(fat*10)/10,bloodGlucose:null,oxygenSaturation:null,source:'manual_weight',notes:'HealthHub Testsúly modul · manuális',createdAt:now,updatedAt:now};
 try{
  await saveMeasurement(x);document.getElementById(sheetId).classList.remove('on');
  try{if(window.hhDropboxPushCurrentProfile)await window.hhDropboxPushCurrentProfile()}catch(e){console.warn('Weight Dropbox sync',e)}
  window.hhRenderLiveKpis&&window.hhRenderLiveKpis();window.hhSyncFullMigrationDashboard&&window.hhSyncFullMigrationDashboard();
  try{window.dispatchEvent(new CustomEvent('healthhub:measurement-saved',{detail:{profile:profile,type:'weight',id:x.id}}))}catch(e){}
  window.toast&&window.toast('Testsúlymérés mentve · '+num(x.weightKg,1)+' kg');await render();
 }catch(e){console.error(e);window.toast?window.toast('A testsúlymérés mentése nem sikerült.'):alert('Mentési hiba.')}
}
window.hhOpenWeight=function(){ensure();wrapSmartDelete();document.getElementById(pageId).classList.add('on');render()}
window.hhCloseWeight=function(){var p=document.getElementById(pageId);if(p)p.classList.remove('on');var o=document.getElementById(sheetId);if(o)o.classList.remove('on')}
window.hhRenderWeight270=render;window.hhDeleteWeight271=deleteWeight;
window.addEventListener('healthhub:profile-changed',function(){var p=document.getElementById(pageId);if(p&&p.classList.contains('on'))setTimeout(render,40)});
document.documentElement.dataset.healthhubWeight='1.273';
})();