(function(){
'use strict';
/* HealthHub v1.49 — Health Connect activity / sleep / nutrition snapshot */
var BRIDGE_DB='healthhub-connect-v1';
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function num(v,d){v=Number(v);return Number.isFinite(v)?v.toLocaleString('hu-HU',{maximumFractionDigits:d==null?1:d}):'—'}
function dur(a,b){var m=Math.max(0,(Date.parse(b)-Date.parse(a))/60000);if(!Number.isFinite(m))return '—';var h=Math.floor(m/60),mm=Math.round(m%60);return h? h+' ó '+mm+' p':Math.round(m)+' p'}
function when(s){var d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
async function latestBundle(){
 return new Promise(function(ok){
  var r=indexedDB.open(BRIDGE_DB,2);r.onerror=function(){ok(null)};r.onsuccess=function(){var db=r.result;try{var q=db.transaction('imports').objectStore('imports').getAll();q.onsuccess=function(){var x=(q.result||[]).filter(function(i){return i.profile===pkey()&&i.bundle}).sort(function(a,b){return Date.parse(b.importedAt||0)-Date.parse(a.importedAt||0)});db.close();ok(x[0]||null)};q.onerror=function(){db.close();ok(null)}}catch(e){db.close();ok(null)}}})
}
function latestNonZero(a,keys){return (a||[]).slice().reverse().find(function(x){return keys.some(function(k){return Number(x[k])>0})})||null}
function latestByTime(a,key){return (a||[]).slice().sort(function(x,y){return Date.parse(y[key]||0)-Date.parse(x[key]||0)})[0]||null}
function card(icon,label,value,meta){return '<div class="hhLifeCard"><div class="hhLifeIcon">'+icon+'</div><div><small>'+esc(label)+'</small><b>'+value+'</b><span>'+meta+'</span></div></div>'}
async function render(){
 if(window.healthSectionKind!=='measurements')return;
 var host=document.getElementById('hhNowPanel');if(!host)return;
 if(document.querySelector('.hhLifeV151'))return;
 var old=document.getElementById('hhLifePanel');if(old)old.remove();
 var imp=await latestBundle();if(!imp||!imp.bundle||!imp.bundle.records)return;
 var r=imp.bundle.records, cards=[], act=latestNonZero(r.dailyActivity,['steps','distanceMeters','caloriesKcal']), nut=latestNonZero(r.dailyNutrition,['energyKcal','proteinGrams','carbsGrams','fatGrams']), sl=latestByTime(r.sleepSessions,'endTime'), ex=latestByTime(r.exerciseSessions,'endTime'), bf=latestByTime(r.bodyFat,'time'), vo=latestByTime(r.vo2Max,'time'), rh=latestByTime(r.restingHeartRate,'time');
 if(act){
  cards.push(card('🚶','Aktivitás',num((act.distanceMeters||0)/1000,2)+' km','🔥 '+num(act.caloriesKcal,0)+' kcal · '+num(act.steps,0)+' lépés · '+esc(act.date||'')));
 }
 if(ex)cards.push(card('🏃','Legutóbbi edzés',dur(ex.startTime,ex.endTime),esc(ex.title||'Health Connect edzés')+' · '+when(ex.endTime)));
 if(sl)cards.push(card('🌙','Alvás',dur(sl.startTime,sl.endTime),when(sl.endTime)+(Array.isArray(sl.stages)&&sl.stages.length?' · '+sl.stages.length+' szakasz':'')));
 if(nut)cards.push(card('🥗','Táplálkozás',num(nut.energyKcal,0)+' kcal','P '+num(nut.proteinGrams,0)+' g · CH '+num(nut.carbsGrams,0)+' g · Zs '+num(nut.fatGrams,0)+' g · '+esc(nut.date||'')));
 if(rh)cards.push(card('♥','Nyugalmi pulzus',num(rh.bpm,0)+' /perc',when(rh.time)));
 if(vo)cards.push(card('🫁','VO₂max',num(vo.mlKgMin,1)+' ml/kg/min',when(vo.time)));
 if(bf)cards.push(card('◉','Testzsír',num(bf.percent,1)+' %',when(bf.time)));
 if(!cards.length)return;
 var s=document.createElement('section');s.id='hhLifePanel';s.className='hhLife';s.innerHTML='<div class="hhLifeHead"><div><small>HEALTH CONNECT · ÉLETMÓD</small><h4>Aktivitás, alvás és táplálkozás</h4></div><span>'+esc(imp.bundle.schemaVersion||'')+'</span></div><div class="hhLifeGrid">'+cards.join('')+'</div>';
 host.appendChild(s);
}
function style(){
 if(document.getElementById('hh-v149-style'))return;var s=document.createElement('style');s.id='hh-v149-style';s.textContent=
 '.hhLife{margin-top:12px;padding-top:12px;border-top:1px solid #e1edf2}.hhLifeHead{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px}.hhLifeHead small{font-size:7.5px;font-weight:900;letter-spacing:.11em;color:#6c78a4}.hhLifeHead h4{font-size:12px;margin:2px 0 0;color:#173f62}.hhLifeHead>span{font-size:7px;color:#91a0ab}.hhLifeGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.hhLifeCard{display:flex;gap:8px;align-items:center;min-height:60px;background:#fbfdff;border:1px solid #e7eef4;border-radius:13px;padding:9px}.hhLifeIcon{width:29px;height:29px;display:grid;place-items:center;border-radius:9px;background:#eef5fb;font-size:15px;flex:0 0 auto}.hhLifeCard small{display:block;font-size:7.5px;color:#758998;font-weight:800}.hhLifeCard b{display:block;font-size:14px;color:#173f62;margin:1px 0}.hhLifeCard span{display:block;font-size:7px;color:#8a99a5;line-height:1.25}@media(max-width:390px){.hhLifeGrid{grid-template-columns:1fr 1fr}.hhLifeCard b{font-size:13px}}';
 document.head.appendChild(s)
}
style();
setTimeout(render,500);
var prev=window.renderHealthSection;if(typeof prev==='function')window.renderHealthSection=async function(){var x=await prev.apply(this,arguments);setTimeout(render,160);return x};
window.addEventListener('focus',function(){setTimeout(render,200)});
document.documentElement.dataset.healthhubLifestyle='1.49';
})();