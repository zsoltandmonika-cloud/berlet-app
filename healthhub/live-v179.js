(function(){
'use strict';
/* HealthHub v1.79 — live 3x3 HealthRadar KPI dashboard */
var DB='healthhub-healthradar-v2',BRIDGE_DB='healthhub-connect-v1';

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function fmtDateTime(s){
 var d=new Date(s);if(!Number.isFinite(d.getTime()))return 'nincs adat';
 var today=new Date(),same=d.toDateString()===today.toDateString();
 return same?'ma '+d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'});
}
function fmtDay(s){
 if(!s)return'nincs adat';var d=new Date(s+'T12:00:00');if(!Number.isFinite(d.getTime()))return esc(s);
 return d.toDateString()===new Date().toDateString()?'ma':d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'});
}
function dur(a,b){
 var m=(Date.parse(b)-Date.parse(a))/60000;if(!Number.isFinite(m)||m<=0)return '—';
 var h=Math.floor(m/60),mm=Math.round(m%60);return h?h+'ó '+mm+'p':Math.round(m)+'p';
}
function openDb(name){
 return new Promise(function(ok,no){var r=indexedDB.open(name,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}});
}
async function readMeasurements(){
 try{var db=await openDb(DB);try{return await reqP(db.transaction('measurements').objectStore('measurements').getAll())||[]}finally{db.close()}}catch(e){return[]}
}
async function readBridge(){
 var out={activity:[],imports:[]};
 try{
  var db=await openDb(BRIDGE_DB);try{
   var tx=db.transaction(['activity','imports']);
   out.activity=await reqP(tx.objectStore('activity').getAll())||[];
   out.imports=await reqP(tx.objectStore('imports').getAll())||[];
  }finally{db.close()}
 }catch(e){}
 return out
}
function latestMeasurement(rows,pred){
 return rows.filter(pred).sort(function(a,b){return Date.parse(b.measuredAt||0)-Date.parse(a.measuredAt||0)})[0]||null;
}
function latestRaw(imports,key,timeKey){
 var all=[];
 imports.forEach(function(imp){
  var r=imp&&imp.bundle&&imp.bundle.records;if(!r)return;
  var a=Array.isArray(r[key])?r[key]:[];
  a.forEach(function(x){all.push(x)});
 });
 return all.sort(function(a,b){return Date.parse(b[timeKey]||0)-Date.parse(a[timeKey]||0)})[0]||null;
}
function latestHeart(imports){
 var out=[];
 imports.forEach(function(imp){
  var r=imp&&imp.bundle&&imp.bundle.records,hrs=r&&Array.isArray(r.heartRate)?r.heartRate:[];
  hrs.forEach(function(hr){(Array.isArray(hr.samples)?hr.samples:[]).forEach(function(s){
   var bpm=Number(s&&s.bpm),ts=Date.parse(s&&s.time||0);
   if(Number.isFinite(ts)&&Number.isFinite(bpm)&&bpm>=25&&bpm<=250)out.push({time:new Date(ts).toISOString(),bpm:bpm});
  })});
 });
 out.sort(function(a,b){return Date.parse(b.time)-Date.parse(a.time)});return out[0]||null;
}
function latestActivity(activity){
 return activity.slice().sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))})[0]||null;
}
function latestDailyActivity(imports){
 var all=[];
 imports.forEach(function(imp){var r=imp&&imp.bundle&&imp.bundle.records,a=r&&Array.isArray(r.dailyActivity)?r.dailyActivity:[];a.forEach(function(x){all.push(x)})});
 return all.filter(function(x){return Number(x.steps)||Number(x.caloriesKcal)||Number(x.distanceMeters)}).sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))})[0]||null;
}
function val(v,dec){var n=Number(v);return Number.isFinite(n)?n.toLocaleString('hu-HU',{maximumFractionDigits:dec==null?1:dec}):'—'}
function tile(icon,label,value,unit,meta,cls){
 return '<div class="hhLiveKpi '+(cls||'')+'"><div class="hhLiveIcon">'+icon+'</div><div class="hhLiveLabel">'+esc(label)+'</div><div class="hhLiveValue">'+value+'</div><div class="hhLiveUnit">'+esc(unit||'')+'</div><div class="hhLiveMeta">'+esc(meta||'nincs adat')+'</div></div>';
}
async function render(){
 var card=document.querySelector('#health .kpiCard');if(!card)return;
 var p=pkey(),data=await Promise.all([readMeasurements(),readBridge()]),rows=data[0].filter(function(x){return x.profile===p}),bridge=data[1],
     imports=bridge.imports.filter(function(x){return x.profile===p}),activity=bridge.activity.filter(function(x){return x.profile===p});
 var bp=latestMeasurement(rows,function(x){return x.systolic!=null&&x.diastolic!=null}),
     spo2=latestMeasurement(rows,function(x){return x.oxygenSaturation!=null}),
     glu=latestMeasurement(rows,function(x){return x.bloodGlucose!=null}),
     wt=latestMeasurement(rows,function(x){return x.weightKg!=null}),
     hr=latestHeart(imports),
     sleep=latestRaw(imports,'sleepSessions','endTime'),
     ex=latestRaw(imports,'exerciseSessions','endTime'),
     act=latestActivity(activity),
     daily=latestDailyActivity(imports);
 if(!hr){
  var mp=latestMeasurement(rows,function(x){return x.pulse!=null});
  if(mp)hr={time:mp.measuredAt,bpm:mp.pulse};
 }
 if(!act&&daily)act={date:daily.date,steps:daily.steps};
 var cal=daily&&Number(daily.caloriesKcal)>0?daily:null;
 card.innerHTML='<div class="cardHead hhLiveHead"><h3>▥ Fő egészségügyi mutatók</h3><small>Legfrissebb adatok</small></div><div class="hhLiveGrid">'+
  tile('🫀','Vérnyomás',bp?Math.round(bp.systolic)+'/'+Math.round(bp.diastolic):'—','Hgmm',bp?fmtDateTime(bp.measuredAt):'nincs adat','bp')+
  tile('♥','Pulzus',hr?Math.round(hr.bpm):'—','/perc',hr?fmtDateTime(hr.time):'nincs adat','pulse')+
  tile('🫁','Véroxigén',spo2?val(spo2.oxygenSaturation,1):'—','%',spo2?fmtDateTime(spo2.measuredAt):'nincs adat','spo2')+
  tile('💧','Vércukor',glu?val(glu.bloodGlucose,1):'—','mmol/L',glu?fmtDateTime(glu.measuredAt):'nincs adat','glucose')+
  tile('⚖','Testsúly',wt?val(wt.weightKg,1):'—','kg',wt?fmtDateTime(wt.measuredAt):'nincs adat','weight')+
  tile('🌙','Alvás',sleep?dur(sleep.startTime,sleep.endTime):'—','',sleep?fmtDateTime(sleep.endTime):'nincs adat','sleep')+
  tile('🏃','Edzés',ex?dur(ex.startTime,ex.endTime):'—','',ex?fmtDateTime(ex.endTime):'nincs adat','exercise')+
  tile('🚶','Lépések',act?val(act.steps,0):'—','lépés',act?fmtDay(act.date):'nincs adat','steps')+
  tile('🔥','Elégetett kalória',cal?val(cal.caloriesKcal,0):'—','kcal',cal?fmtDay(cal.date):'nincs adat','calories')+
 '</div>';
}
function arrangeHealthRadar(){
 var health=document.getElementById('health');if(!health)return;
 var ask=health.querySelector('.ask'),lists=health.querySelector('.two');
 if(ask&&lists&&lists.nextElementSibling!==ask)lists.insertAdjacentElement('afterend',ask);
}
function style(){
 if(document.getElementById('hh-v179-style'))return;
 var s=document.createElement('style');s.id='hh-v179-style';s.textContent=
 '#health .kpiCard{padding:10px!important}.hhLiveHead{margin-bottom:8px!important}.hhLiveHead small{color:var(--a)!important}.hhLiveGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.hhLiveKpi{min-width:0;min-height:104px;background:linear-gradient(180deg,#fff,#fbfdff);border:1px solid #e5edf2;border-radius:14px;padding:8px;position:relative;overflow:hidden;box-shadow:0 4px 12px rgba(31,65,91,.035)}.hhLiveKpi:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--a);opacity:.42}.hhLiveIcon{font-size:15px;line-height:1}.hhLiveLabel{font-size:6.8px;color:#6d8292;font-weight:850;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhLiveValue{font-size:16px;line-height:1.1;color:#173f62;font-weight:900;margin-top:4px;letter-spacing:-.02em;white-space:nowrap}.hhLiveUnit{font-size:6.6px;color:#8a99a5;min-height:10px;margin-top:1px}.hhLiveMeta{font-size:6.3px;color:var(--a);font-weight:750;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhLiveKpi.bp:after{opacity:.65}.hhLiveKpi.sleep,.hhLiveKpi.exercise,.hhLiveKpi.steps,.hhLiveKpi.calories{background:linear-gradient(180deg,#fff,color-mix(in srgb,var(--soft) 24%,#fff))}@media(max-width:360px){.hhLiveGrid{gap:4px}.hhLiveKpi{padding:6px;min-height:98px}.hhLiveValue{font-size:14px}.hhLiveLabel{font-size:6.3px}}';
 document.head.appendChild(s);
}
style();arrangeHealthRadar();
var prevSet=window.setProfile;if(typeof prevSet==='function')window.setProfile=function(){var r=prevSet.apply(this,arguments);setTimeout(render,100);return r};
var prevShow=window.show;if(typeof prevShow==='function')window.show=function(){var r=prevShow.apply(this,arguments);setTimeout(render,120);return r};
window.addEventListener('focus',function(){setTimeout(render,100)});
document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(render,100)});
setTimeout(function(){arrangeHealthRadar();render()},250);setInterval(render,60000);
window.hhRenderLiveKpis=render;window.hhArrangeHealthRadar=arrangeHealthRadar;
document.documentElement.dataset.healthhubLiveKpi='1.79';
})();