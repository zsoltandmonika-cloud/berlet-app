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

async function sleepSessions(profile){
 window.hhSleepSourceMeta={profile:profile,source:'cache',exportedAt:null};
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
     }
     cur.continue();
    };
   });
  }finally{db.close()}
 }catch(e){}

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
  return '<i class="'+stageClass(x.stage)+'" style="left:'+left.toFixed(2)+'%;width:'+width.toFixed(2)+'%" title="'+esc(stageName(x.stage)+' · '+fmtTime(x.startTime)+'–'+fmtTime(x.endTime))+'"></i>';
 }).join('');
 var tickCount=span<90*60000?3:5,ticks=[];
 for(var i=0;i<tickCount;i++){
  var when=new Date(start+span*i/(tickCount-1));
  ticks.push('<span>'+fmtTime(when.toISOString())+'</span>');
 }
 return '<div class="hhStageBar" aria-label="Alvási szakaszok időarányosan">'+bars+'</div>'+
  '<div class="hhSleepClockTicks">'+ticks.join('')+'</div>'+
  '<div class="hhStageLegend"><span>Ébren</span><span>Könnyű</span><span>Mély</span><span>REM</span></div>';
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
 var imported=meta.exportedAt?' · Utolsó adatimport: '+fmtDateFull(meta.exportedAt)+' '+fmtTime(meta.exportedAt):' · Import ideje ismeretlen';
 return '<div class="hhSleepSource381'+(stale?' stale':'')+'"><b>📅 Utolsó mért éjszaka: '+esc(fmtDateFull(last.endTime))+'</b>'+
 '<span>'+esc((meta.source||'Health Connect')+imported)+'</span>'+
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
 return {start:start,end:end,windowMin:windowMin,actual:actual,efficiency:actual==null?null:actual/windowMin,stages:stages};
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
   Insufficient stage coverage => no computed index. */
function hhSleepIndex382(m){
 if(!m||m.actual==null||m.windowMin<=0||m.actual<15||m.efficiency==null)return null;
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
function sleepFactorCards381(night){
 if(!night)return '';
 var m=hhSleepMetrics382(night),stages=m?m.stages:[],hasStages=stages.length>0;
 var mins={4:0,5:0,6:0,1:0};
 stages.forEach(function(s){
  var k=Number(s.stage);if(k===3||k===7)k=1;
  if(mins[k]!=null)mins[k]+=durMin(s.startTime,s.endTime);
 });
 var idx=hhSleepIndex382(m),durationTone=hhSleepTone382(m&&m.actual);
 var efficiencyTone=hhSleepEfficiency382(m&&m.efficiency);
 function share(n,base){return base>0?Math.round(n/base*100)+'%':'—'}
 function val(n){return n==null?'—':durText(n)}
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
   '<small>Saját, becsült pihenésindex · nem Samsung-pontszám</small>'+
   (idx?'<span class="hhSleepFactorStatus381 '+idx.tone+'">'+idx.label+'</span>':'<span class="hhSleepFactorStatus381 muted">Nincs elég adat</span>')+
   '</div><strong>'+(idx?idx.score:'—')+' <small>/ 100</small></strong></div>';
 var expl='<details class="hhSleepIndexMethod382"><summary>ℹ️ Hogyan számoljuk az alvásindexet?</summary>'+
  '<p>Tájékoztató, nem orvosilag validált saját mutató. Az alvásidő maximum 65 pontot ér (8 óra esetén), az alváshatékonyság maximum 35 pontot (90% felett). A 6 óránál rövidebb alvás legfeljebb 59, a 6–7 órás vagy 75% alatti hatékonyság legfeljebb 79 pontot kaphat. Hiányzó alvásszakasz-adatokból nem számolunk pontszámot. Az index nem hasonlítható közvetlenül a Samsung 0–100 értékéhez.</p></details>';
 return '<section class="hhSleepFactorsSection381" aria-label="Alvási tényezők">'+
  '<div class="hhSleepFactorHeading381"><div><small>ALVÁSELEMZÉS</small><h3>Alvási tényezők</h3></div><span class="hhSleepFactorSource381">⌚ Health Connect</span></div>'+
  score+expl+
  '<div class="hhSleepFactors381">'+
   card('💤','Tényleges alvás',val(m&&m.actual),durationTone.label,durationTone.tone,'Mért alvás, ébrenlét nélkül')+
   card('🌑','Mély alvás',hasStages?val(mins[5]):'—',hasStages?share(mins[5],m&&m.actual):'Nincs adat',hasStages?'info':'muted','Mért alvásfázis · tájékoztató')+
   card('🌙','REM alvás',hasStages?val(mins[6]):'—',hasStages?share(mins[6],m&&m.actual):'Nincs adat',hasStages?'info':'muted','Mért alvásfázis · tájékoztató')+
   card('👁️','Ébrenlét',hasStages?val(mins[1]):'—',efficiencyTone.label,efficiencyTone.tone,'Alváshatékonyság: '+(m&&m.efficiency!=null?Math.round(m.efficiency*100)+'%':'—'))+
   card('⏳','Elalvási idő','—','Nincs adat','muted','A Samsung egyedi értéke nem érhető el')+
   card('☁️','Könnyű alvás',hasStages?val(mins[4]):'—',hasStages?share(mins[4],m&&m.actual):'Nincs adat',hasStages?'info':'muted','Mért alvásfázis · tájékoztató')+
  '</div><p class="hhSleepFactorFoot381">🔴 Rövidebb / kedvezőtlenebb · 🟠 figyelendő · 🟢 kedvezőbb. A mély, REM és könnyű alvás csempéi információs jellegűek; a viselhető eszköz fázisadatai nem diagnózisok.</p></section>';
}
function sleepOverview(rows){
 if(!rows.length)return '<div class="hhSleepEmpty big">Nincs szinkronizált alvásadat.</div>';
 var night=hhLatestNight(rows),m=hhSleepMetrics382(night);
 var windowMins=m&&m.windowMin,actual=m&&m.actual;
 var from24=Date.now()-24*3600000,rolling=hhSleepOverlaps(hhSleepIntervals(rows),from24,Date.now());
 var hasRecent=rows.some(function(x){return Date.parse(x.endTime)>from24&&Date.parse(x.startTime)<Date.now()});
 var recentMinutes=hasRecent?rolling:null;
 function card(title,value,details,state){
  return '<div class="hhSleepStat363 hhSleepRag382 '+esc(state)+'"><small>'+title+'</small><b>'+value+'</b><span>'+details+'</span></div>';
 }
 return '<div class="hhSleepOverview363 hhSleepOverview382">'+
  card('💤 UTOLSÓ ALVÁS',actual==null?'—':durText(actual),esc(fmtTime(night.startTime)+'–'+fmtTime(night.endTime)),hhSleepTone382(actual).tone)+
  card('🕒 UTOLSÓ 24 ÓRA',recentMinutes==null?'—':durText(recentMinutes),'Mért alvás 24 óra alatt',hhSleepTone382(recentMinutes).tone)+
  '</div><p class="hhSleepInfo363">A két csempe tényleges alvásidőt mutat, nem az ébrenlétet is tartalmazó alvási ablakot. A 24 órás érték átfedés nélkül összesített.</p>';
}
// A friendly, evidence-labelled sleep nudge. No diagnosis from wearable observations.
function sleepLenaComment(rows,profile){
 if(!rows.length)return'';
 var to=Date.now(),from=to-24*3600000;
 var recent=rows.filter(function(x){return Date.parse(x.endTime)>from&&Date.parse(x.startTime)<to});
 var mins=hhSleepOverlaps(hhSleepIntervals(recent),from,to);
 var healthy=recent.length&&mins>=15;
 var firstName=profile==='monika'?'Mónika':'Zsolt';
 var icon='😶',title='Kevés adat',msg='Még nem látok elegendő alvásadatot a biztosabb értékeléshez. Előbb nézzük meg a szinkront.';
 if(!healthy&&recent.length===0){icon='🔄';title='Friss alvásadat hiányzik';msg='A legutóbbi 24 órából nem érkezett alvásmérés. Ez adatkapcsolati hiány, nem a tényleges alvásod értékelése.'}
 else if(healthy&&mins<360){icon='😴';title='Pihenésre fel!';msg=firstName+', az elmúlt 24 órában '+durText(mins)+' alvást látok. Ez kevésnek tűnik; ha teheted, ma adj több időt a pihenésnek.'}
 else if(healthy&&mins<420){icon='🙂';title='Van még tartalék';msg=firstName+', most '+durText(mins)+' jött össze 24 óra alatt. Egy kicsivel hosszabb éjszaka segíthet a napközbeni energiaszinten.'}
 else if(healthy&&mins<=540){icon='😌';title='Jól néz ki';msg=firstName+', '+durText(mins)+' pihenés már egész biztató. Remélhetőleg az energiaszinted is hálás lesz érte.'}
 else if(healthy){icon='🌙';title='Hosszabb pihenés';msg=firstName+', '+durText(mins)+' alvást rögzítettem. Ha ez szokatlan, az alvásminőséget és a közérzetet is érdemes figyelni.'}
 // Stage-aware explanation, never a replacement for Samsung's own proprietary sleep score.
 if(healthy){
  var latestNight=hhLatestNight(recent),stages=latestNight&&latestNight.stages||[];
  if(stages.length){
   var stageMins={deep:0,rem:0,awake:0};
   stages.forEach(function(st){
    var k=Number(st.stage),m=durMin(st.startTime,st.endTime);
    if(k===5)stageMins.deep+=m;
    else if(k===6)stageMins.rem+=m;
    else if(k===1||k===3||k===7)stageMins.awake+=m;
   });
   msg+=' A Health Connect fázisadataiban '+durText(stageMins.deep)+' mély, '+durText(stageMins.rem)+' REM és '+durText(stageMins.awake)+' ébrenléti idő látszik. A HealthRadar saját alvásindexe tájékoztató jellegű, nem Samsung-pontszám.';
  }
 }
 return '<aside class="hhSleepLena364" aria-label="Léna gyors alvásértékelése"><div class="hhSleepMood364">'+icon+'</div><div class="hhSleepLenaText364"><b>💬 Léna · '+esc(title)+'</b><p>'+esc(msg)+'</p><small>⌚ Óraadatokból készült becslés, nem alvásdiagnózis.</small></div></aside>';
}
function chart(rows){
 if(!rows.length)return '<div class="hhSleepEmpty">Nincs alvásadat ebben az időszakban.</div>';
 var vals=rows.map(function(x){return durMin(x.startTime,x.endTime)/60}),max=Math.max.apply(null,vals.concat([8])),w=620,h=180,pad=26;
 var pts=rows.map(function(x,i){var xx=pad+(w-pad*2)*(rows.length===1?.5:i/(rows.length-1)),yy=h-pad-(h-pad*2)*(vals[i]/max);return {x:xx,y:yy}});
 var path=pts.map(function(p,i){return(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)}).join(' ');
 var grid='';for(var g=0;g<4;g++){var y=pad+(h-pad*2)*(g/3),v=max-(max)*(g/3);grid+='<line x1="'+pad+'" y1="'+y+'" x2="'+(w-pad)+'" y2="'+y+'" stroke="#e9edf6"/><text x="2" y="'+(y+3)+'" font-size="8" fill="#8893aa">'+v.toFixed(1)+'h</text>'}
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'+grid+'<path d="'+path+'" fill="none" stroke="var(--a)" stroke-width="2.5"/>'+
 pts.map(function(p){return '<circle cx="'+p.x+'" cy="'+p.y+'" r="2.8" fill="var(--a)"/>'}).join('')+
 '<text x="'+pad+'" y="'+(h-4)+'" font-size="8" fill="#8893aa">'+esc(fmtDate(rows[0].endTime))+'</text><text x="'+(w-pad)+'" y="'+(h-4)+'" text-anchor="end" font-size="8" fill="#8893aa">'+esc(fmtDate(rows[rows.length-1].endTime))+'</text></svg>';
}
function trendSummary(rows){
 if(!rows.length)return '';
 var mins=rows.map(function(x){return durMin(x.startTime,x.endTime)}),latest=rows[rows.length-1],first=rows[0],delta=mins[mins.length-1]-mins[0];
 return '<div class="hhSleepSummary"><div><small>ÁTLAG</small><b>'+durText(avg(mins))+'</b></div><div><small>LEGUTÓBBI</small><b>'+durText(mins[mins.length-1])+'</b></div><div><small>LEGHOSSZABB</small><b>'+durText(Math.max.apply(null,mins))+'</b></div><div><small>VÁLTOZÁS</small><b>'+(delta>0?'+':'')+Math.round(delta)+' p</b></div></div>';
}
async function render(profileOverride){
 var page=document.getElementById('hhSleepPage');if(!page)return;
 var renderId=++sleepRenderSeq,requestedProfile=profileOverride||pkey();
 page.innerHTML=heroHtml()+'<div class="surface hhSleepSurface"><div class="hhSleepTop"><div><small>HEALTH CONNECT · <span id="hhSleepSourceLabel">ALVÁS</span></small><h2>Alvás és regeneráció</h2></div><button class="hhSleepProfile" onclick="hhSleepToggleProfile(event)" aria-label="Váltás '+esc(otherName())+' profiljára">'+esc(pname())+'</button></div><div class="hhSleepCard hhSleepLoading"><div class="hhSleepSpinner"></div><b>Alvásadatok betöltése…</b><small>Health Connect adatok feldolgozása</small></div></div>'+bottomNav();
 var rows=await sleepSessions(requestedProfile);
 if(renderId!==sleepRenderSeq)return;
 var latest=rows[rows.length-1]||null,night=latest?hhLatestNight(rows):null,period=filtered(rows),total=latest?durMin(latest.startTime,latest.endTime):0;var srcLabel=(window.hhSleepDataSource||'Health Connect').toUpperCase();
 page.innerHTML=heroHtml()+'<div class="surface hhSleepSurface">'+
 '<div class="hhSleepTop"><div><small>HEALTH CONNECT · '+esc(requestedProfile==='monika'?'MÓNIKA':'ZSOLT')+'</small><h2>Alvás és regeneráció</h2></div><button class="hhSleepProfile" onclick="hhSleepToggleProfile(event)" aria-label="Váltás '+esc(otherName())+' profiljára">'+esc(pname())+'</button></div>'+
 (latest?hhSleepSource381(latest)+sleepOverview(rows)+sleepFactorCards381(night)+sleepLenaComment(rows,requestedProfile)+stageBar(night):
 '<div class="hhSleepEmpty big">Még nincs Health Connect alvásadat ennél a profilnál.</div>')+
 '<div class="hhSleepCard"><div class="hhSleepCardHead"><div><small>TREND</small><h3>Alvásidő</h3></div><div class="hhSleepPeriods"><button class="'+(sleepState.period==='7d'?'on':'')+'" onclick="hhSleepPeriod(\'7d\')">Heti</button><button class="'+(sleepState.period==='30d'?'on':'')+'" onclick="hhSleepPeriod(\'30d\')">Havi</button><button class="'+(sleepState.period==='90d'?'on':'')+'" onclick="hhSleepPeriod(\'90d\')">3 hónap</button></div></div>'+chart(period)+trendSummary(period)+'</div>'+
 '<div class="hhSleepCard helperCard"><div class="hhSleepCardHead"><div><small>SLEEP HELPER</small><h3>Elalvássegítő</h3></div><span>API-mentes</span></div><p>Válassz időt és hangot. A meleg fény lassan elsötétül, a hang pedig fokozatosan elhalkul.</p>'+
 '<div class="hhHelperTimes"><button class="on" data-min="10" onclick="hhHelperMinutes(10,this)">10 perc</button><button data-min="15" onclick="hhHelperMinutes(15,this)">15 perc</button><button data-min="20" onclick="hhHelperMinutes(20,this)">20 perc</button></div>'+
 '<div class="hhHelperModes"><button class="on" data-mode="brown" onclick="hhHelperMode(\'brown\',this)">🟤 Brown noise</button><button data-mode="soft" onclick="hhHelperMode(\'soft\',this)">🌧 Lágy zaj</button><button data-mode="breath" onclick="hhHelperMode(\'breath\',this)">🌬 Légzés</button><button data-mode="light" onclick="hhHelperMode(\'light\',this)">🌙 Csak fény</button></div>'+
 '<button class="hhHelperStart" onclick="hhStartSleepHelper()">🌙 ELALVÁS INDÍTÁSA</button></div>'+
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
ensurePage();wireButton();document.addEventListener('click',delegatedSleepClick,true);
var prevSet=window.setProfile;if(typeof prevSet==='function')window.setProfile=function(){var r=prevSet.apply(this,arguments);var requested=arguments[0]==='m'?'monika':arguments[0]==='z'?'zsolt':pkey();setTimeout(function(){if(document.getElementById('hhSleepPage')?.classList.contains('on'))render(requested)},30);return r};
setTimeout(wireButton,300);setInterval(function(){var p=document.getElementById('hhSleepPage');if(p&&p.classList.contains('on'))wireButton()},5000);
document.documentElement.dataset.healthhubSleep='1.382';window.HH_LIVE_BUILD='v382-sleep-rag-healthradar-index';
})();