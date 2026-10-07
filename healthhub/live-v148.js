(function(){
'use strict';
/* HealthHub v1.48.1 — visual health snapshot + sync status · bridge schema v3 */
var DB='healthhub-healthradar-v2', BRIDGE_DB='healthhub-connect-v1';
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openBridgeDb(){return new Promise(function(ok,no){var r=indexedDB.open(BRIDGE_DB,3);r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains('imports'))d.createObjectStore('imports',{keyPath:'id'});if(!d.objectStoreNames.contains('activity'))d.createObjectStore('activity',{keyPath:'id'})};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function fmtDate(s){if(!s)return '—';var d=new Date(s);if(!Number.isFinite(d.getTime()))return '—';return d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function sameDay(a,b){return a&&b&&String(a).slice(0,10)===String(b).slice(0,10)}
function latest(rows,test){return rows.filter(test).sort(function(a,b){return Date.parse(b.measuredAt||0)-Date.parse(a.measuredAt||0)})[0]||null}
function previous(rows,test,current){return rows.filter(function(x){return test(x)&&x.id!==current.id}).sort(function(a,b){return Date.parse(b.measuredAt||0)-Date.parse(a.measuredAt||0)})[0]||null}
function delta(cur,prev,key,unit){if(!cur||!prev)return '';var a=Number(cur[key]),b=Number(prev[key]);if(!Number.isFinite(a)||!Number.isFinite(b)||a===b)return '';var d=Math.round((a-b)*10)/10;return '<span class="hhDelta '+(d<0?'down':'up')+'">'+(d>0?'↑ ':'↓ ')+Math.abs(d)+' '+unit+'</span>'}
async function readMeasurements(){
 var db=await openDb();try{return await reqP(db.transaction('measurements').objectStore('measurements').getAll())||[]}finally{db.close()}
}
async function readCloud(profile){
 try{
  var v=window.HH_DROPBOX_VAULT;if(!v||!v.connected||!v.connected()||typeof v.downloadJson!=='function')return null;
  var raw=null,path='/HealthHub/profiles/'+profile+'-health-connect.json';
  try{raw=await v.downloadJson(path)}catch(e){
   if(e&&e.status!==409)throw e;
   path='/incoming-'+profile+'.json';
   raw=await v.downloadJson(path);
  }
  if(!raw||String(raw.profile||'').toLowerCase()!==profile)return null;
  localStorage.setItem('hh-healthradar-cloud-last-'+profile,new Date().toISOString());
  return raw;
 }catch(e){
  console.warn('HealthRadar cloud read failed',e);
  localStorage.setItem('hh-healthradar-cloud-error-'+profile,String(e&&e.message||e));
  return null;
 }
}
async function readBridge(profile){
 var out={steps:null,lastSync:null,pulse:null,previousPulse:null};
 try{
  var db=await openBridgeDb();
  var t=db.transaction(['activity','imports']);
  var ac=t.objectStore('activity'),im=t.objectStore('imports');
  var acts=await reqP(ac.getAll()),ims=await reqP(im.getAll());
  acts=acts.filter(function(x){return x.profile===profile}).sort(function(a,b){return String(b.date).localeCompare(String(a.date))});
  ims=ims.filter(function(x){return x.profile===profile}).sort(function(a,b){return Date.parse(b.importedAt||0)-Date.parse(a.importedAt||0)});
  out.steps=acts[0]||null;
  out.lastSync=ims[0]||null;

  /* Heart-rate samples are continuous Health Connect data. They are not the
     same thing as the pulse value attached to a blood-pressure measurement.
     Collect raw samples from all imported bundles and use the newest sample. */
  var heart=[],seen=new Set();
  ims.forEach(function(imp){
   var recs=imp&&imp.bundle&&imp.bundle.records;
   var hrs=recs&&Array.isArray(recs.heartRate)?recs.heartRate:[];
   hrs.forEach(function(hr){
    var samples=Array.isArray(hr.samples)?hr.samples:[];
    samples.forEach(function(s){
     var at=s&&s.time, bpm=Number(s&&s.bpm), ts=Date.parse(at||0);
     if(!Number.isFinite(ts)||!Number.isFinite(bpm)||bpm<25||bpm>250)return;
     var sig=String(at)+'|'+String(bpm);
     if(seen.has(sig))return;
     seen.add(sig);
     heart.push({measuredAt:new Date(ts).toISOString(),pulse:Math.round(bpm)});
    });
   });
  });
  heart.sort(function(a,b){return Date.parse(b.measuredAt)-Date.parse(a.measuredAt)});
  out.pulse=heart[0]||null;
  out.previousPulse=heart[1]||null;
  db.close();
 }catch(e){}
 try{
  var raw=await readCloud(profile),rec=raw&&raw.records||null;
  if(rec){
   var da=Array.isArray(rec.dailyActivity)?rec.dailyActivity:[];
   if(da.length){
    var x=da.slice().sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))})[0];
    if(x&&x.date)out.steps={profile:profile,date:x.date,steps:Number(x.steps)||0,distanceMeters:Number(x.distanceMeters)||0,caloriesKcal:Number(x.caloriesKcal)||Number(x.activeCaloriesKcal)||0,activeMinutes:Number(x.activeMinutes)||0,source:'dropbox-health-connect'};
   }
   var hs=[];
   (Array.isArray(rec.heartRate)?rec.heartRate:[]).forEach(function(hr){(Array.isArray(hr.samples)?hr.samples:[]).forEach(function(s){var t=Date.parse(s&&s.time||0),b=Number(s&&s.bpm);if(Number.isFinite(t)&&Number.isFinite(b)&&b>=25&&b<=250)hs.push({measuredAt:new Date(t).toISOString(),pulse:Math.round(b)})})});
   hs.sort(function(a,b){return Date.parse(b.measuredAt)-Date.parse(a.measuredAt)});
   if(hs.length){out.pulse=hs[0];out.previousPulse=hs[1]||null}
   if(raw.exportedAt)out.lastSync={importedAt:raw.exportedAt,fileName:'Dropbox Health Cloud'};
  }
 }catch(e){}
 return out
}
function item(icon,label,value,meta,extra,cls){return '<div class="hhNowItem '+(cls||'')+'"><div class="hhNowIcon">'+icon+'</div><div class="hhNowTxt"><small>'+label+'</small><b>'+value+'</b><span>'+meta+'</span></div>'+(extra||'')+'</div>'}
async function render(){
 if(window.healthSectionKind!=='measurements')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var rows=(await readMeasurements()).filter(function(x){return x.profile===pkey()});
 var bridge=await readBridge(pkey());
 var bp=latest(rows,function(x){return x.systolic!=null&&x.diastolic!=null}), pulse=latest(rows,function(x){return x.pulse!=null}), wt=latest(rows,function(x){return x.weightKg!=null}), spo2=latest(rows,function(x){return x.oxygenSaturation!=null}), glu=latest(rows,function(x){return x.bloodGlucose!=null});
 if(bp&&bp.pulse!=null&&(!pulse||Date.parse(bp.measuredAt)>Date.parse(pulse.measuredAt)))pulse=bp;
 if(bridge.pulse&&(!pulse||Date.parse(bridge.pulse.measuredAt)>Date.parse(pulse.measuredAt)))pulse=bridge.pulse;
 var today=new Date().toISOString().slice(0,10), step=bridge.steps;
 var html='<section class="hhNow" id="hhNowPanel"><div class="hhNowHead"><div><small>MAI ÁLLAPOT</small><h3>'+new Date().toLocaleDateString('hu-HU',{weekday:'long',month:'long',day:'numeric'})+'</h3></div><div class="hhSyncPill">♥ '+(bridge.lastSync?'Szinkron: '+fmtDate(bridge.lastSync.importedAt):'Health Connect')+'</div></div><div class="hhNowGrid">';
 if(bp)html+=item('🫀','Vérnyomás',Math.round(bp.systolic)+'/'+Math.round(bp.diastolic)+' <em>Hgmm</em>',fmtDate(bp.measuredAt),delta(bp,previous(rows,function(x){return x.systolic!=null&&x.diastolic!=null},bp),'systolic','Hgmm'),'bp');
 if(pulse){var pulsePrev=(bridge.pulse&&pulse===bridge.pulse)?bridge.previousPulse:previous(rows,function(x){return x.pulse!=null},pulse);html+=item('♥','Pulzus',Math.round(pulse.pulse)+' <em>/perc</em>',fmtDate(pulse.measuredAt),delta(pulse,pulsePrev,'pulse','/perc'),'pulse');}
 if(spo2)html+=item('🫁','SpO₂',Math.round(spo2.oxygenSaturation*10)/10+' <em>%</em>',fmtDate(spo2.measuredAt),delta(spo2,previous(rows,function(x){return x.oxygenSaturation!=null},spo2),'oxygenSaturation','%'),'spo2');
 if(wt)html+=item('⚖','Testsúly',Math.round(wt.weightKg*10)/10+' <em>kg</em>',fmtDate(wt.measuredAt),delta(wt,previous(rows,function(x){return x.weightKg!=null},wt),'weightKg','kg'),'weight');
 if(glu)html+=item('●','Vércukor',Math.round(glu.bloodGlucose*10)/10+' <em>mmol/L</em>',fmtDate(glu.measuredAt),'','glucose');
 if(step)html+=item('🚶','Lépések',Number(step.steps||0).toLocaleString('hu-HU'),sameDay(step.date,today)?'ma':step.date,'','steps');
 html+='</div></section>';
 var old=document.getElementById('hhNowPanel');if(old)old.remove();
 var first=root.querySelector('.hrSectionCard')||root.firstElementChild;if(first)first.insertAdjacentHTML('beforebegin',html);else root.insertAdjacentHTML('afterbegin',html);
 enhanceCards(root);
}
function enhanceCards(root){
 var cards=root.querySelectorAll('.hrSectionCard');
 cards.forEach(function(c){
  var text=(c.textContent||'').trim();
  if(/Mérések és trendek/i.test(text))c.classList.add('hhMetricsSection');
 });
 root.querySelectorAll('button').forEach(function(b){if(/Health Connect JSON/i.test(b.textContent||''))b.classList.add('hhHcProminent')});
}
function ensureStyle(){
 if(document.getElementById('hh-v148-style'))return;
 var s=document.createElement('style');s.id='hh-v148-style';s.textContent=
 '.hhNow{margin:10px 0 14px;padding:13px;border:1px solid #dcecf4;border-radius:20px;background:linear-gradient(180deg,#ffffff 0%,#f7fbfd 100%);box-shadow:0 8px 24px rgba(18,74,108,.07)}'+
 '.hhNowHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}.hhNowHead small{font-size:8px;font-weight:900;letter-spacing:.12em;color:#168c7d}.hhNowHead h3{margin:2px 0 0;font-size:14px;color:#123f60;text-transform:capitalize}.hhSyncPill{font-size:7.5px;font-weight:800;color:#157665;background:#e7f8f3;border:1px solid #c7eee3;padding:6px 8px;border-radius:999px;white-space:nowrap}'+
 '.hhNowGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hhNowItem{position:relative;display:flex;align-items:center;gap:9px;min-height:70px;padding:10px;border:1px solid #e6eef3;border-radius:15px;background:#fff}.hhNowIcon{width:31px;height:31px;border-radius:10px;display:grid;place-items:center;background:#f0f7fb;font-size:16px;flex:0 0 auto}.hhNowTxt{min-width:0;display:flex;flex-direction:column}.hhNowTxt small{font-size:8px;color:#6f8392;font-weight:800}.hhNowTxt b{font-size:19px;line-height:1.1;color:#123f60;margin-top:2px;letter-spacing:-.02em}.hhNowTxt b em{font-size:9px;font-style:normal;color:#6f8392;font-weight:750}.hhNowTxt span{font-size:7.5px;color:#8394a1;margin-top:4px}.hhDelta{position:absolute;right:8px;top:8px!important;padding:3px 5px;border-radius:999px;background:#f4f8fa;font-weight:800}.hhDelta.up{color:#b05c21}.hhDelta.down{color:#23765e}'+
 '.hhNowItem.bp{border-left:4px solid #d76d6d}.hhNowItem.pulse{border-left:4px solid #e38a96}.hhNowItem.spo2{border-left:4px solid #6eaed1}.hhNowItem.weight{border-left:4px solid #879db2}.hhNowItem.glucose{border-left:4px solid #a48bc4}.hhNowItem.steps{border-left:4px solid #73b99b}.hhHcProminent{box-shadow:0 5px 14px rgba(20,123,160,.14)!important;font-weight:900!important}.hhMetricsSection{overflow:visible}'+
 '@media(max-width:390px){.hhNowGrid{grid-template-columns:1fr 1fr}.hhNowTxt b{font-size:17px}.hhSyncPill{white-space:normal;text-align:right;max-width:120px}}';
 document.head.appendChild(s)
}
ensureStyle();
var prev=window.renderHealthSection;if(typeof prev==='function')window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);setTimeout(render,60);return r};
setTimeout(render,250);
window.addEventListener('focus',function(){setTimeout(render,80)});
document.documentElement.dataset.healthhubVisualHealth='1.48';
})();
