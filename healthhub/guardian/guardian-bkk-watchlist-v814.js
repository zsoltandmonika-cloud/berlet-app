/* Family Guard BKK Watchlist v814
 * The verified official BKK catalog remains the SINGLE source of favorites.
 * Favorites are scoped to profile and to this Edge browser, never GPS data.
 * 260/17/19/1/41 have source-backed GTFS route maps. Their live vehicles
 * are displayed ONLY from fresh verified BKK GTFS-RT positions; never simulated.
 */
(function(w,d){
 'use strict';
 const $=id=>d.getElementById(id);
 const FEATURED=new Set(['bus:260','tram:17','tram:19','tram:1','tram:41']);
 const LIVE_MAP=new Set(['bus:260','tram:17','tram:19','tram:1','tram:41']);
 const MODE={bus:'Busz',tram:'Villamos',trolley:'Trolibusz',metro:'Metró',hev:'HÉV',rail:'Vasút',other:'Járat'};
 function catalog(){return w.HH_BKK_CATALOG_V801}
 function currentProfile(){
  const x=$('hhTransitProfileV791');
  return x&&x.value==='monika'?'monika':x&&x.value==='zsolt'?'zsolt':
   w.localStorage&&w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
 }
 function node(tag,cls,text){
  const e=d.createElement(tag);
  if(cls)e.className=cls;
  if(text!==undefined)e.textContent=text;
  return e;
 }
 function action(label,aria,run,disabled){
  const b=node('button','hh-bkk-watch-action-v814',label);
  b.type='button';b.setAttribute('aria-label',aria);b.disabled=!!disabled;
  b.addEventListener('click',run);
  return b;
 }
 /* These badges use ONLY the already-validated GTFS-RT snapshot published
    by guardian-live-pilot-v793. Never infer live positions from a toggle. */
 const FRESH_MS=90000;
 let verifiedAt=0,verifiedKeys=new Set(),expiryTimer=null;
 function liveKey(v){
  if(typeof v?.routeKey==='string')return v.routeKey;
  const id=String(v?.routeId||'');
  return id==='260'?'bus:260':['17','19','1','41'].includes(id)?'tram:'+id:null;
 }
 function freshFor(key){
  const age=Date.now()-verifiedAt;
  return verifiedAt>0&&age>=-10000&&age<FRESH_MS&&verifiedKeys.has(key);
 }
 function onVerified(e){
  const payload=e?.detail||{},stamp=Date.parse(payload.generatedAt),age=Date.now()-stamp;
  if(expiryTimer!==null&&typeof w.clearTimeout==='function')w.clearTimeout(expiryTimer);
  expiryTimer=null;verifiedAt=0;verifiedKeys=new Set();
  if(Number.isFinite(stamp)&&age>=-10000&&age<FRESH_MS&&Array.isArray(payload.vehicles)){
   verifiedAt=stamp;
   verifiedKeys=new Set(payload.vehicles.map(liveKey).filter(Boolean));
   if(typeof w.setTimeout==='function')
    expiryTimer=w.setTimeout(()=>{verifiedAt=0;verifiedKeys=new Set();expiryTimer=null;render()},Math.max(1,FRESH_MS-age+30));
  }
  render();
 }
 // A fresh map session starts with the saved profile's Watchlist ON.
 // A manual hide remains authoritative until the next full page opening.
 // No camera movement, GPS request or additional BKK live polling.
 const sessionHidden={zsolt:new Set(),monika:new Set()};
 const managed={zsolt:new Set(),monika:new Set()};
 let autoBusy=false,autoQueued=false,autoAgain=false,observedMap=null;
 function autoMap(){
  const m=w.HH_GUARDIAN_V761?.map;
  if(!m||typeof m.isStyleLoaded!=='function'||!m.isStyleLoaded()||d.hidden)return null;
  if(d.documentElement?.dataset?.sh9Transit==='on')return null;
  return m;
 }
 function queueAuto(){
  if(autoBusy){autoAgain=true;return}
  if(autoQueued)return;
  autoQueued=true;
  Promise.resolve().then(async()=>{
   autoQueued=false;
   const map=w.HH_GUARDIAN_V761?.map;
   if(map&&map!==observedMap&&map.on){
    observedMap=map;map.on('style.load',queueAuto);map.on('load',queueAuto);
   }
   if(!autoMap()||!catalog()?.loaded)return;
   autoBusy=true;
   try{await restoreWatchlist()}finally{
    autoBusy=false;
    if(autoAgain){autoAgain=false;queueAuto()}
   }
  }).catch(()=>{autoBusy=false});
 }
 async function restoreWatchlist(){
  const api=catalog(),profile=currentProfile(),map=autoMap();
  if(!map||!api?.loaded)return;
  api.setProfile?.(profile);
  const keys=api.favoriteIds.filter(key=>!!api.routeByKey(key));
  const wanted=new Set(keys.filter(key=>!sessionHidden[profile].has(key)));
  const transit=w.HH_GUARDIAN_TRANSIT_V790,extra=w.HH_BKK_EXTRA_ROUTE_V912;
  const live=w.HH_BKK_LIVE_PER_LINE_V909;
  const stillCurrent=()=>currentProfile()===profile&&autoMap()===map;
  for(const key of [...managed[profile]]){
   if(!stillCurrent())return;
   if(wanted.has(key))continue;
   live?.setEnabled(key,false,profile);
   if(FEATURED.has(key))transit?.setLineVisible?.(key.split(':')[1],false);
   else await extra?.setLineVisible?.(key,false);
   managed[profile].delete(key);
  }
  let extraCount=0;
  for(const key of wanted){
   if(!stillCurrent())return;
   if(sessionHidden[profile].has(key)||!api.favoriteIds.includes(key))continue;
   live?.setEnabled(key,true,profile);
   managed[profile].add(key);
   if(FEATURED.has(key)){
    const id=key.split(':')[1];
    if(transit?.hasMapRoute?.(id)&&!transit.isLineVisible?.(id))transit.setLineVisible?.(id,true);
   }else if(extraCount++<12&&extra?.setLineVisible&&!extra.isLineVisible?.(key)){
    await extra.setLineVisible(key,true);
    if(!stillCurrent())return;
    if(sessionHidden[profile].has(key)||!api.favoriteIds.includes(key)){
     await extra.setLineVisible(key,false);live?.setEnabled(key,false,profile);
    }
   }
  }
  if(stillCurrent()){extra?.refresh?.();render()}
 }
 function render(){
  const api=catalog(),host=$('hhBkkWatchRowsV814'),section=$('hhBkkWatchlistV814');
  const panel=$('hhTransitPanel');
  if(!api||!host||!section||!panel)return;
  const profile=currentProfile();
  if(api.setProfile&&api.favoriteIds)api.setProfile(profile);
  // This is a user-controlled display list, never an unconsented GPS watch.
  const keys=api.favoriteIds;
  const count=$('hhBkkWatchCountV814');
  if(count)count.textContent=keys.length+' figyelt járat · '+(profile==='monika'?'Mónika':'Zsolt');
  host.replaceChildren();
  if(!keys.length)host.append(node('p','hh-bkk-watch-empty-v814','A figyelőlista üres. A Szerkesztés gombbal kiválaszthatod a járataidat.'));
  keys.forEach((key,i)=>{
   const parts=key.split(':'),mode=parts[0],id=parts.slice(1).join(':');
   const route=api.routeByKey?api.routeByKey(key):null;
   const row=node('article','hh-bkk-watch-row-v814 hh-bkk-watch-mode-'+mode);
   const badge=node('span','hh-bkk-watch-number-v814',id);
   badge.setAttribute('data-bkk-mode',mode);
   if(mode==='metro')badge.setAttribute('data-bkk-route',id);
   const detail=node('div','hh-bkk-watch-copy-v814');
   detail.append(node('strong','',MODE[mode]||'Járat'));
   detail.append(node('span','',route?(route.directions.slice(0,2).join(' ↔ ')||route.name||'BKK menetrendi járat'):'BKK járat · adatok betöltése…'));
   const supported=FEATURED.has(key);
   const extra=w.HH_BKK_EXTRA_ROUTE_V912;
   const transit=w.HH_GUARDIAN_TRANSIT_V790;
   const original=$('hhTransitShow'+id);
   const mapReady=supported&&(transit&&typeof transit.hasMapRoute==='function'?
    transit.hasMapRoute(id):!!original);
   const note=mapReady?'Menetrendi vonal · élő jel csak friss BKK-adatból':
    supported?'Menetrendi útvonal betöltésre vár · élő jel csak friss BKK-adatból':
    route?'Mutasd / Elrejt · menetrendi útvonal és elérhető élő járművek':'Katalógus betöltésére vár';
   detail.append(node('small','',note));
   const controls=node('div','hh-bkk-watch-actions-v814');
   // One control manages both static routes and authenticated live vehicles.
   // The map layer and live vehicle layer remain independently implemented.
   const liveFilter=w.HH_BKK_LIVE_PER_LINE_V909;
   if(route){
    const shown=supported?!!(transit&&typeof transit.isLineVisible==='function'&&transit.isLineVisible(id)):
     !!(extra&&extra.isLineVisible&&extra.isLineVisible(key));
    const liveEnabled=!!(liveFilter&&liveFilter.enabled(key,profile));
    // A previously enabled LIVE overlay is respected during migration, even
    // when its static route was hidden. Never mislabel an active view "Mutasd".
    const displayed=shown||liveEnabled;
    const canDraw=supported?!!mapReady:!!extra;
    const toggle=action(displayed?'Elrejt':'Mutasd',
     (MODE[mode]||'Járat')+' '+id+(displayed?' útvonalának és élő járműveinek elrejtése':' útvonalának és élő járműveinek megjelenítése'),async()=>{
      if(displayed){
       sessionHidden[profile].add(key);
       // Hide verified live markers first; then remove the static route.
       if(liveFilter)liveFilter.setEnabled(key,false,profile);
       if(shown){
        if(supported&&transit?.setLineVisible)transit.setLineVisible(id,false);
        else if(!supported&&extra?.setLineVisible)await extra.setLineVisible(key,false);
       }
       render();return;
      }
      sessionHidden[profile].delete(key);
      // Only enable the LIVE overlay if the requested map line loaded.
      let visible=false;
      if(supported){
       if(transit?.showLine)visible=(await transit.showLine(id))!==false;
       else if(transit?.setLineVisible)visible=(await transit.setLineVisible(id,true))!==false;
       else if(original&&!original.disabled){original.click();visible=true}
      }else if(extra?.showLine)visible=(await extra.showLine(key))===true;
      if(visible&&liveFilter)liveFilter.setEnabled(key,true,profile);
      render();
     },!displayed&&!canDraw);
    toggle.classList.add('hh-bkk-watch-unified-v1');
    toggle.dataset.visible=String(displayed);
    toggle.dataset.mapVisible=String(shown);
    toggle.dataset.liveEnabled=String(liveEnabled);
    toggle.setAttribute('aria-pressed',String(displayed));
    toggle.title=displayed?'Útvonal és élő járművek elrejtése':'Útvonal és élő járművek megjelenítése';
    if(displayed&&liveEnabled&&freshFor(key)){
     const liveBadge=node('span','hh-bkk-watch-live-badge-v1','ÉLŐ');
     liveBadge.title='Friss, ellenőrzött BKK járműpozíció';
     liveBadge.setAttribute('aria-hidden','true');
     toggle.append(liveBadge);
    }
    row.dataset.mapVisible=String(shown);
    controls.append(toggle);
   }
   const up=action('↑',id+' feljebb helyezése',()=>api.moveFavoriteKey(key,-1),i===0);
   const down=action('↓',id+' lejjebb helyezése',()=>api.moveFavoriteKey(key,1),i===keys.length-1);
   const remove=action('×',id+' eltávolítása a figyelőlistából',()=>api.removeFavoriteKey(key));
   remove.classList.add('hh-bkk-watch-remove-v814');
   controls.append(up,down,remove);row.append(badge,detail,controls);host.append(row);
  });
  section.hidden=false;
  // Hide three old hardcoded selector rows only after the enhanced list works.
  // Keep original buttons in DOM because map and live route logic use them.
  panel.classList.add('hh-bkk-watch-ready-v814');
 }
 function init(){
  const section=$('hhBkkWatchlistV814'),editor=$('hhBkkCatalogV801'),edit=$('hhBkkWatchEditV814');
  const toggle=$('hhBkkWatchToggleV858'),content=$('hhBkkWatchContentV858');
  if(!section||!editor||!edit||!toggle||!content||!catalog())return;
  // Watchlist is now a permanently expanded, static heading + live rows.
  // No click-to-collapse listener, persistence key or extra data polling.
  // Keep the header ID for existing SH9 controls and tests.
  content.hidden=false;
  toggle.removeAttribute?.('aria-expanded');
  toggle.removeAttribute?.('aria-controls');
  toggle.removeAttribute?.('aria-label');
  // Keep the one existing BKK catalog in Smart Planner, directly before
  // Favorite Places. Watchlist Edit still scrolls to and focuses that catalog.
  const favorites=$('hhSmartHubFavoritesV806');
  if(favorites&&editor.nextElementSibling!==favorites)favorites.before(editor);
  edit.addEventListener('click',()=>{
   // Editing only opens the existing catalog; the Watchlist never closes.
   editor.open=!editor.open;
   edit.setAttribute('aria-expanded',String(editor.open));
   edit.textContent=editor.open?'✕ Szerkesztés bezárása':'✎ Szerkesztés';
   if(editor.open){
    editor.scrollIntoView?.({behavior:'smooth',block:'nearest'});
    $('hhBkkCatalogSearchV801')?.focus({preventScroll:true});
   }
  });
  editor.addEventListener('toggle',()=>{
   edit.setAttribute('aria-expanded',String(editor.open));
   edit.textContent=editor.open?'✕ Szerkesztés bezárása':'✎ Szerkesztés';
  });
  if(w.addEventListener){
   w.addEventListener('hh-bkk-live-verified-v815',onVerified);
   d.addEventListener('visibilitychange',render);
   w.addEventListener('hh-bkk-watchlist-v814-changed',()=>{render();queueAuto()});
   w.addEventListener('hh-bkk-static-map-ready-v817',()=>{render();queueAuto()});
   w.addEventListener('hh-guardian-map-ready-v839',queueAuto);
   w.addEventListener('pageshow',queueAuto);
   d.addEventListener('visibilitychange',()=>{if(!d.hidden)queueAuto()});
   w.addEventListener('hh-bkk-line-visibility-v855',render);
   w.addEventListener('hh-bkk-extra-route-v912-changed',render);
   w.addEventListener('hh-bkk-live-per-line-v909-changed',render);
   w.addEventListener('storage',e=>{if(e.key==='hh-profile'){render();queueAuto()}});
  }
  const profile=$('hhTransitProfileV791');
  if(profile)profile.addEventListener('change',()=>{render();queueAuto()});
  render();queueAuto();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);
 else init();
})(window,document);
