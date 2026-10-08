(function(){
'use strict';
/* HealthHub v311: live public infection-status counters in last empty environmental hero cell. */
var PAGE='hhEnvironmental309', BLOCK='hhInfectionWatch310', CELL='hhInfectionHero311', STYLE='hhInfectionHero311Style';
var observer=null,started=false;
function el(id){return document.getElementById(id)}
function style(){
 if(el(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;
 s.textContent=
 '#'+PAGE+' #'+CELL+'{cursor:pointer;text-align:left;outline-offset:2px;min-height:45px;display:block;user-select:none}'+
 '#'+PAGE+' #'+CELL+':focus-visible{outline:2px solid #fff}'+
 '#'+PAGE+' #'+CELL+' b{font-size:12px;display:block;white-space:nowrap;letter-spacing:-.02em}'+
 '#'+PAGE+' #'+CELL+' em{font-size:6.5px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
 '#'+PAGE+' #'+CELL+' small{font-size:6.5px;overflow:visible}'+
 '#'+PAGE+' #'+CELL+'.hh311Stale{background:rgba(130,149,168,.17)!important;border:1px dashed rgba(220,230,236,.55)!important}';
 document.head.appendChild(s);
}
function data(){try{return window.HH_INFECTION_WATCH_V1&&window.HH_INFECTION_WATCH_V1.get()}catch(e){return null}}
function stale(x){var d=x&&x.periodEnd&&new Date(x.periodEnd+'T12:00:00');return !(d&&isFinite(d.getTime()))||Date.now()-d.getTime()>21*86400000}
function draw(){
 var page=el(PAGE);if(!page)return;
 var cell=page.querySelector('.env309HeroGrid .env309Reserved, .env309HeroGrid #'+CELL);
 if(!cell)return;
 var x=data();
 var yellow=0,orange=0,red=0;
 if(x&&Array.isArray(x.items)){x.items.forEach(function(v){if(v.level==='watch')yellow++;if(v.level==='elevated')orange++;if(v.level==='high')red++})}
 var isStale=!x||stale(x);
 var risk=isStale?0:red?3:orange?2:yellow?1:0;
 var cls='env309HeroMetric'+(risk?' envRisk'+risk:'')+(isStale?' hh311Stale':'');
 if(cell.className!==cls)cell.className=cls;
 if(cell.id!==CELL){cell.id=CELL;cell.setAttribute('role','button');cell.setAttribute('tabindex','0');cell.removeAttribute('aria-hidden')}
 var b=isStale?'⚪ Régi / nincs adat':'🟡 '+yellow+'  🟠 '+orange+'  🔴 '+red;
 var tail=isStale?'Forrás ellenőrzendő':('NNGYK · '+(x.sourceWeek||'—'));
 var h='<small>🦠 Fertőzési helyzet</small><b>'+b+'</b><em>'+tail+'</em>';
 if(cell.innerHTML!==h)cell.innerHTML=h;
 cell.setAttribute('aria-label','Fertőzési helyzet: '+(isStale?'nem aktuális adat':yellow+' sárga, '+orange+' narancs, '+red+' piros')+'. Ugrás a részletekhez.');
 if(!cell.__hh311Bound){
  cell.__hh311Bound=true;
  var go=function(){var d=el(BLOCK);if(d)d.scrollIntoView({behavior:'smooth',block:'start'})};
  cell.addEventListener('click',go);
  cell.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
 }
}
function init(){
 style();var page=el(PAGE);
 if(!page){setTimeout(init,450);return}
 draw();
 if(!started){
  started=true;
  observer=new MutationObserver(function(){setTimeout(draw,0)});
  observer.observe(page,{childList:true});
  setTimeout(draw,900);setTimeout(draw,2200);
  setInterval(function(){if(page.classList.contains('on'))draw()},15000);
  window.addEventListener('focus',draw);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.HH_INFECTION_HERO_V311={refresh:draw};
})();
