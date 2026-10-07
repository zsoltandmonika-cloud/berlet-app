(function(){
'use strict';
/* HealthHub v1.90 — approved Activity visual: HD hero, real period controls, vector icons */
var APPROVED_HERO='./assets/activity-hero-v190.webp';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function state(){return window.hhActivityState||(window.hhActivityState={period:'1d'})}
function color(k){return {walk:'#ff2f7f',run:'#ff9418',bike:'#168df0',workout:'#7438dc',yoga:'#f39b16',pilates:'#ff4f91',hike:'#18b878',other:'#9b38e8'}[k]||'#168df0'}
function icon(k){
 var c=color(k),g='filter="drop-shadow(0 2px 2px rgba(19,55,82,.16))"';
 if(k==='bike')return '<svg viewBox="0 0 64 64" '+g+'><g fill="none" stroke="'+c+'" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="45" r="10"/><circle cx="49" cy="45" r="10"/><path d="M15 45l12-22 12 22H15l14-13h14"/><path d="M31 18h10"/></g></svg>';
 if(k==='workout')return '<svg viewBox="0 0 64 64" '+g+'><g fill="'+c+'"><rect x="7" y="22" width="7" height="20" rx="3"/><rect x="15" y="18" width="7" height="28" rx="3"/><rect x="42" y="18" width="7" height="28" rx="3"/><rect x="50" y="22" width="7" height="20" rx="3"/><rect x="20" y="29" width="24" height="6" rx="3"/></g></svg>';
 if(k==='yoga')return '<svg viewBox="0 0 64 64" '+g+'><circle cx="32" cy="13" r="7" fill="'+c+'"/><path d="M32 22c-6 0-10 5-10 11v5l-9 7c-3 2-1 7 3 6l16-5 16 5c4 1 6-4 3-6l-9-7v-5c0-6-4-11-10-11z" fill="'+c+'"/><path d="M20 54h24" stroke="'+c+'" stroke-width="5" stroke-linecap="round"/></svg>';
 if(k==='pilates')return '<svg viewBox="0 0 64 64" '+g+'><circle cx="21" cy="14" r="6" fill="'+c+'"/><path d="M24 22l9 9 13-9M33 31l-8 13M33 31l14 8M25 44l-11 5M47 39l6 11" fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round"/><circle cx="48" cy="49" r="7" fill="none" stroke="'+c+'" stroke-width="4"/></svg>';
 if(k==='hike')return '<svg viewBox="0 0 64 64" '+g+'><circle cx="30" cy="11" r="6" fill="'+c+'"/><path d="M26 19l-6 15 9 7 3 14M24 31l15-4 8 9M35 24l10 8M48 28v28" fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 if(k==='other')return '<svg viewBox="0 0 64 64" '+g+'><g fill="'+c+'"><path d="M32 7l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"/><path d="M49 34l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M15 38l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g></svg>';
 var run=k==='run',stroke=c;
 return '<svg viewBox="0 0 64 64" '+g+'><circle cx="'+(run?38:32)+'" cy="10" r="6" fill="'+c+'"/><g fill="none" stroke="'+stroke+'" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">'+
 (run?'<path d="M34 20l-10 9 10 8 9-12 9 5M34 37l-10 17M35 38l15 12"/>':'<path d="M31 20l-6 15 7 9 1 12M26 31l-10 8M32 43l12 9"/>')+
 '</g></svg>';
}
function kpiIcon(kind){
 var c={steps:'#1597ef',cal:'#ff8a12',time:'#14b982',dist:'#6c46eb',heart:'#ff3f7e',max:'#ff3f7e',pace:'#ff3f7e',elev:'#ff3f7e'}[kind]||'#1597ef';
 if(kind==='steps')return '<svg viewBox="0 0 64 64"><g fill="'+c+'"><ellipse cx="22" cy="20" rx="9" ry="14" transform="rotate(-15 22 20)"/><ellipse cx="42" cy="35" rx="9" ry="14" transform="rotate(-15 42 35)"/><circle cx="15" cy="41" r="4"/><circle cx="20" cy="47" r="3"/><circle cx="48" cy="55" r="4"/></g></svg>';
 if(kind==='cal')return '<svg viewBox="0 0 64 64"><path d="M36 6c3 13-8 17-4 28 3-5 8-8 12-13 8 8 12 15 10 24-2 10-11 16-22 16S12 53 12 42c0-13 10-20 24-36z" fill="'+c+'"/><path d="M33 34c5 6 7 10 5 15-1 4-4 7-8 7-5 0-9-4-9-9 0-6 5-9 12-13z" fill="#ffd09b"/></svg>';
 if(kind==='time')return '<svg viewBox="0 0 64 64"><g fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round"><circle cx="32" cy="35" r="20"/><path d="M32 35V23M26 8h12M32 8v7"/></g></svg>';
 if(kind==='dist')return '<svg viewBox="0 0 64 64"><g fill="'+c+'"><path d="M18 7c-9 0-15 6-15 15 0 12 15 26 15 26s15-14 15-26C33 13 27 7 18 7zm0 20a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/><path d="M45 16c-9 0-15 6-15 15 0 12 15 26 15 26s15-14 15-26c0-9-6-15-15-15zm0 20a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/></g></svg>';
 if(kind==='max')return '<svg viewBox="0 0 64 64"><path d="M7 49l15-24 8 11 10-18 17 31z" fill="'+c+'"/><path d="M39 12l2 4 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="'+c+'"/></svg>';
 if(kind==='pace')return '<svg viewBox="0 0 64 64"><g fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round"><path d="M12 44a20 20 0 0 1 40 0"/><path d="M32 44l12-14"/></g><circle cx="32" cy="44" r="5" fill="'+c+'"/></svg>';
 if(kind==='elev')return '<svg viewBox="0 0 64 64"><g fill="'+c+'"><rect x="8" y="39" width="7" height="17" rx="3"/><rect x="19" y="29" width="7" height="27" rx="3"/><rect x="30" y="19" width="7" height="37" rx="3"/><rect x="41" y="10" width="7" height="46" rx="3"/></g></svg>';
 return '<svg viewBox="0 0 64 64"><path d="M32 55S8 42 8 24c0-9 6-15 14-15 5 0 9 3 10 7 2-4 6-7 11-7 8 0 14 6 14 15 0 18-25 31-25 31z" fill="'+c+'"/></svg>';
}
function ensureHero(){
 var h=document.querySelector('#hhActivityPage .hhActHero');if(!h)return;
 var im=h.querySelector(':scope>img');if(im&&(!im.src||im.src.indexOf('activity-hero-v190')<0))im.src=APPROVED_HERO;
 var old=h.querySelector('.hhActControls');if(old)old.style.display='none';
 h.querySelectorAll('.hit').forEach(function(x){x.style.display='none'});
 if(!h.querySelector('.hhHeroHotspots')){
  var x=document.createElement('div');x.className='hhHeroHotspots';x.innerHTML=
   '<button class="p m" onclick="hhActivitySetProfile(\'m\')" aria-label="Mónika profil"></button>'+
   '<button class="p z" onclick="hhActivitySetProfile(\'z\')" aria-label="Zsolt profil"></button>'+
   '<button class="cal" onclick="hhActivityCalendar()" aria-label="Naptár"></button>'+
   '<button class="weather" onclick="hhActivityWeather()" aria-label="Időjárás"></button>'+
   '<button class="gear" onclick="hhActivitySettings()" aria-label="Beállítások"></button>';
  h.appendChild(x);
 }
 var bar=h.querySelector('.hhPeriodBar');if(!bar){bar=document.createElement('div');bar.className='hhPeriodBar';bar.innerHTML='<button data-p="1d">Ma</button><button data-p="7d">Hét</button><button data-p="30d">Hónap</button><button data-p="365d">Év</button>';bar.addEventListener('click',function(e){var b=e.target.closest('button');if(b&&window.hhActivityPeriod)window.hhActivityPeriod(b.dataset.p)});h.appendChild(bar)}
 bar.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.dataset.p===state().period)});
}
function fixKpis(){
 var top=document.querySelectorAll('#hhActivityPage .hhActTopGrid .hhActMetric');var kinds=['steps','cal','time','dist'];top.forEach(function(m,i){var x=m.querySelector('.ico');if(x)x.innerHTML=kpiIcon(kinds[i])});
 var small=document.querySelectorAll('#hhActivityPage .hhActSmallGrid .hhActMetric');if(small.length<4)return;
 var data=[
  {kind:'heart',label:'Átlag pulzus'},
  {kind:'max',label:'Max. pulzus'},
  {kind:'pace',label:'Tempó',value:'—',unit:'perc/km'},
  {kind:'elev',label:'Szintemelkedés',value:'—',unit:'m'}
 ];
 small.forEach(function(m,i){var d=data[i],ico=m.querySelector('.ico'),lab=m.querySelector('small'),b=m.querySelector('b'),em=m.querySelector('em');if(ico)ico.innerHTML=kpiIcon(d.kind);if(lab)lab.textContent=d.label;if(i>1){if(b)b.textContent=d.value;if(em)em.textContent=d.unit}});
}
function categoryCounts(){
 var ss=(window.hhActivityCache&&window.hhActivityCache.sessions)||[],cut=Date.now()-(state().period==='1d'?1:state().period==='7d'?7:state().period==='30d'?30:365)*86400000,counts={walk:0,run:0,bike:0,workout:0,yoga:0,pilates:0,hike:0,other:0};
 function infer(s){var q=((s.title||'')+' '+(s.manualType||'')).toLocaleLowerCase('hu-HU'),t=Number(s.exerciseType);if(q.includes('pilat'))return'pilates';if(q.includes('jóga')||q.includes('yoga')||t===79)return'yoga';if(q.includes('túra')||q.includes('hike')||t===16)return'hike';if(q.includes('séta')||q.includes('gyalog')||q.includes('walk')||t===56)return'walk';if(q.includes('fut')||q.includes('run')||t===20)return'run';if(q.includes('kerék')||q.includes('bike')||q.includes('cycl')||t===2)return'bike';if(q.includes('edzés')||q.includes('erős')||q.includes('strength')||t===35)return'workout';return'other'}
 ss.forEach(function(s){if(Date.parse(s.endTime||s.startTime||0)>=cut)counts[infer(s)]++});
 return counts;
}
function fixTypes(){
 var host=document.querySelector('#hhActivityPage .hhActTypes');if(!host)return,c=categoryCounts(),defs=[['walk','Gyaloglás'],['run','Futás'],['bike','Kerékpár'],['workout','Edzés'],['yoga','Jóga'],['pilates','Pilates'],['hike','Túrázás'],['other','Egyéb']];
 host.innerHTML=defs.map(function(d,i){return '<button class="hhActType '+d[0]+(i===0?' on':'')+'" onclick="hhActivityManualOpen(\''+d[0]+'\')"><span class="vicon">'+icon(d[0])+'</span><b>'+d[1]+'</b><small>'+(c[d[0]]||0)+' alkalom</small></button>'}).join('');
}
function fixManual(){
 var card=document.querySelector('#hhActivityPage .hhActManualCard');if(!card)return;var g=card.querySelector('.hhActManualGrid');if(!g)return;var defs=[['walk','Séta'],['run','Futás'],['bike','Kerékpár'],['workout','Edzés'],['yoga','Jóga']];
 g.innerHTML=defs.map(function(d){return '<button onclick="hhActivityManualOpen(\''+d[0]+'\')"><span class="vicon">'+icon(d[0])+'</span><b>'+d[1]+'</b></button>'}).join('')+'<button onclick="hhActivityMoreManual()"><span class="moreDots">•••</span><b>További</b></button>';
}
function fixRecent(){
 document.querySelectorAll('#hhActivityPage .hhActRecent .row').forEach(function(r){var b=r.querySelector('.rT b'),i=r.querySelector('.rI');if(!b||!i)return;var q=b.textContent.toLocaleLowerCase('hu-HU'),k=q.includes('pilat')?'pilates':q.includes('jóga')?'yoga':q.includes('túra')?'hike':q.includes('fut')?'run':q.includes('séta')||q.includes('gyalog')?'walk':q.includes('kerék')?'bike':q.includes('edzés')?'workout':'other';i.innerHTML=icon(k);i.classList.add('vector')});
}
window.hhActivityMoreManual=function(){var m=document.getElementById('hhActModal');if(!m)return;m.innerHTML='<div class="hhActSheet"><div class="hhActSheetHead"><div><small>MANUÁLIS AKTIVITÁS</small><h3>További kategóriák</h3></div><button onclick="hhActivityCloseModal()">×</button></div><div class="hhMoreAct">'+[['pilates','Pilates'],['hike','Túrázás'],['other','Egyéb']].map(function(d){return '<button onclick="hhActivityManualOpen(\''+d[0]+'\')"><span>'+icon(d[0])+'</span><b>'+d[1]+'</b></button>'}).join('')+'</div></div>';m.classList.add('on')};
window.hhActivityWeather=function(){var m=document.getElementById('hhActModal');if(!m)return;var w=null;try{w=JSON.parse(localStorage.getItem('hh-budapest-weather-v144')||'null')}catch(e){};m.innerHTML='<div class="hhActSheet"><div class="hhActSheetHead"><div><small>BUDAPEST · IDŐJÁRÁS</small><h3>'+(w&&Number.isFinite(Number(w.temp))?Math.round(w.temp)+' °C':'Aktuális időjárás')+'</h3></div><button onclick="hhActivityCloseModal()">×</button></div><div class="hhWeatherMini">'+(w?'<b>'+Math.round(w.temp)+' °C</b><span>Hőérzet: '+Math.round(Number(w.apparent)||Number(w.temp))+' °C</span><span>Szél: '+Math.round(Number(w.wind)||0)+' km/h</span><span>Napkelte: '+esc((w.sunrise||'').slice(11,16))+' · Napnyugta: '+esc((w.sunset||'').slice(11,16))+'</span>':'Az időjárásadat frissítése folyamatban van.')+'</div></div>';m.classList.add('on')};
window.hhActivitySettings=function(){if(typeof window.haOpen==='function')return window.haOpen();if(typeof window.show==='function'){window.hhCloseActivity&&window.hhCloseActivity();return window.show('home')}};
function enhance(){var p=document.getElementById('hhActivityPage');if(!p||!p.classList.contains('on'))return;ensureHero();fixKpis();fixTypes();fixManual();fixRecent()}
function style(){if(document.getElementById('hh-v190-style'))return;var s=document.createElement('style');s.id='hh-v190-style';s.textContent=
'.hhActivityPage{max-width:430px!important;background:#eef9fd!important}.hhActHero{aspect-ratio:853/428!important;min-height:0!important;max-height:none!important;background:#dff2fb!important}.hhActHero>img{width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important;filter:none!important;image-rendering:auto!important}.hhActControls,.hhActHero>.hit{display:none!important}.hhHeroHotspots{position:absolute;inset:0;z-index:8;pointer-events:none}.hhHeroHotspots button{position:absolute;border:0;background:transparent;padding:0;pointer-events:auto;cursor:pointer}.hhHeroHotspots .p{top:2%;width:13%;height:29%;border-radius:50%}.hhHeroHotspots .m{left:3%}.hhHeroHotspots .z{left:16%}.hhHeroHotspots .cal{right:22.5%;top:2%;width:10%;height:20%;border-radius:50%}.hhHeroHotspots .weather{right:11.5%;top:2%;width:10%;height:20%;border-radius:50%}.hhHeroHotspots .gear{right:1%;top:2%;width:10%;height:20%;border-radius:50%}.hhPeriodBar{position:absolute;z-index:10;left:3.7%;bottom:0;width:48%;height:9.8%;display:grid;grid-template-columns:repeat(4,1fr);background:rgba(255,255,255,.96);border-radius:999px;overflow:hidden;box-shadow:0 3px 14px rgba(24,65,94,.10)}.hhPeriodBar button{border:0;background:transparent;color:#173c62;font-size:10px;font-weight:800}.hhPeriodBar button.on{color:#fff;background:linear-gradient(135deg,#ff2f7f,#ff4b8d);border-radius:999px;box-shadow:0 3px 9px rgba(255,47,127,.26)}'+
'.hhActBody{padding:7px 7px calc(78px + env(safe-area-inset-bottom))!important}.hhActTopGrid,.hhActSmallGrid{gap:7px!important;margin-bottom:7px!important}.hhActMetric{border:0!important;border-radius:15px!important;box-shadow:0 5px 17px rgba(32,84,117,.065)!important}.hhActTopGrid .hhActMetric{height:118px!important;padding:11px 9px 9px!important}.hhActSmallGrid .hhActMetric{height:82px!important;padding:10px 9px!important}.hhActMetric .ico{width:35px;height:35px;display:block!important}.hhActMetric .ico svg{width:100%;height:100%;display:block}.hhActSmallGrid .ico{width:28px;height:28px;float:left;margin-right:6px}.hhActMetric small{font-size:9px!important;color:#536d84!important;margin-top:6px!important}.hhActSmallGrid small{font-size:8px!important}.hhActMetric b{font-size:24px!important;letter-spacing:-.03em}.hhActSmallGrid b{font-size:17px!important}.hhActMetric em{font-size:9px!important}'+
'.hhActChartCard,.hhActTypesCard,.hhActRecentCard,.hhActManualCard{border:0!important;border-radius:16px!important;box-shadow:0 5px 17px rgba(32,84,117,.06)!important}.hhActChartCard{height:166px!important;padding:10px 11px 8px!important}.hhActChart{height:129px!important}.hhActTitle>span{font-size:20px!important}.hhActTitle>b{font-size:12px!important}.hhActTitle>strong{font-size:9px!important}.hhActTitle .leg{font-size:7px!important}'+
'.hhActTypesCard{height:auto!important;padding:10px 11px 11px!important}.hhActTypes{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}.hhActTypes>button.hhActType{height:86px!important;border:1px solid #e7edf3!important;border-radius:14px!important;background:linear-gradient(180deg,#fff,#f8fbfd)!important;padding:7px 3px!important;color:#143b5f!important}.hhActTypes>button.hhActType.on{border:1.5px solid #ff2f7f!important;background:#fff7fb!important}.hhActTypes .vicon{display:block;width:35px;height:35px;margin:0 auto 2px}.hhActTypes .vicon svg{width:100%;height:100%;display:block}.hhActTypes .hhActType b{font-size:9px!important}.hhActTypes .hhActType small{font-size:7px!important}'+
'.hhActRecentCard{padding:10px 11px 9px!important}.hhActRecent .row{grid-template-columns:38px minmax(0,1fr) auto 10px!important;min-height:47px!important}.hhActRecent .rI.vector{width:34px!important;height:34px!important;background:#f2f8fc!important;padding:5px;box-sizing:border-box}.hhActRecent .rI.vector svg{width:100%;height:100%;display:block}.hhActRecent .rT b{font-size:9px!important}.hhActRecent .rT small{font-size:7px!important}.hhActRecent .rS span{font-size:7px!important}'+
'.hhActManualCard{padding:10px 11px 11px!important}.hhActManualGrid{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:6px!important}.hhActManualGrid button{height:58px!important;display:flex!important;flex-direction:column!important;gap:1px!important;border:1px solid #e9eef3!important;background:#f9fbfd!important}.hhActManualGrid .vicon{width:26px;height:26px}.hhActManualGrid .vicon svg{width:100%;height:100%;display:block}.hhActManualGrid button b{font-size:7px!important}.hhActManualGrid .moreDots{font-size:19px;color:#294e6c;font-weight:900;line-height:26px}'+
'.hhMoreAct{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.hhMoreAct button{border:1px solid #e5edf3;background:#fff;border-radius:15px;padding:12px;color:#173f62}.hhMoreAct span{display:block;width:48px;height:48px;margin:auto}.hhMoreAct svg{width:100%;height:100%}.hhMoreAct b{display:block;font-size:10px;margin-top:4px}.hhWeatherMini{display:grid;gap:7px;background:#fff;border:1px solid #e6edf3;border-radius:15px;padding:13px;color:#173f62}.hhWeatherMini b{font-size:24px}.hhWeatherMini span{font-size:10px;color:#6f8597}'+
'.hhActNav{height:60px!important;max-width:430px!important}.hhActNav button span{font-size:22px!important}.hhActNav button b{font-size:8px!important}@media(max-width:380px){.hhPeriodBar button{font-size:9px}.hhActTopGrid .hhActMetric{height:110px!important}.hhActMetric b{font-size:21px!important}.hhActSmallGrid{grid-template-columns:repeat(4,minmax(0,1fr))!important}.hhActManualGrid{grid-template-columns:repeat(3,1fr)!important}.hhActRecent .rS span:nth-child(1){display:none!important}}';
 document.head.appendChild(s)}
style();
var obs=new MutationObserver(function(){clearTimeout(window.__hh190);window.__hh190=setTimeout(enhance,35)});
function start(){var p=document.getElementById('hhActivityPage');if(p)obs.observe(p,{childList:true,subtree:true});enhance()}
setTimeout(start,200);setInterval(function(){var p=document.getElementById('hhActivityPage');if(p&&p.classList.contains('on'))enhance()},4000);
var op=window.hhOpenActivity;if(typeof op==='function')window.hhOpenActivity=function(){var r=op.apply(this,arguments);setTimeout(enhance,80);return r};
var per=window.hhActivityPeriod;if(typeof per==='function')window.hhActivityPeriod=function(v){state().period=v;var r=per.apply(this,arguments);setTimeout(enhance,90);return r};
document.documentElement.dataset.healthhubActivity='1.90';
window.HH_LIVE_BUILD='v1.90-activity-approved';
})();