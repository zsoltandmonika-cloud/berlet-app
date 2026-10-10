(function(){
'use strict';
// HealthHub Calorie Engine v363: read-only, profile-scoped estimate.
// Does not overwrite Samsung Health, Health Connect, or any medical records.
var DB='healthhub-healthradar-v2';
function n(x){var v=Number(x);return Number.isFinite(v)?v:null}
function date(v){var d=new Date(v);return Number.isFinite(d.getTime())?d:null}
function age(v){
 var d=date(v);if(!d&&/^\d{2}\.\d{2}\.\d{4}$/.test(String(v||''))){
  var p=v.split('.');d=new Date(Number(p[2]),Number(p[1])-1,Number(p[0]));
 }
 if(!d)return null;var now=new Date(),a=now.getFullYear()-d.getFullYear();
 if(now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))a--;
 return a>=16&&a<=115?a:null;
}
function sex(v){
 v=String(v||'').toLowerCase().trim();
 if(['male','m','férfi','ferfi','man'].includes(v))return'male';
 if(['female','f','nő','no','woman'].includes(v))return'female';
 return null;
}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(k){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]})}
function fmt(v){return Math.round(v).toLocaleString('hu-HU')}
function day(t){var d=new Date(t);if(!Number.isFinite(d.getTime()))return'';return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function readDb(profile){
 return new Promise(function(resolve){
  try{
   var rq=indexedDB.open(DB,1);
   rq.onerror=function(){resolve(null)};
   rq.onupgradeneeded=function(){/* Metadata is not written by this read-only engine. */};
   rq.onsuccess=function(){
    var db=rq.result;
    try{
     if(!db.objectStoreNames.contains('profiles')||!db.objectStoreNames.contains('measurements')){db.close();resolve(null);return}
     var tx=db.transaction(['profiles','measurements'],'readonly');
     var prof=tx.objectStore('profiles').getAll(),meas=tx.objectStore('measurements').getAll();
     tx.oncomplete=function(){db.close();var p=(prof.result||[]).find(function(x){return x&&x.profile===profile});
      resolve({profile:p||{},measurements:(meas.result||[]).filter(function(x){return x&&x.profile===profile})})};
     tx.onerror=function(){db.close();resolve(null)};
    }catch(e){db.close();resolve(null)}
   };
  }catch(e){resolve(null)}
 });
}
function bestWeight(rows,ctx){
 var weights=(rows||[]).filter(function(x){var w=n(x.weightKg);return w!=null&&w>=25&&w<=350})
  .sort(function(a,b){return (date(b.measuredAt||b.date)?.getTime()||0)-(date(a.measuredAt||a.date)?.getTime()||0)});
 var x=weights[0]||ctx&&ctx.metrics&&ctx.metrics.weight&&ctx.metrics.weight.latest;
 if(!x)return null;
 var weight=n(x.weightKg),fat=n(x.bodyFatPercent),when=date(x.measuredAt||x.date);
 if(fat==null||fat<3||fat>70)fat=null;
 if(weight==null||weight<25||weight>350)return null;
 return {kg:weight,fat:fat,measuredAt:when};
}
function calculate(profile,records,core,measurement){
 var x=measurement,kg=x&&x.kg,h=n(core.heightCm),years=age(core.birthDate),sx=sex(core.sex||core.gender||core.biologicalSex);
 if(!x||!h||h<110||h>225)return {error:'A saját becsléshez a friss testsúly és a profilmagasság szükséges.'};
 var mifflin=years!=null&&sx?10*kg+6.25*h-5*years+(sx==='male'?5:-161):null;
 var fatRecent=x.fat!=null&&x.measuredAt&&(Date.now()-x.measuredAt.getTime())<=30*86400000;
 var katch=fatRecent?370+21.6*(kg*(1-x.fat/100)):null;
 var rmr=mifflin!=null?mifflin:katch;
 if(rmr==null)return {error:'Az alapanyagcseréhez a születési dátum és a nem, vagy friss testzsír%-mérés kell.'};
 var entries=(records.daily||[]).filter(function(d){return d&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)});
 var d=entries[entries.length-1];
 if(!d||!d.date)return {error:'Még nincs napi Health Connect aktivitásadat.'};
 var time=new Date(d.date+'T00:00:00'), now=new Date(),today=day(now);
 if(!Number.isFinite(time.getTime())||d.date>today||(now.getTime()-time.getTime())>8*86400000)return {error:'Az aktivitásadat túl régi. Előbb indíts egy Health Connect szinkront.'};
 var steps=Math.max(0,n(d.steps)||0);
 var rawKm=(n(d.distanceMeters)||0)/1000;
 var stepKm=steps*h/100/1000*(sx==='female'?0.413:0.415);
 var dailyKm=rawKm>0?rawKm:stepKm;
 var sessions=(records.sessions||[]).filter(function(s){return s&&day(s.startTime)===d.date});
 var runKm=0,exerciseKcal=0,reportedWorkoutMinutes=0;
 var seen=new Set();
 sessions.forEach(function(s){
  var st=date(s.startTime),en=date(s.endTime);
  if(!st||!en||en<=st)return;
  var key=st.toISOString()+'|'+en.toISOString()+'|'+String(s.title||s.type||s.manualType);
  if(seen.has(key))return;seen.add(key);
  var hrs=Math.min(8,(en-st)/3600000);
  var label=String(s.manualType||s.title||s.type||'').toLowerCase();
  var km=Math.max(0,n(s.distanceKm)||((n(s.distanceMeters)||0)/1000));
  if(/fut|run|jogg/.test(label)){runKm+=km;return}
  if(/sét|set|walk|hike|túra|tura/.test(label))return; // already counted in walking distance
  var met=/bike|kerékp|kerekp|bicik/.test(label)?6.8:
          /pilates/.test(label)?3:/jóga|joga|yoga/.test(label)?2.5:
          /erős|eros|strength/.test(label)?4.5:/edzés|edzes|workout/.test(label)?5:0;
  if(!met)return;
  reportedWorkoutMinutes+=hrs*60;
  exerciseKcal+=(met-1)*kg*hrs;
 });
 var walkKm=Math.max(0,dailyKm-runKm),walkActive=0.5*kg*walkKm;
 var runActive=0.95*kg*runKm;
 var active=Math.max(0,walkActive+runActive+exerciseKcal);
 var hasActivity=steps>0||dailyKm>0||reportedWorkoutMinutes>0;
 var dayFraction=d.date===today?Math.max(0.01,Math.min(1,(now.getTime()-time.getTime())/86400000)):1;
 var rest=rmr*dayFraction;
 // Compare active with active only. An unqualified caloriesKcal field may be TOTAL energy.
 var samsung=n(d.activeCaloriesKcal);
 if(samsung!=null&&samsung<=0)samsung=null;
 var warning=[];
 if(!x.measuredAt||(Date.now()-x.measuredAt.getTime())>30*86400000)warning.push('régebbi súlyadat');
 if(rawKm<=0&&steps>0)warning.push('becsült lépéshossz');
 if(!sx)warning.push('hiányzó profilnem');
 if(!fatRecent)warning.push('nincs friss testzsír-keresztellenőrzés');
 if(!hasActivity)warning.push('hiányzó aktivitás');
 return {date:d.date,active:active,rest:rest,total:rest+active,samsung:samsung,bmr:rmr,katch:katch,mifflin:mifflin,
  kg:kg,steps:steps,km:dailyKm,measuredAt:x.measuredAt,model:'Mifflin–St Jeor + nettó mozgási becslés',
  confidence:warning.length<=1?'közepes':'korlátozott',warnings:warning,fullDay:d.date!==today,
  pulseUsed:false, genderKnown:!!sx,hasActivity:hasActivity};
}
function css(){
 if(document.getElementById('hhCal363Css'))return;
 var s=document.createElement('style');s.id='hhCal363Css';s.textContent=
 '#hhActivityPage191 .hhCal363{margin:10px 0;background:#fff;border:1px solid color-mix(in srgb,var(--a) 25%,#e4ecf1);border-radius:16px;padding:12px;box-shadow:0 4px 18px #1749740d}'+
 '#hhActivityPage191 .hhCal363 h3{margin:0 0 8px;color:#204967;font-size:14px}'+
 '#hhActivityPage191 .hhCal363Grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}'+
 '#hhActivityPage191 .hhCal363Grid>div{background:var(--soft);padding:9px 5px;text-align:center;border-radius:11px}'+
 '#hhActivityPage191 .hhCal363Grid small{display:block;color:#556c7e;font-size:9px}'+
 '#hhActivityPage191 .hhCal363Grid b{display:block;color:var(--a);font-size:17px}'+
 '#hhActivityPage191 .hhCal363 p{font-size:10px;line-height:1.5;color:#547084;margin:8px 2px 0}';
 document.head.appendChild(s);
}
async function render(profile,cache){
 if(!['zsolt','monika'].includes(profile))return;
 var page=document.getElementById('hhActivityPage191'),host=page&&page.querySelector('.a191Top');
 if(!host)return;
 var box=page.querySelector('#hhCal363');
 if(!box){box=document.createElement('section');box.id='hhCal363';box.className='hhCal363';host.insertAdjacentElement('afterend',box)}
 css();box.innerHTML='<h3>🔥 HealthHub Calorie Engine · BETA</h3><p>Saját energia-becslés számítása…</p>';
 var db=await readDb(profile),ctx=window.hhGetLenaHealthContext289&&window.hhGetLenaHealthContext289(profile);
 if((localStorage.getItem('hh-profile')==='m'?'monika':'zsolt')!==profile||!box.isConnected)return;
 var core=Object.assign({},ctx&&ctx.profileCore||{},db&&db.profile||{});
 var w=bestWeight(db&&db.measurements,ctx);
 var val=calculate(profile,cache,core,w);
 if(val.error){box.innerHTML='<h3>🔥 HealthHub Calorie Engine · BETA</h3><p>'+esc(val.error)+'</p>';return}
 var compare=val.samsung==null?'Samsung: nincs összehasonlítható adat':
  'Samsung Health: '+fmt(val.samsung)+' aktív kcal · eltérés '+(val.active>=val.samsung?'+':'')+fmt(val.active-val.samsung)+' kcal';
 box.innerHTML='<h3>🔥 HealthHub Calorie Engine · BETA</h3>'+
  '<div class="hhCal363Grid">'+
  '<div><small>Saját aktív becslés</small><b>'+fmt(val.active)+'</b><small>kcal</small></div>'+
  '<div><small>Nyugalmi rész</small><b>'+fmt(val.rest)+'</b><small>kcal</small></div>'+
  '<div><small>Együtt, becslés</small><b>'+fmt(val.total)+'</b><small>kcal</small></div></div>'+
  '<p><b>'+esc(val.date)+(val.fullDay?' · lezárt nap':' · mai nap eddig')+'</b> · '+esc(compare)+'.</p>'+
  '<p>Alap: '+fmt(val.kg)+' kg, '+fmt(val.steps)+' lépés, '+val.km.toFixed(1)+' km. Modell: '+esc(val.model)+'. Adatminőség: '+esc(val.confidence)+(val.warnings.length?' ('+esc(val.warnings.join(', '))+')':'')+'.</p>'+
  '<p>⚠️ Nem laboratóriumi mérés. A pulzus nem kalóriaszorzó; különösen béta-blokkoló mellett lenne félrevezető. A teljes napi érték nem tartalmaz minden energiafelhasználási tételt.</p>';
}
window.HH_CALORIE_ENGINE_V363={render:render,estimate:calculate,version:'363'};
})();