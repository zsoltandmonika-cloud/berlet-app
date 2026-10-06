(function(){
'use strict';
/* HealthHub v1.270 — Weight module phase 1: Beurer UI, manual entry, history */
var DB='healthhub-healthradar-v2', BRIDGE='healthhub-connect-v1';
var SCALE_IMG=window.HH_WEIGHT_SCALE_V270||'';
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
 '.hhWBody{padding:10px 12px 28px}.hhWScale{position:relative;width:100%;max-width:406px;margin:0 auto 10px;border-radius:28px;overflow:hidden;filter:drop-shadow(0 12px 22px rgba(26,58,82,.18))}.hhWScale img{width:100%;height:auto;display:block}.hhWDisplay{position:absolute;left:40.8%;top:5.9%;width:18.9%;height:19.1%;border-radius:3px;background:linear-gradient(180deg,#1bc2f2,#16aee7);box-shadow:inset 0 0 12px rgba(255,255,255,.22),0 0 8px rgba(20,186,236,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#eefcff;text-shadow:0 0 5px rgba(255,255,255,.6);overflow:hidden}.hhWKg{font-family:Consolas,monospace;font-size:clamp(17px,6.1vw,27px);font-weight:500;line-height:.95;letter-spacing:-.08em}.hhWKg span{font-size:.32em;margin-left:2px;letter-spacing:0}.hhWFat{font-family:Consolas,monospace;font-size:clamp(7px,2.5vw,11px);margin-top:5px;white-space:nowrap}.hhWDate{font-size:7.5px;color:#6d8292;text-align:center;margin:-2px 0 10px;font-weight:750}'+
 '.hhWActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 14px}.hhWActions button{min-height:48px;border:1px solid #dce8ef;background:#fff;border-radius:15px;color:#173f62;font-size:10px;font-weight:850;box-shadow:0 5px 14px rgba(38,73,99,.05)}.hhWActions button.primary{background:linear-gradient(135deg,var(--a),var(--a2));border-color:transparent;color:#fff}.hhWActions button span{display:block;font-size:17px;margin-bottom:2px}'+
 '.hhWHist{background:#fff;border:1px solid #e1ebf1;border-radius:19px;padding:12px;box-shadow:0 7px 18px rgba(38,73,99,.05)}.hhWHistHead{display:flex;justify-content:space-between;align-items:end;margin-bottom:8px}.hhWHistHead h3{font-size:14px;margin:0}.hhWHistHead small{font-size:8px;color:var(--a);font-weight:800}.hhWRow{display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px 2px;border-top:1px solid #edf2f5}.hhWRow:first-of-type{border-top:0}.hhWRow b{display:block;font-size:12px}.hhWRow small{display:block;color:#73889a;font-size:8px;margin-top:3px}.hhWVal{text-align:right}.hhWVal strong{display:block;font-size:15px}.hhWVal em{font-style:normal;font-size:8px;color:#8799a6}.hhWEmpty{padding:18px;text-align:center;color:#8193a1;font-size:9px}'+
 '.hhWSheetOv{display:none;position:fixed;inset:0;z-index:8000;background:#08203388;align-items:flex-end}.hhWSheetOv.on{display:flex}.hhWSheet{width:min(100vw,430px);margin:auto;background:#f8fbfd;border-radius:24px 24px 0 0;padding:15px 15px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -16px 40px rgba(0,0,0,.18)}.hhWSheetHead{display:flex;justify-content:space-between;align-items:flex-start}.hhWSheetHead small{font-size:8px;color:var(--a);font-weight:900;letter-spacing:.08em}.hhWSheetHead h3{margin:3px 0 12px;font-size:18px}.hhWClose{width:36px;height:36px;border:0;border-radius:50%;background:#eaf1f5;font-size:18px}.hhWForm{display:grid;gap:10px}.hhWForm label{font-size:9px;font-weight:800;color:#45647c}.hhWForm input{width:100%;height:46px;margin-top:5px;border:1px solid #d5e3eb;border-radius:13px;background:#fff;padding:0 12px;font-size:16px;color:#173f62}.hhWFormGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.hhWSave{height:48px;border:0;border-radius:14px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-weight:900;font-size:11px}.hhWCameraSoon{border:1px dashed #bfd5e2;background:#eef7fb;border-radius:13px;padding:10px;font-size:9px;line-height:1.45;color:#4f6c80}';
 document.head.appendChild(s);
 var p=document.createElement('section');p.id=pageId;p.className='hhWeightPage';document.body.appendChild(p);
 var o=document.createElement('div');o.id=sheetId;o.className='hhWSheetOv';o.addEventListener('click',function(e){if(e.target===o)o.classList.remove('on')});document.body.appendChild(o);
}
function historyHtml(rows){
 if(!rows.length)return'<div class="hhWEmpty">Még nincs testsúlymérés ebben a profilban.</div>';
 return rows.slice(0,10).map(function(x){
  var fat=bodyFatValue(x);
  return '<div class="hhWRow"><div><b>'+esc(fmtDate(x.measuredAt))+'</b><small>'+esc(sourceLabel(x))+'</small></div><div class="hhWVal"><strong>'+num(x.weightKg,1)+' kg</strong><em>'+(fat!=null?'BF '+num(fat,1)+'%':'testzsír —')+'</em></div></div>';
 }).join('');
}
async function render(){
 ensure();var page=document.getElementById(pageId),profile=pkey(),rows=await measurements(profile),bridgeFat=await latestBridgeBodyFat(profile),latest=rows[0]||null,fat=latestFat(rows,bridgeFat);
 page.innerHTML=
  '<div class="hhWTop"><button class="hhWBack" type="button" aria-label="Vissza">‹</button><div class="hhWTitle"><small>HEALTHRADAR · TESTSÚLY</small><b>Testsúly</b></div><div class="hhWProfile">'+esc(pname())+'</div></div>'+
  '<div class="hhWBody"><div class="hhWScale"><img alt="Beurer mérleg" src="'+SCALE_IMG+'"><div class="hhWDisplay"><div class="hhWKg">'+(latest?num(latest.weightKg,1):'0,0')+'<span>kg</span></div><div class="hhWFat">'+(fat?'BF '+num(fat.percent,1)+'%':'BF — %')+'</div></div></div>'+
  '<div class="hhWDate">'+(latest?'Utolsó mérés · '+esc(fmtDate(latest.measuredAt)):'Még nincs rögzített mérés')+'</div>'+
  '<div class="hhWActions"><button class="primary" type="button" data-act="new"><span>📷</span>Új mérés</button><button type="button" data-act="manual"><span>✍️</span>Manuális bevitel</button><button type="button" data-act="trend"><span>📊</span>Trend</button><button type="button" data-act="history"><span>📜</span>Előzmények</button></div>'+
  '<section class="hhWHist" id="hhWeightHistory"><div class="hhWHistHead"><h3>Mérési napló</h3><small>'+rows.length+' mérés</small></div>'+historyHtml(rows)+'</section></div>';
 page.querySelector('.hhWBack').addEventListener('click',window.hhCloseWeight);
 page.querySelector('[data-act="new"]').addEventListener('click',function(){openSheet(true)});
 page.querySelector('[data-act="manual"]').addEventListener('click',function(){openSheet(false)});
 page.querySelector('[data-act="history"]').addEventListener('click',function(){document.getElementById('hhWeightHistory')?.scrollIntoView({behavior:'smooth',block:'start'})});
 page.querySelector('[data-act="trend"]').addEventListener('click',function(){
  window.hhCloseWeight();if(window.hhMeasurementState){window.hhMeasurementState.metric='weightKg';window.hhMeasurementState.period='90d'}
  if(typeof window.openHealthSection==='function')window.openHealthSection('measurements');
  else if(typeof window.show==='function'){window.healthSectionKind='measurements';window.show('healthSection');window.renderHealthSection&&window.renderHealthSection()}
 });
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
window.hhOpenWeight=function(){ensure();document.getElementById(pageId).classList.add('on');render()}
window.hhCloseWeight=function(){var p=document.getElementById(pageId);if(p)p.classList.remove('on');var o=document.getElementById(sheetId);if(o)o.classList.remove('on')}
window.hhRenderWeight270=render;
window.addEventListener('healthhub:profile-changed',function(){var p=document.getElementById(pageId);if(p&&p.classList.contains('on'))setTimeout(render,40)});
document.documentElement.dataset.healthhubWeight='1.270';
})();