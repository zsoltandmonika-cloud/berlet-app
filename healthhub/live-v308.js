(function(){
'use strict';

/* HealthHub v308 — HH-ENV-001 Environmental Health V1
   Normalized, source-dated environmental context for HealthRadar.
   Foundation only: no diagnosis and no symptom-causality claims. */

var BUILD='1.308.1';
var CARD='hhEnvCard308';
var STYLE='hh-env-v308-style';
var LOCAL='hh-environment-v1';
var HISTORY='hh-environment-history-v1';
var CACHE_MS=15*60*1000;
var DEFAULT_LOC={lat:47.50,lon:19.04,label:'Budapest'};
var lastLocation=null;
var refreshPromise=null;
var observer=null;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function n(v,d){var x=Number(v);return Number.isFinite(x)?(d==null?x:Number(x.toFixed(d))):null}
function fmt(v,d,suffix){return v==null?'—':Number(v).toFixed(d||0)+(suffix||'')}
function signed(v,d,suffix){if(v==null)return '—';var x=Number(v);return (x>0?'+':'')+x.toFixed(d||0)+(suffix||'')}
function now(){return new Date().toISOString()}
function loadLocal(){
 try{var x=JSON.parse(localStorage.getItem(LOCAL)||'null');return x&&x.schema==='healthhub.environment/1'?x:null}catch(e){return null}
}
function saveLocal(x){
 try{localStorage.setItem(LOCAL,JSON.stringify(x))}catch(e){}
 try{
  var h=JSON.parse(localStorage.getItem(HISTORY)||'[]');if(!Array.isArray(h))h=[];
  var key=(x.observedAt||x.fetchedAt||'')+'|'+(x.location&&x.location.lat)+'|'+(x.location&&x.location.lon);
  h=h.filter(function(y){return ((y.observedAt||y.fetchedAt||'')+'|'+(y.location&&y.location.lat)+'|'+(y.location&&y.location.lon))!==key});
  h.unshift(x);
  var cut=Date.now()-8*86400000;
  h=h.filter(function(y){return Date.parse(y.observedAt||y.fetchedAt||0)>=cut}).slice(0,336);
  localStorage.setItem(HISTORY,JSON.stringify(h));
 }catch(e){}
}
function cachedFresh(x){return !!(x&&x.airQuality&&x.pollen&&Date.now()-Date.parse(x.fetchedAt||0)<CACHE_MS)}

function ensureStyle(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '#'+CARD+'{margin-top:9px;position:relative;overflow:hidden;background:linear-gradient(145deg,#fff,color-mix(in srgb,var(--a) 4%,#fff));border:1px solid #e1ebf1;border-radius:18px;padding:12px}'+
 '#'+CARD+' .envHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:9px}'+
 '#'+CARD+' .envHead h3{margin:0;color:#173f62;font-size:13px}#'+CARD+' .envHead small{display:block;margin-top:2px;color:#8094a3;font-size:8.5px}'+
 '#'+CARD+' .envRefresh{width:34px;height:34px;border:1px solid #dce7ed;border-radius:50%;background:#fff;color:var(--a);font-size:17px;font-weight:900}#'+CARD+' .envRefresh.busy{animation:hhEnvSpin308 1s linear infinite}'+
 '@keyframes hhEnvSpin308{to{transform:rotate(360deg)}}'+
 '#'+CARD+' .envStatus{display:grid;grid-template-columns:10px 1fr;gap:7px;align-items:start;padding:9px 10px;border-radius:13px;background:#f6fafc;border:1px solid #e8eff3;margin-bottom:9px}'+
 '#'+CARD+' .envDot{width:9px;height:9px;border-radius:50%;margin-top:3px;background:#35a66f}#'+CARD+' .envStatus.watch .envDot{background:#e6a423}#'+CARD+' .envStatus.high .envDot{background:#dc4a5d}'+
 '#'+CARD+' .envStatus b{display:block;color:#214963;font-size:11px}#'+CARD+' .envStatus small{display:block;color:#718795;font-size:9px;line-height:1.35;margin-top:2px}'+
 '#'+CARD+' .envGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}#'+CARD+' .envCell{min-width:0;border:1px solid #e7eef2;border-radius:12px;background:#fff;padding:8px}'+
 '#'+CARD+' .envCell small{display:block;color:#8496a3;font-size:7.5px;font-weight:800;text-transform:uppercase;letter-spacing:.02em}#'+CARD+' .envCell b{display:block;color:#173f62;font-size:15px;margin-top:2px;white-space:nowrap}#'+CARD+' .envCell em{display:block;color:#728796;font-size:8px;font-style:normal;margin-top:2px;line-height:1.25}'+
 '#'+CARD+' .envPressure{margin-top:7px;border-radius:12px;background:color-mix(in srgb,var(--a) 5%,#fff);padding:8px 9px;color:#5f788a;font-size:8.5px;line-height:1.5}#'+CARD+' .envPressure b{color:#244d68}#'+CARD+' .envPressure span{white-space:nowrap;margin-right:7px}'+
 '#'+CARD+' .envFoot{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:8px;color:#8a9ba8;font-size:7.5px}#'+CARD+' .envFoot a{color:var(--a);text-decoration:none;font-weight:900}'+
 '#'+CARD+' .envError{padding:15px 8px;text-align:center;color:#728796;font-size:10px}'+
 '@media(max-width:370px){#'+CARD+' .envGrid{grid-template-columns:repeat(2,1fr)}}';
 document.head.appendChild(s);
}

function ensureCard(){
 ensureStyle();
 var health=document.getElementById('health');if(!health)return null;
 var old=document.getElementById(CARD);if(old)return old;
 var quick=health.querySelector('.quick');
 var card=document.createElement('div');card.id=CARD;card.className='card';
 card.innerHTML='<div class="envHead"><div><h3>🌦️ Környezeti egészség</h3><small>Environmental Health V1 · betöltés…</small></div><button class="envRefresh" type="button" aria-label="Környezeti adatok frissítése">↻</button></div><div class="envError">Környezeti adatok betöltése…</div>';
 if(quick&&quick.parentNode)quick.insertAdjacentElement('afterend',card);
 else{var surface=health.querySelector('.surface');if(surface)surface.prepend(card);else health.appendChild(card)}
 card.querySelector('.envRefresh').onclick=function(){refresh(true)};
 var cached=loadLocal();if(cached)render(cached);
 return card;
}

function uvLabel(v){
 if(v==null)return 'nincs adat';
 if(v<3)return 'alacsony';
 if(v<6)return 'közepes';
 if(v<8)return 'magas';
 if(v<11)return 'nagyon magas';
 return 'extrém';
}
function pressureLabel(d6,d12,d24){
 var m=Math.max(Math.abs(d6||0),Math.abs(d12||0),Math.abs(d24||0));
 if(m>=10)return 'gyors változás';
 if(m>=6)return 'észrevehető változás';
 return 'stabilabb';
}
function aqiLabel(v){
 if(v==null)return 'nincs adat';
 if(v<20)return 'jó';
 if(v<40)return 'megfelelő';
 if(v<60)return 'közepes';
 if(v<80)return 'rossz';
 if(v<100)return 'nagyon rossz';
 return 'extrém rossz';
}
function pollenSummary(p){
 var names={alder:'Éger',birch:'Nyír',grass:'Fűfélék',mugwort:'Üröm',olive:'Olajfa',ragweed:'Parlagfű'};
 var best=null;
 Object.keys(names).forEach(function(k){
  var v=p&&p[k];if(v==null||!Number.isFinite(Number(v)))return;
  v=Number(v);if(!best||v>best.value)best={key:k,name:names[k],value:v};
 });
 if(!best)return {available:false,name:'—',value:null,label:'nincs adat'};
 if(best.value<=0)return {available:true,name:'Nincs kimutatható',value:0,label:'0 grains/m³'};
 return {available:true,name:best.name,value:n(best.value,1),label:n(best.value,1)+' grains/m³'};
}
function assess(x){
 var flags=[],level=0,feel=x.current.apparentTemperature,uv=x.current.uvIndex,gust=x.current.windGust;
 var d6=Math.abs(x.pressureDelta.h6||0),d12=Math.abs(x.pressureDelta.h12||0),d24=Math.abs(x.pressureDelta.h24||0);
 function add(l,t){level=Math.max(level,l);flags.push({level:l,text:t})}
 if(feel!=null){
  if(feel>=35)add(2,'erős hőterhelés'); else if(feel>=30)add(1,'melegterhelés');
  if(feel<=-20)add(2,'extrém hideg'); else if(feel<=-8)add(1,'hidegterhelés');
 }
 if(uv!=null){if(uv>=8)add(2,'nagyon erős UV');else if(uv>=6)add(1,'magas UV')}
 if(gust!=null){if(gust>=75)add(2,'erős széllökések');else if(gust>=50)add(1,'szeles idő')}
 var aqi=x.airQuality&&x.airQuality.europeanAqi;
 if(aqi!=null){if(aqi>=60)add(2,'rossz levegőminőség');else if(aqi>=40)add(1,'közepes levegőminőség')}
 if(d6>=7||d12>=10||d24>=14)add(2,'gyors légnyomásváltozás');
 else if(d6>=4||d12>=6||d24>=9)add(1,'légnyomásváltozás');
 var label=level===2?'Magas környezeti terhelés':level===1?'Figyelmet érdemlő környezet':'Normál környezeti terhelés';
 var summary=flags.length?flags.sort(function(a,b){return b.level-a.level}).slice(0,2).map(function(f){return f.text}).join(' · '):'Jelenleg nincs kiemelt környezeti tényező.';
 return {level:level,key:level===2?'high':level===1?'watch':'normal',label:label,summary:summary,flags:flags};
}

function nearestIndex(times,target){
 var best=-1,bd=Infinity,t=Date.parse(target||now());
 for(var i=0;i<(times||[]).length;i++){var d=Math.abs(Date.parse(times[i])-t);if(d<bd){bd=d;best=i}}
 return best;
}
function deltaAt(values,idx,h){
 if(idx<0||idx-h<0||!Array.isArray(values))return null;
 var a=Number(values[idx]),b=Number(values[idx-h]);return Number.isFinite(a)&&Number.isFinite(b)?n(a-b,1):null;
}
function normalize(j,loc){
 var cur=j.current||{},h=j.hourly||{},times=h.time||[];
 var idx=nearestIndex(times,cur.time||now());
 var pressure=Array.isArray(h.pressure_msl)?h.pressure_msl:[];
 var uv=Array.isArray(h.uv_index)&&idx>=0?n(h.uv_index[idx],1):null;
 var x={
  schema:'healthhub.environment/1',
  version:'1.1',
  source:{provider:'Open-Meteo',dataset:'Forecast API · best_match',url:'https://open-meteo.com/',retrievedAt:now()},
  location:{label:loc.label||'Helyzeted',lat:n(loc.lat,2),lon:n(loc.lon,2),timezone:j.timezone||null},
  fetchedAt:now(),
  observedAt:cur.time||((times&&times[idx])||now()),
  current:{
   temperature:n(cur.temperature_2m,1),
   apparentTemperature:n(cur.apparent_temperature,1),
   humidity:n(cur.relative_humidity_2m,0),
   pressureMsl:n(cur.pressure_msl,1),
   surfacePressure:n(cur.surface_pressure,1),
   windSpeed:n(cur.wind_speed_10m,1),
   windGust:n(cur.wind_gusts_10m,1),
   weatherCode:n(cur.weather_code,0),
   isDay:n(cur.is_day,0),
   uvIndex:uv
  },
  pressureDelta:{
   h3:deltaAt(pressure,idx,3),
   h6:deltaAt(pressure,idx,6),
   h12:deltaAt(pressure,idx,12),
   h24:deltaAt(pressure,idx,24)
  }
 };
 x.assessment=assess(x);
 return x;
}

function render(x){
 var c=ensureCard();if(!c||!x)return;
 var a=x.assessment||assess(x),cur=x.current||{},pd=x.pressureDelta||{};
 var t=new Date(x.fetchedAt||Date.now());
 var time=Number.isFinite(t.getTime())?t.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}):'—';
 var loc=x.location&&x.location.label||'Budapest';
 var feelNote=cur.apparentTemperature==null?'—':'hőérzet '+fmt(cur.apparentTemperature,0,'°C');
 var windNote=cur.windGust==null?'széllökés —':'lökés '+fmt(cur.windGust,0,' km/h');
 c.innerHTML=
  '<div class="envHead"><div><h3>🌦️ Környezeti egészség</h3><small>Environmental Health V1 · '+esc(loc)+'</small></div><button class="envRefresh" type="button" aria-label="Környezeti adatok frissítése">↻</button></div>'+
  '<div class="envStatus '+esc(a.key||'normal')+'"><span class="envDot"></span><span><b>'+esc(a.label)+'</b><small>'+esc(a.summary)+'</small></span></div>'+
  '<div class="envGrid">'+
   '<div class="envCell"><small>Hőmérséklet</small><b>'+fmt(cur.temperature,0,'°C')+'</b><em>'+esc(feelNote)+'</em></div>'+
   '<div class="envCell"><small>Páratartalom</small><b>'+fmt(cur.humidity,0,'%')+'</b><em>relatív páratartalom</em></div>'+
   '<div class="envCell"><small>Szél</small><b>'+fmt(cur.windSpeed,0,' km/h')+'</b><em>'+esc(windNote)+'</em></div>'+
   '<div class="envCell"><small>UV index</small><b>'+fmt(cur.uvIndex,1,'')+'</b><em>'+esc(uvLabel(cur.uvIndex))+'</em></div>'+
   '<div class="envCell"><small>Légnyomás</small><b>'+fmt(cur.pressureMsl,0,' hPa')+'</b><em>'+esc(pressureLabel(pd.h6,pd.h12,pd.h24))+'</em></div>'+
   '<div class="envCell"><small>24h változás</small><b>'+signed(pd.h24,1,' hPa')+'</b><em>6h '+signed(pd.h6,1,'')+' · 12h '+signed(pd.h12,1,'')+'</em></div>'+
   '<div class="envCell"><small>Levegő</small><b>'+fmt(x.airQuality&&x.airQuality.europeanAqi,0,' AQI')+'</b><em>'+esc(aqiLabel(x.airQuality&&x.airQuality.europeanAqi))+'</em></div>'+
   '<div class="envCell"><small>Pollen</small><b>'+esc(pollenSummary(x.pollen).name)+'</b><em>'+esc(pollenSummary(x.pollen).label)+'</em></div>'+
  '</div>'+
  '<div class="envPressure"><b>Légnyomás trend:</b> <span>3h '+signed(pd.h3,1,' hPa')+'</span><span>6h '+signed(pd.h6,1,' hPa')+'</span><span>12h '+signed(pd.h12,1,' hPa')+'</span><span>24h '+signed(pd.h24,1,' hPa')+'</span></div>'+
  '<div class="envFoot"><span>Frissítve '+esc(time)+' · forrásdátummal tárolva</span><a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo ↗</a></div>';
 c.querySelector('.envRefresh').onclick=function(){refresh(true)};
}

function renderError(msg){
 var c=ensureCard();if(!c)return;
 var cached=loadLocal();
 if(cached){render(cached);var s=c.querySelector('.envStatus small');if(s)s.textContent=(s.textContent||'')+' · Frissítés sikertelen, cache adatok.';return}
 c.innerHTML='<div class="envHead"><div><h3>🌦️ Környezeti egészség</h3><small>Environmental Health V1</small></div><button class="envRefresh" type="button">↻</button></div><div class="envError">'+esc(msg||'Az időjárási adatok most nem érhetők el.')+'</div>';
 c.querySelector('.envRefresh').onclick=function(){refresh(true)};
}

function resolveLocation(){
 return new Promise(function(ok){
  if(!navigator.geolocation){ok(DEFAULT_LOC);return}
  var done=false,t=setTimeout(function(){if(!done){done=true;ok(DEFAULT_LOC)}},2800);
  try{
   navigator.geolocation.getCurrentPosition(function(p){
    if(done)return;done=true;clearTimeout(t);
    ok({lat:n(p.coords.latitude,2),lon:n(p.coords.longitude,2),label:'Helyzeted'});
   },function(){if(done)return;done=true;clearTimeout(t);ok(DEFAULT_LOC)},{enableHighAccuracy:false,timeout:2400,maximumAge:30*60*1000});
  }catch(e){if(!done){done=true;clearTimeout(t);ok(DEFAULT_LOC)}}
 });
}
async function fetchAirQuality(loc){
 var qs=new URLSearchParams({
  latitude:String(loc.lat),longitude:String(loc.lon),
  current:'european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen',
  timezone:'auto'
 });
 var ctl=window.AbortController?new AbortController():null;
 var timer=ctl?setTimeout(function(){ctl.abort()},9000):null;
 try{
  var r=await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?'+qs.toString(),{cache:'no-store',signal:ctl&&ctl.signal});
  if(!r.ok)throw new Error('Air HTTP '+r.status);
  var j=await r.json(),a=j.current||{};
  return {
   observedAt:a.time||null,
   airQuality:{
    europeanAqi:n(a.european_aqi,0),
    pm25:n(a.pm2_5,1),
    pm10:n(a.pm10,1),
    nitrogenDioxide:n(a.nitrogen_dioxide,1),
    ozone:n(a.ozone,1),
    sulphurDioxide:n(a.sulphur_dioxide,1)
   },
   pollen:{
    alder:n(a.alder_pollen,1),
    birch:n(a.birch_pollen,1),
    grass:n(a.grass_pollen,1),
    mugwort:n(a.mugwort_pollen,1),
    olive:n(a.olive_pollen,1),
    ragweed:n(a.ragweed_pollen,1)
   }
  };
 }finally{if(timer)clearTimeout(timer)}
}
async function fetchEnvironment(loc){
 var qs=new URLSearchParams({
  latitude:String(loc.lat),longitude:String(loc.lon),
  current:'temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,surface_pressure,wind_speed_10m,wind_gusts_10m,weather_code,is_day',
  hourly:'pressure_msl,uv_index',
  past_hours:'24',forecast_hours:'24',timezone:'auto'
 });
 var ctl=window.AbortController?new AbortController():null;
 var timer=ctl?setTimeout(function(){ctl.abort()},9000):null;
 try{
  var airPromise=fetchAirQuality(loc).catch(function(e){console.warn('HealthHub AIR/POLLEN V1',e);return null});
  var r=await fetch('https://api.open-meteo.com/v1/forecast?'+qs.toString(),{cache:'no-store',signal:ctl&&ctl.signal});
  if(!r.ok)throw new Error('HTTP '+r.status);
  var j=await r.json(),x=normalize(j,loc),air=await airPromise;
  if(air){
   x.airQuality=air.airQuality;
   x.pollen=air.pollen;
   x.airObservedAt=air.observedAt;
   x.source.airQuality={provider:'Open-Meteo',dataset:'Air Quality API · CAMS Europe',url:'https://open-meteo.com/en/docs/air-quality-api',retrievedAt:now()};
   x.assessment=assess(x);
  }
  return x;
 }finally{if(timer)clearTimeout(timer)}
}
async function refresh(force){
 if(refreshPromise)return refreshPromise;
 var cached=loadLocal();
 if(!force&&cachedFresh(cached)){render(cached);return cached}
 var c=ensureCard(),b=c&&c.querySelector('.envRefresh');if(b)b.classList.add('busy');
 refreshPromise=(async function(){
  try{
   var loc=lastLocation||await resolveLocation();lastLocation=loc;
   var x=await fetchEnvironment(loc);saveLocal(x);render(x);
   document.documentElement.dataset.healthhubEnvironment='1.308.1';
   window.dispatchEvent(new CustomEvent('healthhub:environment-updated',{detail:{fetchedAt:x.fetchedAt,observedAt:x.observedAt,level:x.assessment&&x.assessment.key}}));
   return x;
  }catch(e){console.warn('HealthHub ENV V1',e);renderError('A környezeti adatok most nem érhetők el.');return loadLocal()}
  finally{var bb=document.querySelector('#'+CARD+' .envRefresh');if(bb)bb.classList.remove('busy');refreshPromise=null}
 })();
 return refreshPromise;
}
function snapshot(){var x=loadLocal();return x?JSON.parse(JSON.stringify(x)):null}
function history(){try{var h=JSON.parse(localStorage.getItem(HISTORY)||'[]');return Array.isArray(h)?h:[]}catch(e){return []}}

function decorate(){
 ensureCard();
 var cached=loadLocal();if(cached)render(cached);
 refresh(false);
 var health=document.getElementById('health');
 if(health&&window.MutationObserver&&!observer){
  observer=new MutationObserver(function(){if(!document.getElementById(CARD)){ensureCard();var x=loadLocal();if(x)render(x)}});
  observer.observe(health,{childList:true,subtree:true});
 }
}
window.HH_ENVIRONMENT_V1={
 version:BUILD,
 refresh:function(){return refresh(true)},
 getCurrent:function(){return snapshot()},
 getSnapshot:function(){return snapshot()},
 getHistory:function(){return history()},
 risk:function(){var x=loadLocal();return x&&x.assessment||null}
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
setTimeout(decorate,1200);
setInterval(function(){refresh(false)},30*60*1000);
})();
