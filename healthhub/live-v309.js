(function(){
'use strict';

/* HealthHub v309 — Environmental Health dedicated module
   Home tile + responsive 2x5/5x2 module grid + dedicated page.
   Reads HH_ENVIRONMENT_V1 only; does not alter the v308 data engine. */

var BUILD='1.309.13';
var PAGE='hhEnvironmental309';
var STYLE='hh-environmental-v309-style';
var TILE='hhEnvironmentalTile309';
var HERO_CHUNKS=['00','01','02','03a','03b','04','05'].map(function(i){return './assets/environmental-hero-v309-650-'+i+'.b64?v=3092'});
var heroDataUrl='';
var heroPromise=null;
var baseShow=null;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(){return pkey()==='monika'?'Mónika':'Zsolt'}
function val(v,d,s){return v==null?'—':Number(v).toFixed(d||0)+(s||'')}
function signed(v,d,s){if(v==null)return '—';var n=Number(v);return (n>0?'+':'')+n.toFixed(d||0)+(s||'')}
function uvLabel(v){
 if(v==null)return 'Nincs adat';
 if(v<3)return 'Alacsony';
 if(v<6)return 'Közepes';
 if(v<8)return 'Magas';
 if(v<11)return 'Nagyon magas';
 return 'Extrém';
}
function pressureLabel(x){
 var p=x&&x.pressureDelta||{},m=Math.max(Math.abs(p.h6||0),Math.abs(p.h12||0),Math.abs(p.h24||0));
 return m>=10?'Gyors változás':m>=6?'Változó':'Stabilabb';
}
function statusKey(x){return x&&x.assessment&&x.assessment.key||'normal'}
function statusLabel(x){return x&&x.assessment&&x.assessment.label||'Környezeti állapot'}
function statusText(x){return x&&x.assessment&&x.assessment.summary||'Az aktuális környezeti adatok betöltése folyamatban.'}

function ensureStyle(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;s.textContent=
 '.homeModules{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}.homeModule{min-height:98px!important;padding:10px 6px!important;gap:5px!important}.homeModules .homeModule .mi{font-size:34px!important}.homeModules .homeModule img{width:84px!important;height:84px!important;object-fit:contain!important}.homeModules .homeModule b{font-size:11.2px!important;line-height:1.15!important}.homeModules .homeModule small{font-size:8.4px!important;line-height:1.2!important}'+
 '@media(min-width:760px){.homeModules{grid-template-columns:repeat(5,minmax(0,1fr))!important}.homeModule{min-height:112px!important}.homeModules .homeModule img{width:78px!important;height:78px!important}.homeModules .homeModule b{font-size:11.8px!important}}'+
 '#'+TILE+'{position:relative;overflow:hidden;background:rgba(255,255,255,.96)!important;color:#183c5d!important;border:0!important;box-shadow:0 6px 17px rgba(38,74,101,.055)!important}'+
 '#'+TILE+':before{content:none!important}'+
 '#'+TILE+' .env309Icon{position:relative;width:78px;height:78px;display:grid;place-items:center;font-size:46px;background:transparent!important;border:0!important;box-shadow:none!important;text-shadow:0 4px 10px rgba(0,77,119,.14)}'+
 '#'+TILE+' b{position:relative;color:#183c5d!important;text-shadow:none!important}'+
 '#'+TILE+' small{position:relative;color:#72879a!important;text-shadow:none!important;opacity:1}'+
 '#'+PAGE+'{background:linear-gradient(180deg,#dff4ff,#edf9f6);min-height:100vh;padding-bottom:68px}'+
 'html.hh-env309-open .hhHealthMainSwitch263,html.hh-env309-open [aria-label^="Egy kattintás: váltás"]{display:none!important}'+
 '#'+PAGE+' .env309Hero{height:268px;position:relative;overflow:hidden;background:linear-gradient(145deg,#61bff1,#1476bd);background-size:cover;background-position:center center}'+
 '#'+PAGE+' .env309Hero:before{content:"";position:absolute;z-index:3;right:0;top:0;bottom:0;width:68%;background:linear-gradient(90deg,rgba(18,117,184,.18),rgba(5,78,139,.48));backdrop-filter:blur(7px) saturate(1.05);pointer-events:none}'+
 '#'+PAGE+' .env309Hero:after{content:"";position:absolute;z-index:4;inset:0;background:linear-gradient(90deg,rgba(3,50,83,.02),rgba(2,43,79,.04) 42%,rgba(1,47,83,.12));pointer-events:none}'+
 '#'+PAGE+' .env309Top{position:absolute;z-index:6;left:12px;top:12px;display:flex;align-items:center}'+
 '#'+PAGE+' .env309Top button{height:34px;border-radius:18px;border:1px solid rgba(255,255,255,.55);background:rgba(6,55,91,.33);color:#fff;backdrop-filter:blur(10px);box-shadow:0 4px 12px rgba(5,50,84,.12);font-weight:900}'+
 '#'+PAGE+' .env309Back{width:34px;font-size:20px}'+
 '#'+PAGE+' .env309Glass{position:absolute;z-index:5;right:12px;top:18px;width:min(59%,510px);min-height:190px;border-radius:18px;padding:11px;background:linear-gradient(145deg,rgba(7,94,158,.50),rgba(8,75,135,.50));border:1px solid rgba(255,255,255,.58);box-shadow:0 12px 28px rgba(2,55,96,.22),inset 0 1px 0 rgba(255,255,255,.38);backdrop-filter:blur(18px) saturate(1.14);-webkit-backdrop-filter:blur(18px) saturate(1.14);color:#fff}'+
 '#'+PAGE+' .env309Glass h1{font-size:19px;line-height:1;margin:0 0 3px}#'+PAGE+' .env309Glass>small{font-size:8px;opacity:.82}'+
 '#'+PAGE+' .env309HeroGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:9px}'+
 '#'+PAGE+' .env309HeroMetric{min-width:0;border-radius:10px;padding:6px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.17)}'+
 '#'+PAGE+' .env309Reserved{min-height:45px;background:rgba(255,255,255,.035);border:1px dashed rgba(255,255,255,.11)}'+
 '#'+PAGE+' .env309HeroMetric small{display:block;font-size:6.5px;text-transform:uppercase;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
 '#'+PAGE+' .env309HeroMetric b{display:block;font-size:13px;margin-top:2px;white-space:nowrap}#'+PAGE+' .env309HeroMetric em{display:block;font-size:6.5px;font-style:normal;opacity:.78;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
 '#'+PAGE+' .env309Body{position:relative;z-index:8;margin-top:-15px;border-radius:22px 22px 0 0;background:linear-gradient(180deg,#f2fbff,#edf8f5);padding:12px 10px 76px}'+
 '#'+PAGE+' .env309Status{border-radius:16px;padding:11px 12px;background:#fff;box-shadow:0 7px 18px rgba(28,78,105,.07);border:1px solid #e0edf2;display:grid;grid-template-columns:12px 1fr;gap:8px;margin-bottom:9px}'+
 '#'+PAGE+' .env309Dot{width:10px;height:10px;border-radius:50%;margin-top:3px;background:#35a66f}#'+PAGE+' .env309Status.watch .env309Dot{background:#e5a21d}#'+PAGE+' .env309Status.high .env309Dot{background:#e04b5f}'+
 '#'+PAGE+' .env309Status b{font-size:12px;color:#173f62}#'+PAGE+' .env309Status small{display:block;font-size:8.5px;color:#738997;line-height:1.35;margin-top:2px}'+
 '#'+PAGE+' .env309Cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}'+
 '#'+PAGE+' .env309Card{border-radius:16px;padding:11px;background:#fff;border:1px solid #e1ecf1;box-shadow:0 6px 16px rgba(31,75,101,.055)}'+
 '#'+PAGE+' .env309Card h3{font-size:11px;color:#193f60;margin:0 0 8px}#'+PAGE+' .env309Big{font-size:21px;font-weight:950;color:#15527c}#'+PAGE+' .env309Sub{font-size:8px;color:#7c8f9c;margin-top:2px;line-height:1.35}'+
 '#'+PAGE+' .env309Trend{margin-top:7px;padding-top:7px;border-top:1px solid #edf2f4;font-size:8px;color:#607a8d;line-height:1.55}'+
 '#'+PAGE+' .env309Future{background:linear-gradient(145deg,#f7fff9,#fff);border-color:#d9eee0}#'+PAGE+' .env309Future .env309Big{color:#4a9d57}'+
 '#'+PAGE+' .env309Wide{grid-column:1/-1}#'+PAGE+' .env309Source{margin-top:9px;text-align:center;color:#8295a2;font-size:7.5px}#'+PAGE+' .env309Source a{color:var(--a);font-weight:900;text-decoration:none}'+
 '@media(max-width:390px){#'+PAGE+' .env309Hero{height:318px;background-size:auto 100%!important;background-position:-42px center!important}#'+PAGE+' .env309Hero:before{width:40%;background:linear-gradient(90deg,rgba(18,117,184,.02),rgba(5,78,139,.36));backdrop-filter:blur(7px) saturate(1.04)}#'+PAGE+' .env309Glass{right:6px;top:10px;bottom:18px;width:38%;padding:7px;min-height:0;display:flex;flex-direction:column;background:linear-gradient(145deg,rgba(7,94,158,.40),rgba(8,75,135,.40));backdrop-filter:blur(18px) saturate(1.14);-webkit-backdrop-filter:blur(18px) saturate(1.14)}#'+PAGE+' .env309Glass h1{font-size:14.2px;line-height:1.04;margin-bottom:3px}#'+PAGE+' .env309Glass>small{font-size:6.7px;line-height:1.15;display:block}#'+PAGE+' .env309HeroGrid{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(4,minmax(0,1fr));gap:5px;margin-top:7px;flex:1}#'+PAGE+' .env309HeroMetric{padding:4px;min-height:0}#'+PAGE+' .env309HeroMetric small{font-size:6.25px}#'+PAGE+' .env309HeroMetric b{font-size:11px}#'+PAGE+' .env309HeroMetric em{font-size:6.25px}#'+PAGE+' .env309Reserved{min-height:0}#'+PAGE+' .env309Cards{grid-template-columns:1fr 1fr}}';
 document.head.appendChild(s);
}

async function loadHero(){
 if(heroDataUrl)return heroDataUrl;
 if(heroPromise)return heroPromise;
 heroPromise=Promise.all(HERO_CHUNKS.map(function(url){
  return fetch(url,{cache:'force-cache'}).then(function(r){if(!r.ok)throw new Error('hero '+r.status+' '+url);return r.text()});
 })).then(function(parts){
  var b64=parts.map(function(x){return String(x||'').trim()}).join('');
  if(b64.length<30000||b64.slice(0,5)!=='UklGR')throw new Error('hero chunks invalid');
  heroDataUrl='data:image/webp;base64,'+b64;
  var h=document.querySelector('#'+PAGE+' .env309Hero');if(h)h.style.backgroundImage='url("'+heroDataUrl+'")';
  return heroDataUrl;
 }).catch(function(e){console.warn('ENV hero',e);return ''}).finally(function(){heroPromise=null});
 return heroPromise;
}

function current(){
 try{return window.HH_ENVIRONMENT_V1&&window.HH_ENVIRONMENT_V1.getCurrent?window.HH_ENVIRONMENT_V1.getCurrent():null}catch(e){return null}
}

function heroMetrics(x){
 var c=x&&x.current||{},p=x&&x.pressureDelta||{};
 return ''+
 '<div class="env309HeroMetric"><small>Hőmérséklet</small><b>'+val(c.temperature,0,'°C')+'</b><em>Hőérzet '+val(c.apparentTemperature,0,'°C')+'</em></div>'+
 '<div class="env309HeroMetric"><small>Páratartalom</small><b>'+val(c.humidity,0,'%')+'</b><em>relatív</em></div>'+
 '<div class="env309HeroMetric"><small>Szél</small><b>'+val(c.windSpeed,0,' km/h')+'</b><em>Lökés '+val(c.windGust,0,' km/h')+'</em></div>'+
 '<div class="env309HeroMetric"><small>Légnyomás</small><b>'+val(c.pressureMsl,0,' hPa')+'</b><em>'+esc(pressureLabel(x))+'</em></div>'+
 '<div class="env309HeroMetric"><small>UV index</small><b>'+val(c.uvIndex,1,'')+'</b><em>'+esc(uvLabel(c.uvIndex))+'</em></div>'+
 '<div class="env309HeroMetric"><small>Pollen</small><b>V1.1</b><em>következő szelet</em></div>'+
 '<div class="env309HeroMetric env309Reserved" aria-hidden="true"></div>'+
 '<div class="env309HeroMetric env309Reserved" aria-hidden="true"></div>';
}

function pageHtml(x){
 var c=x&&x.current||{},p=x&&x.pressureDelta||{},loc=x&&x.location&&x.location.label||'Budapest';
 var t=x&&x.fetchedAt?new Date(x.fetchedAt):null,ft=t&&Number.isFinite(t.getTime())?t.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'}):'—';
 var key=statusKey(x);
 return ''+
 '<div class="env309Hero">'+
  '<div class="env309Top"><button class="env309Back" type="button" aria-label="Vissza">‹</button></div>'+
  '<div class="env309Glass"><h1>🌿 Környezeti egészség</h1><small>Időjárás · Levegőminőség · Pollen · UV · '+esc(loc)+'</small><div class="env309HeroGrid">'+heroMetrics(x)+'</div></div>'+
 '</div>'+
 '<div class="env309Body">'+
  '<div class="env309Status '+esc(key)+'"><span class="env309Dot"></span><span><b>'+esc(statusLabel(x))+'</b><small>'+esc(statusText(x))+'</small></span></div>'+
  '<div class="env309Cards">'+
   '<div class="env309Card"><h3>🌡️ Hőterhelés</h3><div class="env309Big">'+val(c.apparentTemperature,0,'°C')+'</div><div class="env309Sub">Aktuális hőérzet · tényleges '+val(c.temperature,0,'°C')+'</div></div>'+
   '<div class="env309Card"><h3>💧 Páratartalom</h3><div class="env309Big">'+val(c.humidity,0,'%')+'</div><div class="env309Sub">Relatív páratartalom</div></div>'+
   '<div class="env309Card"><h3>🌬️ Szél</h3><div class="env309Big">'+val(c.windSpeed,0,' km/h')+'</div><div class="env309Sub">Széllökés: '+val(c.windGust,0,' km/h')+'</div></div>'+
   '<div class="env309Card"><h3>☀️ UV terhelés</h3><div class="env309Big">'+val(c.uvIndex,1,'')+'</div><div class="env309Sub">'+esc(uvLabel(c.uvIndex))+' UV-index</div></div>'+
   '<div class="env309Card env309Wide"><h3>🌀 Légnyomás és változás</h3><div class="env309Big">'+val(c.pressureMsl,0,' hPa')+'</div><div class="env309Sub">'+esc(pressureLabel(x))+'</div><div class="env309Trend">3 óra: <b>'+signed(p.h3,1,' hPa')+'</b> · 6 óra: <b>'+signed(p.h6,1,' hPa')+'</b> · 12 óra: <b>'+signed(p.h12,1,' hPa')+'</b> · 24 óra: <b>'+signed(p.h24,1,' hPa')+'</b></div></div>'+
   '<div class="env309Card env309Future"><h3>🌿 Pollen</h3><div class="env309Big">Következik</div><div class="env309Sub">HH-ENV-002 · hivatalos napi pollenterhelés és fő allergének.</div></div>'+
   '<div class="env309Card env309Future"><h3>🌫️ Levegőminőség</h3><div class="env309Big">Előkészítve</div><div class="env309Sub">A következő környezeti réteghez fenntartott hely.</div></div>'+
  '</div>'+
  '<div class="env309Source">Frissítve: '+esc(ft)+' · adatmotor: Environmental Health V1 · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open‑Meteo ↗</a></div>'+
 '</div>';
}

function ensurePage(){
 ensureStyle();
 var page=document.getElementById(PAGE);
 if(!page){
  var app=document.querySelector('.app')||document.body;
  page=document.createElement('section');page.id=PAGE;page.className='page';
  app.appendChild(page);
 }
 page.innerHTML=pageHtml(current());
 page.querySelector('.env309Back').onclick=function(){closePage()};
 if(heroDataUrl)page.querySelector('.env309Hero').style.backgroundImage='url("'+heroDataUrl+'")';
 else loadHero();
 return page;
}

function tileKey(el){
 var t=(el&&el.textContent||'').toLocaleLowerCase('hu-HU');
 if(el&&el.id===TILE)return 'environment';
 if(t.includes('healthradar'))return 'healthradar';
 if(t.includes('sleep'))return 'sleep';
 if(t.includes('activity'))return 'activity';
 if(t.includes('cognitive'))return 'cognitive';
 if(t.includes('wellbeing'))return 'wellbeing';
 if(t.includes('nutrition'))return 'nutrition';
 if(t.includes('receptár')||t.includes('receptar'))return 'recipes';
 if(t.includes('insights'))return 'insights';
 if(t.includes('ask léna')||t.includes('ask lena'))return 'ask';
 return '';
}
function reorderHomeModules(){
 var grid=document.querySelector('#home .homeModules');if(!grid)return;
 var desired=['healthradar','environment','sleep','activity','cognitive','wellbeing','nutrition','recipes','insights','ask'];
 var nodes=Array.from(grid.children);
 var by={};
 nodes.forEach(function(n){var k=tileKey(n);if(k&&!by[k])by[k]=n});
 desired.forEach(function(k){if(by[k])grid.appendChild(by[k])});
}
function ensureTile(){
 ensureStyle();
 var grid=document.querySelector('#home .homeModules');if(!grid)return;
 var tile=document.getElementById(TILE);
 if(!tile){
  tile=document.createElement('button');tile.id=TILE;tile.className='homeModule envHomeTile';
  tile.type='button';
  tile.innerHTML='<span class="env309Icon">🌿</span><b>Környezeti egészség</b><small>Időjárás · pollen · UV</small>';
  grid.appendChild(tile);
 }
 tile.onclick=function(e){if(e){e.preventDefault();e.stopPropagation()}openPage()};
 reorderHomeModules();
}

function setEnvPageState(on){
 document.documentElement.classList.toggle('hh-env309-open',!!on);
}
function hideNavs(){
 ['navTimelineBar','navHealthBar','navHomeBar','navDetailBar'].forEach(function(id){var n=document.getElementById(id);if(n)n.style.display='none'});
 var nav=document.getElementById('navHealthBar');if(nav)nav.style.display='grid';
}
function openPage(){
 var page=ensurePage();
 document.querySelectorAll('.page').forEach(function(x){x.classList.remove('on')});
 page.classList.add('on');setEnvPageState(true);hideNavs();window.scrollTo(0,0);
 if(window.HH_ENVIRONMENT_V1&&window.HH_ENVIRONMENT_V1.refresh){
  var x=current();
  if(!x||Date.now()-Date.parse(x.fetchedAt||0)>15*60*1000){
   window.HH_ENVIRONMENT_V1.refresh().then(function(){render()});
  }
 }
}
function closePage(){
 var p=document.getElementById(PAGE);if(p)p.classList.remove('on');
 setEnvPageState(false);
 if(baseShow)baseShow('home');else if(typeof window.show==='function')window.show('home');
}
function render(){
 var page=document.getElementById(PAGE);if(!page)return;
 var on=page.classList.contains('on');
 page.innerHTML=pageHtml(current());
 page.querySelector('.env309Back').onclick=function(){closePage()};
 if(heroDataUrl)page.querySelector('.env309Hero').style.backgroundImage='url("'+heroDataUrl+'")';else loadHero();
 if(on){page.classList.add('on');hideNavs()}
}
function hookShow(){
 if(window.show&&window.show.__hhEnv309)return;
 if(typeof window.show==='function'){
  baseShow=window.show;
  var wrapped=function(id){
   if(id==='environmental'||id===PAGE){openPage();return}
   var p=document.getElementById(PAGE);if(p)p.classList.remove('on');
   setEnvPageState(false);
   return baseShow.apply(this,arguments);
  };
  wrapped.__hhEnv309=true;window.show=wrapped;
 }
}
function syncSystemInfoBuild(){
 var live=(document.querySelector('meta[name="healthhub-live-build"]')||{}).content||'v309.13';
 window.HH_LIVE_BUILD=live;
 var all=Array.from(document.querySelectorAll('body *'));
 all.forEach(function(el){
  var txt=(el.textContent||'').trim();
  if(!/rendszerinf[oó]|system info/i.test(txt))return;
  var box=el.closest('section,article,.page,.modal,.card,.panel,div')||el.parentElement;
  if(!box)return;
  Array.from(box.querySelectorAll('*')).forEach(function(n){
   var t=(n.textContent||'').trim();
   if(/^v\d+(?:\.\d+)*$/i.test(t))n.textContent=live;
  });
 });
}
function decorate(){
 ensureTile();reorderHomeModules();ensurePage();hookShow();syncSystemInfoBuild();
 document.documentElement.dataset.healthhubEnvironmental='1.309.13';
}
window.hh309OpenEnvironment=openPage;
window.hh309CloseEnvironment=closePage;
window.addEventListener('healthhub:environment-updated',function(){render()});
window.addEventListener('healthhub:profile-changed',function(){render()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
setTimeout(decorate,600);setTimeout(decorate,1600);
setInterval(syncSystemInfoBuild,2500);
})();