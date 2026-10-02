(function(){
'use strict';
/* HealthHub v1.85 — approved Activity design */
var DB='healthhub-connect-v1';
var state=window.hhActivityState||{period:'7d'};window.hhActivityState=state;

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,1);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function dayKey(v){var d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString().slice(0,10):''}
function mins(a,b){var m=(Date.parse(b)-Date.parse(a))/60000;return Number.isFinite(m)&&m>0?m:0}
function dur(m){m=Math.round(m||0);var h=Math.floor(m/60),x=m%60;return h?(h+'ó '+x+'p'):(m+'p')}
function n(v,d){v=Number(v);return Number.isFinite(v)?v.toLocaleString('hu-HU',{maximumFractionDigits:d==null?0:d}):'—'}
function fmtDate(v){var d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
function avg(a){return a.length?a.reduce(function(x,y){return x+y},0)/a.length:null}

async function load(){
 var out={imports:[],activity:[]};
 try{
  var db=await openDb();try{
   var tx=db.transaction(['imports','activity']);
   out.imports=await reqP(tx.objectStore('imports').getAll())||[];
   out.activity=await reqP(tx.objectStore('activity').getAll())||[];
  }finally{db.close()}
 }catch(e){}
 out.imports=out.imports.filter(function(x){return x.profile===pkey()&&x.bundle});
 out.activity=out.activity.filter(function(x){return x.profile===pkey()});
 return out;
}
function collect(raw){
 var sm=new Map(),dm=new Map(),hm=new Map();
 raw.imports.sort(function(a,b){return Date.parse(b.importedAt||0)-Date.parse(a.importedAt||0)}).forEach(function(imp){
  var r=imp.bundle&&imp.bundle.records||{};
  (Array.isArray(r.exerciseSessions)?r.exerciseSessions:[]).forEach(function(s){var id=String(s.id||s.startTime+'|'+s.endTime);if(!sm.has(id))sm.set(id,s)});
  (Array.isArray(r.dailyActivity)?r.dailyActivity:[]).forEach(function(x){if(x&&x.date&&!dm.has(x.date))dm.set(x.date,x)});
  (Array.isArray(r.heartRate)?r.heartRate:[]).forEach(function(hr){(Array.isArray(hr.samples)?hr.samples:[]).forEach(function(s){var k=String(s.time)+'|'+String(s.bpm);if(!hm.has(k))hm.set(k,s)})});
 });
 raw.activity.forEach(function(x){if(x&&x.date){var old=dm.get(x.date)||{};dm.set(x.date,Object.assign({},old,x))}});
 return {
  sessions:Array.from(sm.values()).sort(function(a,b){return Date.parse(b.endTime||0)-Date.parse(a.endTime||0)}),
  daily:Array.from(dm.values()).sort(function(a,b){return String(a.date).localeCompare(String(b.date))}),
  heart:Array.from(hm.values()).sort(function(a,b){return Date.parse(a.time||0)-Date.parse(b.time||0)})
 };
}
function hrFor(s,heart){
 var a=Date.parse(s.startTime),b=Date.parse(s.endTime),v=heart.filter(function(x){var t=Date.parse(x.time);return t>=a&&t<=b&&Number.isFinite(Number(x.bpm))}).map(function(x){return Number(x.bpm)});
 return v.length?{avg:avg(v),max:Math.max.apply(null,v),count:v.length}:null;
}
function typeLabel(s){
 if(s.title&&String(s.title)!=='null')return String(s.title);
 var t=Number(s.exerciseType);
 var map={2:'Kerékpár',8:'Elliptikus tréner',16:'Túrázás',20:'Futás',25:'Evezés',35:'Erősítés',56:'Gyaloglás',79:'Jóga'};
 return map[t]||'Edzés';
}
function avgHrByDay(heart){
 var m={};heart.forEach(function(x){var k=dayKey(x.time),b=Number(x.bpm);if(!k||!Number.isFinite(b))return;(m[k]||(m[k]=[])).push(b)});
 var out={};Object.keys(m).forEach(function(k){out[k]=avg(m[k])});return out;
}
function activityChart(rows,heart){
 if(!rows.length)return '<div class="hhActNo">Nincs napi aktivitásadat.</div>';
 var hr=avgHrByDay(heart),w=360,h=150,p=24,maxS=Math.max.apply(null,rows.map(function(x){return Number(x.steps)||0}).concat([1])),maxC=Math.max.apply(null,rows.map(function(x){return Number(x.caloriesKcal)||0}).concat([1]));
 var vals=rows.map(function(x){return Number(hr[x.date])||null}).filter(function(v){return v!=null}),minH=vals.length?Math.min.apply(null,vals):60,maxH=vals.length?Math.max.apply(null,vals):180;if(maxH-minH<30){minH=Math.max(40,minH-15);maxH+=15}
 var gap=(w-2*p)/rows.length,bw=Math.max(2,gap*.34),blue='',orange='',pts=[];
 rows.forEach(function(x,i){
  var xx=p+i*gap,sv=Number(x.steps)||0,cv=Number(x.caloriesKcal)||0,sh=(h-2*p)*(sv/maxS),ch=(h-2*p)*(cv/maxC);
  blue+='<rect x="'+(xx+gap*.10).toFixed(1)+'" y="'+(h-p-sh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+sh.toFixed(1)+'" rx="2" fill="#27a7f7" fill-opacity=".86"/>';
  orange+='<rect x="'+(xx+gap*.50).toFixed(1)+'" y="'+(h-p-ch).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+ch.toFixed(1)+'" rx="2" fill="#ff941a" fill-opacity=".86"/>';
  var hv=hr[x.date];if(Number.isFinite(hv)){var yy=h-p-(h-2*p)*((hv-minH)/(maxH-minH));pts.push((xx+gap*.5).toFixed(1)+','+yy.toFixed(1))}
 });
 var poly=pts.length>1?'<polyline points="'+pts.join(' ')+'" fill="none" stroke="#ff2f7f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>':'';
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><line x1="'+p+'" y1="'+(h-p)+'" x2="'+(w-p)+'" y2="'+(h-p)+'" stroke="#e7edf2"/>'+blue+orange+poly+'</svg>';
}
function metric(icon,label,value,unit,cls){
 return '<div class="hhActMetric '+(cls||'')+'"><span class="hhActMetricIcon">'+icon+'</span><div class="hhActMetricText"><small>'+esc(label)+'</small><b>'+value+'</b><em>'+esc(unit||'')+'</em></div></div>';
}
function ensure(){
 if(document.getElementById('hhActivityPage'))return;
 var p=document.createElement('section');p.id='hhActivityPage';p.className='hhActivityPage';document.body.appendChild(p);
}
function hero(){
 return '<div class="hhActHero"><img src="./assets/activity-hero-v184.webp" alt="Activity hero"><button class="hhActHeroHit h0" onclick="hhActivityPeriod(\'1d\')" aria-label="Ma"></button><button class="hhActHeroHit h1" onclick="hhActivityPeriod(\'7d\')" aria-label="Hét"></button><button class="hhActHeroHit h2" onclick="hhActivityPeriod(\'30d\')" aria-label="Hónap"></button><button class="hhActHeroHit h3" onclick="hhActivityPeriod(\'30d\')" aria-label="Év"></button></div>';
}
function nav(){
 return '<nav class="hhActNav"><button onclick="hhCloseActivity()"><span>⌂</span><b>Kezdőlap</b></button><button onclick="hhCloseActivity();if(window.show)show(\'health\')"><span>♡</span><b>HealthRadar</b></button><button class="on"><span>🏃</span><b>Activity</b></button><button onclick="hhCloseActivity();if(window.hhOpenInsights)hhOpenInsights()"><span>▥</span><b>Elemzések</b></button><button onclick="hhCloseActivity();if(window.show)show(\'home\')"><span>•••</span><b>Továbbiak</b></button></nav>';
}
async function render(){
 var p=document.getElementById('hhActivityPage');if(!p)return;
 p.innerHTML=hero()+'<div class="surface hhActSurface"><div class="hhActLoading"><i></i><div><b>Aktivitásadatok betöltése…</b><small>Health Connect · '+esc(pname())+'</small></div></div></div>'+nav();

 var c=collect(await load()),days=state.period==='1d'?1:(state.period==='30d'?30:7),cut=Date.now()-days*86400000,today=dayKey(Date.now());
 var sessions=c.sessions.filter(function(s){return Date.parse(s.endTime||0)>=cut}),daily=c.daily.filter(function(x){return Date.parse(x.date+'T23:59:59')>=cut});
 var latestDay=c.daily.find(function(x){return x.date===today})||c.daily[c.daily.length-1]||null;
 var todays=c.sessions.filter(function(s){return dayKey(s.startTime)===today});
 var active=todays.reduce(function(a,s){return a+mins(s.startTime,s.endTime)},0);
 var latestSession=c.sessions[0]||null,latestHr=latestSession?hrFor(latestSession,c.heart):null;
 var totalMin=sessions.reduce(function(a,s){return a+mins(s.startTime,s.endTime)},0);
 var typeMap={};sessions.forEach(function(s){var k=typeLabel(s);typeMap[k]=(typeMap[k]||0)+1});
 var types=Object.entries(typeMap).sort(function(a,b){return b[1]-a[1]}).slice(0,5),icons=['🚶','🏃','🚴','🏋️','🧘'];
 var recent=c.sessions.slice(0,3);

 p.innerHTML=hero()+'<div class="surface hhActSurface">'+
  '<div class="hhActGrid top">'+
    metric('👣','Lépések',latestDay?n(latestDay.steps,0):'—','lépés','steps')+
    metric('🔥','Elégetett kalória',latestDay?n(latestDay.caloriesKcal,0):'—','kcal','cal')+
    metric('⏱️','Aktív idő',dur(active),'','time')+
    metric('📍','Távolság',latestDay?n((Number(latestDay.distanceMeters)||0)/1000,1):'—','km','dist')+
  '</div>'+
  '<div class="hhActGrid lower">'+
    metric('💗','Átlag pulzus',latestHr?n(latestHr.avg,0):'—','bpm','hr')+
    metric('💓','Max. pulzus',latestHr?n(latestHr.max,0):'—','bpm','hr')+
    metric('🏃','Edzések',String(sessions.length),'db','work')+
    metric('⌛','Edzésidő',dur(totalMin),'','work')+
  '</div>'+
  '<section class="hhActCard hhActChartCard"><div class="hhActCardHead"><span>📊</span><h3>Aktivitás az időszakban</h3><div class="hhActLegend"><i class="blue"></i>Lépések <i class="orange"></i>Kalória <i class="pink"></i>Pulzus</div></div><div class="hhActChart">'+activityChart(daily,c.heart)+'</div></section>'+
  '<section class="hhActCard"><div class="hhActCardHead"><span>🏃</span><h3>Aktivitás típusok</h3><b>Összes ›</b></div><div class="hhActTypes">'+(types.length?types.map(function(x,i){return '<div class="'+(i===0?'on':'')+'"><span>'+icons[i%icons.length]+'</span><b>'+esc(x[0])+'</b><small>'+x[1]+' alkalom</small></div>'}).join(''):'<div class="hhActNo">Nincs edzéstípus adat.</div>')+'</div></section>'+
  '<section class="hhActCard"><div class="hhActCardHead"><span>🕘</span><h3>Legutóbbi edzések</h3><b>Összes ›</b></div><div class="hhActRecent">'+(recent.length?recent.map(function(s,i){var h=hrFor(s,c.heart);return '<div><span class="hhActRecentIcon">'+icons[(i+1)%icons.length]+'</span><div class="hhActRecentText"><b>'+esc(typeLabel(s))+'</b><small>'+esc(fmtDate(s.startTime))+'</small></div><div class="hhActRecentStats"><span>⏱ '+dur(mins(s.startTime,s.endTime))+'</span>'+(h?'<span>💗 '+n(h.avg,0)+' bpm</span>':'')+'</div><strong>›</strong></div>'}).join(''):'<div class="hhActNo">Nincs rögzített edzés.</div>')+'</div></section>'+
 '</div>'+nav();
}
window.hhOpenActivity=function(){ensure();var p=document.getElementById('hhActivityPage');p.classList.add('on');render()};
window.hhCloseActivity=function(){var p=document.getElementById('hhActivityPage');if(p)p.classList.remove('on')};
window.hhRenderActivity=render;
window.hhActivityPeriod=function(v){state.period=v;render()};

function wire(){
 var btn=Array.from(document.querySelectorAll('.homeModule')).find(function(x){var b=x.querySelector('b');return b&&b.textContent.trim()==='Activity'});
 if(btn){btn.removeAttribute('onclick');btn.onclick=function(e){e.preventDefault();window.hhOpenActivity()};btn.style.cursor='pointer'}
}
function style(){
 if(document.getElementById('hh-v185-style'))return;
 var s=document.createElement('style');s.id='hh-v185-style';s.textContent=
 '.hhActivityPage{display:none;position:fixed;inset:0;z-index:5200;overflow-y:auto;background:#f3fbff;width:min(100vw,420px);margin:auto;padding-bottom:62px}.hhActivityPage.on{display:block}'+
 '.hhActHero{height:205px;position:relative;overflow:hidden;background:#dceef8}.hhActHero img{width:100%;height:205px;display:block;object-fit:cover}.hhActHeroHit{position:absolute;bottom:7px;height:27px;width:50px;border:0;background:transparent;z-index:4}.hhActHeroHit.h0{left:17px}.hhActHeroHit.h1{left:69px}.hhActHeroHit.h2{left:121px}.hhActHeroHit.h3{left:173px}'+
 '.hhActSurface{margin:0!important;padding:7px 7px 72px!important;background:#f3fbff!important}'+
 '.hhActGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-bottom:5px}.hhActMetric{background:#fff;border:1px solid #e5edf2;border-radius:13px;padding:7px 6px;min-width:0;min-height:92px;position:relative;box-shadow:0 4px 12px rgba(31,65,91,.035)}.hhActGrid.lower .hhActMetric{min-height:70px}.hhActMetric:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:#ff7db2;border-radius:0 0 13px 13px}.hhActMetricIcon{font-size:20px;display:block;line-height:1}.hhActMetricText small{display:block;font-size:6px;line-height:1.1;color:#667d91;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhActMetricText b{display:inline-block;font-size:16px;line-height:1.05;color:#153b5e;margin-top:4px;letter-spacing:-.02em}.hhActMetricText em{font-style:normal;font-size:6px;color:#8395a4;margin-left:2px}.hhActGrid.lower .hhActMetricText b{font-size:15px}.hhActGrid.lower .hhActMetricIcon{font-size:19px}'+
 '.hhActCard{background:#fff;border-radius:14px;padding:9px;margin-top:6px;border:1px solid #e9eff3;box-shadow:0 4px 12px rgba(31,65,91,.035)}.hhActCardHead{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:6px}.hhActCardHead>span{font-size:17px}.hhActCardHead h3{font-size:11px;color:#153b5e;margin:0}.hhActCardHead>b{font-size:7px;color:#2c9df4}.hhActLegend{font-size:5.8px;color:#73889a;white-space:nowrap}.hhActLegend i{display:inline-block;width:6px;height:6px;border-radius:50%;margin:0 2px 0 5px}.hhActLegend .blue{background:#27a7f7}.hhActLegend .orange{background:#ff941a}.hhActLegend .pink{background:#ff2f7f}.hhActChart{height:118px;margin-top:5px}.hhActChart svg{width:100%;height:100%;display:block}'+
 '.hhActTypes{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin-top:8px}.hhActTypes>div{background:linear-gradient(180deg,#fff,#f6f9fc);border-radius:11px;padding:7px 2px;text-align:center;border:1px solid #edf1f4;min-width:0}.hhActTypes>div.on{border-color:#ff2f7f;background:#fff8fb}.hhActTypes span{display:block;font-size:19px}.hhActTypes b{display:block;font-size:6.5px;color:#173f62;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhActTypes small{display:block;font-size:5.7px;color:#778a9a;margin-top:2px}'+
 '.hhActRecent>div{display:grid;grid-template-columns:30px minmax(0,1fr) auto 10px;gap:6px;align-items:center;padding:6px 0;border-top:1px solid #edf1f5}.hhActRecent>div:first-child{border-top:0}.hhActRecentIcon{width:30px;height:30px;border-radius:50%;background:#eefaf3;display:grid;place-items:center;font-size:15px}.hhActRecentText b{display:block;font-size:7.5px;color:#173f62}.hhActRecentText small{display:block;font-size:5.8px;color:#7a8e9e;margin-top:1px}.hhActRecentStats{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.hhActRecentStats span{font-size:5.8px;color:#61778a;white-space:nowrap}.hhActRecent strong{font-size:14px;color:#59748a}.hhActNo{min-height:60px;display:grid;place-items:center;font-size:7px;color:#8495a2}'+
 '.hhActLoading{display:flex;align-items:center;gap:9px;background:#fff;border-radius:14px;padding:14px}.hhActLoading i{width:22px;height:22px;border-radius:50%;border:3px solid #e5edf2;border-top-color:#ff2f7f;animation:hhActSpin .8s linear infinite}.hhActLoading b{display:block;font-size:9px;color:#173f62}.hhActLoading small{font-size:7px;color:#8192a0}'+
 '.hhActNav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:7300;width:min(100vw,420px);height:57px;background:rgba(255,255,255,.98);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;box-shadow:0 -5px 18px rgba(28,66,92,.07)}.hhActNav button{border:0;background:transparent;color:#6f8597;font-size:7px;display:flex;flex-direction:column;align-items:center;gap:1px}.hhActNav button span{font-size:19px}.hhActNav button b{font-size:7px}.hhActNav button.on{color:#ff2f7f}'+
 '@keyframes hhActSpin{to{transform:rotate(360deg)}}@media(max-width:360px){.hhActSurface{padding-left:5px!important;padding-right:5px!important}.hhActGrid{gap:4px}.hhActMetric{padding:6px 4px;min-height:86px}.hhActMetricIcon{font-size:18px}.hhActMetricText b{font-size:14px}.hhActTypes{gap:3px}.hhActRecentStats{display:none}}';
 document.head.appendChild(s);
}
style();ensure();wire();setInterval(wire,1800);
document.documentElement.dataset.healthhubActivity='1.85';
})();