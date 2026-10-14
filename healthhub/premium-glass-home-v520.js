/* HealthHub v520 Premium Glass Home opt-in.
   Activated only by ?hhpremium=1. The underlying application remains authoritative:
   profile state, real module routes, health data, archives and permissions never cloned. */
(function(root){
 'use strict';
 var params;
 try{params=new URLSearchParams(root.location.search)}catch(_){return}
 if(params.get('hhpremium')!=='1')return;
 var ICONS={
  health:'<path d="M20 7.5a5 5 0 0 0-8 0 5 5 0 0 0-8 0c-3 3 0 7 8 13 8-6 11-10 8-13Z"/><path d="M6 12h4l2-3 2 6 2-3h2"/>',
  records:'<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5M9 12h8M9 16h8"/>',
  meds:'<path d="M9 18 18 9a4 4 0 0 0-6-6L3 12a4 4 0 0 0 6 6Z"/><path d="m8 7 9 9"/>',
  sleep:'<path d="M21 15.2A9 9 0 0 1 8.8 3 9 9 0 1 0 21 15.2Z"/><path d="M16 4v4m-2-2h4"/>',
  activity:'<circle cx="16.5" cy="4" r="2"/><path d="m14 9-3 5-5 1m8-6 4 3 3 1m-9 1 3 3-2 5M11 7 6 9l-2 4"/>',
  digital:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 5h4M11 19h2M4 8v8"/>',
  nutrition:'<path d="M20 4C11 4 4 7 4 16a4 4 0 0 0 4 4c9 0 12-7 12-16Z"/><path d="M5 19c4-5 7-7 12-10"/>',
  ask:'<path d="M12 3a9 9 0 0 0-9 9 8 8 0 0 0 2 5l-1 4 5-2a9 9 0 1 0 3-16Z"/><path d="M8.5 12h7M12 8.5v7"/>',
  timeline:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3M14 15h2"/>',
  spark:'<path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z"/><path d="M19 17v5m-2.5-2.5h5M4 18v4m-2-2h4"/>',
  headline:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h4M7 16h4M14 12h3v4h-3z"/>',
  dailyhealth:'<path d="M20 7a5 5 0 0 0-8 0 5 5 0 0 0-8 0c-3 3 0 7 8 13 8-6 11-10 8-13Z"/><path d="M5 13h4l2-3 2 6 2-3h5"/>'
 };
 var TILES=[
  ['health','Egészség'],['records','Leletek'],['meds','Gyógyszerek'],
  ['sleep','Alvás'],['activity','Aktivitás'],['digital','Digital Health'],
  ['nutrition','Nutrition'],['ask','Ask Léna'],['timeline','Idővonal'],
  ['spark','Daily Spark'],['headline','Daily Headline'],['dailyhealth','Daily Health']
 ];
 var style=document.createElement('link');
 style.rel='stylesheet';style.href='./premium-glass-home-v520.css?v=523-approved-budapest-hero';
 document.head.appendChild(style);
 function legacyButton(name){
  var buttons=document.querySelectorAll('#home .homeModules .homeModule');
  for(var i=0;i<buttons.length;i++){
   var b=buttons[i].querySelector('b');
   if(b&&(b.textContent||'').trim().toLowerCase()===name.toLowerCase())return buttons[i];
  }
  return null;
 }
 function fallbackClick(name){
  var b=legacyButton(name);
  if(b){b.click();return true}
  return false;
 }
 function showPage(id){if(typeof root.show==='function'){root.show(id);return true}return false}
 function message(msg){if(typeof root.toast==='function')root.toast(msg);else root.alert(msg)}
 function go(key){
  // Always use existing app modules and permissions, never reproduce source data.
  if(key==='health')return showPage('health');
  if(key==='records'||key==='meds'){
   showPage('health');
   var section=key==='records'?'records':'medications';
   if(typeof root.openHealthSection==='function'){
    try{root.openHealthSection(section);return true}catch(_){}
   }
   var quick=document.querySelectorAll('#health .quick .q');
   if(quick.length>=3){quick[key==='records'?1:2].click();return true}
   return true;
  }
  if(key==='sleep')return fallbackClick('Sleep')||message('Az Alvás modul még töltődik.');
  if(key==='activity'){
   if(typeof root.hhOpenActivity==='function'){root.hhOpenActivity();return true}
   return fallbackClick('Activity')||message('Az Aktivitás modul még töltődik.');
  }
  if(key==='digital'){root.location.assign(new URL('./digital-health/',root.location.href).href);return true}
  if(key==='nutrition'){
   return fallbackClick('Nutrition')||message('A Nutrition és a Receptár összekapcsolása előkészítés alatt.');
  }
  if(key==='ask'){
   if(typeof root.hhOpenLenaSmart299==='function'){root.hhOpenLenaSmart299();return true}
   return fallbackClick('Ask Léna')||message('Az Ask Léna modul még töltődik.');
  }
  if(key==='timeline')return showPage('timeline');
  if(key==='spark')return showPage('spark');
  if(key==='headline')return showPage('briefing');
  if(key==='dailyhealth'){
   var health=document.getElementById('hhDailyHealthStrip312');
   if(health){health.click();return true}
   if(root.HH_DAILY_HEALTH_V312&&typeof root.HH_DAILY_HEALTH_V312.open==='function'){
    root.HH_DAILY_HEALTH_V312.open();return true;
   }
   message('A Daily Health még betöltődik.');return false;
  }
 }
 function profile(){
  var p;
  try{p=root.localStorage.getItem('hh-profile')}catch(_){}
  return p==='m'||p==='monika'?'m':'z';
 }
 function updateProfile(){
  var p=profile();
  document.documentElement.dataset.hhpgProfile=p;
  var hit=document.querySelector('#home #heroHome .profileHit');
  if(hit){
   hit.setAttribute('aria-label','Profilváltás · '+(p==='m'?'Mónika':'Zsolt'));
   hit.title='Profilváltás';
   var avatar=document.querySelectorAll('#overlay .choice img')[p==='m'?1:0];
   if(avatar&&avatar.src)hit.style.backgroundImage='url("'+avatar.src+'")';
  }
 }
 function makeTile(tile){
  var key=tile[0],label=tile[1],el=document.createElement('button');
  el.type='button';el.className='hhpg-tile';el.dataset.key=key;
  el.dataset.group=['spark','headline','dailyhealth'].indexOf(key)>=0?'daily':'main';
  el.setAttribute('aria-label',label+' megnyitása');
  var img=document.createElement('span');img.className='hhpg-icon';
  img.setAttribute('aria-hidden','true');
  img.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+ICONS[key]+'</svg>';
  var txt=document.createElement('span');txt.className='hhpg-label';txt.textContent=label;
  el.appendChild(img);el.appendChild(txt);
  el.addEventListener('click',function(){go(key)});
  return el;
 }
 function mount(){
  if(document.getElementById('hhPremiumGrid520'))return;
  var old=document.querySelector('#home .homeModules');
  if(!old||!old.parentNode)return;
  var top=document.createElement('div');top.className='hhpg-eyebrow';
  var t=document.createElement('span');t.textContent='HEALTHHUB · PREMIUM GLASS';
  var p=document.createElement('span');p.textContent='DESIGN PREVIEW';
  top.appendChild(t);top.appendChild(p);
  var grid=document.createElement('div');grid.id='hhPremiumGrid520';
  grid.className='hhpg-grid';grid.setAttribute('aria-label','HealthHub modulok és Daily jelentések');
  TILES.forEach(function(tile){grid.appendChild(makeTile(tile))});
  old.parentNode.insertBefore(top,old);
  old.parentNode.insertBefore(grid,old);
  document.documentElement.dataset.hhPremiumPreview='on';
  updateProfile();
  document.addEventListener('hh:profile-changed',updateProfile);
  root.addEventListener('storage',function(e){if(e.key==='hh-profile')updateProfile()});
  document.documentElement.dataset.hhPremiumTiles='12';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 root.HH_PREMIUM_HOME_V520=Object.freeze({tiles:TILES.map(function(t){return t[0]}),go:go,updateProfile:updateProfile});
})(window);
