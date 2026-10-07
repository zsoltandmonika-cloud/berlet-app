(function(){
'use strict';
/* HealthHub v1.88.1 — Activity live profile/search/calendar controls · bridge schema v3 */
var DB='healthhub-connect-v1';
var state=window.hhActivityState||{period:'1d'};window.hhActivityState=state;

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function reqP(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,3);r.onupgradeneeded=function(){var d=r.result;if(!d.objectStoreNames.contains('imports'))d.createObjectStore('imports',{keyPath:'id'});if(!d.objectStoreNames.contains('activity'))d.createObjectStore('activity',{keyPath:'id'})};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
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
 return v.length?{avg:avg(v),max:Math.max.apply(null,v)}:null;
}
function typeLabel(s){
 if(s.title&&String(s.title)!=='null')return String(s.title);
 var t=Number(s.exerciseType),map={2:'Kerékpár',8:'Elliptikus tréner',16:'Túrázás',20:'Futás',25:'Evezés',35:'Erősítés',56:'Gyaloglás',79:'Jóga'};
 return map[t]||'Edzés';
}
function periodDays(){return state.period==='1d'?1:(state.period==='7d'?7:(state.period==='30d'?30:365))}
function avgHrByDay(heart){
 var m={};heart.forEach(function(x){var k=dayKey(x.time),b=Number(x.bpm);if(!k||!Number.isFinite(b))return;(m[k]||(m[k]=[])).push(b)});
 var out={};Object.keys(m).forEach(function(k){out[k]=avg(m[k])});return out;
}
function chart(rows,heart){
 if(!rows.length)return '<div class="hhActNo">Nincs aktivitásadat.</div>';
 var hr=avgHrByDay(heart),w=392,h=112,p=18,maxS=Math.max.apply(null,rows.map(function(x){return Number(x.steps)||0}).concat([1])),maxC=Math.max.apply(null,rows.map(function(x){return Number(x.caloriesKcal)||0}).concat([1]));
 var hv=rows.map(function(x){return Number(hr[x.date])}).filter(Number.isFinite),minH=hv.length?Math.min.apply(null,hv):60,maxH=hv.length?Math.max.apply(null,hv):180;if(maxH-minH<30){minH=Math.max(40,minH-15);maxH+=15}
 var gap=(w-2*p)/rows.length,bw=Math.max(2,gap*.30),blue='',orange='',pts=[];
 rows.forEach(function(x,i){
  var xx=p+i*gap,sv=Number(x.steps)||0,cv=Number(x.caloriesKcal)||0,sh=(h-2*p)*(sv/maxS),ch=(h-2*p)*(cv/maxC);
  blue+='<rect x="'+(xx+gap*.15).toFixed(1)+'" y="'+(h-p-sh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+sh.toFixed(1)+'" rx="1.5" fill="#23a7f6"/>';
  orange+='<rect x="'+(xx+gap*.52).toFixed(1)+'" y="'+(h-p-ch).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+ch.toFixed(1)+'" rx="1.5" fill="#ff9418"/>';
  var hrv=hr[x.date];if(Number.isFinite(hrv)){var yy=h-p-(h-2*p)*((hrv-minH)/(maxH-minH));pts.push((xx+gap*.5).toFixed(1)+','+yy.toFixed(1))}
 });
 var line=pts.length>1?'<polyline points="'+pts.join(' ')+'" fill="none" stroke="#ff2f7f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>':'';
 return '<svg viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><line x1="'+p+'" y1="'+(h-p)+'" x2="'+(w-p)+'" y2="'+(h-p)+'" stroke="#e8eef3"/>'+blue+orange+line+'</svg>';
}
function metric(icon,label,value,unit,accent){
 return '<div class="hhActMetric '+(accent||'')+'"><span class="ico">'+icon+'</span><small>'+esc(label)+'</small><div><b>'+value+'</b><em>'+esc(unit||'')+'</em></div></div>';
}
function avatarSrc(){var a=document.getElementById('personHome')||document.getElementById('personH');return a&&(a.currentSrc||a.src)||''}
function ensure(){
 if(!document.getElementById('hhActivityPage')){var p=document.createElement('section');p.id='hhActivityPage';p.className='hhActivityPage';document.body.appendChild(p)}
 if(!document.getElementById('hhActModal')){var m=document.createElement('div');m.id='hhActModal';m.className='hhActModal';document.body.appendChild(m)}
}
function hero(){
 var av=avatarSrc();
 return '<div class="hhActHero"><img src="./assets/activity-hero-v184.webp" alt="Activity hero">'+
 '<div class="hhActControls">'+
 '<button class="avatar" onclick="hhActivityProfiles()" aria-label="Profilváltás">'+(av?'<img src="'+esc(av)+'" alt="'+esc(pname())+'">':'<b>'+esc(pname().charAt(0))+'</b>')+'</button>'+
 '<button onclick="hhActivitySearch()" aria-label="Aktivitás keresés"><span class="searchIcon">⌕</span></button>'+
 '<button onclick="hhActivityCalendar()" aria-label="Aktivitás naptár"><span class="calendarIcon">▣</span></button>'+
 '</div>'+
 '<button class="hit t0" onclick="hhActivityPeriod(\'1d\')" aria-label="Ma"></button><button class="hit t1" onclick="hhActivityPeriod(\'7d\')" aria-label="Hét"></button><button class="hit t2" onclick="hhActivityPeriod(\'30d\')" aria-label="Hónap"></button><button class="hit t3" onclick="hhActivityPeriod(\'365d\')" aria-label="Év"></button></div>';
}
function nav(){
 return '<nav class="hhActNav"><button onclick="hhCloseActivity()"><span>⌂</span><b>Kezdőlap</b></button><button onclick="hhCloseActivity();if(window.show)show(\'health\')"><span>♡</span><b>HealthRadar</b></button><button class="on"><span>🏃</span><b>Activity</b></button><button onclick="hhCloseActivity();if(window.hhOpenInsights)hhOpenInsights()"><span>▥</span><b>Elemzések</b></button><button onclick="hhCloseActivity();if(window.show)show(\'home\')"><span>•••</span><b>Továbbiak</b></button></nav>';
}


function closeActModal(){var m=document.getElementById('hhActModal');if(m)m.classList.remove('on')}
window.hhActivityProfiles=function(){
 ensure();var m=document.getElementById('hhActModal'),cur=pkey();
 m.innerHTML='<div class="hhActSheet"><div class="hhActSheetHead"><div><small>HEALTHHUB PROFIL</small><h3>Ki aktivitását nézzük?</h3></div><button onclick="hhActivityCloseModal()">×</button></div>'+
 '<div class="hhActProfileChoices"><button class="'+(cur==='monika'?'on':'')+'" onclick="hhActivitySetProfile(\'m\')"><span>👩</span><b>Mónika</b></button><button class="'+(cur==='zsolt'?'on':'')+'" onclick="hhActivitySetProfile(\'z\')"><span>👨</span><b>Zsolt</b></button></div></div>';m.classList.add('on');
};
window.hhActivitySetProfile=function(p){
 if(typeof window.setProfile==='function')window.setProfile(p);else localStorage.setItem('hh-profile',p);
 closeActModal();setTimeout(render,80);
};
window.hhActivitySearch=function(){
 ensure();var m=document.getElementById('hhActModal'),c=window.hhActivityCache||{sessions:[]};
 m.innerHTML='<div class="hhActSheet"><div class="hhActSheetHead"><div><small>ACTIVITY SEARCH</small><h3>Edzések keresése</h3></div><button onclick="hhActivityCloseModal()">×</button></div><input id="hhActSearchInput" class="hhActSearchInput" type="search" placeholder="pl. futás, séta, jóga…" oninput="hhActivitySearchFilter(this.value)"><div id="hhActSearchResults" class="hhActSearchResults"></div></div>';m.classList.add('on');setTimeout(function(){var i=document.getElementById('hhActSearchInput');if(i)i.focus();window.hhActivitySearchFilter('')},20);
};
window.hhActivitySearchFilter=function(q){
 q=String(q||'').trim().toLocaleLowerCase('hu-HU');var c=window.hhActivityCache||{sessions:[]},r=c.sessions.filter(function(s){return typeLabel(s).toLocaleLowerCase('hu-HU').includes(q)}).slice(0,20),el=document.getElementById('hhActSearchResults');if(!el)return;
 el.innerHTML=r.length?r.map(function(s){var h=hrFor(s,c.heart||[]);return '<button onclick="hhActivityCloseModal()"><span>🏃</span><div><b>'+esc(typeLabel(s))+'</b><small>'+esc(fmtDate(s.startTime))+' · '+dur(mins(s.startTime,s.endTime))+(h?' · '+n(h.avg,0)+' bpm':'')+'</small></div></button>'}).join(''):'<div class="hhActModalEmpty">Nincs találat.</div>';
};
window.hhActivityCalendar=function(){
 ensure();var m=document.getElementById('hhActModal'),d=new Date().toISOString().slice(0,10);
 m.innerHTML='<div class="hhActSheet"><div class="hhActSheetHead"><div><small>ACTIVITY CALENDAR</small><h3>Napi aktivitás</h3></div><button onclick="hhActivityCloseModal()">×</button></div><input id="hhActDate" class="hhActDate" type="date" value="'+d+'" onchange="hhActivityCalendarDay(this.value)"><div id="hhActCalendarBody"></div></div>';m.classList.add('on');setTimeout(function(){window.hhActivityCalendarDay(d)},0);
};
window.hhActivityCalendarDay=function(date){
 var c=window.hhActivityCache||{sessions:[],daily:[],heart:[]},day=c.daily.find(function(x){return x.date===date}),ss=c.sessions.filter(function(s){return dayKey(s.startTime)===date}),el=document.getElementById('hhActCalendarBody');if(!el)return;
 var total=ss.reduce(function(a,s){return a+mins(s.startTime,s.endTime)},0);
 el.innerHTML='<div class="hhActCalendarStats"><div><small>LÉPÉSEK</small><b>'+(day?n(day.steps,0):'—')+'</b></div><div><small>KALÓRIA</small><b>'+(day?n(day.caloriesKcal,0):'—')+'</b></div><div><small>TÁVOLSÁG</small><b>'+(day?n((Number(day.distanceMeters)||0)/1000,1):'—')+' km</b></div><div><small>EDZÉSIDŐ</small><b>'+dur(total)+'</b></div></div><div class="hhActCalendarList">'+(ss.length?ss.map(function(s){var h=hrFor(s,c.heart||[]);return '<div><span>🏃</span><div><b>'+esc(typeLabel(s))+'</b><small>'+esc(fmtDate(s.startTime))+' · '+dur(mins(s.startTime,s.endTime))+(h?' · '+n(h.avg,0)+' bpm':'')+'</small></div></div>'}).join(''):'<p>Ezen a napon nincs rögzített edzés.</p>')+'</div>';
};
window.hhActivityCloseModal=closeActModal;

async function render(){
 var p=document.getElementById('hhActivityPage');if(!p)return;
 p.innerHTML=hero()+'<div class="hhActBody"><div class="hhActLoading"><i></i><div><b>Aktivitásadatok betöltése…</b><small>Health Connect · '+esc(pname())+'</small></div></div></div>'+nav();

 var c=collect(await load());window.hhActivityCache=c;var days=periodDays(),cut=Date.now()-days*86400000,today=dayKey(Date.now());
 var sessions=c.sessions.filter(function(s){return Date.parse(s.endTime||0)>=cut});
 var daily=c.daily.filter(function(x){return Date.parse(x.date+'T23:59:59')>=cut});
 var latestDay=c.daily.find(function(x){return x.date===today})||c.daily[c.daily.length-1]||null;
 var todays=c.sessions.filter(function(s){return dayKey(s.startTime)===today});
 var active=todays.reduce(function(a,s){return a+mins(s.startTime,s.endTime)},0);
 var latestSession=c.sessions[0]||null,latestHr=latestSession?hrFor(latestSession,c.heart):null,totalMin=sessions.reduce(function(a,s){return a+mins(s.startTime,s.endTime)},0);
 var typeMap={};sessions.forEach(function(s){var k=typeLabel(s);typeMap[k]=(typeMap[k]||0)+1});
 var types=Object.entries(typeMap).sort(function(a,b){return b[1]-a[1]}).slice(0,5),icons=['🚶','🏃','🚴','🏋️','🧘'];
 var recent=c.sessions.slice(0,3);

 p.innerHTML=hero()+'<div class="hhActBody">'+
  '<div class="hhActTopGrid">'+
   metric('👣','Lépések',latestDay?n(latestDay.steps,0):'—','lépés','pink')+
   metric('🔥','Elégetett kalória',latestDay?n(latestDay.caloriesKcal,0):'—','kcal','orange')+
   metric('⏱️','Aktív idő',dur(active),'','green')+
   metric('📍','Távolság',latestDay?n((Number(latestDay.distanceMeters)||0)/1000,1):'—','km','violet')+
  '</div>'+
  '<div class="hhActSmallGrid">'+
   metric('💗','Átlag pulzus',latestHr?n(latestHr.avg,0):'—','bpm','pink')+
   metric('💓','Max. pulzus',latestHr?n(latestHr.max,0):'—','bpm','pink')+
   metric('🏃','Edzések',String(sessions.length),'db','orange')+
   metric('⌛','Edzésidő',dur(totalMin),'','violet')+
  '</div>'+
  '<section class="hhActChartCard"><div class="hhActTitle"><span>📊</span><b>Aktivitás a nap folyamán</b><div class="leg"><i class="b"></i>Lépések <i class="o"></i>Aktív kalória <i class="p"></i>Pulzus</div></div><div class="hhActChart">'+chart(daily.slice(-Math.min(days,30)),c.heart)+'</div></section>'+
  '<section class="hhActTypesCard"><div class="hhActTitle"><span>🏃</span><b>Aktivitás típusok</b><strong>Összes ›</strong></div><div class="hhActTypes">'+
   (types.length?types.map(function(x,i){return '<div class="'+(i===0?'on':'')+'"><span>'+icons[i%icons.length]+'</span><b>'+esc(x[0])+'</b><small>'+x[1]+' alkalom</small></div>'}).join(''):'<div class="hhActNo">Nincs adat.</div>')+
  '</div></section>'+
  '<section class="hhActRecentCard"><div class="hhActTitle"><span>🕘</span><b>Legutóbbi edzések</b><strong>Összes ›</strong></div><div class="hhActRecent">'+
   (recent.length?recent.map(function(s,i){var h=hrFor(s,c.heart);return '<div class="row"><span class="rI">'+icons[(i+1)%icons.length]+'</span><div class="rT"><b>'+esc(typeLabel(s))+'</b><small>'+esc(fmtDate(s.startTime))+'</small></div><div class="rS"><span>📍 — km</span><span>⏱ '+dur(mins(s.startTime,s.endTime))+'</span><span>🔥 — kcal</span>'+(h?'<span>💗 '+n(h.avg,0)+' bpm</span>':'')+'</div><strong>›</strong></div>'}).join(''):'<div class="hhActNo">Nincs rögzített edzés.</div>')+
  '</div></section>'+
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
 if(document.getElementById('hh-v188-style'))return;
 var s=document.createElement('style');s.id='hh-v188-style';s.textContent=
 '.hhActivityPage{display:none;position:fixed;top:0;bottom:0;left:50%;transform:translateX(-50%);z-index:5200;width:100%;max-width:419px;overflow-y:auto;overflow-x:hidden;background:#f4fbff;box-sizing:border-box}.hhActivityPage.on{display:block}'+
 '.hhActHero{position:relative;width:100%;height:auto;aspect-ratio:419/198;overflow:hidden;background:#dceef8}.hhActHero>img{display:block;width:100%;height:100%;object-fit:cover;object-position:center center;image-rendering:auto}.hhActControls{position:absolute;right:5px;top:5px;z-index:7;display:flex;gap:4px;padding:3px;border-radius:12px;background:rgba(242,249,255,.93);backdrop-filter:blur(5px);box-shadow:0 3px 12px rgba(17,52,78,.12)}.hhActControls button{width:30px;height:30px;border:0;border-radius:9px;background:#fff;color:#103a60;display:grid;place-items:center;padding:0;box-shadow:0 1px 5px rgba(18,56,83,.08)}.hhActControls .avatar{border-radius:50%;overflow:hidden}.hhActControls .avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block}.hhActControls .avatar b{font-size:12px}.hhActControls .searchIcon{font-size:23px;line-height:1;transform:rotate(-12deg)}.hhActControls .calendarIcon{font-size:20px;line-height:1}.hhActHero .hit{position:absolute;bottom:0;height:34px;width:52px;border:0;background:transparent}.hhActHero .t0{left:8px}.hhActHero .t1{left:60px}.hhActHero .t2{left:112px}.hhActHero .t3{left:164px}'+
 '.hhActBody{padding:3px 4px 48px;background:#f4fbff;box-sizing:border-box;width:100%;overflow:hidden}'+
 '.hhActTopGrid,.hhActSmallGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;width:100%;box-sizing:border-box}.hhActTopGrid{margin-bottom:4px}.hhActSmallGrid{margin-bottom:4px}'+
 '.hhActMetric{background:#fff;border:1px solid #e4edf3;border-radius:11px;min-width:0;box-sizing:border-box;position:relative;overflow:hidden;padding:7px 6px 6px}.hhActTopGrid .hhActMetric{height:84px}.hhActSmallGrid .hhActMetric{height:48px;padding:5px 6px}.hhActMetric:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:#ff74a9}.hhActMetric.orange:after{background:#ff9b28}.hhActMetric.green:after{background:#26c98b}.hhActMetric.violet:after{background:#7d4cff}.hhActMetric .ico{display:block;font-size:20px;line-height:1}.hhActSmallGrid .ico{font-size:16px;float:left;margin-right:5px}.hhActMetric small{display:block;font-size:5.9px;line-height:1.15;color:#5f7488;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhActSmallGrid small{font-size:5.6px;margin-top:0}.hhActMetric div{white-space:nowrap}.hhActMetric b{font-size:17px;line-height:1;color:#113b60;letter-spacing:-.02em}.hhActMetric em{font-style:normal;font-size:6px;color:#7d8f9f;margin-left:2px}.hhActSmallGrid b{font-size:13px}.hhActSmallGrid em{font-size:5.8px}'+
 '.hhActChartCard,.hhActTypesCard,.hhActRecentCard{background:#fff;border:1px solid #e8eef3;border-radius:11px;box-sizing:border-box;width:100%;overflow:hidden}.hhActChartCard{height:111px;padding:6px 7px 4px;margin-bottom:4px}.hhActTypesCard{height:86px;padding:6px 7px;margin-bottom:4px}.hhActRecentCard{height:95px;padding:6px 7px}'+
 '.hhActTitle{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:5px;min-width:0}.hhActTitle>span{font-size:13px}.hhActTitle>b{font-size:9px;color:#123a5e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhActTitle>strong{font-size:6px;color:#2a9cf4;font-weight:700}.hhActTitle .leg{font-size:4.9px;color:#6f8394;display:flex;align-items:center;white-space:nowrap}.hhActTitle .leg i{width:5px;height:5px;border-radius:50%;display:inline-block;margin:0 2px 0 5px}.hhActTitle .leg .b{background:#23a7f6}.hhActTitle .leg .o{background:#ff9418}.hhActTitle .leg .p{background:#ff2f7f}'+
 '.hhActChart{height:84px;margin-top:1px}.hhActChart svg{display:block;width:100%;height:100%}'+
 '.hhActTypes{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin-top:5px}.hhActTypes>div{height:59px;background:linear-gradient(180deg,#fff,#f7fafc);border:1px solid #edf1f4;border-radius:9px;text-align:center;padding:4px 2px;box-sizing:border-box;min-width:0}.hhActTypes>div.on{border-color:#ff4f8d;background:#fff8fb}.hhActTypes span{display:block;font-size:17px;line-height:1}.hhActTypes b{display:block;font-size:6px;color:#163d60;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhActTypes small{display:block;font-size:5.2px;color:#748899;margin-top:1px}'+
 '.hhActRecent{margin-top:3px}.hhActRecent .row{display:grid;grid-template-columns:24px minmax(0,1fr) auto 8px;gap:4px;align-items:center;height:24px;border-top:1px solid #eef2f5}.hhActRecent .row:first-child{border-top:0}.hhActRecent .rI{width:22px;height:22px;border-radius:50%;background:#eefaf3;display:grid;place-items:center;font-size:12px}.hhActRecent .rT{min-width:0}.hhActRecent .rT b{display:block;font-size:5.9px;color:#173f62;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhActRecent .rT small{display:block;font-size:4.8px;color:#7b8d9c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hhActRecent .rS{display:flex;gap:4px;white-space:nowrap}.hhActRecent .rS span{font-size:4.7px;color:#61778a}.hhActRecent .row>strong{font-size:10px;color:#607a8f}.hhActNo{display:grid;place-items:center;height:100%;font-size:6px;color:#8495a2}'+
 '.hhActLoading{display:flex;align-items:center;gap:8px;background:#fff;border-radius:10px;padding:12px}.hhActLoading i{width:20px;height:20px;border:3px solid #e6edf2;border-top-color:#ff2f7f;border-radius:50%;animation:hhActSpin .8s linear infinite}.hhActLoading b{display:block;font-size:8px;color:#173f62}.hhActLoading small{font-size:6px;color:#8192a0}'+
 '.hhActNav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:7300;width:100%;max-width:419px;height:42px;background:rgba(255,255,255,.98);display:grid;grid-template-columns:repeat(5,1fr);box-shadow:0 -3px 10px rgba(28,66,92,.07)}.hhActNav button{border:0;background:transparent;color:#6f8597;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0}.hhActNav button span{font-size:15px;line-height:1}.hhActNav button b{font-size:5.7px}.hhActNav button.on{color:#ff2f7f}'+
 '.hhActModal{display:none;position:fixed;inset:0;z-index:9800;background:rgba(17,41,60,.35);backdrop-filter:blur(6px);align-items:flex-end;justify-content:center}.hhActModal.on{display:flex}.hhActSheet{width:min(100%,419px);max-height:78vh;overflow:auto;background:linear-gradient(180deg,#fff,#f6fbff);border-radius:22px 22px 0 0;padding:13px 12px 22px;box-sizing:border-box}.hhActSheetHead{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.hhActSheetHead small{font-size:6px;color:#ff2f7f;font-weight:900;letter-spacing:.1em}.hhActSheetHead h3{font-size:15px;color:#153b5e;margin:2px 0 10px}.hhActSheetHead button{width:32px;height:32px;border:0;border-radius:50%;background:#f3f7fa;color:#547087;font-size:18px}.hhActProfileChoices{display:grid;grid-template-columns:1fr 1fr;gap:8px}.hhActProfileChoices button{border:1px solid #e2eaf0;border-radius:15px;background:#fff;padding:13px;color:#173f62}.hhActProfileChoices button.on{border-color:#ff4f8d;background:#fff6fa}.hhActProfileChoices span{display:block;font-size:27px}.hhActProfileChoices b{font-size:10px}.hhActSearchInput,.hhActDate{width:100%;box-sizing:border-box;border:1px solid #dce6ed;border-radius:12px;background:#fff;padding:10px;font-size:16px;color:#173f62}.hhActSearchResults{margin-top:8px}.hhActSearchResults button,.hhActCalendarList>div{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr);gap:8px;align-items:center;text-align:left;border:0;border-top:1px solid #edf2f5;background:transparent;padding:9px 2px;color:#173f62}.hhActSearchResults button:first-child{border-top:0}.hhActSearchResults span,.hhActCalendarList>div>span{width:32px;height:32px;border-radius:10px;background:#eef8ff;display:grid;place-items:center;font-size:16px}.hhActSearchResults b,.hhActCalendarList b{display:block;font-size:9px}.hhActSearchResults small,.hhActCalendarList small{display:block;font-size:7px;color:#74899a;margin-top:2px}.hhActModalEmpty,.hhActCalendarList p{font-size:8px;color:#7b8e9e;padding:14px 3px}.hhActCalendarStats{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:9px}.hhActCalendarStats>div{background:#fff;border:1px solid #e6edf2;border-radius:12px;padding:9px}.hhActCalendarStats small{display:block;font-size:6px;color:#718699}.hhActCalendarStats b{display:block;font-size:14px;color:#173f62;margin-top:2px}@keyframes hhActSpin{to{transform:rotate(360deg)}}'+
 '@media(max-width:360px){.hhActBody{padding-left:3px;padding-right:3px}.hhActTopGrid,.hhActSmallGrid{gap:3px}.hhActMetric{padding-left:4px;padding-right:4px}.hhActRecent .rS span:nth-child(1),.hhActRecent .rS span:nth-child(3){display:none}}';
 document.head.appendChild(s);
}
style();ensure();wire();setInterval(function(){var p=document.getElementById('hhActivityPage');if(p&&p.classList.contains('on'))wire()},5000);
document.documentElement.dataset.healthhubActivity='1.88';
})();