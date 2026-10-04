(function(){
'use strict';

/* HealthHub v1.225 — Sleep dashboard from Health Connect sleepSessions.
   Cloud-first, local IndexedDB fallback, no invented sleep score. */

var DB='healthhub-connect-v1';
var PAGE_ID='hhSleepPage225';
var styleId='hh-v225-sleep-style';
var state={days:7,busy:false};

function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function accent(){return pkey()==='monika'?'#ef3f89':'#178ed8'}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function req(r){return new Promise(function(ok,no){r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function openDb(){return new Promise(function(ok,no){var r=indexedDB.open(DB,2);r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}})}
function mins(a,b){var x=(Date.parse(b)-Date.parse(a))/60000;return Number.isFinite(x)&&x>0?x:0}
function dur(m){m=Math.max(0,Math.round(Number(m)||0));var h=Math.floor(m/60),x=m%60;return h+'h '+String(x).padStart(2,'0')+'m'}
function shortDur(m){m=Math.max(0,Math.round(Number(m)||0));var h=Math.floor(m/60),x=m%60;return h+':'+String(x).padStart(2,'0')}
function time(v){var d=new Date(v);return isNaN(d)?'—':d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'})}
function dayLabel(v){var d=new Date(v);return isNaN(d)?'—':d.toLocaleDateString('hu-HU',{month:'short',day:'numeric'})}
function fullDay(v){var d=new Date(v);return isNaN(d)?'—':d.toLocaleDateString('hu-HU',{month:'long',day:'numeric',weekday:'short'})}
function avg(a){return a.length?a.reduce(function(x,y){return x+y},0)/a.length:0}

var STAGES={
  0:{k:'unknown',label:'Ismeretlen',color:'#a9b7c5'},
  1:{k:'awake',label:'Ébren',color:'#ffbe45'},
  2:{k:'sleep',label:'Alvás',color:'#8f7bf6'},
  3:{k:'awake',label:'Ágyon kívül',color:'#ff8f66'},
  4:{k:'awake',label:'Ébren az ágyban',color:'#ffc96d'},
  5:{k:'light',label:'Könnyű',color:'#58b6f7'},
  6:{k:'deep',label:'Mély',color:'#4057c9'},
  7:{k:'rem',label:'REM',color:'#a568e8'}
};
function stageInfo(x){
  var n=Number(x);
  return STAGES[n]||STAGES[0];
}
function sleepStage(k){return k==='sleep'||k==='light'||k==='deep'||k==='rem'}

async function localImports(){
  try{
    var db=await openDb();
    try{
      if(!db.objectStoreNames.contains('imports'))return [];
      var all=await req(db.transaction('imports','readonly').objectStore('imports').getAll())||[];
      return all.filter(function(x){return x&&x.profile===pkey()&&x.bundle});
    }finally{db.close()}
  }catch(e){return []}
}
async function cloudImport(){
  try{
    var v=window.HH_DROPBOX_VAULT,p=pkey();
    if(!v||!v.connected||!v.connected()||typeof v.downloadJson!=='function')return null;
    var raw=null,path='/HealthHub/profiles/'+p+'-health-connect.json';
    try{raw=await v.downloadJson(path)}catch(e){
      if(e&&e.status!==409)throw e;
      raw=await v.downloadJson('/incoming-'+p+'.json');
      path='/incoming-'+p+'.json';
    }
    if(!raw||String(raw.profile||'').toLowerCase()!==p)return null;
    localStorage.setItem('hh-sleep-cloud-last-'+p,new Date().toISOString());
    return {id:'cloud-'+p,profile:p,importedAt:raw.exportedAt||new Date().toISOString(),bundle:raw,_cloud:true,fileName:path};
  }catch(e){
    console.warn('Sleep Cloud read failed',e);
    return null;
  }
}
async function loadSessions(){
  var imps=await localImports(),cloud=await cloudImport();
  if(cloud)imps.unshift(cloud);
  imps.sort(function(a,b){return Date.parse(b.importedAt||0)-Date.parse(a.importedAt||0)});
  var map=new Map();
  imps.forEach(function(imp){
    var a=imp.bundle&&imp.bundle.records&&imp.bundle.records.sleepSessions;
    if(!Array.isArray(a))return;
    a.forEach(function(s){
      if(!s||!s.startTime||!s.endTime)return;
      var id=String(s.id||s.startTime+'|'+s.endTime);
      if(!map.has(id))map.set(id,s);
    });
  });
  return Array.from(map.values()).sort(function(a,b){return Date.parse(b.endTime)-Date.parse(a.endTime)});
}

function model(s){
  var total=mins(s.startTime,s.endTime),st=Array.isArray(s.stages)?s.stages:[];
  var buckets={awake:0,light:0,deep:0,rem:0,sleep:0,unknown:0},segments=[];
  st.slice().sort(function(a,b){return Date.parse(a.startTime)-Date.parse(b.startTime)}).forEach(function(x){
    var m=mins(x.startTime,x.endTime);if(!m)return;
    var inf=stageInfo(x.stage);
    buckets[inf.k]=(buckets[inf.k]||0)+m;
    segments.push({m:m,k:inf.k,label:inf.label,color:inf.color,start:x.startTime,end:x.endTime});
  });
  var knownSleep=buckets.light+buckets.deep+buckets.rem+buckets.sleep;
  var sleepMin=knownSleep>0?knownSleep:total;
  if(!segments.length)segments=[{m:total,k:'sleep',label:'Alvás',color:'#8f7bf6',start:s.startTime,end:s.endTime}];
  return {raw:s,total:total,sleep:sleepMin,buckets:buckets,segments:segments};
}
function recentWithin(ms,days){
  var cut=Date.now()-days*86400000;
  return ms.filter(function(x){return Date.parse(x.raw.endTime)>=cut});
}
function stagePct(m,key){
  var denom=m.buckets.awake+m.buckets.light+m.buckets.deep+m.buckets.rem+m.buckets.sleep+m.buckets.unknown;
  return denom>0?Math.round((m.buckets[key]||0)/denom*100):0;
}
function stageTimeline(m){
  var total=m.segments.reduce(function(a,x){return a+x.m},0)||1;
  return '<div class="s225StageLine">'+m.segments.map(function(x){
    var w=Math.max(1,x.m/total*100);
    return '<span title="'+esc(x.label)+' · '+dur(x.m)+'" style="width:'+w.toFixed(2)+'%;background:'+x.color+'"></span>';
  }).join('')+'</div>';
}
function donut(m){
  var parts=[
    {k:'awake',label:'Ébren',v:m.buckets.awake,color:'#ffbe45'},
    {k:'light',label:'Könnyű',v:m.buckets.light,color:'#58b6f7'},
    {k:'deep',label:'Mély',v:m.buckets.deep,color:'#4057c9'},
    {k:'rem',label:'REM',v:m.buckets.rem,color:'#a568e8'},
    {k:'sleep',label:'Alvás',v:m.buckets.sleep,color:'#8f7bf6'}
  ].filter(function(x){return x.v>0});
  var total=parts.reduce(function(a,x){return a+x.v},0)||1,at=0,stops=[];
  parts.forEach(function(x){var a=at/total*360;at+=x.v;var b=at/total*360;stops.push(x.color+' '+a.toFixed(1)+'deg '+b.toFixed(1)+'deg')});
  if(!stops.length)stops=['#dce7ef 0deg 360deg'];
  return '<div class="s225Donut" style="background:conic-gradient('+stops.join(',')+')"><div><b>'+dur(m.sleep)+'</b><small>alvás</small></div></div>'+
    '<div class="s225Legend">'+parts.map(function(x){return '<span><i style="background:'+x.color+'"></i><b>'+esc(x.label)+'</b><em>'+Math.round(x.v)+'p</em></span>'}).join('')+'</div>';
}
function weekChart(rows){
  var r=rows.slice(0,7).reverse();
  if(!r.length)return '<div class="s225Empty">Még nincs heti alvásadat.</div>';
  var max=Math.max.apply(null,r.map(function(x){return x.sleep}).concat([480]));
  return '<div class="s225Week">'+r.map(function(x){
    var h=Math.max(6,Math.min(100,x.sleep/max*100));
    return '<div class="s225Bar"><b>'+shortDur(x.sleep)+'</b><div><i style="height:'+h.toFixed(1)+'%"></i></div><small>'+dayLabel(x.raw.endTime)+'</small></div>';
  }).join('')+'</div>';
}
function nightRows(rows){
  return rows.slice(0,6).map(function(x){
    var deep=Math.round(x.buckets.deep),rem=Math.round(x.buckets.rem);
    return '<div class="s225Night"><div class="s225NightDate"><b>'+fullDay(x.raw.endTime)+'</b><small>'+time(x.raw.startTime)+' → '+time(x.raw.endTime)+'</small></div><strong>'+dur(x.sleep)+'</strong><div class="s225NightMeta">'+
      (deep?'<span>Mély '+deep+'p</span>':'')+(rem?'<span>REM '+rem+'p</span>':'')+
      '<span>'+esc((x.raw.sourcePackage||'Health Connect').replace(/^com\./,''))+'</span></div></div>';
  }).join('');
}
function emptyHtml(){
  return '<div class="s225EmptyCard"><div class="s225Moon">☾</div><b>Még nincs SleepSession adat</b><p>A HealthHub Connect már tudja olvasni az alvást a Health Connectből. Telefonon futtasd a <strong>SYNC NOW</strong>-t, majd frissítsd a HealthHubot.</p></div>';
}
function header(latest,week){
  var av=week.length?avg(week.map(function(x){return x.sleep})):0;
  return '<div class="s225Hero">'+
    '<div class="s225HeroGlow"></div>'+
    '<button class="s225Back" onclick="hh225CloseSleep()" aria-label="Vissza">‹</button>'+
    '<button class="s225Profile" onclick="hh225ToggleProfile()" aria-label="Profilváltás">'+esc(pname())+'</button>'+
    '<div class="s225HeroCopy"><span>Sleep</span><h1>'+(latest?dur(latest.sleep):'—')+'</h1><p>'+(latest?time(latest.raw.startTime)+' → '+time(latest.raw.endTime):'Nincs adat')+'</p></div>'+
    '<div class="s225MoonArt"><i></i><b>☾</b><span>✦</span><em>✦</em></div>'+
    '<div class="s225HeroStats"><div><b>'+(av?dur(av):'—')+'</b><small>7 nap átlag</small></div><div><b>'+week.length+'</b><small>éjszaka</small></div><div><b>'+(latest?Math.round(latest.buckets.awake):'—')+'</b><small>ébren perc</small></div></div>'+
  '</div>';
}
function body(rows){
  if(!rows.length)return '<div class="s225Body">'+emptyHtml()+'</div>';
  var latest=rows[0],week=recentWithin(rows,7);
  return '<div class="s225Body">'+
    '<div class="s225Title"><div><b>Legutóbbi éjszaka</b><small>'+fullDay(latest.raw.endTime)+'</small></div><span>Health Connect</span></div>'+
    '<div class="s225Card s225Stage">'+stageTimeline(latest)+'<div class="s225StageFoot"><span>Elalvás <b>'+time(latest.raw.startTime)+'</b></span><span>Ébredés <b>'+time(latest.raw.endTime)+'</b></span></div></div>'+
    '<div class="s225Two"><div class="s225Card">'+donut(latest)+'</div>'+
      '<div class="s225Card s225Facts"><div><small>Mély alvás</small><b>'+dur(latest.buckets.deep)+'</b><span>'+stagePct(latest,'deep')+'%</span></div><div><small>REM</small><b>'+dur(latest.buckets.rem)+'</b><span>'+stagePct(latest,'rem')+'%</span></div><div><small>Könnyű</small><b>'+dur(latest.buckets.light)+'</b><span>'+stagePct(latest,'light')+'%</span></div></div></div>'+
    '<div class="s225Title"><div><b>7 napos alvás</b><small>éjszakánkénti időtartam</small></div><span>'+ (week.length?('átlag '+dur(avg(week.map(function(x){return x.sleep})))):'—') +'</span></div>'+
    '<div class="s225Card">'+weekChart(week)+'</div>'+
    '<div class="s225Title"><div><b>Korábbi éjszakák</b><small>részletes Health Connect adatok</small></div></div>'+
    '<div class="s225Card s225NightList">'+nightRows(rows)+'</div>'+
  '</div>';
}
function nav(){
 return '<nav class="s225Nav">'+
  '<button onclick="hh225CloseSleep()"><span>⌂</span><b>Kezdőlap</b></button>'+
  '<button onclick="hh225GoHealth()"><span>♡</span><b>HealthRadar</b></button>'+
  '<button class="on"><span>☾</span><b>Sleep</b></button>'+
  '<button onclick="hh225GoActivity()"><span>◒</span><b>Activity</b></button>'+
  '<button onclick="hh225GoMore()"><span>•••</span><b>Továbbiak</b></button>'+
 '</nav>';
}
async function render(){
  var page=document.getElementById(PAGE_ID);if(!page)return;
  page.style.setProperty('--sleepAccent',accent());
  page.innerHTML=header(null,[])+'<div class="s225Body"><div class="s225Loading">Alvásadatok betöltése…</div></div>'+nav();
  var sessions=await loadSessions(),models=sessions.map(model);
  var week=recentWithin(models,7),latest=models[0]||null;
  page.innerHTML=header(latest,week)+body(models)+nav();
}
function ensure(){
  if(document.getElementById(PAGE_ID))return;
  var app=document.querySelector('.app')||document.body;
  var p=document.createElement('section');p.id=PAGE_ID;p.className='page s225Page';
  app.appendChild(p);
}
function hideLegacyNav(on){
  document.documentElement.classList.toggle('hhSleep225Open',!!on);
}
window.hh225OpenSleep=function(){
  ensure();
  document.querySelectorAll('.page').forEach(function(x){x.classList.remove('on')});
  var p=document.getElementById(PAGE_ID);p.classList.add('on');
  hideLegacyNav(true);scrollTo(0,0);render();
};
window.hh225CloseSleep=function(){
  hideLegacyNav(false);
  var p=document.getElementById(PAGE_ID);if(p)p.classList.remove('on');
  if(typeof window.show==='function')window.show('home');
  else{var h=document.getElementById('home');if(h)h.classList.add('on')}
  scrollTo(0,0);
};
window.hh225ToggleProfile=function(){
  var next=pkey()==='monika'?'z':'m';
  if(typeof window.setProfile==='function')window.setProfile(next);
  else localStorage.setItem('hh-profile',next);
  setTimeout(render,40);
};
window.hh225GoHealth=function(){hideLegacyNav(false);if(typeof window.show==='function')window.show('health')};
window.hh225GoActivity=function(){
  hideLegacyNav(false);
  if(typeof window.hh191Open==='function')window.hh191Open();
  else{
    var b=Array.from(document.querySelectorAll('#home .homeModule')).find(function(x){return /Activity/i.test(x.textContent||'')});
    if(b)b.click();else if(typeof window.show==='function')window.show('home');
  }
};
window.hh225GoMore=function(){hideLegacyNav(false);if(typeof window.openHealthSection==='function')window.openHealthSection('more');else if(typeof window.show==='function')window.show('health')};

function wire(){
  var btn=Array.from(document.querySelectorAll('#home .homeModule')).find(function(x){
    var b=x.querySelector('b');return b&&b.textContent.trim()==='Sleep';
  });
  if(!btn)return;
  btn.setAttribute('onclick','hh225OpenSleep()');
  btn.onclick=function(e){if(e){e.preventDefault();e.stopPropagation()}window.hh225OpenSleep();return false};
}
function style(){
 if(document.getElementById(styleId))return;
 var s=document.createElement('style');s.id=styleId;s.textContent=
 '.hhSleep225Open #navHomeBar,.hhSleep225Open #navHealthBar,.hhSleep225Open #navTimelineBar,.hhSleep225Open #navDetailBar{display:none!important}'+
 '.s225Page{min-height:100vh;background:linear-gradient(180deg,#eef6ff,#f8f5ff 42%,#f7fbfe);padding-bottom:70px;color:#153650}'+
 '.s225Hero{height:250px;position:relative;overflow:hidden;background:linear-gradient(145deg,#dff3ff 0%,#e7e2ff 46%,#f8eaff 100%);color:#173b5a}'+
 '.s225Hero:after{content:"";position:absolute;inset:auto -50px -75px -50px;height:130px;background:rgba(255,255,255,.68);border-radius:50% 50% 0 0/45% 45% 0 0}'+
 '.s225HeroGlow{position:absolute;width:250px;height:250px;border-radius:50%;right:-70px;top:-90px;background:rgba(255,255,255,.55);filter:blur(2px)}'+
 '.s225Back{position:absolute;left:12px;top:16px;width:38px;height:38px;border:0;border-radius:14px;background:rgba(255,255,255,.72);color:#315672;font-size:28px;z-index:5}'+
 '.s225Profile{position:absolute;right:12px;top:16px;border:0;border-radius:999px;background:rgba(255,255,255,.78);padding:10px 14px;color:var(--sleepAccent);font-size:11px;font-weight:900;z-index:5}'+
 '.s225HeroCopy{position:absolute;left:22px;top:68px;z-index:3}.s225HeroCopy>span{font-size:14px;font-weight:900;color:#617b99;letter-spacing:.04em}.s225HeroCopy h1{font-size:39px;line-height:1;margin:5px 0 7px;color:#173b5a}.s225HeroCopy p{margin:0;font-size:13px;font-weight:800;color:#647d95}'+
 '.s225MoonArt{position:absolute;right:28px;top:68px;width:125px;height:112px;z-index:2}.s225MoonArt b{position:absolute;right:14px;top:0;font-size:86px;line-height:1;color:#fff;text-shadow:0 12px 30px rgba(68,87,165,.18)}.s225MoonArt span,.s225MoonArt em{position:absolute;color:#fff;font-style:normal;font-size:20px}.s225MoonArt span{left:4px;top:14px}.s225MoonArt em{left:22px;bottom:8px;font-size:12px}'+
 '.s225HeroStats{position:absolute;left:18px;right:18px;bottom:11px;z-index:4;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.s225HeroStats div{background:rgba(255,255,255,.84);border:1px solid rgba(255,255,255,.95);border-radius:15px;padding:9px 10px}.s225HeroStats b{display:block;font-size:15px;color:#173b5a}.s225HeroStats small{display:block;font-size:7.4px;color:#7790a4;margin-top:2px}'+
 '.s225Body{padding:12px 11px 20px}.s225Title{display:flex;align-items:end;justify-content:space-between;padding:6px 3px 7px}.s225Title b{display:block;font-size:13px}.s225Title small{display:block;font-size:8px;color:#8094a4;margin-top:2px}.s225Title>span{font-size:8px;font-weight:900;color:var(--sleepAccent)}'+
 '.s225Card{background:#fff;border:1px solid #e4edf4;border-radius:18px;padding:12px;box-shadow:0 7px 20px rgba(41,76,104,.055);min-width:0}.s225Stage{padding:13px}.s225StageLine{display:flex;height:28px;border-radius:10px;overflow:hidden;background:#edf2f6;gap:1px}.s225StageLine span{height:100%;display:block}.s225StageFoot{display:flex;justify-content:space-between;margin-top:8px;font-size:8px;color:#7a8f9e}.s225StageFoot b{color:#284b66;margin-left:3px}'+
 '.s225Two{display:grid;grid-template-columns:1.15fr .85fr;gap:8px;margin-top:8px}.s225Donut{width:116px;height:116px;border-radius:50%;margin:2px auto 10px;display:grid;place-items:center}.s225Donut>div{width:72px;height:72px;border-radius:50%;background:#fff;display:grid;place-items:center;align-content:center;text-align:center}.s225Donut b{font-size:13px}.s225Donut small{font-size:7px;color:#8094a4}.s225Legend{display:grid;grid-template-columns:1fr 1fr;gap:5px}.s225Legend span{display:grid;grid-template-columns:8px 1fr auto;align-items:center;gap:4px;font-size:7px}.s225Legend i{width:7px;height:7px;border-radius:50%}.s225Legend b{font-size:7px}.s225Legend em{font-style:normal;color:#8295a4}'+
 '.s225Facts{display:grid;gap:7px;align-content:center}.s225Facts div{background:#f5f9fc;border-radius:12px;padding:9px}.s225Facts small{display:block;font-size:7px;color:#8194a3}.s225Facts b{display:block;font-size:13px;margin-top:2px}.s225Facts span{font-size:7px;color:var(--sleepAccent);font-weight:900}'+
 '.s225Week{height:152px;display:flex;align-items:flex-end;gap:7px;padding:10px 2px 0}.s225Bar{flex:1;height:100%;display:grid;grid-template-rows:18px 1fr 20px;align-items:end;text-align:center;min-width:0}.s225Bar>b{font-size:7px;color:#516e84}.s225Bar>div{height:100%;display:flex;align-items:flex-end;justify-content:center;background:linear-gradient(180deg,#f8fbfd,#f0f4fb);border-radius:8px;overflow:hidden}.s225Bar i{display:block;width:70%;min-height:5px;border-radius:7px 7px 3px 3px;background:linear-gradient(180deg,#a66bea,#5868de)}.s225Bar small{font-size:6.5px;color:#8092a1;padding-top:4px;white-space:nowrap}'+
 '.s225NightList{padding:0 11px}.s225Night{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:11px 2px;border-bottom:1px solid #edf2f5}.s225Night:last-child{border-bottom:0}.s225NightDate b{font-size:9px;display:block}.s225NightDate small{font-size:7.5px;color:#8093a3}.s225Night>strong{font-size:12px;color:#213f5a}.s225NightMeta{grid-column:1/-1;display:flex;gap:5px;flex-wrap:wrap}.s225NightMeta span{font-size:6.7px;background:#f2f6fa;border-radius:999px;padding:4px 6px;color:#627c91}'+
 '.s225EmptyCard{background:#fff;border:1px solid #e3edf4;border-radius:20px;padding:30px 20px;text-align:center;box-shadow:0 8px 22px rgba(39,74,102,.06)}.s225EmptyCard .s225Moon{font-size:56px;color:#7c6ae7}.s225EmptyCard b{display:block;font-size:15px;margin-top:4px}.s225EmptyCard p{font-size:9px;line-height:1.55;color:#678095}.s225Loading,.s225Empty{text-align:center;padding:28px 12px;color:#70889b;font-size:9px}'+
 '.s225Nav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(100vw,420px);height:60px;background:rgba(255,255,255,.98);border-top:1px solid #dfe8ee;display:grid;grid-template-columns:repeat(5,1fr);z-index:80}.s225Nav button{border:0;background:transparent;color:#6d8395;display:grid;place-items:center;align-content:center;gap:2px}.s225Nav span{font-size:20px;line-height:1}.s225Nav b{font-size:7px}.s225Nav .on{color:var(--sleepAccent)}'+
 '@media(max-width:380px){.s225Hero{height:240px}.s225HeroCopy h1{font-size:34px}.s225Two{grid-template-columns:1fr}.s225Donut{width:105px;height:105px}.s225Facts{grid-template-columns:repeat(3,1fr)}.s225Facts div{padding:7px}.s225Night>strong{font-size:11px}}';
 document.head.appendChild(s);
}

style();ensure();wire();
var obs=new MutationObserver(function(){wire()});obs.observe(document.body,{childList:true,subtree:true});
window.addEventListener('focus',function(){setTimeout(wire,100)});
document.documentElement.dataset.healthhubSleep='1.225';
window.HH_LIVE_BUILD='v1.225-sleep-health-connect';
})();