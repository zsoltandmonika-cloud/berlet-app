(function(){
'use strict';
/* HealthHub v1.228 — Sleep dashboard + Cloud Health Connect + Sleep Helper */
var BRIDGE_DB='healthhub-connect-v1';
var sleepState=window.hhSleepState||{period:'7d'};
var sleepRenderSeq=0;
window.hhSleepState=sleepState;
var helper={ctx:null,source:null,gain:null,timer:null,endAt:0,wake:null,raf:null,mode:'brown',minutes:10};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function activeProfileCode(){
 try{
  if(typeof cur!=='undefined'&&(cur==='m'||cur==='z'))return cur;
 }catch(e){}
 return localStorage.getItem('hh-profile')==='m'?'m':'z';
}
function pkey(){return activeProfileCode()==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function otherName(){return pkey()==='monika'?'Zsolt':'Mónika'}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openBridgeDb(){return new Promise(function(ok,no){var r=indexedDB.open(BRIDGE_DB,2);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function fmtTime(s){var d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}):'—'}
function fmtDateFull(s){var d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleDateString('hu-HU',{year:'numeric',month:'long',day:'numeric',weekday:'long'}):'Ismeretlen dátum'}
function fmtDate(s){var d=new Date(s);return Number.isFinite(d.getTime())?d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'}):'—'}
function durMin(a,b){var v=(Date.parse(b)-Date.parse(a))/60000;return Number.isFinite(v)&&v>0?v:0}
function durText(min){min=Math.round(min||0);var h=Math.floor(min/60),m=min%60;return h?h+' ó '+m+' p':m+' p'}
function avg(a){return a.length?a.reduce(function(x,y){return x+y},0)/a.length:0}
function stageName(v){return ({0:'Ismeretlen',1:'Ébren',2:'Alvás',3:'Ágyon kívül',4:'Könnyű',5:'Mély',6:'REM',7:'Ébren (ágyban)'})[Number(v)]||'Szakasz'}
function stageClass(v){return ({1:'awake',2:'sleep',3:'awake',4:'light',5:'deep',6:'rem',7:'awake'})[Number(v)]||'unknown'}

/* v384: Health Connect records kept in memory per profile; no cross-person fallback. */
var hhSleepVitals384={zsolt:null,monika:null};
function hhSelectNightVitals384(profile,records,sessions){
 var night=(window.HH_SLEEP_V428_ENABLED===true&&window.HH_SLEEP_V428&&typeof window.HH_SLEEP_V428.night==='function'?window.HH_SLEEP_V428.night(sessions||[]):hhLatestNight(sessions||[])),nullValue={nightKey:'',heartRate:[],oxygenSaturation:[]};
 if(!night||!records||typeof records!=='object'){hhSleepVitals384[profile]=nullValue;return;}
 var start=Date.parse(night.startTime),end=Date.parse(night.endTime);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start){hhSleepVitals384[profile]=nullValue;return;}
 // Only keep the latest measured night, not a 30-day heart-rate history in browser memory.
 var heart=Array.isArray(records.heartRate)?records.heartRate.filter(function(r){
  return r&&Array.isArray(r.samples)&&Date.parse(r.startTime)<=end&&Date.parse(r.endTime)>=start;
 }).slice(-400):[];
 var oxy=Array.isArray(records.oxygenSaturation)?records.oxygenSaturation.filter(function(r){
  var t=Date.parse(r&&r.time);return Number.isFinite(t)&&t>=start&&t<=end;
 }).slice(-800):[];
 hhSleepVitals384[profile]={nightKey:night.startTime+'|'+night.endTime,heartRate:heart,oxygenSaturation:oxy};
}
function hhNightBiometrics384(night,profile){
 var stored=hhSleepVitals384[profile],out={pulse:null,oxygen:null};
 if(!night||!stored||stored.nightKey!==night.startTime+'|'+night.endTime)return out;
 // Exclude awake periods; a watch sample merely inside time-in-bed is not always sleep.
 var sleepTimes=hhSleepIntervals(night.sessions);
 if(!sleepTimes.length)return out;
 function validTime(t){return Number.isFinite(t)&&sleepTimes.some(function(s){return t>=s[0]&&t<=s[1]})}
 function aggregate(records,type){
  var bins=new Map(),count=0;
  function push(time,value,low,high){
   var t=Date.parse(time),v=Number(value);
   if(!validTime(t)||!Number.isFinite(v)||v<low||v>high)return;
   var minute=Math.floor(t/60000),row=bins.get(minute)||{sum:0,n:0};
   row.sum+=v;row.n+=1;bins.set(minute,row);count++;
  }
  if(type==='pulse'){
   records.slice(0,400).forEach(function(r){
    if(!r||!Array.isArray(r.samples))return;
    r.samples.slice(0,5000).forEach(function(s){push(s&&s.time,s&&s.bpm,25,240)});
   });
  }else{
   records.slice(0,800).forEach(function(r){push(r&&r.time,r&&r.percent,50,100)});
  }
  if(!bins.size)return null;
  var minuteMeans=Array.from(bins.values()).map(function(v){return v.sum/v.n});
  return {value:Math.round(minuteMeans.reduce(function(a,b){return a+b},0)/minuteMeans.length),
    minutes:minuteMeans.length,samples:count};
 }
 out.pulse=aggregate(stored.heartRate,'pulse');
 out.oxygen=aggregate(stored.oxygenSaturation,'oxygen');
 return out;
}
async function sleepSessions(profile){
 window.hhSleepSourceMeta={profile:profile,source:'cache',exportedAt:null};
 hhSleepVitals384[profile]=null;
 var map=new Map(),cutoff=Date.now()-95*86400000,cloudUsed=false;

 function addRows(a,importedAt){
  if(!Array.isArray(a))return;
  a.forEach(function(s){
   if(!s||!s.startTime||!s.endTime)return;
   if(Date.parse(s.endTime||0)<cutoff)return;
   var id=String(s.id||s.startTime+'|'+s.endTime);
   if(!map.has(id))map.set(id,Object.assign({},s,{_importedAt:importedAt||''}));
  });
 }

 /* Canonical Cloud file is authoritative for the selected profile.
    Do NOT mix it with old local imports, because stale historical imports can
    otherwise overwrite the visible "latest sleep" after a profile switch. */
 try{
  var v=window.HH_DROPBOX_VAULT;
  if(v&&v.connected&&v.connected()&&typeof v.downloadJson==='function'){
   var path='/HealthHub/profiles/'+profile+'-health-connect.json';
   var raw=await v.downloadJson(path);
   if(raw&&String(raw.profile||'').toLowerCase()===profile){
    addRows(raw.records&&raw.records.sleepSessions,raw.exportedAt);
    hhSelectNightVitals384(profile,raw.records,Array.from(map.values()).sort(function(a,b){return Date.parse(a.endTime)-Date.parse(b.endTime)}));
    window.hhSleepSourceMeta={profile:profile,source:'Dropbox / Health Connect',exportedAt:raw.exportedAt||null};
    cloudUsed=true;
    localStorage.setItem('hh-sleep-cloud-last-'+profile,new Date().toISOString());
    localStorage.setItem('hh-sleep-cloud-path-'+profile,path);
    window.hhSleepDataSource='Dropbox Cloud · '+profile;
    return Array.from(map.values()).sort(function(a,b){return Date.parse(a.endTime)-Date.parse(b.endTime)});
   }
  }
 }catch(e){
  if(!(e&&e.status===409))console.warn('Sleep Cloud read failed',e);
 }

 /* Local fallback is used only when the canonical Cloud file is unavailable. */
 var localVitals=null,localLatestEnd=-Infinity;
 try{
  var db=await openBridgeDb();try{
   await new Promise(function(resolve){
    var tx=db.transaction('imports'),st=tx.objectStore('imports'),req=st.openCursor(null,'prev');
    req.onerror=function(){resolve()};
    req.onsuccess=function(){
     var cur=req.result;if(!cur){resolve();return}
     var i=cur.value;
     if(i&&i.profile===profile&&i.bundle&&i.bundle.records){
      addRows(i.bundle.records.sleepSessions,i.importedAt);
      var endValues=(i.bundle.records.sleepSessions||[]).map(function(s){return Date.parse(s&&s.endTime)}).filter(Number.isFinite);
      var newest=endValues.length?Math.max.apply(null,endValues):-Infinity;
      if(newest>localLatestEnd){localLatestEnd=newest;localVitals=i.bundle.records;}
     }
     cur.continue();
    };
   });
  }finally{db.close()}
 }catch(e){}

 hhSelectNightVitals384(profile,localVitals,Array.from(map.values()).sort(function(a,b){return Date.parse(a.endTime)-Date.parse(b.endTime)}));
 window.hhSleepDataSource='Helyi Health Connect cache · '+profile;
 var fallbackDates=Array.from(map.values()).map(function(x){return Date.parse(x._importedAt||'')}).filter(Number.isFinite);
 window.hhSleepSourceMeta={profile:profile,source:'helyi Health Connect cache',exportedAt:fallbackDates.length?new Date(Math.max.apply(null,fallbackDates)).toISOString():null};
 return Array.from(map.values()).sort(function(a,b){return Date.parse(a.endTime)-Date.parse(b.endTime)});
}
function periodDays(){return sleepState.period==='30d'?30:sleepState.period==='90d'?90:7}
function filtered(rows){var min=Date.now()-periodDays()*86400000;return rows.filter(function(x){return Date.parse(x.endTime)>=min})}
function heroHtml(){
 var date=document.getElementById('dateH')||document.getElementById('dateHome');
 return '<div class="hhSleepDoctorHero"><button class="hhSleepProfileHit" onclick="hhSleepToggleProfile(event)" aria-label="Egy kattintás: váltás '+esc(otherName())+' profiljára" title="Váltás '+esc(otherName())+' profiljára"></button><div class="hhSleepHeroActions"><button onclick="hhCloseSleep()" aria-label="Kezdőlap">⌂</button><button onclick="hhRenderSleep()" aria-label="Frissítés">↻</button></div><div class="hhSleepDoctorTitle"><button class="hhSleepProfileName" onclick="hhSleepToggleProfile(event)" aria-label="Váltás '+esc(otherName())+' profiljára">'+esc(pname())+'</button><h1>Sleep</h1><span>'+esc(date&&date.textContent||'')+'</span></div></div>';
}
function bottomNav(){
 return '<nav class="hhSleepNav"><button onclick="hhCloseSleep()"><span>⌂</span><b>Kezdőlap</b></button><button class="on"><span>🌙</span><b>Sleep</b></button><button onclick="hhCloseSleep();if(window.show)show(\'health\')"><span>♡</span><b>HealthRadar</b></button><button onclick="hhCloseSleep();if(window.show)show(\'timeline\')"><span>▥</span><b>Idővonal</b></button></nav>';
}
function stageBar(s){
 var stages=Array.isArray(s&&s.stages)?s.stages:[];
 if(!stages.length)return '<div class="hhSleepEmpty">Ehhez az alváshoz nincs részletes szakaszadat.</div>';
 var start=Date.parse(s.startTime),end=Date.parse(s.endTime),span=end-start;
 if(!(span>0))return '';
 var bars=stages.map(function(x){
  var a=Math.max(start,Date.parse(x.startTime)),b=Math.min(end,Date.parse(x.endTime));
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return '';
  var left=(a-start)/span*100,width=(b-a)/span*100;
  return '<i class="'+stageClass(x.stage)+'" style="left:'+left.toFixed(3)+'%;width:'+width.toFixed(3)+'%" title="'+esc(stageName(x.stage)+' · '+fmtTime(x.startTime)+'–'+fmtTime(x.endTime))+'"></i>';
 }).join('');
 var tickCount=span<90*60000?3:5,ticks=[];
 for(var i=0;i<tickCount;i++){
  var when=new Date(start+span*i/(tickCount-1));
  ticks.push('<span>'+fmtTime(when.toISOString())+'</span>');
 }
 return '<section class="hhSleepTimeline386" aria-label="Alvásfázisok idővonala">'+
  '<div class="hhSleepTimelineTitle386">🌙 Alvásfázisok idővonala</div>'+
  '<div class="hhStageBar hhStageBar386" role="img" aria-label="A mért ébrenlét, könnyű, mély és REM szakaszok időarányos megjelenítése">'+bars+'</div>'+
  '<div class="hhSleepClockTicks">'+ticks.join('')+'</div>'+
  '<div class="hhStageLegend386"><span><i class="awake"></i>Ébren</span><span><i class="light"></i>Könnyű</span><span><i class="deep"></i>Mély</span><span><i class="rem"></i>REM</span></div>'+
  '</section>';
}
function stageSummary(s){
 var out={1:0,4:0,5:0,6:0},st=Array.isArray(s&&s.stages)?s.stages:[];
 st.forEach(function(x){var k=Number(x.stage);if(k===7||k===3)k=1;if(out[k]!=null)out[k]+=durMin(x.startTime,x.endTime)});
 var total=Object.values(out).reduce(function(a,b){return a+b},0)||durMin(s.startTime,s.endTime);
 function p(k){return total?Math.round(out[k]/total*100):0}
 return '<div class="hhSleepStageGrid"><div><small>KÖNNYŰ</small><b>'+p(4)+'%</b></div><div><small>MÉLY</small><b>'+p(5)+'%</b></div><div><small>REM</small><b>'+p(6)+'%</b></div><div><small>ÉBREN</small><b>'+p(1)+'%</b></div></div>';
}
// Union of actual sleep intervals, avoiding overlap and omitting known awake/out-of-bed stages.
function hhSleepIntervals(rows){
 var a=[];
 (rows||[]).forEach(function(s){
  var st=Array.isArray(s.stages)?s.stages:[];
  var sleep=st.filter(function(x){return [2,4,5,6].includes(Number(x.stage))});
  // If stages exist but none marks sleep, never treat the entire window as asleep.
  var periods=st.length?sleep:[s];
  periods.forEach(function(x){
   var start=Date.parse(x.startTime),end=Date.parse(x.endTime);
   if(Number.isFinite(start)&&Number.isFinite(end)&&end>start)a.push([start,end]);
  });
 });
 a.sort(function(x,y){return x[0]-y[0]});
 var union=[];
 a.forEach(function(x){
  var last=union[union.length-1];
  if(last&&x[0]<=last[1])last[1]=Math.max(last[1],x[1]);
  else union.push(x.slice());
 });
 return union;
}
function hhSleepOverlaps(intervals,start,end){
 return intervals.reduce(function(acc,x){return acc+Math.max(0,Math.min(end,x[1])-Math.max(start,x[0]))},0)/60000;
}
function hhLatestNight(rows){
 if(!Array.isArray(rows)||!rows.length)return null;
 var last=rows[rows.length-1],group=[last],start=Date.parse(last.startTime),end=Date.parse(last.endTime);
 for(var i=rows.length-2;i>=0;i--){
  var x=rows[i],prevEnd=Date.parse(x.endTime),prevStart=Date.parse(x.startTime);
  if(!Number.isFinite(prevEnd)||!Number.isFinite(prevStart))continue;
  if(start-prevEnd>90*60000)break;
  group.unshift(x);start=Math.min(start,prevStart);
 }
 return {startTime:new Date(start).toISOString(),endTime:new Date(end).toISOString(),
  stages:group.reduce(function(a,x){return a.concat(Array.isArray(x.stages)?x.stages:[])},[]),
  sessions:group};
}
function hhSleepSource381(last){
 if(!last)return '';
 var meta=window.hhSleepSourceMeta||{},now=new Date(),end=new Date(last.endTime);
 var currentDay=now.toLocaleDateString('sv-SE'),lastDay=end.toLocaleDateString('sv-SE');
 var stale=lastDay!==currentDay;
 var imported=meta.exportedAt?'Utolsó adatimport: '+fmtDateFull(meta.exportedAt)+' '+fmtTime(meta.exportedAt):'Utolsó adatimport: időpont nem ismert';
 return '<div class="hhSleepSource381'+(stale?' stale':'')+'"><b>📅 Utolsó mért alvás: '+esc(fmtDateFull(last.endTime))+'</b>'+
 '<span>'+esc(imported)+'</span>'+
 (stale?'<strong>⚠️ A mai alvás még nem szerepel az átvett adatokban. A webes frissítés csak a már szinkronizált adatokat olvassa újra.</strong>':'')+
 '</div>';
}
/* RAG = red / amber / green. This is a HealthRadar display indicator, not a medical diagnosis.
   Stage quotas (REM/deep) are intentionally informational: wrist devices do not diagnose sleep stages. */
function hhSleepMetrics382(night){
 if(!night)return null;
 var start=Date.parse(night.startTime),end=Date.parse(night.endTime),windowMin=(end-start)/60000;
 if(!Number.isFinite(windowMin)||windowMin<=0||windowMin>16*60)return null;
 var stages=Array.isArray(night.stages)?night.stages:[];
 var enough=stages.some(function(s){return [2,4,5,6].includes(Number(s.stage))&&durMin(s.startTime,s.endTime)>0});
 var actual=enough?hhSleepOverlaps(hhSleepIntervals(night.sessions),start,end):null;
 if(actual!=null&&(actual<0||actual>windowMin*1.02))actual=null;
 var knownStageIntervals=stages.filter(function(st){return [1,2,3,4,5,6,7].includes(Number(st.stage))}).map(function(st){
  return [Math.max(start,Date.parse(st.startTime)),Math.min(end,Date.parse(st.endTime))];
 }).filter(function(a){return Number.isFinite(a[0])&&Number.isFinite(a[1])&&a[1]>a[0]}).sort(function(a,b){return a[0]-b[0]});
 var covered=0,left=null,right=null;
 knownStageIntervals.forEach(function(pair){
  if(left==null){left=pair[0];right=pair[1]}else if(pair[0]<=right){right=Math.max(right,pair[1])}
  else{covered+=right-left;left=pair[0];right=pair[1]}
 });
 if(left!=null)covered+=right-left;
 var coverage=Math.min(1,Math.max(0,covered/60000/windowMin));
 return {start:start,end:end,windowMin:windowMin,actual:actual,efficiency:actual==null?null:actual/windowMin,coverage:coverage,stages:stages};
}
function hhSleepTone382(min){
 if(min==null||!Number.isFinite(min))return {tone:'muted',label:'Nincs értékelhető adat'};
 if(min<360)return {tone:'bad',label:'6 óránál rövidebb'};
 if(min<420)return {tone:'warn',label:'6–7 óra'};
 if(min<=540)return {tone:'good',label:'7–9 óra'};
 return {tone:'warn',label:'9 óránál hosszabb'};
}
function hhSleepEfficiency382(ratio){
 if(ratio==null||!Number.isFinite(ratio))return {tone:'muted',label:'Nincs adat'};
 if(ratio<.75)return {tone:'bad',label:'Sok ébrenlét'};
 if(ratio<.90)return {tone:'warn',label:'Megszakított alvás'};
 return {tone:'good',label:'Kevés ébrenlét'};
}
/* HealthRadar v1 experimental sleep index: 65% duration progress (8 h target)
   +35% measured sleep efficiency (90% target, 50% zero baseline).
   Caps: under 6h <=59, under 7h <=79, efficiency under 75% <=79.
   It is NOT Samsung's proprietary score and NOT a validated clinical instrument.
   Less than 80% valid sleep-stage timeline coverage => no computed index. */
function hhSleepIndex382(m){
 if(!m||m.actual==null||m.windowMin<=0||m.actual<15||m.efficiency==null||m.coverage<.80)return null;
 var durationPart=65*Math.max(0,Math.min(1,m.actual/480));
 var efficiencyPart=35*Math.max(0,Math.min(1,(m.efficiency-.5)/.4));
 var score=Math.round(durationPart+efficiencyPart);
 if(m.actual<360)score=Math.min(score,59);
 else if(m.actual<420)score=Math.min(score,79);
 if(m.efficiency<.75)score=Math.min(score,79);
 return {score:score,tone:score<60?'bad':score<80?'warn':'good',
  label:score<60?'Figyelmet igényel':score<80?'Fejleszthető':'Kedvező',
  durationPart:Math.round(durationPart),efficiencyPart:Math.round(efficiencyPart),efficiency:m.efficiency};
}
function sleepFactorHeading383(){
 return '<div class="hhSleepFactorHeading381 hhSleepFactorTop383"><div><small>ALVÁSELEMZÉS</small><h3>Alvási tényezők</h3></div><span class="hhSleepFactorSource381">⌚ Health Connect</span></div>';
}
function sleepFactorCards381(night,profile){
 if(!night)return '';
 var m=hhSleepMetrics382(night),stages=m?m.stages:[],hasStages=stages.length>0;
 var mins={4:0,5:0,6:0,1:0};
 stages.forEach(function(s){
  var k=Number(s.stage);if(k===3||k===7)k=1;
  if(mins[k]!=null)mins[k]+=durMin(s.startTime,s.endTime);
 });
 var idx=hhSleepIndex382(m),durationTone=hhSleepTone382(m&&m.actual),vitals=hhNightBiometrics384(night,profile);
 var efficiencyTone=hhSleepEfficiency382(m&&m.efficiency);
 function share(n,base){return base>0?Math.round(n/base*100)+'%':'—'}
 function val(n){return n==null?'—':durText(n)}
 // Display complete elapsed minutes for per-stage cards, without changing raw
 // Health Connect intervals. Exact Samsung parity still requires phone comparison.
 function stageVal(n){return n==null?'—':durText(Math.floor(n+1e-8))}
 function card(icon,name,value,status,tone,detail){
  return '<div class="hhSleepFactor381 hhSleepRag382 '+esc(tone)+'">'+
   '<div class="hhSleepFactorLabel381"><span class="hhSleepFactorIcon381" aria-hidden="true">'+icon+'</span><span>'+esc(name)+'</span></div>'+
   '<strong class="hhSleepFactorValue381">'+esc(value)+'</strong>'+
   '<span class="hhSleepFactorStatus381 '+esc(tone)+'">'+esc(status)+'</span>'+
   '<small class="hhSleepFactorDetail381">'+esc(detail)+'</small></div>';
 }
 var score='<div class="hhSleepScoreStrip381 hhSleepRag382 '+(idx?idx.tone:'muted')+'">'+
   '<div class="hhSleepScoreSymbol381" aria-hidden="true">☾</div>'+
   '<div class="hhSleepScoreText381"><b>HealthRadar alvásindex</b>'+
   (window.HH_SLEEP_V428_ENABLED===true?'':'<small>Saját, becsült pihenésindex · nem Samsung-pontszám</small>')+
   (idx?'<span class="hhSleepFactorStatus381 '+idx.tone+'">'+idx.label+'</span>':'<span class="hhSleepFactorStatus381 muted">Nincs elég adat</span>')+
   '</div><strong>'+(idx?idx.score:'—')+' <small>/ 100</small></strong></div>';
 var expl='<details class="hhSleepIndexMethod382"><summary>ℹ️ Hogyan számoljuk az alvásindexet?</summary>'+
  '<p>Tájékoztató, nem orvosilag validált saját mutató. Az alvásidő maximum 65 pontot ér (8 óra esetén), az alváshatékonyság maximum 35 pontot (90% felett). A 6 óránál rövidebb alvás legfeljebb 59, a 6–7 órás vagy 75% alatti hatékonyság legfeljebb 79 pontot kaphat. 80%-nál hiányosabb alvásfázis-idővonalból nem számolunk pontszámot. Az index nem hasonlítható közvetlenül a Samsung 0–100 értékéhez.</p></details>';
 return '<section class="hhSleepFactorsSection381'+(window.HH_SLEEP_V428_ENABLED===true?' hhSleepFactorsV432':'')+'" aria-label="Alvási tényezők">'+
  
  score+expl+
  '<div class="hhSleepFactors381">'+
   card('💤','Tényleges alvás',val(m&&m.actual),durationTone.label,durationTone.tone,'Mért alvás, ébrenlét nélkül')+
   card('🌑','Mély alvás',hasStages?stageVal(mins[5]):'—',hasStages?share(mins[5],m&&m.actual):'Nincs adat',hasStages?'info':'muted','Mért alvásfázis · tájékoztató')+
   card('🌙','REM alvás',hasStages?stageVal(mins[6]):'—',hasStages?share(mins[6],m&&m.actual):'Nincs adat',hasStages?'info':'muted','Mért alvásfázis · tájékoztató')+
   card('👁️','Ébrenlét',hasStages?stageVal(mins[1]):'—',efficiencyTone.label,efficiencyTone.tone,'Alváshatékonyság: '+(m&&m.efficiency!=null?Math.round(m.efficiency*100)+'%':'—'))+
   (window.HH_SLEEP_V428_ENABLED===true?
     card('💓','Éjszakai pulzus',vitals.pulse?vitals.pulse.value+' /perc':'—',
       vitals.pulse?(vitals.pulse.minutes===1?'Egyetlen időpont':'Átlag'):'Nincs mérés',
       vitals.pulse?'info':'muted',
       vitals.pulse?vitals.pulse.minutes+' mért perc · Health Connect':'Nincs éjszakai pulzusadat')+
     card('☁️','Könnyű alvás',hasStages?stageVal(mins[4]):'—',hasStages?share(mins[4],m&&m.actual):'Nincs adat',hasStages?'info':'muted','Mért alvásfázis · tájékoztató')+
     (vitals.oxygen?card('🫁','Éjszakai véroxigén',vitals.oxygen.value+'%',vitals.oxygen.minutes===1?'Egyetlen időpont':'Átlag','info',vitals.oxygen.minutes+' mért perc · Health Connect'):'')
     :
     card('☁️','Könnyű alvás',hasStages?stageVal(mins[4]):'—',hasStages?share(mins[4],m&&m.actual):'Nincs adat',hasStages?'info':'muted','Mért alvásfázis · tájékoztató')+
     (vitals.pulse?card('💓','Éjszakai pulzus',vitals.pulse.value+' /perc',vitals.pulse.minutes===1?'Egyetlen időpont':'Átlag', 'info',vitals.pulse.minutes+' mért perc · Health Connect'):'')+
     (vitals.oxygen?card('🫁','Éjszakai véroxigén',vitals.oxygen.value+'%',vitals.oxygen.minutes===1?'Egyetlen időpont':'Átlag','info',vitals.oxygen.minutes+' mért perc · Health Connect'):'')
   )+
  '</div><p class="hhSleepFactorFoot381">🔴 Rövidebb / kedvezőtlenebb · 🟠 figyelendő · 🟢 kedvezőbb. A mély, REM és könnyű alvás csempéi információs jellegűek; a viselhető eszköz fázisadatai nem diagnózisok.</p></section>';
}
function sleepOverview(rows){
 if(!rows.length)return '<div class="hhSleepEmpty big">Nincs szinkronizált alvásadat.</div>';
 var night=hhLatestNight(rows),m=hhSleepMetrics382(night);
 var windowMins=m&&m.windowMin,actual=m&&m.actual;
 function card(title,value,details,state){
  return '<div class="hhSleepStat363 hhSleepRag382 '+esc(state)+'"><small>'+title+'</small><b>'+value+'</b><span>'+details+'</span></div>';
 }
 // The last night is directly tied to one verifiable time range. Do not silently
 // mix in earlier rolling-24h intervals until their exact record origins are shown.
 return '<div class="hhSleepOverview363 hhSleepOverview382">'+
  card('💤 ALVÁSI IDŐSZAK',windowMins==null?'—':durText(windowMins),esc(fmtTime(night.startTime)+'–'+fmtTime(night.endTime)),'muted')+
  card('🌙 TÉNYLEGES ALVÁS',actual==null?'—':durText(actual),'Ébrenlét nélkül · utolsó éjszaka',hhSleepTone382(actual).tone)+
  '</div>';
}
// A friendly, evidence-labelled sleep nudge. No diagnosis from wearable observations.
function sleepLenaComment(rows,profile,nightOverride){
 if(!rows.length)return'';
 var night=arguments.length>=3?nightOverride:hhLatestNight(rows),measured=hhSleepMetrics382(night);
 var mins=measured&&measured.actual,healthy=mins!=null&&mins>=15;
 var name=profile==='monika'?'Mónika':'Zsolt';
 var icon='😶',title='Kevés adat',msg='Az utolsó éjszakáról még nincs elég fázisadat a tényleges alvás megállapításához.';
 if(healthy&&mins<360){icon='😴';title='Pihenésre fel!';msg=name+', az utolsó éjszaka '+durText(mins)+' tényleges alvást mértem. Ez kevésnek tűnik; ha teheted, ma adj több időt a pihenésnek.'}
 else if(healthy&&mins<420){icon='🙂';title='Van még tartalék';msg=name+', az utolsó éjszaka '+durText(mins)+' tényleges alvást látok. Egy hosszabb éjszaka segíthet a regenerációban.'}
 else if(healthy&&mins<=540){icon='😌';title='Jól néz ki';msg=name+', az utolsó éjszaka '+durText(mins)+' tényleges alvást rögzítettem. Figyeld meg, mennyire érzed magad kipihentnek.'}
 else if(healthy){icon='🌙';title='Hosszabb pihenés';msg=name+', az utolsó éjszaka '+durText(mins)+' tényleges alvást rögzítettem. Ha ez szokatlan, a közérzetedet is érdemes figyelni.'}
 if(healthy&&night&&Array.isArray(night.stages)&&night.stages.length){
  var stageMins={deep:0,rem:0,awake:0};
  night.stages.forEach(function(st){
   var k=Number(st.stage),m=durMin(st.startTime,st.endTime);
   if(k===5)stageMins.deep+=m;
   else if(k===6)stageMins.rem+=m;
   else if(k===1||k===3||k===7)stageMins.awake+=m;
  });
  msg+=' A Health Connect fázisadataiban '+durText(Math.floor(stageMins.deep+1e-8))+' mély, '+durText(Math.floor(stageMins.rem+1e-8))+' REM és '+durText(Math.floor(stageMins.awake+1e-8))+' ébrenléti idő látszik. A HealthRadar saját alvásindexe tájékoztató jellegű, nem Samsung-pontszám.';
 }
 return '<aside class="hhSleepLena364" aria-label="Léna gyors alvásértékelése"><div class="hhSleepMood364">'+icon+'</div><div class="hhSleepLenaText364"><b>💬 Léna · '+esc(title)+'</b><p>'+esc(msg)+'</p><small>⌚ Óraadatokból készült becslés, nem alvásdiagnózis.</small></div></aside>';
}
/* Trend data: one measured sleep duration per local waking day.
   Multiple overlapping sessions are unioned; missing days never become artificial zeros. */
function hhSleepTrendDaily386(rows){
 var groups=new Map();
 (rows||[]).forEach(function(s){
  var end=Date.parse(s&&s.endTime);
  if(!Number.isFinite(end))return;
  var d=new Date(end).toLocaleDateString('sv-SE');
  if(!groups.has(d))groups.set(d,[]);
  groups.get(d).push(s);
 });
 return Array.from(groups.entries()).sort(function(a,b){return a[0].localeCompare(b[0])}).map(function(row){
  var known=row[1].filter(function(s){return Array.isArray(s.stages)&&s.stages.some(function(t){return [2,4,5,6].includes(Number(t.stage))&&durMin(t.startTime,t.endTime)>0})});
  if(!known.length)return {date:row[0],minutes:null,sessions:row[1].length};
  var spans=hhSleepIntervals(known),minutes=spans.reduce(function(sum,p){return sum+(p[1]-p[0])/60000},0);
  return {date:row[0],minutes:Math.max(0,Math.round(minutes)),sessions:row[1].length};
 });
}
function hhSleepTrendSeries386(rows){
 var days=periodDays(),now=new Date(),daily=hhSleepTrendDaily386(rows),byDate=new Map(daily.map(function(x){return [x.date,x]}));
 var buckets=[];
 for(var offset=days-1;offset>=0;offset--){
  var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-offset),key=d.toLocaleDateString('sv-SE'),item=byDate.get(key);
  buckets.push({date:key,label:d.toLocaleDateString('hu-HU',{month:'numeric',day:'numeric'}),minutes:item&&item.minutes!=null?item.minutes:null,count:item&&item.minutes!=null?1:0});
 }
 if(days!==90)return buckets;
 // Weekly average of observed nights, never add a week's total as if it were one night.
 var weeks=[];
 for(var i=0;i<buckets.length;i+=7){
  var part=buckets.slice(i,i+7),seen=part.filter(function(x){return x.minutes!=null});
  var value=seen.length?Math.round(seen.reduce(function(a,x){return a+x.minutes},0)/seen.length):null;
  weeks.push({date:part[part.length-1].date,label:part[0].label+'–'+part[part.length-1].label,
   minutes:value,count:seen.length});
 }
 return weeks;
}
function chart(rows){
 var points=hhSleepTrendSeries386(rows),values=points.filter(function(p){return p.minutes!=null});
 if(!values.length)return '<div class="hhSleepEmpty hhSleepNoTrend386">Ebben az időszakban nincs alvásfázisokkal igazolt alvásidő. A hiányzó napokat nem tekintjük 0 órának.</div>';
 var isWeekly=periodDays()===90,w=360,h=238,left=39,right=12,top=26,bottom=185;
 var maxH=Math.max.apply(null,values.map(function(p){return p.minutes/60}).concat([9]));
 var topH=Math.max(10,Math.ceil((maxH+0.2)/2)*2);
 var px=function(i){return left+(w-left-right)*(points.length===1?.5:i/(points.length-1))};
 var py=function(hours){return bottom-(bottom-top)*Math.max(0,Math.min(1,hours/topH))};
 var lastMeasuredIndex=-1;points.forEach(function(p,i){if(p.minutes!=null)lastMeasuredIndex=i});
 var segments=[],segment=[],circles='',labels='',grid='';
 function flush(){if(segment.length){segments.push(segment.join(' '));segment=[]}}
 points.forEach(function(p,i){
  if(p.minutes==null){flush();return}
  var x=px(i),y=py(p.minutes/60);
  segment.push((segment.length?'L':'M')+x.toFixed(1)+' '+y.toFixed(1));
  var dateLabel=p.date.slice(0,4)+'. '+p.date.slice(5,7)+'. '+p.date.slice(8,10)+'.';
  var duration=durText(p.minutes),weekHint=isWeekly?' · '+p.count+' mért éjszaka':'';
  var title=dateLabel+' · '+duration+weekHint;
  circles+='<g class="hhSleepTrendPoint386'+(i===lastMeasuredIndex?' on':'')+'" role="button" tabindex="0" data-date="'+esc(p.date)+'" data-date-label="'+esc(dateLabel)+'" data-minutes="'+p.minutes+'" data-count="'+p.count+'" aria-label="'+esc(title)+'" >'+
   '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="14" fill="transparent"></circle>'+
   '<circle class="hhSleepDot386" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4.9" fill="#fff" stroke="var(--a)" stroke-width="3"></circle>'+
   '<title>'+esc(title)+'</title></g>';
  if(periodDays()===7){
   labels+='<text x="'+x.toFixed(1)+'" y="'+Math.max(14,y-12).toFixed(1)+'" fill="#234b6b" font-size="10" font-weight="800" text-anchor="middle">'+esc((p.minutes/60).toFixed(1).replace('.',',')+' ó')+'</text>';
  }
 });
 flush();
 for(var v=0;v<=topH;v+=2){
  var gy=py(v);
  grid+='<line x1="'+left+'" y1="'+gy.toFixed(1)+'" x2="'+(w-right)+'" y2="'+gy.toFixed(1)+'" stroke="#dae6ef" stroke-width="'+(v?'.8':'1.2')+'"></line>'+
    '<text x="'+(left-8)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="11" font-weight="650" fill="#496478">'+v+' ó</text>';
 }
 // 7–9 hours is a general adult reference range; do not suggest that every user needs the same amount.
 var targetTop=py(9),targetBottom=py(7);
 var band='<rect x="'+left+'" y="'+targetTop.toFixed(1)+'" width="'+(w-left-right)+'" height="'+(targetBottom-targetTop).toFixed(1)+'" fill="#e7f5e9" opacity=".9"></rect>'+
   '<line x1="'+left+'" y1="'+targetBottom.toFixed(1)+'" x2="'+(w-right)+'" y2="'+targetBottom.toFixed(1)+'" stroke="#76ad89" stroke-width="1.2" stroke-dasharray="4 4"></line>'+
   '<line x1="'+left+'" y1="'+targetTop.toFixed(1)+'" x2="'+(w-right)+'" y2="'+targetTop.toFixed(1)+'" stroke="#76ad89" stroke-width="1.2" stroke-dasharray="4 4"></line>';
 var area='',paths='';
 segments.forEach(function(seg){paths+='<path d="'+seg+'" fill="none" stroke="var(--a)" stroke-width="3.7" stroke-linecap="round" stroke-linejoin="round"></path>'});
 var tickStep=periodDays()===7?1:periodDays()===30?6:3;
 points.forEach(function(p,i){
  if(i%tickStep===0||i===points.length-1){
   var name=periodDays()===7?p.label:isWeekly?p.label.split('–')[0]:p.label;
   var anchor=i===0?'start':i===points.length-1?'end':'middle';
   labels+='<text x="'+px(i).toFixed(1)+'" y="'+(bottom+19)+'" fill="#435f73" font-size="10.5" font-weight="700" text-anchor="'+anchor+'">'+esc(name)+'</text>';
  }
 });
 var selected=values[values.length-1],latest=selected.date.slice(0,4)+'. '+selected.date.slice(5,7)+'. '+selected.date.slice(8,10)+'.';
 var info='Kijelölt '+(isWeekly?'hét':'nap')+': '+latest+' · '+durText(selected.minutes)+(isWeekly?' ('+selected.count+' mért éjszaka átlaga)':'');
 var observed=values.length,missing=points.length-observed;
 var meta=isWeekly?'13 heti átlagból '+observed+' héten van adat':observed+' / '+points.length+' napból van mért alvás';
 return '<div class="hhSleepTrend386">'+
  '<div class="hhSleepTrendIntro386"><span>💤 Tényleges alvásidő</span><small>'+esc(meta)+'</small></div>'+
  '<svg class="hhSleepTrendSvg386" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Alvásidő trend. Érintsd meg a mérési pontokat a pontos értékért.">'+
  '<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="transparent"></rect>'+band+grid+paths+circles+labels+
  '<text x="'+(w-right)+'" y="14" text-anchor="end" font-size="10" font-weight="700" fill="#3a8060">7–9 ó referencia</text></svg>'+
  '<div class="hhSleepTrendPickInfo386" aria-live="polite">'+esc(info)+'</div>'+
  '<div class="hhSleepTrendFoot386">● Érintsd meg az egyes pontokat a részletekhez. A hiányzó napok nem számítanak 0 órának.</div>'+
  '</div>';
}
function trendSummary(rows){
 var nights=hhSleepTrendDaily386(rows).filter(function(r){return r.minutes!=null}),minutes=nights.map(function(r){return r.minutes});
 if(!minutes.length)return '';
 var delta=minutes[minutes.length-1]-minutes[0];
 return '<div class="hhSleepSummary"><div><small>ÁTLAG / MÉRT NAP</small><b>'+durText(avg(minutes))+'</b></div>'+
 '<div><small>LEGUTÓBBI</small><b>'+durText(minutes[minutes.length-1])+'</b></div>'+
 '<div><small>LEGHOSSZABB</small><b>'+durText(Math.max.apply(null,minutes))+'</b></div>'+
 '<div><small>VÁLTOZÁS</small><b>'+(delta>0?'+':'')+Math.round(delta)+' p</b></div></div>';
}
window.hhSleepTrendPick386=function(el){
 if(!el||!el.dataset)return;
 var box=el.closest('.hhSleepTrend386'),value=box&&box.querySelector('.hhSleepTrendPickInfo386');
 if(!value)return;
 var minutes=Number(el.dataset.minutes),count=Number(el.dataset.count);
 if(!Number.isFinite(minutes)||minutes<0)return;
 box.querySelectorAll('.hhSleepTrendPoint386').forEach(function(g){g.classList.toggle('on',g===el)});
 value.textContent='Kijelölt '+(periodDays()===90?'hét':'nap')+': '+(el.dataset.dateLabel||el.dataset.date)+' · '+durText(minutes)+(periodDays()===90?' ('+count+' mért éjszaka átlaga)':'');
};
async function render(profileOverride){
 var page=document.getElementById('hhSleepPage');if(!page)return;
 var renderId=++sleepRenderSeq,requestedProfile=profileOverride||pkey();
 page.innerHTML=heroHtml()+'<div class="surface hhSleepSurface"><div class="hhSleepTop"><div><small>HEALTH CONNECT · <span id="hhSleepSourceLabel">ALVÁS</span></small><h2>Alvás és regeneráció</h2></div><button class="hhSleepProfile" onclick="hhSleepToggleProfile(event)" aria-label="Váltás '+esc(otherName())+' profiljára">'+esc(pname())+'</button></div><div class="hhSleepCard hhSleepLoading"><div class="hhSleepSpinner"></div><b>Alvásadatok betöltése…</b><small>Health Connect adatok feldolgozása</small></div></div>'+bottomNav();
 var rows=await sleepSessions(requestedProfile);
 if(renderId!==sleepRenderSeq)return;
 var latest=rows[rows.length-1]||null,night=latest?hhLatestNight(rows):null,period=filtered(rows),total=latest?durMin(latest.startTime,latest.endTime):0;var srcLabel=(window.hhSleepDataSource||'Health Connect').toUpperCase();
 // v428 is an explicit read-only preview. The existing Sleep view stays intact
 // without ?hh_sleep_v428_preview=1, including its canonical profile-scoped source.
 var v428Enabled=window.HH_SLEEP_V428_ENABLED===true&&!!window.HH_SLEEP_V428;
 var shownNight=v428Enabled?window.HH_SLEEP_V428.night(rows):night;
 var sleepContent=latest?hhSleepSource381(latest)+
  (v428Enabled?window.HH_SLEEP_V428.top(rows,requestedProfile)+sleepFactorHeading383():sleepFactorHeading383()+sleepOverview(rows))+
  sleepFactorCards381(shownNight,requestedProfile)+
  // v431: label and show both recent sleep phase timelines before Léna's review.
  (v428Enabled?window.HH_SLEEP_V428.recentTimelines(rows,requestedProfile)+
   window.HH_SLEEP_V428.lenaComment(rows,requestedProfile):
   (shownNight?sleepLenaComment(rows,requestedProfile,shownNight):'')+
   stageBar(night)+
   (window.HH_SLEEP_VISUAL_V427&&window.HH_SLEEP_VISUAL_V427_ENABLED===true?window.HH_SLEEP_VISUAL_V427.render(rows,requestedProfile):'')
  ):'<div class="hhSleepEmpty big">Még nincs Health Connect alvásadat ennél a profilnál.</div>';
 page.innerHTML=heroHtml()+'<div class="surface hhSleepSurface">'+
 '<div class="hhSleepTop"><div><small>HEALTH CONNECT · '+esc(requestedProfile==='monika'?'MÓNIKA':'ZSOLT')+'</small><h2>Alvás és regeneráció</h2></div><button class="hhSleepProfile" onclick="hhSleepToggleProfile(event)" aria-label="Váltás '+esc(otherName())+' profiljára">'+esc(pname())+'</button></div>'+
 sleepContent+
 '<div class="hhSleepCard"><div class="hhSleepCardHead"><div><small>TREND</small><h3>Alvásidő</h3></div><div class="hhSleepPeriods"><button class="'+(sleepState.period==='7d'?'on':'')+'" onclick="hhSleepPeriod(\'7d\')">Heti</button><button class="'+(sleepState.period==='30d'?'on':'')+'" onclick="hhSleepPeriod(\'30d\')">Havi</button><button class="'+(sleepState.period==='90d'?'on':'')+'" onclick="hhSleepPeriod(\'90d\')">3 hónap</button></div></div>'+chart(period)+trendSummary(period)+'</div>'+
 (v428Enabled&&latest?window.HH_SLEEP_V428.calendar(rows,requestedProfile):'')+
 '<div class="hhSleepCard helperCard"><div class="hhSleepCardHead"><div><small>SLEEP HELPER</small><h3>Elalvássegítő</h3></div><span>API-mentes</span></div><p>Válassz időt és hangot. A meleg fény lassan elsötétül, a hang pedig fokozatosan elhalkul.</p>'+
 '<div class="hhHelperTimes"><button class="on" data-min="10" onclick="hhHelperMinutes(10,this)">10 perc</button><button data-min="15" onclick="hhHelperMinutes(15,this)">15 perc</button><button data-min="20" onclick="hhHelperMinutes(20,this)">20 perc</button></div>'+
 '<div class="hhHelperModes"><button class="on" data-mode="brown" onclick="hhHelperMode(\'brown\',this)">🟤 Brown noise</button><button data-mode="soft" onclick="hhHelperMode(\'soft\',this)">🌧 Lágy zaj</button><button data-mode="breath" onclick="hhHelperMode(\'breath\',this)">🌬 Légzés</button><button data-mode="light" onclick="hhHelperMode(\'light\',this)">🌙 Csak fény</button></div>'+
 '<button class="hhHelperStart" onclick="hhStartSleepHelper()">🌙 ELALVÁS INDÍTÁSA</button></div>'+
 '<details class="hhSleepLabs428"><summary>🧪 Sleep · fejlesztői előnézet</summary>'+
  '<a href="'+esc(window.location.pathname+'?hh_sleep_v428_preview='+(v428Enabled?'0':'1'))+'">'+
  (v428Enabled?'Vissza a stabil Sleep nézethez':'Sleep v428 háromnézetes előnézet megnyitása')+'</a>'+
  '<p>Az előnézet nem indít új szinkront, és csak a kiválasztott profil már szinkronizált adatait olvassa.</p></details>'+
 '<p class="privacyNote">Az alvási adatok tájékoztató jellegűek. A HealthHub nem értékeli diagnosztikusan az alvást.</p></div>'+bottomNav();
}
function ensurePage(){
 if(document.getElementById('hhSleepPage'))return;
 var s=document.createElement('section');s.id='hhSleepPage';s.className='hhSleepPage';document.body.appendChild(s);
}
function wireButton(){
 var btn=Array.from(document.querySelectorAll('.homeModule')).find(function(b){var x=b.querySelector('b');return x&&x.textContent.trim()==='Sleep'});
 if(btn){btn.dataset.hhSleepWired='1';btn.removeAttribute('onclick');btn.style.pointerEvents='auto';btn.style.cursor='pointer'}
}
function delegatedSleepClick(e){
 var btn=e.target&&e.target.closest?e.target.closest('.homeModule'):null;if(!btn)return;
 var lab=btn.querySelector('b');if(!lab||lab.textContent.trim()!=='Sleep')return;
 e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
 window.hhOpenSleep();
}
window.hhOpenSleep=function(){ensurePage();var p=document.getElementById('hhSleepPage');p.classList.add('on');p.innerHTML=heroHtml()+'<div class="surface hhSleepSurface"><div class="hhSleepTop"><div><small>HEALTH CONNECT · ALVÁS</small><h2>Alvás és regeneráció</h2></div><button class="hhSleepProfile" onclick="hhSleepToggleProfile(event)" aria-label="Váltás '+esc(otherName())+' profiljára">'+esc(pname())+'</button></div><div class="hhSleepCard hhSleepLoading"><div class="hhSleepSpinner"></div><div><b>Alvásadatok betöltése…</b><small>Health Connect adatok feldolgozása</small></div></div></div>'+bottomNav();requestAnimationFrame(function(){render().catch(function(e){console.error(e);var q=document.getElementById('hhSleepPage');if(q)q.innerHTML=heroHtml()+'<div class="surface hhSleepSurface"><div class="hhSleepEmpty big">Az alvásadatok betöltése nem sikerült. Frissítsd az oldalt, majd próbáld újra.</div></div>'})})};
window.hhCloseSleep=function(){stopHelper();var p=document.getElementById('hhSleepPage');if(p)p.classList.remove('on')};
window.hhRenderSleep=render;
window.hhSleepToggleProfile=function(e){
 if(e){e.preventDefault();e.stopPropagation();}
 sleepRenderSeq++;
 var nextCode=activeProfileCode()==='m'?'z':'m';
 var nextProfile=nextCode==='m'?'monika':'zsolt';

 /* Keep the two HealthHub profile states in lockstep. */
 localStorage.setItem('hh-profile',nextCode);
 try{
  if(typeof window.setProfile==='function')window.setProfile(nextCode);
 }catch(err){console.warn('Sleep profile switch',err)}
 try{window.dispatchEvent(new CustomEvent('healthhub:profile-changed',{detail:{profile:nextProfile,source:'sleep'}}))}catch(err){}

 if(document.getElementById('hhSleepPage')?.classList.contains('on'))render(nextProfile);
 return false;
};
window.hhSleepPeriod=function(p){sleepState.period=p;render()};
window.hhHelperMinutes=function(m,el){helper.minutes=m;document.querySelectorAll('.hhHelperTimes button').forEach(function(b){b.classList.toggle('on',b===el)})};
window.hhHelperMode=function(m,el){helper.mode=m;document.querySelectorAll('.hhHelperModes button').forEach(function(b){b.classList.toggle('on',b===el)})};

function noiseBuffer(ctx,mode){
 var len=ctx.sampleRate*2,b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0),last=0;
 for(var i=0;i<len;i++){var w=Math.random()*2-1;if(mode==='brown'){last=(last+.02*w)/1.02;d[i]=last*3.5}else d[i]=w*.35}
 return b;
}
async function startAudio(mode,seconds){
 if(mode==='light'||mode==='breath')return;
 var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 helper.ctx=new AC();var src=helper.ctx.createBufferSource(),gain=helper.ctx.createGain(),filter=helper.ctx.createBiquadFilter();
 src.buffer=noiseBuffer(helper.ctx,mode);src.loop=true;filter.type='lowpass';filter.frequency.value=mode==='brown'?650:1800;
 gain.gain.setValueAtTime(.18,helper.ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0008,helper.ctx.currentTime+seconds);
 src.connect(filter).connect(gain).connect(helper.ctx.destination);src.start();helper.source=src;helper.gain=gain;
}
function helperOverlay(){
 var o=document.getElementById('hhSleepHelperOverlay');if(o)return o;
 o=document.createElement('div');o.id='hhSleepHelperOverlay';o.innerHTML='<button class="hhHelperClose" onclick="hhStopSleepHelper()">×</button><div class="hhBreathOrb"></div><div class="hhHelperClock"></div><div class="hhHelperHint">Lassan engedd el a napot.</div>';
 document.body.appendChild(o);return o;
}
function updateClock(){
 var o=document.getElementById('hhSleepHelperOverlay');if(!o)return;
 var left=Math.max(0,helper.endAt-Date.now()),sec=Math.ceil(left/1000),m=Math.floor(sec/60),s=sec%60;
 var clock=o.querySelector('.hhHelperClock');if(clock)clock.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
 var total=helper.minutes*60000,progress=1-left/total;o.style.setProperty('--fade',String(Math.max(.08,1-progress*.92)));
 if(left<=0){stopHelper();return}
 helper.raf=requestAnimationFrame(updateClock);
}
window.hhStartSleepHelper=async function(){
 stopHelper();var sec=helper.minutes*60,o=helperOverlay();o.className='on mode-'+helper.mode;o.style.setProperty('--dur',helper.minutes+'min');helper.endAt=Date.now()+sec*1000;
 try{if(navigator.wakeLock)helper.wake=await navigator.wakeLock.request('screen')}catch(e){}
 try{await startAudio(helper.mode,sec)}catch(e){}
 helper.timer=setTimeout(stopHelper,sec*1000);updateClock();
};
function stopHelper(){
 if(helper.timer)clearTimeout(helper.timer);helper.timer=null;if(helper.raf)cancelAnimationFrame(helper.raf);helper.raf=null;
 try{helper.source&&helper.source.stop()}catch(e){}try{helper.ctx&&helper.ctx.close()}catch(e){}helper.source=null;helper.ctx=null;
 try{helper.wake&&helper.wake.release()}catch(e){}helper.wake=null;
 var o=document.getElementById('hhSleepHelperOverlay');if(o)o.className='';
}
window.hhStopSleepHelper=stopHelper;

function style(){
 if(document.getElementById('hh-v170-style'))return;
 var s=document.createElement('style');s.id='hh-v170-style';s.textContent=
 '.hhSleepPage{display:none;position:fixed;inset:0;z-index:5000;overflow-y:auto;background:linear-gradient(180deg,var(--wash2),var(--wash));width:min(100vw,420px);margin:auto;box-shadow:0 0 0 1px #d6e3ea;padding-bottom:64px}.hhSleepPage.on{display:block}.hhSleepDoctorHero{height:205px;position:relative;overflow:hidden;background-image:var(--hh-role-atlas);background-size:auto 200%;background-position:left top;background-repeat:no-repeat;color:#173f61}.hhSleepDoctorHero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0) 46%,rgba(255,255,255,.10) 70%,rgba(255,255,255,.22) 100%);pointer-events:none}.hhSleepProfileHit{position:absolute;left:0;top:0;width:52%;height:100%;border:0;background:transparent;padding:0;z-index:4;cursor:pointer}.hhSleepHeroActions{position:absolute;right:10px;top:10px;z-index:6;display:flex;gap:7px}.hhSleepHeroActions button{width:35px;height:35px;border:1px solid rgba(23,63,97,.16);border-radius:50%;background:rgba(255,255,255,.82);color:#173f61;font-size:18px;box-shadow:0 4px 14px rgba(40,70,100,.10)}.hhSleepDoctorTitle{position:absolute;left:56%;right:28px;top:49%;z-index:3;color:#173f61}.hhSleepProfileName{display:block;border:0;background:transparent;padding:0;margin:0 0 2px;color:var(--a);font-size:9px;font-weight:850;cursor:pointer}.hhSleepDoctorTitle h1{font-size:30px;line-height:1;margin:0 0 5px}.hhSleepDoctorTitle span{font-size:8px;font-weight:750;color:#5e7387}.hhSleepSurface{margin-top:-13px!important;background:linear-gradient(180deg,var(--wash2),var(--wash))!important;border-radius:24px 24px 0 0!important}.hhSleepNav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:7000;width:min(100vw,420px);height:58px;background:rgba(255,255,255,.97);box-shadow:0 -5px 18px rgba(28,66,92,.08);display:grid;grid-template-columns:repeat(4,1fr);align-items:center}.hhSleepNav button{border:0;background:transparent;color:#70869a;font-size:7px;display:flex;flex-direction:column;align-items:center;gap:2px}.hhSleepNav button span{font-size:20px;line-height:1}.hhSleepNav button b{font-size:7.5px}.hhSleepNav button.on{color:var(--a)}.hhSleepLoading{display:flex;align-items:center;gap:10px;min-height:72px}.hhSleepLoading b{display:block;font-size:10px;color:#27375b}.hhSleepLoading small{display:block;font-size:7px;color:#8993a5}.hhSleepSpinner{width:22px;height:22px;border:3px solid #e5e1f6;border-top-color:var(--a);border-radius:50%;animation:hhSpin .8s linear infinite}@keyframes hhSpin{to{transform:rotate(360deg)}}.hhSleepSurface{padding-top:12px;padding-bottom:80px}.hhSleepTop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:9px}.hhSleepTop small,.hhSleepCardHead small{font-size:7px;font-weight:900;letter-spacing:.12em;color:var(--a)}.hhSleepTop h2{font-size:16px;margin:2px 0;color:#173f62}.hhSleepProfile{font-size:8px;font-weight:850;color:var(--a);background:var(--soft);border:0;border-radius:999px;padding:6px 8px;cursor:pointer}.hhSleepHeroCard{display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,#173f61,var(--a));color:#fff;border-radius:18px;padding:14px;box-shadow:0 8px 22px rgba(51,45,105,.18)}.hhSleepHeroCard .moon{font-size:32px}.hhSleepHeroCard small{font-size:7px;letter-spacing:.1em;opacity:.8;font-weight:850}.hhSleepHeroCard b{display:block;font-size:25px;margin:2px 0}.hhSleepHeroCard span{font-size:8px;opacity:.88}.hhStageBar{display:flex;height:18px;margin:9px 2px 3px;border-radius:9px;overflow:hidden;background:#edf0f8}.hhStageBar i{display:block;min-width:1px}.hhStageBar .awake{background:#e9a6b1}.hhStageBar .light{background:color-mix(in srgb,var(--a) 35%,#fff)}.hhStageBar .deep{background:color-mix(in srgb,var(--a) 78%,#173f61)}.hhStageBar .rem{background:color-mix(in srgb,var(--a2) 45%,#fff)}.hhStageBar .sleep{background:color-mix(in srgb,var(--a) 28%,#fff)}.hhStageBar .out,.hhStageBar .unknown{background:#dce0ea}.hhStageLegend{display:flex;justify-content:space-between;font-size:6.8px;color:#7c879a;margin:0 4px 9px}.hhSleepStageGrid,.hhSleepSummary{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:9px 0}.hhSleepStageGrid div,.hhSleepSummary div{background:#fff;border:1px solid #e8ebf3;border-radius:12px;padding:8px}.hhSleepStageGrid small,.hhSleepSummary small{display:block;font-size:6.5px;color:#8993a5;font-weight:850}.hhSleepStageGrid b,.hhSleepSummary b{display:block;font-size:11px;color:#27375b;margin-top:2px}.hhSleepCard{background:#fff;border-radius:17px;padding:12px;margin-top:9px;box-shadow:0 6px 17px rgba(38,74,101,.055)}.hhSleepCardHead{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.hhSleepCardHead h3{font-size:13px;margin:2px 0;color:#173f62}.hhSleepPeriods,.hhHelperTimes,.hhHelperModes{display:flex;flex-wrap:wrap;gap:5px}.hhSleepPeriods button,.hhHelperTimes button,.hhHelperModes button{border:1px solid #dfe4ed;background:#fff;color:#52627a;border-radius:11px;padding:6px 8px;font-size:8px;font-weight:800}.hhSleepPeriods button.on,.hhHelperTimes button.on,.hhHelperModes button.on{background:var(--soft);border-color:color-mix(in srgb,var(--a) 35%,#fff);color:var(--a)}.hhSleepCard svg{width:100%;height:180px;margin-top:8px}.hhSleepEmpty{font-size:8.5px;color:#7f8b9a;padding:10px;text-align:center}.hhSleepEmpty.big{background:#fff;border-radius:16px;padding:20px}.helperCard p{font-size:8.5px;line-height:1.4;color:#607188}.hhHelperTimes{margin:9px 0}.hhHelperModes{margin-bottom:9px}.hhHelperStart{width:100%;border:0;border-radius:14px;padding:11px;background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-size:10px;font-weight:900}.hhSleepSummary{margin-bottom:0}'+
 '#hhSleepHelperOverlay{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(35,22,21,var(--fade,.95));transition:background 2s;color:#fff}#hhSleepHelperOverlay.on{display:flex}.hhHelperClose{position:absolute;right:18px;top:18px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.18);color:#fff;font-size:22px}.hhBreathOrb{width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#ffd8a6,#b97954 60%,rgba(89,50,40,.2));box-shadow:0 0 70px rgba(255,178,111,.35);animation:hhBreathe 10s ease-in-out infinite}.mode-light .hhBreathOrb{animation:none}.mode-brown .hhBreathOrb,.mode-soft .hhBreathOrb{animation:hhGlow 14s ease-in-out infinite}.hhHelperClock{font-size:28px;font-weight:800;margin-top:28px;letter-spacing:.04em}.hhHelperHint{font-size:10px;opacity:.72;margin-top:6px}@keyframes hhBreathe{0%,100%{transform:scale(.72);opacity:.5}45%{transform:scale(1.12);opacity:1}}@keyframes hhGlow{0%,100%{transform:scale(.92);opacity:.55}50%{transform:scale(1.03);opacity:.9}}';
 document.head.appendChild(s);
}
style();
(function(){
 if(document.getElementById('hhSleep363Css'))return;
 var c=document.createElement('style');c.id='hhSleep363Css';
 c.textContent='.hhSleepSource381{display:flex;flex-direction:column;gap:4px;background:#f1f8fc;border:1px solid #cce4ef;border-radius:13px;padding:10px;margin:5px 0 8px;font-size:11px;color:#234966}.hhSleepSource381 span{color:#547185;font-size:10px}.hhSleepSource381.stale{background:#fff7e8;border-color:#f0ca87}.hhSleepSource381 strong{font-size:10px;color:#965500}.hhSleepFactorsSection381{margin:10px 0 5px}.hhSleepFactorHeading381{display:flex;align-items:end;justify-content:space-between;gap:8px;margin:2px 2px 10px}.hhSleepFactorHeading381 small{display:block;font-size:9px;letter-spacing:.09em;font-weight:850;color:var(--a)}.hhSleepFactorHeading381 h3{margin:3px 0 0;color:#173f61;font-size:18px;line-height:1.2}.hhSleepFactorSource381{font-size:10px;color:var(--a);background:var(--soft);border:1px solid color-mix(in srgb,var(--a) 22%,#fff);border-radius:99px;padding:6px 8px;white-space:nowrap;font-weight:700}.hhSleepScoreStrip381{display:flex;align-items:center;gap:9px;padding:11px 12px;background:linear-gradient(115deg,#fff,color-mix(in srgb,var(--soft) 70%,#fff));border:1px solid color-mix(in srgb,var(--a) 24%,#fff);border-radius:16px;margin-bottom:8px}.hhSleepScoreSymbol381{display:grid;place-items:center;width:36px;height:36px;flex:0 0 36px;background:var(--soft);color:var(--a);border-radius:12px;font-size:23px}.hhSleepScoreText381{flex:1;min-width:0}.hhSleepScoreText381 b{display:block;color:#244763;font-size:12px;line-height:1.3}.hhSleepScoreText381 small{display:block;margin-top:2px;color:#607988;font-size:9px;line-height:1.3}.hhSleepScoreStrip381>strong{font-size:25px;color:#607d94;white-space:nowrap}.hhSleepScoreStrip381>strong small{font-size:11px;font-weight:650}.hhSleepFactors381{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.hhSleepFactor381{min-width:0;min-height:146px;background:#fff;border:1px solid color-mix(in srgb,var(--a) 16%,#d5e3eb);border-radius:18px;padding:12px 11px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;box-shadow:0 3px 12px rgba(42,77,104,.045)}.hhSleepFactorLabel381{display:flex;align-items:center;gap:5px;min-width:0;font-size:12px;line-height:1.24;font-weight:760;color:#27475e}.hhSleepFactorIcon381{font-size:16px;line-height:1;flex:0 0 auto}.hhSleepFactorValue381{font-size:25px!important;line-height:1.1;color:#193d5a;font-weight:850;letter-spacing:-.025em}.hhSleepFactorStatus381{display:inline-flex;align-items:center;align-self:flex-start;max-width:100%;width:auto;min-height:24px;border-radius:8px;padding:4px 8px;font-size:10px!important;font-weight:800;line-height:1.3;overflow-wrap:anywhere}.hhSleepFactorStatus381.warn{background:#fff0d9;color:#945100}.hhSleepFactorStatus381.good{background:#e6f7ed;color:#176842}.hhSleepFactorStatus381.info{background:#e8f2ff;color:#2564a1}.hhSleepFactorStatus381.muted{background:#eef2f4;color:#597181}.hhSleepFactorDetail381{display:block;font-size:9px!important;line-height:1.35;color:#667e8d;margin-top:auto}.hhSleepFactorFoot381{font-size:10px;line-height:1.45;color:#667b8c;margin:8px 3px 9px}.hhSleepFactorsSection381+.hhStageBar{margin-top:11px!important}@media(max-width:355px){.hhSleepFactor381{padding:10px 8px;min-height:140px}.hhSleepFactorLabel381{font-size:11px}.hhSleepFactorValue381{font-size:22px!important}.hhSleepFactorStatus381{font-size:9px!important}.hhSleepScoreText381 small{font-size:8px}}.hhSleepOverview363{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:4px 0 5px}'+
 '.hhSleepStat363{min-width:0;padding:9px 5px 8px;border-radius:12px;background:#fff;border:1px solid color-mix(in srgb,var(--a) 26%,#fff);text-align:center}'+
 '.hhSleepStat363 small{display:block;font-size:9px;line-height:1.22;color:var(--a);font-weight:850;min-height:24px;letter-spacing:0}'+
 '.hhSleepStat363 b{display:block;font-size:18px;line-height:1.24;color:#193e63;font-weight:850}'+
 '.hhSleepStat363 span{display:block;font-size:8px;line-height:1.35;color:#586f83;white-space:normal}'+
 '.hhSleepInfo363{font-size:9px;line-height:1.4;color:#667d8e;margin:3px 2px 6px}'+
 '.hhSleepPage .hhStageBar{display:block;position:relative;height:12px!important;margin:6px 2px 2px!important}'+
 '.hhSleepPage .hhStageBar i{display:block;position:absolute;top:0;height:100%;min-width:0}'+
 '.hhSleepClockTicks{display:flex;justify-content:space-between;font-size:10px;line-height:1.3;font-weight:750;color:#465d78;margin:2px 1px 4px}'+
 '.hhSleepPage .hhStageLegend{font-size:9px!important;margin:3px 3px 5px!important}'+
 '.hhSleepLena364{display:flex;align-items:flex-start;gap:9px;margin:6px 0 8px;padding:10px 11px;background:linear-gradient(100deg,var(--soft),#fff);border:1px solid color-mix(in srgb,var(--a) 28%,#fff);border-radius:13px}'+
'.hhSleepMood364{font-size:27px;line-height:1.1;flex:0 0 28px}.hhSleepLenaText364{min-width:0}'+
'.hhSleepLenaText364 b{font-size:12px;color:var(--a)}.hhSleepLenaText364 p{font-size:11px;line-height:1.4;margin:4px 0;color:#254961}.hhSleepLenaText364 small{font-size:8px;color:#627c8b}'+
'@media(max-width:355px){.hhSleepStat363 small{font-size:8px}.hhSleepStat363 b{font-size:16px}.hhSleepStat363 span{font-size:7px}}';
 document.head.appendChild(c);
})();
(function(){if(document.getElementById('hhSleepRag382Css'))return;var e=document.createElement('style');e.id='hhSleepRag382Css';e.textContent="/* v382 RAG: color is a transparent measurement signal, not a diagnosis. */\n.hhSleepPage .hhSleepOverview363.hhSleepOverview382{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:7px 0}\n.hhSleepPage .hhSleepOverview382 .hhSleepStat363{padding:12px 8px;min-height:90px;display:flex;flex-direction:column;justify-content:space-between;gap:4px}\n.hhSleepPage .hhSleepOverview382 .hhSleepStat363 small{font-size:10px;line-height:1.28;min-height:0}\n.hhSleepPage .hhSleepOverview382 .hhSleepStat363 b{font-size:23px}\n.hhSleepPage .hhSleepOverview382 .hhSleepStat363 span{font-size:9px}\n.hhSleepPage .hhSleepRag382.good{border-color:#4bb981!important;background:linear-gradient(135deg,#f2fcf6,#e6f8ec)!important}\n.hhSleepPage .hhSleepRag382.warn{border-color:#edb350!important;background:linear-gradient(135deg,#fffaf1,#fff0d8)!important}\n.hhSleepPage .hhSleepRag382.bad{border-color:#e27676!important;background:linear-gradient(135deg,#fff7f6,#ffe8e7)!important}\n.hhSleepPage .hhSleepRag382.muted{border-color:#cbd9e3!important;background:#f4f8fa!important}\n.hhSleepPage .hhSleepRag382.info{border-color:color-mix(in srgb,var(--a) 35%,#d9e7ee)!important;background:linear-gradient(145deg,#fff,color-mix(in srgb,var(--soft) 28%,#fff))!important}\n.hhSleepPage .hhSleepFactorStatus381.bad{background:#ffe0df;color:#a62525}\n.hhSleepPage .hhSleepScoreStrip381.hhSleepRag382{margin-bottom:4px}\n.hhSleepPage .hhSleepScoreText381 .hhSleepFactorStatus381{margin-top:5px;font-size:10px!important;display:inline-flex}\n.hhSleepPage .hhSleepIndexMethod382{margin:0 0 10px 2px;color:#566f81;font-size:10px}\n.hhSleepPage .hhSleepIndexMethod382 summary{cursor:pointer;font-weight:750;min-height:30px;display:flex;align-items:center}\n.hhSleepPage .hhSleepIndexMethod382 p{margin:0 3px 8px;line-height:1.5;border-left:3px solid var(--a);padding-left:8px}\n.hhSleepPage .hhSleepLena364{margin:12px 0 11px}\n@media(max-width:355px){.hhSleepPage .hhSleepOverview382 .hhSleepStat363 b{font-size:19px}.hhSleepPage .hhSleepOverview382 .hhSleepStat363 small{font-size:9px}}\n";document.head.appendChild(e)})();
(function(){if(document.getElementById('hhSleep383Css'))return;var el=document.createElement('style');el.id='hhSleep383Css';el.textContent="/* v383: hero heading below top controls, further right/up. */\n.hhSleepPage .hhSleepDoctorTitle{left:62%;right:8px;top:36%;width:auto;max-width:none}\n.hhSleepPage .hhSleepDoctorTitle span{display:block;font-size:8px;line-height:1.25;overflow-wrap:break-word}\n.hhSleepPage .hhSleepFactorHeading381.hhSleepFactorTop383{margin:10px 2px 7px;align-items:end}\n.hhSleepPage .hhSleepFactorHeading381.hhSleepFactorTop383 h3{font-size:19px}\n.hhSleepPage .hhSleepFactorsSection381{margin-top:4px}\n.hhSleepPage .hhSleepOverview363.hhSleepOverview382{margin-top:4px}\n@media(max-width:355px){.hhSleepPage .hhSleepDoctorTitle{left:60%;right:6px;top:38%}.hhSleepPage .hhSleepDoctorTitle h1{font-size:27px}.hhSleepPage .hhSleepDoctorTitle span{font-size:7px}}\n";document.head.appendChild(el)})();
(function(){if(document.getElementById('hhSleep384Css'))return;var el=document.createElement('style');el.id='hhSleep384Css';el.textContent="/* v384: shorter cards everywhere, readable on 320–420 CSS-px Android screens. */\n.hhSleepPage .hhSleepOverview382 .hhSleepStat363{padding:9px 7px!important;min-height:73px!important;gap:2px!important;border-radius:13px!important}\n.hhSleepPage .hhSleepOverview382 .hhSleepStat363 b{font-size:21px!important;line-height:1.15!important}\n.hhSleepPage .hhSleepOverview382 .hhSleepStat363 small{font-size:9px!important}\n.hhSleepPage .hhSleepOverview382 .hhSleepStat363 span{font-size:8px!important}\n.hhSleepPage .hhSleepOverview382{gap:7px!important;margin:3px 0 5px!important}\n.hhSleepPage .hhSleepScoreStrip381{padding:8px 10px!important;gap:7px!important;border-radius:13px!important}\n.hhSleepPage .hhSleepScoreSymbol381{width:30px!important;height:30px!important;flex-basis:30px!important;font-size:19px!important}\n.hhSleepPage .hhSleepScoreText381 b{font-size:11px!important}\n.hhSleepPage .hhSleepScoreText381 small{font-size:8px!important}\n.hhSleepPage .hhSleepScoreText381 .hhSleepFactorStatus381{padding:2px 6px!important;min-height:19px!important;margin-top:2px!important;font-size:9px!important}\n.hhSleepPage .hhSleepScoreStrip381>strong{font-size:25px!important;line-height:1.05!important}\n.hhSleepPage .hhSleepScoreStrip381.hhSleepRag382.bad>strong{color:#ae272b!important}\n.hhSleepPage .hhSleepScoreStrip381.hhSleepRag382.warn>strong{color:#936000!important}\n.hhSleepPage .hhSleepScoreStrip381.hhSleepRag382.good>strong{color:#176b3e!important}\n.hhSleepPage .hhSleepScoreStrip381.hhSleepRag382.muted>strong{color:#617786!important}\n.hhSleepPage .hhSleepFactors381{gap:7px!important}\n.hhSleepPage .hhSleepFactor381{min-height:105px!important;padding:9px 9px 8px!important;gap:3px!important;border-radius:14px!important;box-shadow:none!important}\n.hhSleepPage .hhSleepFactor381 .hhSleepFactorLabel381{font-size:11px!important}\n.hhSleepPage .hhSleepFactor381 .hhSleepFactorIcon381{font-size:14px!important}\n.hhSleepPage .hhSleepFactor381 .hhSleepFactorValue381{font-size:22px!important;line-height:1.12!important}\n.hhSleepPage .hhSleepFactor381 .hhSleepFactorStatus381{font-size:9px!important;min-height:19px!important;padding:3px 7px!important}\n.hhSleepPage .hhSleepFactor381 .hhSleepFactorDetail381{font-size:8px!important;line-height:1.25!important;margin-top:2px!important}\n.hhSleepPage .hhSleepFactor381:last-child:nth-child(odd){grid-column:1/-1}\n.hhSleepPage .hhSleepFactorFoot381{margin:5px 2px 7px!important;font-size:9px!important}\n.hhSleepPage .hhSleepFactorsSection381{margin-top:2px!important}\n.hhSleepPage .hhSleepIndexMethod382 summary{min-height:27px!important}\n.hhSleepPage .hhSleepFactorHeading381.hhSleepFactorTop383{margin:5px 2px 5px!important}\n@media(max-width:355px){\n .hhSleepPage .hhSleepOverview382 .hhSleepStat363 b{font-size:18px!important}\n .hhSleepPage .hhSleepFactor381{min-height:103px!important;padding:8px 7px!important}\n .hhSleepPage .hhSleepFactor381 .hhSleepFactorValue381{font-size:20px!important}\n .hhSleepPage .hhSleepScoreStrip381>strong{font-size:22px!important}\n}\n";document.head.appendChild(el)})();
(function(){if(document.getElementById('hhSleep385Css'))return;var st=document.createElement('style');st.id='hhSleep385Css';st.textContent="/* v385 small Sleep UI finishing pass: move hero caption right/up, avoid action buttons. */\n.hhSleepPage .hhSleepDoctorTitle{left:67%;right:5px;top:29%;width:auto;max-width:none}\n.hhSleepPage .hhSleepDoctorTitle h1{font-size:30px;line-height:1.03}\n.hhSleepPage .hhSleepDoctorTitle span{display:block;font-size:7.5px;line-height:1.28;overflow-wrap:break-word}\n@media(max-width:355px){\n .hhSleepPage .hhSleepDoctorTitle{left:64%;right:5px;top:30%}\n .hhSleepPage .hhSleepDoctorTitle h1{font-size:27px}\n .hhSleepPage .hhSleepDoctorTitle span{font-size:7px}\n}\n";document.head.appendChild(st)})();
(function(){if(document.getElementById('hhSleep386Css'))return;var node=document.createElement('style');node.id='hhSleep386Css';node.textContent="/* Sleep v386: readable, touch-friendly visualizations. */\n.hhSleepPage .hhSleepTimeline386{margin:10px 0 8px;padding:9px 9px 7px;border:1px solid color-mix(in srgb,var(--a) 20%,#e3edf4);border-radius:14px;background:#fff}\n.hhSleepPage .hhSleepTimelineTitle386{font-size:11px;color:#234663;font-weight:850;margin:0 0 6px}\n.hhSleepPage .hhSleepTimeline386 .hhStageBar386{height:29px!important;min-height:29px!important;margin:0!important;border-radius:9px!important;background:#edf1f5}\n.hhSleepPage .hhSleepTimeline386 .hhStageBar386 i{height:100%;box-shadow:inset 0 0 0 .55px rgba(255,255,255,.27)}\n.hhSleepPage .hhSleepTimeline386 .hhStageBar386 .awake{background:#dc7a88}\n.hhSleepPage .hhSleepTimeline386 .hhStageBar386 .light{background:#93c9ee}\n.hhSleepPage .hhSleepTimeline386 .hhStageBar386 .deep{background:#245a9b}\n.hhSleepPage .hhSleepTimeline386 .hhStageBar386 .rem{background:#8e76cb}\n.hhSleepPage .hhSleepTimeline386 .hhStageBar386 .sleep{background:#aac9ec}\n.hhSleepPage .hhSleepTimeline386 .hhSleepClockTicks{font-size:11px!important;font-weight:800!important;color:#304f69!important;margin:5px 0 6px!important}\n.hhSleepPage .hhStageLegend386{display:flex;gap:6px;flex-wrap:wrap;justify-content:space-between;font-size:10px;color:#38556c;font-weight:700}\n.hhSleepPage .hhStageLegend386 span{display:inline-flex;align-items:center;gap:4px}\n.hhSleepPage .hhStageLegend386 i{display:inline-block;width:9px;height:9px;border-radius:3px}\n.hhSleepPage .hhStageLegend386 .awake{background:#dc7a88}\n.hhSleepPage .hhStageLegend386 .light{background:#93c9ee}\n.hhSleepPage .hhStageLegend386 .deep{background:#245a9b}\n.hhSleepPage .hhStageLegend386 .rem{background:#8e76cb}\n.hhSleepPage .hhSleepTrend386{margin:6px 0 7px}\n.hhSleepPage .hhSleepTrendIntro386{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#234663;font-size:12px;font-weight:800}\n.hhSleepPage .hhSleepTrendIntro386 small{color:#637d8e;font-size:9px;font-weight:700;text-align:right}\n.hhSleepPage .hhSleepCard .hhSleepTrendSvg386{display:block;width:100%;height:auto!important;max-height:none!important;margin:5px 0 2px!important;overflow:visible}\n.hhSleepPage .hhSleepTrendPoint386{cursor:pointer;outline:0}\n.hhSleepPage .hhSleepTrendPoint386.on .hhSleepDot386,.hhSleepPage .hhSleepTrendPoint386:focus-visible .hhSleepDot386{stroke-width:5;filter:drop-shadow(0 0 3px rgba(32,79,145,.28))}\n.hhSleepPage .hhSleepTrendPickInfo386{font-size:11px;font-weight:850;color:#173f62;background:var(--soft);border:1px solid color-mix(in srgb,var(--a) 27%,#e0ebf4);border-radius:10px;padding:8px 9px}\n.hhSleepPage .hhSleepTrendFoot386{font-size:9.5px;color:#5c7587;line-height:1.4;margin:5px 1px 0}\n.hhSleepPage .hhSleepNoTrend386{font-size:11px;text-align:left;padding:20px 8px}\n.hhSleepPage .hhSleepSummary small{font-size:8px!important}\n.hhSleepPage .hhSleepSummary b{font-size:11px!important}\n@media(max-width:355px){.hhSleepPage .hhSleepTrendIntro386 small{font-size:8px}.hhSleepPage .hhStageLegend386{font-size:9px}.hhSleepPage .hhSleepTrendPickInfo386{font-size:10px}}\n";document.head.appendChild(node)})();
document.addEventListener('click',function(e){var p=e.target&&e.target.closest?e.target.closest('.hhSleepTrendPoint386'):null;if(p)window.hhSleepTrendPick386(p)},true);
document.addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;var p=e.target&&e.target.closest?e.target.closest('.hhSleepTrendPoint386'):null;if(p){e.preventDefault();window.hhSleepTrendPick386(p)}},true);
ensurePage();wireButton();document.addEventListener('click',delegatedSleepClick,true);
var prevSet=window.setProfile;if(typeof prevSet==='function')window.setProfile=function(){var r=prevSet.apply(this,arguments);var requested=arguments[0]==='m'?'monika':arguments[0]==='z'?'zsolt':pkey();setTimeout(function(){if(document.getElementById('hhSleepPage')?.classList.contains('on'))render(requested)},30);return r};
setTimeout(wireButton,300);setInterval(function(){var p=document.getElementById('hhSleepPage');if(p&&p.classList.contains('on'))wireButton()},5000);
document.documentElement.dataset.healthhubSleep='1.386';window.HH_LIVE_BUILD='v386-sleep-readable-trends';
})();