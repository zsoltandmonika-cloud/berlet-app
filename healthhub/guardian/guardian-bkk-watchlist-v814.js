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
    route?'Új: Mutasd → hiteles megállósorrend, sematikus útvonal · élő jármű külön':'Katalógus betöltésére vár';
   detail.append(node('small','',note));
   const controls=node('div','hh-bkk-watch-actions-v814');
   // Static route lines and LIVE vehicles must never share their toggle state.
   const liveFilter=w.HH_BKK_LIVE_PER_LINE_V909;
   if(route&&liveFilter){
    const enabled=liveFilter.enabled(key,profile);
    const live=action(enabled?'Élő: BE':'Élő: KI',
     (MODE[mode]||'Járat')+' '+id+' élő járműveinek '+(enabled?'elrejtése':'megjelenítése'),()=>{
      liveFilter.setEnabled(key,!liveFilter.enabled(key,profile),profile);
    });
    live.classList.add('hh-bkk-watch-live-v909');
    live.dataset.liveEnabled=String(enabled);
    live.setAttribute('aria-pressed',String(enabled));
    live.title='Csak ennek a járatnak az élő járműveit kapcsolja';
    controls.append(live);
   }
   if(route){
    const shown=supported?!!(transit&&typeof transit.isLineVisible==='function'&&transit.isLineVisible(id)):
     !!(extra&&extra.isLineVisible&&extra.isLineVisible(key));
    const show=action(shown?'Ne mutasd':'Mutasd ↗',
     (MODE[mode]||'Járat')+' '+id+(shown?' útvonal elrejtése a térképről':' útvonal mutatása a térképen'),()=>{
      if(!supported){
       if(extra){if(shown)extra.setLineVisible(key,false);else extra.showLine(key)}
       return;
      }
      if(!mapReady)return;
      if(transit&&typeof transit.setLineVisible==='function'){
       if(shown)transit.setLineVisible(id,false);
       else if(typeof transit.showLine==='function')transit.showLine(id);
       else transit.setLineVisible(id,true);
      }else if(!shown&&original&&!original.disabled)original.click();
      render();
    },!route||(supported&&!mapReady)||(!supported&&!extra));
    show.classList.add('hh-bkk-watch-show-v814');
    show.setAttribute('aria-pressed',String(shown));
    show.dataset.visible=String(shown);
    row.dataset.mapVisible=String(shown);
    controls.append(show);
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
  // Single accessible collapse target. Existing watchlist values stay mounted.
  // Initial state: compact, collapsed on page load.
  function setExpanded(expanded){
   content.hidden=!expanded;
   toggle.setAttribute('aria-expanded',String(expanded));
   toggle.setAttribute('aria-label',expanded?'Saját BKK Watchlist összecsukása':'Saját BKK Watchlist megnyitása');
   if(!expanded&&editor.open)editor.open=false;
  }
  setExpanded(false);
  toggle.addEventListener('click',()=>setExpanded(content.hidden));
  // Keep the one existing BKK catalog in Smart Planner, directly before
  // Favorite Places. Watchlist Edit still scrolls to and focuses that catalog.
  const favorites=$('hhSmartHubFavoritesV806');
  if(favorites&&editor.nextElementSibling!==favorites)favorites.before(editor);
  edit.addEventListener('click',()=>{
   // Editing is independent of collapse but always shows the list context.
   if(!editor.open)setExpanded(true);
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
   w.addEventListener('hh-bkk-watchlist-v814-changed',render);
   w.addEventListener('hh-bkk-static-map-ready-v817',render);
   w.addEventListener('hh-bkk-line-visibility-v855',render);
   w.addEventListener('hh-bkk-extra-route-v912-changed',render);
   w.addEventListener('hh-bkk-live-per-line-v909-changed',render);
   w.addEventListener('storage',e=>{if(e.key==='hh-profile')render()});
  }
  const profile=$('hhTransitProfileV791');
  if(profile)profile.addEventListener('change',render);
  render();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);
 else init();
})(window,document);
