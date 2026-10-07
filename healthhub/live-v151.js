(function(){
'use strict';
/* HealthHub v1.51.1 — robust Health Connect lifestyle restore · bridge schema v3 */
var BRIDGE_DB='healthhub-connect-v1';
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function num(v,d){v=Number(v);return Number.isFinite(v)?v.toLocaleString('hu-HU',{maximumFractionDigits:d==null?1:d}):'—'}
function dur(a,b){var m=(Date.parse(b)-Date.parse(a))/60000;if(!Number.isFinite(m)||m<0)return '—';var h=Math.floor(m/60),mm=Math.round(m%60);return h?h+' ó '+mm+' p':Math.round(m)+' p'}
function when(s){var d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
function latestByTime(a,key){return (Array.isArray(a)?a:[]).slice().sort(function(x,y){return Date.parse(y[key]||0)-Date.parse(x[key]||0)})[0]||null}
function latestNonZero(a,keys){return (Array.isArray(a)?a:[]).slice().reverse().find(function(x){return keys.some(function(k){return Number(x[k])>0})})||null}
function card(icon,label,value,meta,cls){return '<div class="hhLifeCard '+(cls||'')+'"><div class="hhLifeIcon">'+icon+'</div><div class="hhLifeText"><small>'+esc(label)+'</small><b>'+value+'</b><span>'+meta+'</span></div></div>'}
async function latestBundle(){
 return new Promise(function(ok){
  var q=indexedDB.open(BRIDGE_DB,3);
  q.onupgradeneeded=function(){var d=q.result;if(!d.objectStoreNames.contains('imports'))d.createObjectStore('imports',{keyPath:'id'});if(!d.objectStoreNames.contains('activity'))d.createObjectStore('activity',{keyPath:'id'})};
  q.onerror=function(){ok(null)};
  q.onsuccess=function(){
   var db=q.result;
   try{
    var r=db.transaction('imports').objectStore('imports').getAll();
    r.onsuccess=function(){
     var imports=(r.result||[]).filter(function(i){return i.profile===pkey()&&i.bundle&&i.bundle.records}).sort(function(a,b){return Date.parse(b.importedAt||0)-Date.parse(a.importedAt||0)});
     db.close();
     if(!imports.length){ok(null);return}
     var merged={schemaVersion:imports[0].bundle.schemaVersion||'',records:{}};
     var keys=['dailyActivity','dailySteps','exerciseSessions','sleepSessions','dailyNutrition','restingHeartRate','vo2Max','bodyFat'];
     keys.forEach(function(k){
       var out=[],seen=new Set();
       imports.forEach(function(im){
         var arr=Array.isArray(im.bundle.records&&im.bundle.records[k])?im.bundle.records[k]:[];
         arr.forEach(function(x){
           var sig=String(x.id||x.date||x.time||x.startTime||JSON.stringify(x));
           if(seen.has(sig))return;seen.add(sig);out.push(x)
         })
       });
       merged.records[k]=out;
     });
     ok({profile:pkey(),importedAt:imports[0].importedAt||'',bundle:merged,imports:imports})
    };
    r.onerror=function(){db.close();ok(null)}
   }catch(e){db.close();ok(null)}
  }
 })
}
function exerciseLabel(x){
 var t=String((x&&x.title)||'').trim();if(t)return t;
 var type=Number(x&&x.exerciseType);
 var common={8:'Kerékpár',16:'Edzés',56:'Futás',79:'Séta',80:'Gyaloglás'};
 return common[type]||'Edzés / aktivitás';
}
async function render(){
 if(window.healthSectionKind!=='measurements')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var imp=await latestBundle();if(!imp)return;
 var r=imp.bundle.records||{};
 var act=latestNonZero(r.dailyActivity,['steps','distanceMeters','caloriesKcal']);
 var step=latestNonZero(r.dailySteps,['count']);
 var ex=latestByTime(r.exerciseSessions,'endTime');
 var sl=latestByTime(r.sleepSessions,'endTime');
 var nut=latestNonZero(r.dailyNutrition,['energyKcal','proteinGrams','carbsGrams','fatGrams']);
 var rh=latestByTime(r.restingHeartRate,'time');
 var vo=latestByTime(r.vo2Max,'time');
 var bf=latestByTime(r.bodyFat,'time');
 var cards=[];
 if(step)cards.push(card('👣','Lépések',num(step.count,0),esc(step.date||'Legutóbbi nap'),'steps'));
 if(act&&Number(act.distanceMeters)>0)cards.push(card('🚶','Távolság',num(Number(act.distanceMeters)/1000,2)+' km',esc(act.date||''),'distance'));
 if(act&&Number(act.caloriesKcal)>0)cards.push(card('🔥','Elégetett kalória',num(act.caloriesKcal,0)+' kcal',esc(act.date||''),'calories'));
 if(ex)cards.push(card('🏃','Exercise / Walk',dur(ex.startTime,ex.endTime),esc(exerciseLabel(ex))+' · '+when(ex.endTime),'exercise'));
 if(sl)cards.push(card('🌙','Alvás',dur(sl.startTime,sl.endTime),when(sl.endTime)+(Array.isArray(sl.stages)&&sl.stages.length?' · '+sl.stages.length+' szakasz':''),'sleep'));
 if(nut)cards.push(card('🥗','Táplálkozás',num(nut.energyKcal,0)+' kcal','P '+num(nut.proteinGrams,0)+' g · CH '+num(nut.carbsGrams,0)+' g · Zs '+num(nut.fatGrams,0)+' g','nutrition'));
 if(rh)cards.push(card('♥','Nyugalmi pulzus',num(rh.bpm,0)+' /perc',when(rh.time),'resting'));
 if(vo)cards.push(card('🫁','VO₂max',num(vo.mlKgMin,1)+' ml/kg/min',when(vo.time),'vo2'));
 if(bf)cards.push(card('◉','Testzsír',num(bf.percent,1)+' %',when(bf.time),'fat'));
 var old=document.getElementById('hhLifePanel');if(old)old.remove();
 if(!cards.length)return;
 var panel=document.createElement('section');panel.id='hhLifePanel';panel.className='hhLife hhLifeV151';
 panel.innerHTML='<div class="hhLifeHead"><div><small>HEALTH CONNECT · ÉLETMÓD</small><h4>Aktivitás, alvás és táplálkozás</h4></div><span>'+esc(imp.bundle.schemaVersion||'')+'</span></div><div class="hhLifeGrid">'+cards.join('')+'</div>';
 var now=document.getElementById('hhNowPanel');
 if(now&&now.parentNode===root)now.insertAdjacentElement('afterend',panel);
 else root.insertBefore(panel,root.firstChild);
}
function style(){
 if(document.getElementById('hh-v151-style'))return;
 var s=document.createElement('style');s.id='hh-v151-style';s.textContent=
 '.hhLifeV151{margin:0 0 14px;padding:13px;border:1px solid #dfeaf1;border-radius:20px;background:linear-gradient(180deg,#fff,#f8fbfd);box-shadow:0 8px 22px rgba(28,70,98,.06)}'+
 '.hhLifeV151 .hhLifeHead{margin-bottom:10px}.hhLifeV151 .hhLifeHead small{font-size:8px}.hhLifeV151 .hhLifeHead h4{font-size:13px;margin-top:3px}.hhLifeV151 .hhLifeGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}'+
 '.hhLifeV151 .hhLifeCard{min-height:72px;padding:10px;border-radius:15px;background:#fff;border:1px solid #e5edf3;box-shadow:0 4px 12px rgba(31,65,91,.045)}'+
 '.hhLifeV151 .hhLifeIcon{width:34px;height:34px;border-radius:11px;font-size:17px}.hhLifeV151 .hhLifeText small{font-size:8px}.hhLifeV151 .hhLifeText b{font-size:15px;line-height:1.1;margin:2px 0}.hhLifeV151 .hhLifeText span{font-size:7.5px;line-height:1.3}'+
 '.hhLifeV151 .steps{border-left:4px solid #69b99c}.hhLifeV151 .distance{border-left:4px solid #71a9d2}.hhLifeV151 .calories{border-left:4px solid #efa261}.hhLifeV151 .exercise{border-left:4px solid #8e9dde}.hhLifeV151 .sleep{border-left:4px solid #8177bd}.hhLifeV151 .nutrition{border-left:4px solid #8fb96f}'+
 '@media(max-width:390px){.hhLifeV151 .hhLifeGrid{grid-template-columns:1fr 1fr}.hhLifeV151 .hhLifeText b{font-size:13px}}';
 document.head.appendChild(s)
}
function schedule(){[60,220,700].forEach(function(ms){setTimeout(render,ms)})}
style();
var prev=window.renderHealthSection;
if(typeof prev==='function')window.renderHealthSection=async function(){var x=await prev.apply(this,arguments);schedule();return x};
window.addEventListener('focus',schedule);
schedule();
document.documentElement.dataset.healthhubLifestyleRestore='1.51';
window.HH_LIVE_BUILD='v1.51-lifestyle-restore';
})();