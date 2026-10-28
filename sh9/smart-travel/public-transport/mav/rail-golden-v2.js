/* SH9 MÁV Smart Rail v2: transform functional v1 into prototype-accurate,
   accessible interactive DOM. No fake phone status bar and no invented live data.
   Existing v1 handlers retain authority over route selection, profile and audio.
*/
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const shell=document.querySelector('main.shell'),hero=shell?.querySelector('.hero');
 const planner=$('plannerTitle')?.closest('section'),profile=$('profile');
 if(!shell||!hero||!planner||!profile)return;
 const ICONS={
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  train:'<rect x="5" y="2" width="14" height="17" rx="3"/><path d="M5 9h14M5 15h14M8 22l2-3m6 0 2 3"/><circle cx="8.5" cy="15.5" r=".6"/><circle cx="15.5" cy="15.5" r=".6"/>',
  ticket:'<path d="M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4z"/><path d="M12 6v12" stroke-dasharray="2 2"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15"/>',
  star:'<path d="m12 2 3.1 6.3 7 .99-5.04 4.9 1.2 6.9L12 17.9l-6.26 3.2 1.2-6.9L1.9 9.3l7-.99z"/>',
  station:'<path d="m3 21 9-18 9 18M5 9h14M8 15h8M11 10v11m2-11v11"/>',
  more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  car:'<path d="m5 17-1 3m15-3 1 3M5 13l2-6h10l2 6m-15 0h16v5H4z"/><circle cx="7.5" cy="16.5" r="1"/><circle cx="16.5" cy="16.5" r="1"/>',
  plane:'<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
  house:'<path d="M3 11 12 3l9 8v10h-7v-7h-4v7H3z"/>',
  grid:'<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/>',
  arrow:'<path d="M19 12H5m7-7-7 7 7 7"/>',
  refresh:'<path d="M3 11a9 9 0 0 1 15.4-5.4L21 8m0-5v5h-5M21 13a9 9 0 0 1-15.4 5.4L3 16m5 0H3v5"/>'
 };
 function icon(key){
  return '<svg aria-hidden="true" viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(ICONS[key]||ICONS.train)+'</svg>';
 }
 function el(tag,cls,text){
  const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;
 }
 function link(href,cls,label,ico,external){
  const e=el('a',cls);e.href=href;e.innerHTML='<span class="rail-icon">'+icon(ico)+'</span><span>'+label+'</span>';
  if(external){e.target='_blank';e.rel='noopener noreferrer external';}
  return e;
 }
 const OFFICIAL='https://mavplusz.hu/',TICKETS='https://jegy.mav.hu/';
 // Keep all hero pixels photographic. There is deliberately no fabricated clock/battery/wifi overlay.
 const back=el('a','rail-back');back.href='../';back.setAttribute('aria-label','Vissza a Tömegközlekedéshez');back.innerHTML=icon('arrow');hero.append(back);
 hero.append(profile);
 const signal=$('signal');if(signal){hero.append(signal);/* title and state belong to the v1 audio controller */}
 const short=el('section','rail-shortcuts');short.setAttribute('aria-label','MÁV gyors funkciók');
 function shortcut(label,ico,fn,active){
  const b=el('button','rail-shortcut');b.type='button';b.innerHTML='<span class="rail-icon">'+icon(ico)+'</span><span>'+label+'</span>';
  if(active)b.setAttribute('aria-current','true');b.addEventListener('click',fn);short.append(b);
 }
 function scrollTo(id){const p=$(id);if(p)p.scrollIntoView({behavior:'smooth',block:'start'});}
 function openOfficial(url){window.open(url,'_blank','noopener,noreferrer');}
 shortcut('Útvonal','search',()=>scrollTo('plannerTitle'),true);
 shortcut('Menetrend','clock',()=>openOfficial(OFFICIAL));
 shortcut('Kedvencek','heart',()=>scrollTo('favoriteTitle'));
 shortcut('Élő vonatok','train',()=>openOfficial(OFFICIAL));
 shortcut('Jegyek ↗','ticket',()=>openOfficial(TICKETS));
 hero.after(short);
 // Reuse all working v1 planner controls: change only layout and appearance.
 planner.classList.add('rail-planner');
 const head=planner.querySelector('.section-header'),modes=planner.querySelector('.mode');
 if(head&&modes){
  const wrap=el('div','rail-planner-head');head.before(wrap);wrap.append(head,modes);
 }
 const route=planner.querySelector('.route-grid'),when=$('whenBox');
 if(route&&when){
  const body=el('div','rail-planner-body');route.before(body);body.append(route);
  const tile=el('div','rail-time-tile');
  const live=el('div','rail-now');live.id='railNow';
  tile.append(live,when);body.append(tile);
  function timeText(){
   const now=new Date();
   const opts={month:'short',day:'numeric',weekday:'short'};
   const date=now.toLocaleDateString('hu-HU',opts).replace(/\.$/,'');
   const clock=now.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'});
   live.innerHTML='<span class="rail-icon">'+icon('clock')+'</span><span class="rail-date">'+date+'<br>'+clock+'</span>';
  }
  function syncDate(){const active=planner.querySelector('.mode [aria-pressed="true"]')?.dataset.mode||'now';live.hidden=active!=='now';timeText();}
  planner.querySelectorAll('.mode button').forEach(b=>b.addEventListener('click',syncDate));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncDate()});
  syncDate();
 }
 const primary=$('openPlanner'),actions=planner.querySelector('.actions');
 if(primary){
  primary.textContent='⌕  Útvonal keresése ↗';
  const wrap=el('div','rail-planner-actions');primary.before(wrap);wrap.append(primary);
  const refresh=el('button','rail-refresh','↻  Útvonalak frissítése');refresh.type='button';
  refresh.title='Az aktuális menetrend csak a hivatalos MÁVPlusz oldalon ellenőrizhető';
  refresh.addEventListener('click',()=>{
   const j=window.SH9_MAV_RAIL_V1?.journey($('from')?.value,$('to')?.value);
   if(!j){$('status').textContent='Válassz két különböző állomást.';return;}
   $('status').textContent='A hivatalos MÁVPlusz menetrendjét nyitjuk meg. Az SH9 nem közöl ellenőrizetlen időpontot.';
   openOfficial(OFFICIAL);
  });
  wrap.append(refresh);
 }
 // The image-generated prototype contains illustrative departures. We do not pass
 // those fictional times or platforms off as real MÁV information.
 const departures=el('section','rail-departures');departures.id='railDepartures';departures.setAttribute('aria-labelledby','railDeparturesTitle');
 const depHead=el('div','section-header');
 const title=el('h2','', 'Következő járatok');title.id='railDeparturesTitle';title.insertAdjacentHTML('afterbegin',icon('train'));
 const all=el('a','rail-open-all','Összes találat ↗');all.href=OFFICIAL;all.target='_blank';all.rel='noopener noreferrer external';
 depHead.append(title,all);departures.append(depHead);
 departures.append(el('p','rail-demo-tag','Kártyanézet · jelenleg nincs hitelesített élő menetrendi adatkapcsolat'));
 const list=el('div','rail-train-list');
 const examples=[
  ['SAJÓ Expressz · 15406','A hero-képen szereplő járat · illusztráció'],
  ['InterCity járatok','Indulások, átszállások és helyjegyek: MÁVPlusz'],
  ['InterRégió járatok','Aktuális megállók és időpontok: MÁVPlusz']
 ];
 const trainSvg='<svg viewBox="0 0 60 46" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 29V14Q5 6 18 5h24q13 1 13 9v15l-6 8H11L5 29Z" fill="#ebf7ff" stroke="#0b4d99" stroke-width="3"/><path d="M14 10h32l7 14H9l5-14Z" fill="#1a65aa"/><path d="M10 31h42" stroke="#f3d449" stroke-width="4"/><path d="m17 38-4 5m30-5 4 5" stroke="#0b1d3b" stroke-width="3"/><circle cx="14" cy="29" r="2" fill="#ffdf77"/><circle cx="46" cy="29" r="2" fill="#ffdf77"/></svg>';
 examples.forEach((data,i)=>{
  const row=el('button','rail-train-row');row.type='button';row.setAttribute('aria-label',data[0]+'. Hivatalos MÁVPlusz megnyitása');
  const thumb=el('span','rail-train-thumb');thumb.innerHTML=trainSvg;
  const copy=el('span','rail-train-main');copy.append(el('strong','',data[0]),el('small','',data[1]));
  const go=el('span','rail-go','›');row.append(thumb,copy,go);row.addEventListener('click',()=>openOfficial(OFFICIAL));
  list.append(row);
 });
 departures.append(list);
 planner.after(departures);
 // Six actual action surfaces as in prototype. Never create inert decoration.
 const util=el('section','rail-utils');util.setAttribute('aria-label','Vasúti segédfunkciók');
 function utility(label,ico,run,url){
  let b;
  if(url){b=link(url,'rail-util',label,ico,true)} else {
   b=el('button','rail-util');b.type='button';b.innerHTML='<span class="rail-icon">'+icon(ico)+'</span><span>'+label+'</span>';
   b.addEventListener('click',run);
  }
  util.append(b);
 }
 utility('Térkép','map',()=>{$('maps')?.click()});
 utility('Kedvenc vonalak','star',()=>scrollTo('favoriteTitle'));
 utility('Indulási tábla','clock',null,OFFICIAL);
 utility('Állomásinfó','station',null,OFFICIAL);
 utility('Jegyvásárlás','ticket',null,TICKETS);
 utility('Egyebek','more',()=>{const p=$('preferences');if(!p)return;p.open=true;p.scrollIntoView({behavior:'smooth',block:'center'});});
 departures.after(util);
 // The local profile favorites and preferences remain visible and user-editable below first screen.
 const fav=$('favoriteTitle')?.closest('section');
 if(fav)fav.classList.add('rail-user-area');
 const nav=document.querySelector('nav.nav');
 if(nav){
  nav.replaceChildren(
   link('../../../','', 'Kezdőlap','house'),
   link('../bkk/','','BKK','train'),
   link('./','','MÁV','train'),
   link('../../','','Autó','car'),
   link('../../','','Utazás','plane'),
   link('../../../','','További','grid')
  );
  nav.children[2].setAttribute('aria-current','page');
 }
})();
