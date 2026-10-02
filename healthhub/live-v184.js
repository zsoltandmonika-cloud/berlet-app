(function(){
'use strict';
/* HealthHub v1.84 — Activity / Exercise summary */
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
function fmtDate(v){var d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}
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
function lineSvg(vals){
 if(!vals.length)return '<div class="hhActNo">Nincs elég adat.</div>';
 var w=330,h=130,p=18,max=Math.max.apply(null,vals.map(function(x){return x.v}).concat([1]));
 var step=(w-2*p)/Math.max(1,vals.length-1);
 var pts=vals.map(function(x,i){return (p+i*step).toFixed(1)+','+(h-p-(h-2*p)*(x.v/max)).toFixed(1)}).join(' ');
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><line x1="'+p+'" y1="'+(h-p)+'" x2="'+(w-p)+'" y2="'+(h-p)+'" stroke="#e5edf2"/><polyline points="'+pts+'" fill="none" stroke="var(--a)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function barsSvg(rows){
 if(!rows.length)return '<div class="hhActNo">Nincs napi aktivitásadat.</div>';
 var w=330,h=140,p=18,max=Math.max.apply(null,rows.map(function(x){return Number(x.steps)||0}).concat([1])),bw=(w-2*p)/rows.length*.58,gap=(w-2*p)/rows.length,out='';
 rows.forEach(function(x,i){var v=Number(x.steps)||0,hh=(h-2*p)*(v/max),xx=p+i*gap+(gap-bw)/2;out+='<rect x="'+xx.toFixed(1)+'" y="'+(h-p-hh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+hh.toFixed(1)+'" rx="3" fill="var(--a)" fill-opacity=".72"/>'});
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><line x1="'+p+'" y1="'+(h-p)+'" x2="'+(w-p)+'" y2="'+(h-p)+'" stroke="#e5edf2"/>'+out+'</svg>';
}
function tile(icon,label,value,unit){
 return '<div class="hhActMetric"><span>'+icon+'</span><small>'+esc(label)+'</small><b>'+value+'</b><em>'+esc(unit||'')+'</em></div>';
}
function ensure(){
 if(document.getElementById('hhActivityPage'))return;
 var p=document.createElement('section');p.id='hhActivityPage';p.className='hhActivityPage';document.body.appendChild(p);
}
function hero(){
 return '<div class="hhActHero"><img src="./assets/activity-hero-v184.webp" alt="Activity hero"><button class="hhActHome" onclick="hhCloseActivity()" aria-label="Kezdőlap"></button><button class="hhActRefresh" onclick="hhRenderActivity()" aria-label="Frissítés"></button></div>';
}
function nav(){
 return '<nav class="hhActNav"><button onclick="hhCloseActivity()"><span>⌂</span><b>Kezdőlap</b></button><button onclick="hhCloseActivity();if(window.show)show(\'health\')"><span>♡</span><b>HealthRadar</b></button><button class="on"><span>🏃</span><b>Activity</b></button><button onclick="hhCloseActivity();if(window.hhOpenInsights)hhOpenInsights()"><span>▥</span><b>Elemzések</b></button><button onclick="hhCloseActivity();if(window.show)show(\'home\')"><span>•••</span><b>Továbbiak</b></button></nav>';
}
async function render(){
 var p=document.getElementById('hhActivityPage');if(!p)return;
 p.innerHTML=hero()+'<div class="surface hhActSurface"><div class="hhActLoading"><i></i><div><b>Aktivitásadatok betöltése…</b><small>Health Connect · '+esc(pname())+'</small></div></div></div>'+nav();
 var c=collect(await load()),days=state.period==='30d'?30:7,cut=Date.now()-days*86400000,today=dayKey(Date.now());
 var sessions=c.sessions.filter(function(s){return Date.parse(s.endTime||0)>=cut}),daily=c.daily.filter(function(x){return Date.parse(x.date+'T23:59:59')>=cut});
 var latestDay=c.daily.find(function(x){return x.date===today})||c.daily[c.daily.length-1]||null;
 var todays=c.sessions.filter(function(s){return dayKey(s.startTime)===today});
 var active=todays.reduce(function(a,s){return a+mins(s.startTime,s.endTime)},0);
 var latestSession=c.sessions[0]||null,latestHr=latestSession?hrFor(latestSession,c.heart):null;
 var totalMin=sessions.reduce(function(a,s){return a+mins(s.startTime,s.endTime)},0);
 var typeMap={};sessions.forEach(function(s){var k=typeLabel(s);typeMap[k]=(typeMap[k]||0)+1});
 var types=Object.entries(typeMap).sort(function(a,b){return b[1]-a[1]}).slice(0,5);
 var recent=c.sessions.slice(0,5);
 var trend=daily.map(function(x){return {v:Number(x.steps)||0}});
 var insight=sessions.length
   ?('Az elmúlt '+days+' napban '+sessions.length+' edzés került a Health Connectből a profilba, összesen '+dur(totalMin)+' rögzített edzésidővel.')
   :'Ebben az időszakban még nincs rögzített edzés a Health Connectben.';

 p.innerHTML=hero()+'<div class="surface hhActSurface">'+
  '<div class="hhActTabs"><button class="'+(state.period==='7d'?'on':'')+'" onclick="hhActivityPeriod(\'7d\')">Hét</button><button class="'+(state.period==='30d'?'on':'')+'" onclick="hhActivityPeriod(\'30d\')">Hónap</button></div>'+
  '<div class="hhActGrid">'+
    tile('👣','Lépések',latestDay?n(latestDay.steps,0):'—','lépés')+
    tile('🔥','Elégetett kalória',latestDay?n(latestDay.caloriesKcal,0):'—','kcal')+
    tile('⏱️','Aktív idő',dur(active),'')+
    tile('📍','Távolság',latestDay?n((Number(latestDay.distanceMeters)||0)/1000,1):'—','km')+
  '</div>'+
  '<div class="hhActGrid hhActSmall">'+
    tile('❤️','Átlag pulzus',latestHr?n(latestHr.avg,0):'—','bpm')+
    tile('💗','Max. pulzus',latestHr?n(latestHr.max,0):'—','bpm')+
    tile('🏃','Edzések',String(sessions.length),'db')+
    tile('⌛','Edzésidő',dur(totalMin),'')+
  '</div>'+
  '<section class="hhActCard"><div class="hhActHead"><div><small>NAPI AKTIVITÁS</small><h3>Lépésszám az időszakban</h3></div></div><div class="hhActChart">'+barsSvg(daily.slice(-Math.min(days,30)))+'</div></section>'+
  '<section class="hhActCard"><div class="hhActHead"><div><small>TREND</small><h3>Aktivitási trend</h3></div></div><div class="hhActChart">'+lineSvg(trend.slice(-Math.min(days,30)))+'</div></section>'+
  '<section class="hhActCard"><div class="hhActHead"><div><small>EDZÉSTÍPUSOK</small><h3>Rögzített aktivitások</h3></div></div><div class="hhActTypes">'+(types.length?types.map(function(x,i){return '<div><span>'+['🚶','🏃','🚴','🏋️','🧘'][i%5]+'</span><b>'+esc(x[0])+'</b><small>'+x[1]+' alkalom</small></div>'}).join(''):'<div class="hhActNo">Nincs edzéstípus adat.</div>')+'</div></section>'+
  '<section class="hhActCard"><div class="hhActHead"><div><small>LEGUTÓBBI EDZÉSEK</small><h3>Exercise sessions</h3></div></div><div class="hhActRecent">'+(recent.length?recent.map(function(s){var h=hrFor(s,c.heart);return '<div><span class="hhActRecentIcon">🏃</span><div><b>'+esc(typeLabel(s))+'</b><small>'+esc(fmtDate(s.startTime))+' · '+dur(mins(s.startTime,s.endTime))+(h?' · '+n(h.avg,0)+' bpm':'')+'</small></div></div>'}).join(''):'<div class="hhActNo">Nincs rögzített edzés.</div>')+'</div></section>'+
  '<section class="hhActInsight"><span>💡</span><div><b>Léna activity insight</b><p>'+esc(insight)+'</p><small>Leíró összefoglaló, nem orvosi értékelés.</small></div></section>'+
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
 if(document.getElementById('hh-v184-style'))return;
 var s=document.createElement('style');s.id='hh-v184-style';s.textContent=
 '.hhActivityPage{display:none;position:fixed;inset:0;z-index:5200;overflow-y:auto;background:linear-gradient(180deg,var(--wash2),var(--wash));width:min(100vw,420px);margin:auto;padding-bottom:64px}.hhActivityPage.on{display:block}.hhActHero{height:205px;position:relative;overflow:hidden;background:#dceef8}.hhActHero img{display:block;width:100%;height:205px;object-fit:cover}.hhActHome,.hhActRefresh{position:absolute;top:8px;width:38px;height:38px;border:0;background:transparent;z-index:3}.hhActHome{left:8px}.hhActRefresh{right:8px}.hhActSurface{margin-top:-1px!important;padding:8px 9px 76px!important}.hhActTabs{display:grid;grid-template-columns:1fr 1fr;background:#eef4f7;border-radius:16px;padding:3px;margin-bottom:8px}.hhActTabs button{border:0;border-radius:13px;padding:8px;background:transparent;color:#698094;font-size:9px;font-weight:850}.hhActTabs button.on{background:linear-gradient(135deg,var(--a),var(--a2));color:#fff}.hhActGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-bottom:6px}.hhActMetric{background:#fff;border:1px solid #e6edf2;border-radius:16px;padding:10px;min-height:91px;position:relative;overflow:hidden}.hhActMetric:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--a);opacity:.4}.hhActMetric>span{font-size:22px;display:block}.hhActMetric small{display:block;font-size:7px;color:#718598;margin-top:4px}.hhActMetric b{display:inline-block;font-size:20px;color:#173f62;margin-top:3px}.hhActMetric em{font-style:normal;font-size:7px;color:#8a9aa7;margin-left:4px}.hhActSmall .hhActMetric{min-height:82px}.hhActCard{background:#fff;border-radius:17px;padding:11px;margin-top:8px;box-shadow:0 6px 17px rgba(38,74,101,.05)}.hhActHead small{font-size:6.5px;color:var(--a);font-weight:900;letter-spacing:.1em}.hhActHead h3{font-size:12px;color:#173f62;margin:2px 0 3px}.hhActChart{height:145px}.hhActChart svg{width:100%;height:100%;display:block}.hhActTypes{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin-top:8px}.hhActTypes>div{background:linear-gradient(180deg,#fff,var(--soft));border-radius:12px;padding:7px 3px;text-align:center;min-width:0}.hhActTypes span{display:block;font-size:20px}.hhActTypes b{display:block;font-size:7px;color:#173f62;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhActTypes small{font-size:6px;color:#718598}.hhActRecent>div{display:grid;grid-template-columns:34px minmax(0,1fr);gap:8px;align-items:center;padding:8px 0;border-top:1px solid #edf1f5}.hhActRecent>div:first-child{border-top:0}.hhActRecentIcon{width:34px;height:34px;border-radius:11px;background:var(--soft);display:grid;place-items:center;font-size:17px}.hhActRecent b{display:block;font-size:9px;color:#173f62}.hhActRecent small{display:block;font-size:7px;color:#74889a;margin-top:2px}.hhActInsight{display:grid;grid-template-columns:38px minmax(0,1fr);gap:9px;background:linear-gradient(135deg,var(--soft),#fff);border:1px solid color-mix(in srgb,var(--a) 16%,#fff);border-radius:16px;padding:11px;margin-top:8px}.hhActInsight>span{font-size:25px}.hhActInsight b{font-size:10px;color:#173f62}.hhActInsight p{font-size:8px;line-height:1.4;color:#587086;margin:3px 0}.hhActInsight small{font-size:6.5px;color:#8393a0}.hhActNo{height:100%;display:grid;place-items:center;font-size:8px;color:#8495a2}.hhActLoading{display:flex;align-items:center;gap:9px;background:#fff;border-radius:16px;padding:14px}.hhActLoading i{width:22px;height:22px;border-radius:50%;border:3px solid #e5edf2;border-top-color:var(--a);animation:hhActSpin .8s linear infinite}.hhActLoading b{display:block;font-size:9px;color:#173f62}.hhActLoading small{font-size:7px;color:#8192a0}.hhActNav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:7300;width:min(100vw,420px);height:58px;background:rgba(255,255,255,.97);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;box-shadow:0 -5px 18px rgba(28,66,92,.07)}.hhActNav button{border:0;background:transparent;color:#718699;font-size:7px;display:flex;flex-direction:column;align-items:center;gap:2px}.hhActNav button span{font-size:19px}.hhActNav button b{font-size:7.5px}.hhActNav button.on{color:var(--a)}@keyframes hhActSpin{to{transform:rotate(360deg)}}@media(max-width:360px){.hhActMetric{padding:8px;min-height:86px}.hhActMetric b{font-size:18px}.hhActTypes{grid-template-columns:repeat(3,1fr)}}';
 document.head.appendChild(s);
}
style();ensure();wire();setInterval(wire,1800);
document.documentElement.dataset.healthhubActivity='1.84';
})();