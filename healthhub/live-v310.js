(function(){
'use strict';
/* HealthHub v310 - Infection Watch V1: public, source-week dated NNGYK observations.
   Integrates under Environmental Health; does not touch user health profiles or vault. */
var PAGE='hhEnvironmental309', ID='hhInfectionWatch310', STYLE='hhInfectionWatch310Style';
var URL='./data/infection-watch.json', CACHE='hh-infection-watch-public-v1';
var current=null, lastFetch=0, inFlight=null, observer=null, installed=false;
var levels={low:['🟢','Alacsony'],watch:['🟡','Figyelendő'],elevated:['🟠','Országos emelkedés'],high:['🔴','Magas'],unknown:['⚪','Nincs trendadat']};
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function date(x){var d=new Date(x+'T12:00:00');return isNaN(d)?'—':d.toLocaleDateString('hu-HU',{month:'2-digit',day:'2-digit'})}
function old(x){return x&&Date.now()-Date.parse(x.periodEnd+'T12:00:00')>21*86400000}
function valid(d){return !!(d&&d.schema==='healthhub.infection-watch/1'&&Array.isArray(d.items)&&d.periodEnd&&d.sources)}
function style(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;
 s.textContent=
 '#'+ID+'{margin:14px 0 8px;padding:14px;border-radius:18px;background:rgba(255,255,255,.96);border:1px solid #dbe9ef;box-shadow:0 6px 19px rgba(24,68,99,.06);color:#214762}'+
 '#'+ID+' .iw310Header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}'+
 '#'+ID+' h2{font-size:17px;margin:0;font-weight:900;letter-spacing:-.02em}'+
 '#'+ID+' .iw310Sub{font-size:10px;color:#678092;margin-top:4px;line-height:1.45}'+
 '#'+ID+' .iw310Update{border:1px solid #d4e5ea;background:#f5fbfd;color:#35617e;border-radius:30px;padding:7px 10px;font-size:10px;font-weight:800;white-space:nowrap}'+
 '#'+ID+' .iw310Notice{margin:10px 0;padding:10px;border-radius:12px;background:#fff8e4;border:1px solid #f1d99c;color:#795b20;font-size:11px;font-weight:800}'+
 '#'+ID+' .iw310Notice small{display:block;margin-top:4px;font-size:9px;font-weight:500;line-height:1.4}'+
 '#'+ID+' .iw310Rows{display:grid;gap:6px}'+
 '#'+ID+' .iw310Row{background:#f6fafc;border:1px solid #e4ecf0;border-radius:12px;padding:9px 10px}'+
 '#'+ID+' .iw310RowTop{display:flex;align-items:center;gap:8px;min-width:0}'+
 '#'+ID+' .iw310Mark{font-size:18px;flex:0 0 auto}'+
 '#'+ID+' .iw310RowText{min-width:0;flex:1}'+
 '#'+ID+' .iw310RowText b{font-size:12px;display:block;color:#173c5a}'+
 '#'+ID+' .iw310RowText em{font-size:10px;font-style:normal;font-weight:800;color:#51708a;display:block;margin-top:3px}'+
 '#'+ID+' .iw310Scope{display:block;font-size:8px;background:#e6f1f6;border-radius:99px;padding:4px 7px;color:#567a91;text-align:right;max-width:125px;line-height:1.25}'+
 '#'+ID+' .iw310Row p{font-size:10px;line-height:1.5;color:#526f82;margin:6px 0 0 26px}'+
 '#'+ID+' details{margin:5px 0 0 26px;color:#496b83;font-size:10px;line-height:1.5}'+
 '#'+ID+' summary{cursor:pointer;font-weight:800;color:#286c9a}'+
 '#'+ID+' .iw310Foot{margin-top:10px;font-size:9px;color:#708798;line-height:1.6}'+
 '#'+ID+' .iw310Foot a{color:#226e9c;font-weight:800;text-decoration:none;margin-right:12px}'+
 '#'+ID+' .iw310Stale{margin:9px 0;padding:9px;border-radius:10px;background:#f2f3f4;color:#5d6a70;font-size:10px}'+
 '#'+ID+' .iw310Error{font-size:11px;color:#687d8c;padding:12px 3px}'+
 '@media(min-width:700px){#'+ID+' .iw310Rows{grid-template-columns:repeat(2,minmax(0,1fr))}#'+ID+' .iw310Row:last-child{grid-column:1/-1}}'+
 '@media(max-width:370px){#'+ID+' .iw310Scope{max-width:75px;font-size:7px}#'+ID+' .iw310RowText b{font-size:11px}}';
 document.head.appendChild(s);
}
function row(x){
 var l=levels[x.level]||levels.unknown;
 return '<div class="iw310Row"><div class="iw310RowTop"><span class="iw310Mark" aria-label="'+esc(l[1])+'">'+l[0]+'</span>'+
 '<div class="iw310RowText"><b>'+esc(x.name)+'</b><em>'+esc(x.label)+'</em></div>'+
 '<span class="iw310Scope">'+esc(x.scope)+'</span></div>'+
 '<p>'+esc(x.summary)+'</p><details><summary>Részletek</summary>'+esc(x.detail)+'</details></div>';
}
function html(){
 if(!current)return '<div class="iw310Header"><div><h2>🦠 Fertőzési helyzet</h2><div class="iw310Sub">NNGYK · heti járványügyi adatok</div></div><button class="iw310Update" type="button">Frissítés ↻</button></div><div class="iw310Error">Hivatalos járványügyi forrásadat betöltése…</div>';
 var d=current, s=d.sources||{};
 return '<div class="iw310Header"><div><h2>🦠 Fertőzési helyzet</h2>'+
 '<div class="iw310Sub">'+esc(d.geography)+' · Forrásadat: NNGYK · '+esc(d.sourceWeek)+' ('+date(d.periodStart)+'–'+date(d.periodEnd)+')</div></div>'+
 '<button class="iw310Update" type="button" title="A HealthHubban eltárolt hivatalos forrásadat újraellenőrzése">Frissítés ↻</button></div>'+
 (old(d)?'<div class="iw310Stale">⏳ A forrásadat több mint 3 hetes. Nem tekinthető aktuális helyzetértékelésnek; új NNGYK-jelentés szükséges.</div>':'')+
 '<div class="iw310Notice">🟡 '+esc(d.overall.label)+'<small>'+esc(d.overall.description)+'</small></div>'+
 '<div class="iw310Rows">'+d.items.map(row).join('')+'</div>'+
 '<div class="iw310Foot">'+esc(d.methodology)+'<br>'+
 '<a target="_blank" rel="noopener noreferrer" href="'+esc(s.respiratory)+'">Légúti jelentés ↗</a>'+
 '<a target="_blank" rel="noopener noreferrer" href="'+esc(s.weekly)+'">Fertőző betegségek ↗</a>'+
 '<a target="_blank" rel="noopener noreferrer" href="'+esc(s.weeklyPdf)+'">Heti PDF ↗</a>'+
 '<br>Adatok ellenőrizve: '+esc(d.reviewedOn)+' · A frissítés a HealthHub publikált adatkészletét olvassa újra; új NNGYK-adat csak adatfrissítés után jelenik meg.</div>';
}
function repaint(){
 var c=document.getElementById(ID);if(!c)return;
 c.innerHTML=html();
 c.querySelector('.iw310Update').addEventListener('click',function(){refresh(true)});
}
function mount(){
 var page=document.getElementById(PAGE);
 if(!page)return false;
 style();
 var body=page.querySelector('.env309Body');
 if(body&&!body.querySelector('#'+ID)){
  var x=document.createElement('section');x.id=ID;x.setAttribute('aria-label','Fertőzési helyzet, heti járványügyi figyelő');
  var source=body.querySelector('.env309Source');body.insertBefore(x,source||null);
  repaint();
 }
 if(!installed){
  observer=new MutationObserver(function(){mount()});
  observer.observe(page,{childList:true});
  installed=true;
 }
 return true;
}
function refresh(force){
 if(inFlight)return inFlight;
 if(!force&&current&&Date.now()-lastFetch<6*3600000)return Promise.resolve(current);
 inFlight=fetch(URL+'?t='+Math.floor(Date.now()/(6*3600000)),{cache:'no-store'}).then(function(r){
  if(!r.ok)throw Error('HTTP '+r.status);return r.json();
 }).then(function(x){
  if(!valid(x))throw Error('Hibás forrásadat');
  current=x;lastFetch=Date.now();
  try{localStorage.setItem(CACHE,JSON.stringify(x))}catch(e){}
  repaint();return x;
 }).catch(function(e){
  if(!current){
   var c=document.getElementById(ID);
   if(c){c.innerHTML='<h2>🦠 Fertőzési helyzet</h2><div class="iw310Error">A jelentés jelenleg nem tölthető be. A korábbi adatok hiányában nem jelenítünk meg becsült fertőzési szinteket.</div>';}
  }
  return null;
 }).finally(function(){inFlight=null});
 return inFlight;
}
function init(){
 try{var c=JSON.parse(localStorage.getItem(CACHE)||'null');if(valid(c))current=c}catch(e){}
 if(!mount()){setTimeout(init,400);return}
 repaint();refresh(false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('focus',function(){if(Date.now()-lastFetch>6*3600000)refresh(false)});
window.HH_INFECTION_WATCH_V1={refresh:refresh,get:function(){return current}};
})();
