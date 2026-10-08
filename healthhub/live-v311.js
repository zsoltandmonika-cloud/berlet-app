(function(){
'use strict';
/* HealthHub v311.3: compact, attention-only infection signals in the last environmental hero cell.
   Shows disease names rather than category totals. Official NNGYK week is source-dated. */
var PAGE='hhEnvironmental309', BLOCK='hhInfectionWatch310', CELL='hhInfectionHero311', STYLE='hhInfectionHero311Style';
var observer=null,started=false;
var LEVEL={watch:{order:1,name:'Sárga'},elevated:{order:2,name:'Narancs'},high:{order:3,name:'Piros'}};
var NAMES={influenza:'Influenza',covid:'COVID-19',rsv:'RSV',gastro:'Bélfertőzés',hepatitis:'Hepatitis A'};
function el(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function style(){
 if(el(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;
 s.textContent=
 '#'+PAGE+' #'+CELL+'{cursor:pointer;outline-offset:2px;min-height:45px;max-height:100%;box-sizing:border-box;padding:4px 4px 3px!important;display:flex;flex-direction:column;align-items:stretch;gap:1px;overflow:hidden;user-select:none;text-align:left}'+
 '#'+PAGE+' #'+CELL+':focus-visible{outline:2px solid #fff}'+
 '#'+PAGE+' #'+CELL+' .hh311Heading{display:flex;flex-direction:row;align-items:center;gap:3px;min-width:0;min-height:17px;margin:0 0 1px}'+
 '#'+PAGE+' #'+CELL+' .hh311Icon{display:block;flex:0 0 16px;width:16px;font-size:16px!important;line-height:17px;text-align:center;filter:drop-shadow(0 1px 2px rgba(0,75,40,.24))}'+
 '#'+PAGE+' #'+CELL+' .hh311TitleWords{display:flex;min-width:0;flex-direction:column;align-items:flex-start;font-size:7px!important;font-weight:900;line-height:8px;letter-spacing:-.12px;text-transform:none}'+
 '#'+PAGE+' #'+CELL+' .hh311TitleWords span{display:block;white-space:nowrap}'+
 '#'+PAGE+' #'+CELL+' .hh311Signals{display:flex;flex-direction:column;min-width:0;gap:1px}'+
 '#'+PAGE+' #'+CELL+' .hh311Signal{display:flex;align-items:center;gap:3px;min-width:0;line-height:8px;font-size:7px;font-weight:800;white-space:nowrap}'+
 '#'+PAGE+' #'+CELL+' .hh311Dot{width:5px;height:5px;border-radius:50%;display:inline-block;flex:0 0 5px;border:1px solid rgba(255,255,255,.65);box-sizing:content-box}'+
 '#'+PAGE+' #'+CELL+' .hh311Dot.watch{background:#f4cb41}'+
 '#'+PAGE+' #'+CELL+' .hh311Dot.elevated{background:#ff9b3d}'+
 '#'+PAGE+' #'+CELL+' .hh311Dot.high{background:#ff5064}'+
 '#'+PAGE+' #'+CELL+' .hh311Disease{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
 '#'+PAGE+' #'+CELL+' .hh311Extra{font-size:6px;line-height:7px;font-weight:800}'+
 '#'+PAGE+' #'+CELL+' .hh311Empty{display:block;font-size:6.8px;line-height:9px;font-weight:800}'+
 '#'+PAGE+' #'+CELL+' .hh311Source{display:block;margin-top:auto;font-size:5.6px!important;line-height:6px!important;font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:clip;opacity:.86}'+
 '#'+PAGE+' #'+CELL+'.hh311Stale{background:rgba(130,149,168,.17)!important;border:1px dashed rgba(220,230,236,.55)!important}';
 document.head.appendChild(s);
}
function data(){try{return window.HH_INFECTION_WATCH_V1&&window.HH_INFECTION_WATCH_V1.get()}catch(e){return null}}
function stale(x){var d=x&&x.periodEnd&&new Date(x.periodEnd+'T12:00:00');return !(d&&isFinite(d.getTime()))||Date.now()-d.getTime()>21*86400000}
function row(v){
 return '<span class="hh311Signal"><i aria-hidden="true" class="hh311Dot '+v.level+'"></i><span class="hh311Disease">'+esc(NAMES[v.key]||v.name)+'</span></span>';
}
function draw(){
 var page=el(PAGE);if(!page)return;
 var cell=page.querySelector('.env309HeroGrid .env309Reserved, .env309HeroGrid #'+CELL);
 if(!cell)return;
 var x=data(),isStale=!x||stale(x);
 var signals=!isStale&&Array.isArray(x.items)?x.items.filter(function(i){return Object.prototype.hasOwnProperty.call(LEVEL,i.level)}):[];
 signals.sort(function(a,b){return LEVEL[b.level].order-LEVEL[a.level].order});
 var risk=isStale?0:signals.length?LEVEL[signals[0].level].order:0;
 var cls='env309HeroMetric'+(risk?' envRisk'+risk:'')+(isStale?' hh311Stale':'');
 if(cell.className!==cls)cell.className=cls;
 if(cell.id!==CELL){cell.id=CELL;cell.setAttribute('role','button');cell.setAttribute('tabindex','0');cell.removeAttribute('aria-hidden')}
 var title='<span class="hh311Heading"><span class="hh311Icon" aria-hidden="true">🦠</span><span class="hh311TitleWords"><span>Fertőzési</span><span>Helyzet</span></span></span>';
 var shown=signals.slice(0,2);
 var extra=signals.length>shown.length?'<span class="hh311Extra">+'+(signals.length-shown.length)+' további</span>':'';
 var main=isStale?'<span class="hh311Empty">⚪ Régi adat</span>':
  signals.length?'<span class="hh311Signals">'+shown.map(row).join('')+extra+'</span>':
  '<span class="hh311Empty">🟢 Nincs kiemelt</span>';
 var week=x&&x.sourceWeek?String(x.sourceWeek).replace(/^\d{4}\.\s*/, ''):'—';
 var foot='<em class="hh311Source">NNGYK · '+esc(week)+'</em>';
 var h=title+main+foot;
 if(cell.innerHTML!==h)cell.innerHTML=h;
 var full=isStale?'Elavult vagy hiányzó NNGYK-adatok':signals.length?
  signals.map(function(s){return (NAMES[s.key]||s.name)+' '+LEVEL[s.level].name}).join(', '):
  'Nincs kiemelt fertőzési jelzés';
 cell.setAttribute('aria-label','Fertőzési helyzet. '+full+'. Részletek megnyitása.');
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
