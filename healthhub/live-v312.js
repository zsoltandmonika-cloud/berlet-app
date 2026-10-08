(function(){
'use strict';
/* HealthHub v312.1 · public morning environmental report + opt-in private, on-device notes.
   Not an LLM-generated medical assessment. No private health data leaves the device. */
var PAGE='hhDailyHealth312',STRIP='hhDailyHealthStrip312',STYLES='hhDailyHealthStyle312';
var SETTINGS='hh-daily-health-312-preferences',ARCHIVE='hh-daily-health-312-archive';
var REPORT='./data/daily-health-public.json';
var AI_REPORT='./data/daily-health-ai-public.json';
var current=null,aiCurrent=null,loading=null,observer=null;
var WARN={watch:1,elevated:2,high:3};
function el(id){return document.getElementById(id)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function day(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function fresh(when,hours){var x=Date.parse(when||'');return Number.isFinite(x)&&Math.abs(Date.now()-x)<hours*3600000}
function num(v){if(v===null||v===undefined||v===''||typeof v==='boolean')return null;var n=Number(v);return isFinite(n)?n:null}
function fmt(v,dec,suffix){var n=num(v);return n==null?'—':n.toFixed(dec||0)+(suffix||'')}
function read(key,fallback){try{var x=JSON.parse(localStorage.getItem(key)||'null');return x||fallback}catch(e){return fallback}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){console.warn('Daily Health local cache unavailable',e)}}
function prefs(){var p=read(SETTINGS,{});return {allergy:!!p.allergy,allergyName:String(p.allergyName||'').slice(0,60),headache:!!p.headache}}
function safePollen(p){
 if(!p||typeof p!=='object')return {available:false};
 if('dominant' in p)return {available:!!p.available,name:p.dominant,level:num(p.level),value:num(p.countGrainsM3)};
 if('name' in p)return {available:!!p.available,name:p.name,level:num(p.level),value:num(p.value)};
 var names={alder:'Éger',birch:'Nyír',grass:'Fűfélék',mugwort:'Üröm',olive:'Olajfa',ragweed:'Parlagfű'};
 var all=Object.keys(names).map(function(k){
  var value=num(p[k]),tree=['alder','birch','olive'].indexOf(k)!==-1;
  var risk=value==null?null:value<=10?0:value<=(tree?100:30)?1:value<=(tree?500:100)?2:3;
  return {key:k,name:names[k],value:value,level:risk};
 }).filter(function(o){return o.value!==null});
 if(!all.length)return {available:false};
 // Pick the highest *risk* first, not the largest raw grain count.
 all.sort(function(a,b){return b.level-a.level||b.value-a.value});
 var best=all[0];
 return {available:true,name:best.name,value:best.value,level:best.level};
}
function publicSnap(x){
 return x&&x.schema==='healthhub.daily-health-public/1'&&x.date===day()&&x.weather&&x.air?x:null;
}
function liveSnap(){
 var env=null,inf=null;
 try{env=window.HH_ENVIRONMENT_V1&&window.HH_ENVIRONMENT_V1.getCurrent()}catch(e){}
 try{inf=window.HH_INFECTION_WATCH_V1&&window.HH_INFECTION_WATCH_V1.get()}catch(e){}
 var ok=env&&fresh(env.fetchedAt,3);
 var w=ok?{available:true,observedAt:env.observedAt||env.fetchedAt,
  temperature:num(env.current&&env.current.temperature),
  apparentTemperature:num(env.current&&env.current.apparentTemperature),
  daytimeMaxFeelsLike:num(env.current&&env.current.apparentTemperature),
  uvMax:num(env.current&&env.current.uvIndex),
  pressureHpa:num(env.current&&env.current.pressureMsl),
  pressureChange6h:num(env.pressureDelta&&env.pressureDelta.h6),
  windGust:num(env.current&&env.current.windGust)}:{available:false};
 var a=ok&&env.airQuality?{available:true,observedAt:env.airObservedAt||env.observedAt,
  aqi:num(env.airQuality.europeanAqi),pollen:safePollen(env.pollen)}:{available:false};
 var infection={available:false,stale:true};
 if(inf&&inf.periodEnd){
  var age=Date.now()-Date.parse(inf.periodEnd+'T12:00:00');
  infection={available:true,stale:!isFinite(age)||age>21*86400000,sourceWeek:inf.sourceWeek,
   periodEnd:inf.periodEnd,signals:(inf.items||[]).filter(function(i){return WARN[i.level]})};
 }
 return {weather:w,air:a,infection:infection};
}
function context(){
 var live=liveSnap();
 var pub=publicSnap(current);
 var result={schema:'healthhub.daily-health/1',date:day(),location:'Budapest',
   weather:pub&&pub.weather||{available:false},
   air:pub&&pub.air||{available:false},
   infection:pub&&pub.infection||{available:false,stale:true},
   generatedAt:pub&&pub.generatedAt||null,source:pub?'Reggeli nyilvános pillanatkép':'Helyi adatok'};
 // Use more recent environmental reading, but never silently use an outdated cache.
 if(live.weather.available){
  result.weather=Object.assign({},result.weather,live.weather);
  // A mostani hőérzet/UV nem helyettesítheti a reggeli teljes napi MAXIMUM-előrejelzést.
  if(pub&&pub.weather&&pub.weather.available){
   var forecastFeel=num(pub.weather.daytimeMaxFeelsLike),observedFeel=num(live.weather.apparentTemperature);
   if(forecastFeel!=null)result.weather.daytimeMaxFeelsLike=observedFeel!=null?Math.max(forecastFeel,observedFeel):forecastFeel;
   var forecastUv=num(pub.weather.uvMax),observedUv=num(live.weather.uvMax);
   if(forecastUv!=null)result.weather.uvMax=observedUv!=null?Math.max(forecastUv,observedUv):forecastUv;
  }
  result.source='Reggeli előrejelzés + friss környezeti mérés + NNGYK';
 }
 if(live.air.available)result.air=live.air;
 if(live.infection.available)result.infection=live.infection;
 return result;
}
function alert(key,level,title,body){return {key:key,level:level,title:title,body:body}}
function interpret(x){
 var out=[],w=x.weather||{},a=x.air||{},p=a.pollen||{},i=x.infection||{};
 if(w.available){
  var f=num(w.daytimeMaxFeelsLike);
  if(f!=null&&f>=30)out.push(alert('heat',f>=35?'high':'watch','🌡️ Hőterhelés','A mai nappali hőérzet magas lehet. A kültéri terhelést tervezzétek óvatosabban.'));
  if(f!=null&&f<=-8)out.push(alert('cold','watch','🥶 Erős hideg','Réteges öltözet ajánlott.'));
  var uv=num(w.uvMax);if(uv!=null&&uv>=6)out.push(alert('uv','watch','☀️ Erős UV','A napvédelem különösen fontos a szabadtéri programoknál.'));
  var pd=num(w.pressureChange6h);if(pd!=null&&Math.abs(pd)>=6)
   out.push(alert('pressure','watch','🌀 Légnyomásváltozás','Jelentős nyomásváltozás. Egyeseknél fejfájással társulhat; ez önmagában nem bizonyít ok-okozati kapcsolatot.'));
  var gust=num(w.windGust);if(gust!=null&&gust>=60)out.push(alert('wind','watch','🌬️ Széllökések','Óvatosan az erős széllel a szabadtéri programoknál.'));
 }
 if(a.available){
  if(p.available&&num(p.level)>=2)out.push(alert('pollen','watch','🌿 Magas pollenterhelés','A legfrissebb pollenjelzés érzékenység esetén panaszokat okozhat.'));
  var aq=num(a.aqi);if(aq!=null&&aq>=60)out.push(alert('air',aq>=80?'high':'watch','🌫️ Levegőminőség','A mai levegőminőség mellett mérsékeljétek az intenzív kültéri terhelést, ha érzékenyek vagytok.'));
 }
 if(i.available&&!i.stale&&Array.isArray(i.signals)&&i.signals.length)
  out.push(alert('infection','watch','🦠 Heti fertőzési helyzet','A legutóbbi NNGYK-összesítés figyelmet igényel. Ez nem azonos az egyéni, mai fertőzéskockázattal.'));
 out.sort(function(a,b){return (WARN[b.level]||0)-(WARN[a.level]||0)});
 return out;
}
function sourceInfo(x){
 var w=x.weather||{},a=x.air||{},i=x.infection||{},p=a.pollen||{};
 var s=[];
 s.push(w.available?'🌡️ '+fmt(w.temperature,0,'°C')+' · hőérzet '+fmt(w.apparentTemperature,0,'°C'):'🌡️ Nincs friss időjárási adat');
 s.push(w.available&&num(w.pressureChange6h)!=null?'🌀 6h légnyomás '+fmt(w.pressureChange6h,1,' hPa'):'🌀 Légnyomásváltozás: nincs adat');
 s.push(a.available&&num(a.aqi)!=null?'🌫️ Európai AQI '+fmt(a.aqi,0):'🌫️ Levegőminőség: nincs adat');
 s.push(p.available?'🌿 '+esc(p.name||'Pollen')+' · '+['alacsony','közepes','magas','nagyon magas'][Math.min(3,Math.max(0,num(p.level)||0))]:'🌿 Pollenadat: nincs adat');
 s.push(w.available&&num(w.uvMax)!=null?'☀️ UV index '+fmt(w.uvMax,1):'☀️ UV: nincs adat');
 s.push(i.available&&!i.stale?'🦠 NNGYK '+esc(i.sourceWeek||'heti jelentés'):'🦠 NNGYK: nincs friss heti adat');
 return s;
}
function archive(x,alerts){
 var a=read(ARCHIVE,[]);if(!Array.isArray(a))a=[];
 a=a.filter(function(r){return r.date!==x.date});
 // Only public observations + count, never private preference or medication name.
 a.push({date:x.date,source:x.source,warningCount:alerts.length,weatherAvailable:!!x.weather.available,airAvailable:!!x.air.available});
 a.sort(function(l,r){return r.date.localeCompare(l.date)});
 save(ARCHIVE,a.slice(0,14));
}
function styles(){
 if(el(STYLES))return;
 var n=document.createElement('style');n.id=STYLES;
 n.textContent=
 /* Three morning strips only: standalone icons, no colored tile backgrounds. */
  '#home .dailyStrip.sparkStrip,#home .dailyStrip.newsStrip,#home .dailyStrip.hhHealthStrip312{min-height:88px!important;grid-template-columns:74px minmax(0,1fr) 18px!important;gap:8px!important;padding:8px 11px!important}'+
  '#home .dailyStrip.sparkStrip .stripIcon,#home .dailyStrip.newsStrip .stripIcon,#home .dailyStrip.hhHealthStrip312 .stripIcon{width:72px!important;height:72px!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important;display:grid!important;place-items:center!important;font-size:55px!important;line-height:1!important}'+
  '#home .dailyStrip.sparkStrip .stripIcon .atlasIcon,#home .dailyStrip.newsStrip .stripIcon .atlasIcon{width:70px!important;height:70px!important;margin:0!important;filter:drop-shadow(0 3px 4px rgba(37,70,105,.13))!important}'+
  '#home .hhHealthStrip312 .stripIcon{filter:drop-shadow(0 2px 3px rgba(37,70,105,.09))}'+
  '#home .hhHealthStrip312{background:linear-gradient(135deg,#066e73,#1b9d8a);color:#fff}'+
 '#'+PAGE+'{min-height:100vh;background:linear-gradient(180deg,#eaf7f4,#f5fbfc);padding-bottom:95px;color:#153f56;box-sizing:border-box}'+
 '#'+PAGE+' .dh312Top{height:205px;box-sizing:border-box;position:relative;overflow:hidden;padding:16px;background-color:#eaf6fc;background-image:var(--hh-role-atlas);background-repeat:no-repeat;background-size:auto 200%;background-position:left top;color:#0b2d50}'+
 '#'+PAGE+' .dh312Back{position:absolute;z-index:3;top:14px;left:14px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(23,63,97,.16);background:rgba(255,255,255,.78);color:#173f61;font-size:22px;cursor:pointer;backdrop-filter:blur(7px)}'+
 '#'+PAGE+' .dh312Top h1{position:absolute;z-index:2;left:56%;right:7px;top:50%;transform:translateY(-50%);font-size:clamp(18px,5vw,23px);line-height:1.12;margin:0;font-weight:900;letter-spacing:-.5px;color:#0b2d50;text-shadow:0 1px 0 rgba(255,255,255,.92)}'+
 '#'+PAGE+' .dh312Top h1 span{display:block;white-space:nowrap}'+
  '#'+PAGE+' .dh312Subline{font-size:11px;line-height:1.4;margin:0;padding:9px 13px 3px;color:#40677c;background:#eaf7f4}'+
 '#'+PAGE+' .dh312Body{padding:13px;max-width:780px;margin:0 auto;display:grid;gap:10px}'+
 '#'+PAGE+' .dh312Card{border:1px solid #dcebe9;background:white;padding:14px;border-radius:16px;box-shadow:0 4px 13px rgba(19,74,93,.055)}'+
 '#'+PAGE+' .dh312Card h2{font-size:15px;margin:0 0 8px}'+
 '#'+PAGE+' .dh312Card p{font-size:12px;line-height:1.55;margin:5px 0}'+
 '#'+PAGE+' .dh312Meta{font-size:10px;color:#5b7581;line-height:1.5}'+
 '#'+PAGE+' .dh312Warn{padding:8px;border-radius:11px;background:#fff7e9;margin:7px 0;border-left:4px solid #e8b247}'+
 '#'+PAGE+' .dh312Warn.high{background:#fff0f0;border-left-color:#e94e62}'+
 '#'+PAGE+' .dh312Warn b{display:block;font-size:12px}'+
 '#'+PAGE+' .dh312List{display:grid;gap:5px;font-size:12px}'+
 '#'+PAGE+' .dh312List>div{padding:5px 0;border-bottom:1px solid #edf2f2}'+
 '#'+PAGE+' .dh312Btn{padding:9px 11px;border:0;border-radius:10px;font-weight:800;font-size:12px;color:#fff;background:#19778d;cursor:pointer;margin:4px 5px 4px 0}'+
 '#'+PAGE+' .dh312Btn.secondary{background:#e7f3f4;color:#174c66}'+
 '#'+PAGE+' .dh312Form{display:grid;gap:9px;font-size:12px}'+
 '#'+PAGE+' .dh312Form label{display:flex;gap:8px;align-items:center}'+
 '#'+PAGE+' .dh312Form input[type=text]{width:100%;box-sizing:border-box;padding:10px;border:1px solid #bcd1d6;border-radius:9px;font-size:14px}'+
 '#'+PAGE+' .dh312Foot{font-size:10px;color:#607886;line-height:1.5}'+
 '@media(max-width:380px){#'+PAGE+' .dh312Top h1{font-size:17px;left:55%}}';
 document.head.appendChild(n);
}
function ensurePage(){
 var page=el(PAGE);if(page)return page;
 var app=document.querySelector('.app')||document.body;
 page=document.createElement('section');page.id=PAGE;page.className='page';
 page.innerHTML='<div class="dh312Top"><button class="dh312Back" type="button" aria-label="Vissza a főoldalra">‹</button><h1><span>Léna</span><span>Daily Health</span></h1></div><p class="dh312Subline">🩺 Közös reggeli egészségügyi helyzetkép · Zsolt és Mónika</p><div class="dh312Body"><div id="dh312Content" class="dh312Card"><p>Adatok betöltése…</p></div></div>';
 app.appendChild(page);
 page.querySelector('.dh312Back').addEventListener('click',function(){if(typeof window.show==='function')window.show('home')});
 return page;
}
function ensureStrip(){
 var news=document.querySelector('#home .dailyStrip.newsStrip'),home=el('home');if(!news||!home)return;
 var s=el(STRIP);
 if(!s){
  s=document.createElement('button');s.type='button';s.id=STRIP;s.className='dailyStrip hhHealthStrip312';
  s.innerHTML='<span class="stripIcon" aria-hidden="true">🩺</span><span><b>Daily Health</b><p id="dh312Teaser">Reggeli egészségügyi helyzetkép betöltése…</p></span><span class="arr" aria-hidden="true">›</span>';
  // Clicks are handled by delegation, including when Home is re-rendered.
 }
 if(news.nextElementSibling!==s)news.after(s);
}
function personalHtml(keys,x){
 var p=prefs(),out=[];
 if(keys.some(function(k){return k.key==='pollen'})){
  out.push('<p>🌿 <b>Mónika:</b> magas pollenterhelés látszik. Allergiás érzékenység esetén érdemes ellenőrizni az előírt napi rutinodat.'+
   (p.allergy?' <b>Indulás előtt ellenőrizd, hogy nálad van-e '+esc(p.allergyName||'az allergiagyógyszered')+'.</b>':'')+'</p>');
 }
 if(keys.some(function(k){return k.key==='pressure'})){
  out.push('<p>🌀 <b>Zsolt:</b> ha a légnyomásváltozással egy időben fejfájást tapasztalsz, érdemes rögzíteni a Tünetnaplóban.'+
   (p.headache?' Ellenőrizd a korábban megbeszélt, számodra biztonságos teendőket.':'')+'</p>');
 }
 if(keys.some(function(k){return k.key==='heat'})){
  out.push('<p>❤️ <b>Mindkettőtöknek:</b> hőségben a fizikai terhelést a saját egészségi állapototokhoz igazítsátok. Az előírt folyadék- vagy gyógyszerrendet ne változtassátok önállóan.</p>');
 }
 if(keys.some(function(k){return k.key==='air'}))out.push('<p>🌫️ <b>Mindkettőtöknek:</b> kedvezőtlen levegőn érdemes rövidebb, kevésbé intenzív kültéri mozgást tervezni.</p>');
 if(!out.length)out.push('<p>Ma nincs olyan ellenőrzött környezeti jelzés, amelyhez külön személyes emlékeztetőt társítottunk. Az adathiány nem jelent automatikusan alacsony kockázatot.</p>');
 return out.join('');
}
function render(){
 ensureStrip();var page=ensurePage(),box=el('dh312Content');if(!box)return;
 var x=context(),warn=interpret(x),p=prefs();
 var available=!!(x.weather.available||x.air.available||(x.infection.available&&!x.infection.stale));
 archive(x,warn);
 var pRows=personalHtml(warn,x);
 var detail=warn.length?warn.map(function(v){return '<div class="dh312Warn '+esc(v.level)+'"><b>'+esc(v.title)+'</b><p>'+esc(v.body)+'</p></div>'}).join(''):'<p>🟢 Nincs kiemelt jelzés a most elérhető adatokból. Ez nem jelenti azt, hogy minden kockázat kizárható.</p>';
 var d=day();
 var validAi=aiCurrent&&aiCurrent.schema==='healthhub.daily-health-ai-public/1'&&aiCurrent.date===day()&&aiCurrent.brief;
 var ab=validAi?aiCurrent.brief:null;
 var aiBlock=ab?
  '<p><b>'+esc(ab.headline)+'</b></p><p>'+esc(ab.overview)+'</p><p>'+esc(ab.attention)+'</p>'+
  '<div class="dh312List">'+(Array.isArray(ab.tips)?ab.tips:[]).map(function(t){return '<div>💡 '+esc(t)+'</div>'}).join('')+'</div>'+
  '<p class="dh312Meta">Bizonytalanságok: '+esc(ab.uncertainty)+'</p>'+
  '<p class="dh312Meta">Valódi AI-összefoglaló, kizárólag nyilvános környezeti adatokból. Személyes kórtörténet nem került az AI-hoz.</p>':
  '<p class="dh312Meta">A mai AI-összefoglaló még nem érhető el. A környezeti elemzés szabályalapú változata továbbra is működik.</p>';
 var disclaimer='A környezeti figyelmeztetések automatikusan készülnek, a külön jelzett AI-szöveg valós modellhívás eredménye lehet. Nem diagnózis. Gyógyszert ne kezdjetek, ne emeljetek és ne módosítsatok ilyen jelzés alapján.';
 box.outerHTML='<div id="dh312Content">'+
 '<div class="dh312Card"><h2>☀️ Mai helyzet · '+esc(d)+'</h2><p>'+(!available?'⚪ Most nincs megbízhatóan friss forrásadat.':warn.length?'🟡 '+warn.length+' figyelmet érdemlő jelzés.':'🟢 Nincs kiemelt környezeti figyelmeztetés.')+'</p><div class="dh312Meta">'+esc(x.source)+(x.generatedAt?' · automatikus reggeli frissítés: '+esc(String(x.generatedAt).slice(11,16)):' · frissül az alkalmazás megnyitásakor')+'</div></div>'+
 '<div class="dh312Card"><h2>🧠 Léna AI · Mai egészségügyi összefoglaló</h2>'+aiBlock+'</div>'+
 '<div class="dh312Card"><h2>🌦️ Környezeti tényezők</h2><div class="dh312List">'+sourceInfo(x).map(function(s){return '<div>'+s+'</div>'}).join('')+'</div></div>'+
 '<div class="dh312Card"><h2>⚠️ Figyelmeztetések és javaslatok</h2>'+detail+'</div>'+
 '<div class="dh312Card"><h2>💚 Kettőtöknek személyre szabva</h2>'+pRows+'<p class="dh312Meta">A személyes emlékeztetők csak külön bekapcsolás után jelennek meg; orvosi utasítást nem helyettesítenek.</p></div>'+
 '<div class="dh312Card"><h2>⚙️ Személyes emlékeztetők</h2><div class="dh312Form"><label><input id="dh312Allergy" type="checkbox" '+(p.allergy?'checked':'')+'> Mónika: allergiagyógyszer ellenőrzése magas pollen esetén</label><input id="dh312Med" type="text" maxlength="60" placeholder="A korábban felírt allergiagyógyszer neve (nem kötelező)" value="'+esc(p.allergyName)+'"><label><input id="dh312Headache" type="checkbox" '+(p.headache?'checked':'')+'> Zsolt: fejfájás-napló emlékeztető nyomásváltozásnál</label><button id="dh312Save" class="dh312Btn" type="button">💾 Emlékeztetők mentése</button><div class="dh312Meta">Ezeket a beállításokat csak a jelenlegi böngésző helyi tárhelye őrzi, nem kerülnek a nyilvános GitHubba. A böngésző helyi tárhelye nem titkosított egészségügyi adatbázis.</div></div></div>'+
 '<div class="dh312Card"><h2>🤖 Kérdezd Lénát</h2><p>Külön indítható AI-kutatás a meglévő Ask Léna felületen. A tényleges AI-elemzéshez saját jóváhagyásod szükséges.</p><button id="dh312Ask" class="dh312Btn" type="button">🧠 Elemzés indítása Lénával</button><button id="dh312Refresh" class="dh312Btn secondary" type="button">🔄 Környezeti adatok frissítése</button></div>'+
 '<div class="dh312Card"><h2>📅 Korábbi reggelek</h2><p class="dh312Meta">'+(read(ARCHIVE,[]).slice(1,8).map(function(v){return esc(v.date)+' · '+v.warningCount+' figyelmeztetés'}).join('<br>')||'Az archívum most indul. A korábbi napok rövid összesítése ezen az eszközön marad.')+'</p><p class="dh312Foot">'+disclaimer+'</p></div></div>';
 el('dh312Save').onclick=function(){
  save(SETTINGS,{allergy:el('dh312Allergy').checked,allergyName:el('dh312Med').value.trim().slice(0,60),headache:el('dh312Headache').checked});
  render();
 };
 el('dh312Ask').onclick=function(){
  if(typeof window.hhOpenLenaSmart299!=='function'){alert('Az Ask Léna jelenleg nem érhető el.');return}
  window.hhOpenLenaSmart299();
  var q=el('hhSQ299');
  if(q)q.value='Kérlek, értelmezd a mai környezeti tényezőket a HealthHubban. Ellenőrizd a legfrissebb forrásokat, jelezd a bizonytalanságokat. Kérdezz rá, mielőtt személyes egészségügyi adatot használsz. A mai nyilvános figyelmeztetések: '+warn.map(function(v){return v.title.replace(/[^\p{L}\p{N}\s]/gu,'')}).join(', ')+'. Ne javasolj gyógyszeradag módosítást.';
 };
 el('dh312Refresh').onclick=async function(){
  this.disabled=true;this.textContent='Frissítés…';
  try{
   if(window.HH_ENVIRONMENT_V1&&window.HH_ENVIRONMENT_V1.refresh)await window.HH_ENVIRONMENT_V1.refresh();
   if(window.HH_INFECTION_WATCH_V1&&window.HH_INFECTION_WATCH_V1.refresh)await window.HH_INFECTION_WATCH_V1.refresh(true);
  }catch(e){console.warn('Daily Health refresh',e)}
  render();
 };
 var teaser=el('dh312Teaser');
 if(teaser)teaser.textContent=!available?'Jelenleg nincs friss adat':warn.length?warn.length+' tényező figyelmet érdemel · Zsolt és Mónika':'Mai környezeti helyzet · Zsolt és Mónika';
}
function openPage(){
 var page=ensurePage();
 // Route directly to Daily Health instead of toggling Home on and immediately off.
 if(typeof window.show==='function')window.show(PAGE);
 if(!page.classList.contains('on')){
  document.querySelectorAll('.page').forEach(function(node){node.classList.remove('on')});
  page.classList.add('on');
 }
 ['navTimelineBar','navHomeBar','navDetailBar'].forEach(function(id){var n=el(id);if(n)n.style.display='none'});
 // Daily Health shares the same persistent five-button navigation as HealthRadar.
 var healthNav=el('navHealthBar');if(healthNav)healthNav.style.display='grid';
 window.scrollTo(0,0);
 render();
}
async function load(force){
 if(loading)return loading;
 loading=(async function(){
  try{
   var url=REPORT+'?d='+encodeURIComponent(day())+(force?'&t='+Date.now():'');
   var r=await fetch(url,{cache:'no-store'});
   if(!r.ok)throw new Error('Daily Health HTTP '+r.status);
   var j=await r.json();current=publicSnap(j);
   if(!current)console.info('Daily Health public source not yet current: using live environmental data.');
  }catch(e){console.warn('Daily Health public snapshot',e);current=null}
  render();
 })().finally(function(){loading=null});
 return loading;
}
async function loadAi(){
 try{
  var response=await fetch(AI_REPORT+'?d='+encodeURIComponent(day()),{cache:'no-store'});
  if(!response.ok){aiCurrent=null;return}
  var value=await response.json();
  aiCurrent=value&&value.schema==='healthhub.daily-health-ai-public/1'&&
   value.date===day()&&value.brief&&
   ['headline','overview','attention','uncertainty'].every(function(k){return typeof value.brief[k]==='string'})&&
   Array.isArray(value.brief.tips)?value:null;
 }catch(e){aiCurrent=null;console.info('Daily Health AI will use safe fallback',e)}
 render();
}
function init(){
 styles();ensurePage();ensureStrip();
 // Delegation survives a Home DOM replacement; a direct per-element listener does not.
 document.addEventListener('click',function(e){
  var button=e.target&&e.target.closest&&e.target.closest('#'+STRIP);
  if(!button)return;
  e.preventDefault();e.stopPropagation();
  openPage();
 },true);
 render();load(false);loadAi();
 var home=el('home');
 if(home&&window.MutationObserver){
  observer=new MutationObserver(function(){if(!el(STRIP))ensureStrip()});
  observer.observe(home,{childList:true,subtree:true});
 }
 var lastDay=day();
 setInterval(function(){ensureStrip();if(day()!==lastDay){lastDay=day();load(false)}},60000);
 window.addEventListener('healthhub:environment-updated',function(){render()});
 window.addEventListener('focus',function(){load(false);loadAi()});
 document.addEventListener('visibilitychange',function(){if(!document.hidden){load(false);loadAi()}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.HH_DAILY_HEALTH_V312={open:openPage,refresh:function(){return Promise.all([load(true),loadAi()])},getPublic:function(){return current},getPublicAI:function(){return aiCurrent}};
})();
