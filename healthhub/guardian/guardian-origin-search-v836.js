/* Family Guard v836 · One compact verified From search in immersive result map.
 * Reuses v819's matching and v806's Photon/favorites + existing Smart Travel router.
 * No new GPS request, no hidden sharing, no invented origins or ETA.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_ORIGIN_V836=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const $=id=>w&&w.document&&w.document.getElementById(id);
 const displayName=p=>p?(p.displayName&&p.displayName!==p.name?p.displayName+' · ':'')+p.name+(p.subtitle?' · '+p.subtitle:''):'';
 function verified(place,geocoder,profile,shareAllowed){
  if(!geocoder||typeof geocoder.validPlace!=='function'||!geocoder.validPlace(place))return false;
  if(place.source==='favorite'&&place.profile!==profile)return false;
  if(place.source==='shared'&&!shareAllowed)return false;
  return true;
 }
 // Verified profile GPS is an explicit named location, not proof of which
 // physical phone is viewing the map. No new tracking or network request.
 function profileOrigin(fix,selected,allowed,now=Date.now()){
  const key=selected==='m'?'monika':selected==='z'?'zsolt':null;
  if(!allowed||!key||!fix||fix.profile!==key)return null;
  const age=now-Number(fix.ts);
  const limit=fix.source==='HH One Native GPS'?75000:20000;
  if(!Number.isFinite(age)||age< -5000||age>limit||
     !Number.isFinite(fix.accuracy)||fix.accuracy<0||fix.accuracy>100||
     !Number.isFinite(fix.lat)||!Number.isFinite(fix.lng)||
     Math.abs(fix.lat)>90||Math.abs(fix.lng)>180)return null;
  return {name:(key==='monika'?'Mónika':'Zsolt')+' helye',
   subtitle:'Friss, megosztott profilhely',
   lat:fix.lat,lng:fix.lng,source:'selected-profile',profile:selected};
 }
 function init(){
  const d=w&&w.document;if(!d||!w.fetch)return;
  const card=d.querySelector('.map-card'),panel=$('guardianMapOriginV836');
  const input=$('guardianMapOriginInputV836'),go=$('guardianMapOriginGoV836');
  const gps=$('guardianMapOriginGpsV1165'),gpsStatus=$('guardianMapOriginGpsStatusV1165');
  const hits=$('guardianMapOriginResultsV836'),status=$('guardianMapOriginStatusV836');
  if(!card||!panel||!input||!go||!hits||!status)return;
  const g=()=>w.HH_SMART_HUB_FIELDS_V806;
  const helper=()=>w.HH_GUARDIAN_MAP_SEARCH_V819;
  const permitted=()=>!!(w.HH_GUARDIAN_LIVE_V785?.authenticated&&w.HH_GUARDIAN_LIVE_V785?.familyAuthorized);
  const profile=()=>g()?.profileId(w.localStorage);
  let destination=null,origin=null,results=[],seq=0,pending=null,timer=null,lastRequest=0,blurTimer=null,gpsTimeout=null;
  let editing=false,keyboard=false,frame=false,originFocused=false;
  const tell=s=>{status.textContent=s};
  function stop(){
   seq++;if(timer!==null){w.clearTimeout(timer);timer=null}
   if(pending){try{pending.abort()}catch(_){ }pending=null}
  }
  function clearGpsTimeout(){
   if(gpsTimeout!==null){w.clearTimeout(gpsTimeout);gpsTimeout=null}
  }
  function clearHits(){
   hits.replaceChildren();hits.hidden=true;results=[];
   input.setAttribute('aria-expanded','false');
  }
  function hideKeyboardMode(){
   keyboard=false;originFocused=false;
   card.classList.remove('hh-origin-typing-v836');
   card.style.removeProperty('--hh-origin-keyboard-top-v836');
   card.style.removeProperty('--hh-origin-results-max-v836');
  }
  function keyboardPosition(){
   frame=false;if(!keyboard||!card.classList.contains('hh-map-full-v819'))return;
   const vv=w.visualViewport,off=Number.isFinite(vv?.offsetTop)?vv.offsetTop:0;
   const height=Number.isFinite(vv?.height)?vv.height:w.innerHeight;
   const panelHeight=panel.getBoundingClientRect().height||48;
   const top=Math.max(off+12,Math.round(off+height-panelHeight-8));
   card.style.setProperty('--hh-origin-keyboard-top-v836',top+'px');
   card.style.setProperty('--hh-origin-results-max-v836',Math.min(260,Math.max(65,top-off-45))+'px');
  }
  function positionSoon(){
   if(!keyboard||frame)return;frame=true;
   if(w.requestAnimationFrame)w.requestAnimationFrame(keyboardPosition);
   else w.setTimeout(keyboardPosition,0);
  }
  function onFocus(){
   originFocused=true;
   if(blurTimer!==null){w.clearTimeout(blurTimer);blurTimer=null}
   if(card.classList.contains('hh-map-full-v819')){
    keyboard=true;card.classList.add('hh-origin-typing-v836');
    positionSoon();[60,180,350,650].forEach(ms=>w.setTimeout(keyboardPosition,ms));
   }
   if(!input.value.trim())showResults(saved(''));
  }
  function allowSharedEntries(){
   if(!permitted())return [];
   const entries=w.HH_GUARDIAN_LANDMARKS_V776?.sharedEntries;
   if(!Array.isArray(entries))return [];
   return entries.filter(x=>x&&typeof x.name==='string').map(x=>({
    name:x.name,displayName:x.name,subtitle:'☁ Közös térképes hely',
    lat:x.lat,lng:x.lng,kind:x.kind,source:'shared'
   })).filter(x=>g()?.validPlace(x));
  }
  function saved(query){
   const fields=g(),search=helper();
   if(!fields||!search)return [];
   const personal=fields.listFavoritePlaces(w.localStorage);
   return search.matchSaved(personal.concat(allowSharedEntries()),query);
  }
  function merge(a,b){
   const search=helper();
   return search?search.combineResults(a,b):a;
  }
  function setOriginUI(place){
   origin=place;
   if(!editing)input.value=displayName(place);
   input.classList.toggle('hh-origin-confirmed-v836',!!place);
   go.textContent=place?'🧭':'⌕';
   go.title=place?'Útvonaljavaslatok megnyitása':'Kiindulási pont keresése';
   go.setAttribute('aria-label',go.title);
  }
  function routeState(e){
   const state=e?.detail||{};
   destination=g()?.validPlace(state.destination)?state.destination:null;
   card.classList.toggle('hh-map-has-destination-v836',!!destination);
   setOriginUI(g()?.validPlace(state.origin)?state.origin:null);
   gpsLabel();
   if(!destination){stop();clearHits();hideKeyboardMode()}
  }
  function fitPair(from,to){
   const map=w.HH_GUARDIAN_V761?.map;
   if(!map||!from||!to||typeof map.fitBounds!=='function')return;
   // Only confirmed coordinates from Photon or saved favourites, never guessed routing.
   try{map.fitBounds([[Math.min(from.lng,to.lng),Math.min(from.lat,to.lat)],
    [Math.max(from.lng,to.lng),Math.max(from.lat,to.lat)]],{
    padding:{top:165,right:60,bottom:160,left:46},maxZoom:15.8,duration:700
   })}catch(_){}
  }
  function select(place){
   if(!verified(place,g(),profile(),permitted()))return false;
   // v806 is the sole owner of the actual From/To state and route planning.
   const event=new w.CustomEvent('hh-guardian-map-origin-v836',{detail:place,cancelable:true});
   w.dispatchEvent(event);
   if(!event.defaultPrevented){tell('Az útvonaltervező még nem elérhető.');return false}
   stop();clearHits();editing=false;
   setOriginUI(place);input.blur();hideKeyboardMode();
   tell('Kiindulási pont: '+place.name+'. A Smart Travel ellenőrzi az útvonalakat.');
   w.setTimeout(()=>fitPair(place,destination),125);
   return true;
  }
  function showResults(items){
   if(gpsStatus)gpsStatus.hidden=true;
   clearHits();
   results=merge(items,[]);
   for(const place of results){
    if(!verified(place,g(),profile(),permitted()))continue;
    const row=d.createElement('button');row.type='button';
    row.className='hh-map-search-hit-v819'+
     ((place.source==='favorite'||place.source==='shared')?' hh-map-search-hit-saved-v823':'');
    const icon=d.createElement('span');icon.className='hh-map-search-hit-icon-v823';
    icon.textContent=place.source==='favorite'?'⭐':place.source==='shared'?'🏠':'📍';
    icon.setAttribute('aria-hidden','true');
    const details=d.createElement('span');details.className='hh-map-search-hit-text-v819';
    const title=d.createElement('strong');title.textContent=place.displayName||place.name;
    const sub=d.createElement('small');sub.textContent=place.subtitle||'OpenStreetMap · ellenőrzött cím';
    details.append(title,sub);
    const tag=d.createElement('span');tag.className='hh-map-search-hit-tag-v823';
    tag.textContent=place.source==='favorite'?'KEDVENC':place.source==='shared'?'KÖZÖS':'CÍM';
    row.append(icon,details,tag);
    row.addEventListener('click',()=>select(place));
    hits.append(row);
   }
   hits.hidden=!hits.children.length;
   input.setAttribute('aria-expanded',String(!hits.hidden));
  }
  async function search(){
   const fields=g(),value=fields?.queryText(input.value);
   stop();const locals=saved(input.value);showResults(locals);
   if(!fields||!value){
    tell(locals.length?'Válassz egy mentett kiindulási helyet.':'Írj legalább 3 karaktert.');
    return;
   }
   const mine=seq,wait=Math.max(0,1400-(Date.now()-lastRequest));
   if(wait){timer=w.setTimeout(()=>{if(seq===mine)search()},wait);return}
   lastRequest=Date.now();
   const ctrl=w.AbortController?new w.AbortController():null;pending=ctrl;
   tell('Kiindulási címek keresése…');
   try{
    const response=await w.fetch(fields.searchUrl(value),{
     mode:'cors',cache:'no-store',signal:ctrl?.signal
    });
    if(!response.ok)throw Error('HTTP '+response.status);
    const places=fields.normalizeResults(await response.json());
    if(seq!==mine||!destination)return;
    showResults(merge(locals,places));
    tell(results.length?'Válassz kiindulási pontot a találatok közül.':'Nincs találat. Próbálj más címet.');
   }catch(e){
    if(seq!==mine||e?.name==='AbortError')return;
    showResults(locals);
    tell(locals.length?'A kedvencek továbbra is elérhetők.':'A címkereső átmenetileg nem érhető el.');
   }finally{if(pending===ctrl)pending=null}
  }
  function clearPrevious(){
   if(!origin)return;
   editing=true;
   w.dispatchEvent(new w.CustomEvent('hh-guardian-map-origin-clear-v836'));
   editing=false;origin=null;
   input.classList.remove('hh-origin-confirmed-v836');
   go.textContent='⌕';go.title='Kiindulási pont keresése';
   go.setAttribute('aria-label',go.title);
  }
  input.addEventListener('focus',onFocus);
  input.addEventListener('input',()=>{
   clearPrevious();stop();
   const locals=saved(input.value);showResults(locals);
   const value=g()?.queryText(input.value);
   if(!value){tell(locals.length?'Mentett helyek, koppints a címre.':'Kiindulási pont keresése.');return}
   const mine=seq;timer=w.setTimeout(()=>{if(mine===seq)search()},650);
  });
  input.addEventListener('keydown',e=>{
   if(e.key==='Enter'){e.preventDefault();if(results.length===1)select(results[0]);else search()}
   if(e.key==='Escape'){clearHits();input.blur()}
  });
  input.addEventListener('blur',()=>{
   blurTimer=w.setTimeout(()=>{blurTimer=null;hideKeyboardMode()},300);
  });
  // v1168: one-tap location. Show the named verified profile when available,
  // otherwise request the physical phone's browser GPS only once. No tech story.
  const namedProfileOrigin=()=>{
   const selected=profile(),owner=selected==='m'?'monika':'zsolt';
   const live=w.HH_GUARDIAN_LIVE_V785;
   const allowed=!!(live?.authenticated&&(live.familyAuthorized||live.boundProfile===owner));
   return profileOrigin(w.HH_GUARDIAN_PROFILE_FOLLOW_V837?.latestAuthorizedSelectedFix,
    selected,allowed);
  };
  function gpsLabel(){
   if(!gps||gps.disabled)return;
   const here=namedProfileOrigin();
   gps.textContent=here?'📍 '+here.name:'📍 Jelenlegi helyem';
   gps.title=here?'Indulás a kiválasztott profil friss helyéről':
    'A telefon aktuális pozíciója';
   gps.setAttribute('aria-label',here?
    here.name+' · megosztott profilhely használata indulásként':
    'A telefon saját GPS-helyének használata indulásként');
  }
  function showRoute(){
   if(!origin||!destination)return;
   const plan=$('hhSmartHubPlanV806');
   if(!plan||plan.disabled)return;
   $('guardianMapSearchExitV819')?.click();
   plan.click();
   w.setTimeout(()=>$('hhSmartHubTripPlansV804')?.scrollIntoView?.({
    behavior:'smooth',block:'start'
   }),140);
  }
  function gpsNotice(kind,text){
   if(!gps||!gpsStatus)return;
   if(kind!=='loading')clearGpsTimeout();
   gps.disabled=kind==='loading';
   gps.setAttribute('aria-busy',String(kind==='loading'));
   gpsStatus.textContent=text;
   gpsStatus.dataset.state=kind;
   gpsStatus.hidden=kind!=='error';
   if(kind==='loading')gps.textContent='📍 Helykeresés…';
   else gpsLabel();
  }
  if(gps&&gpsStatus){
   gpsLabel();
   gps.addEventListener('click',()=>{
    if(gps.disabled)return;
    const saved=namedProfileOrigin();
    if(saved){
     // The button is labelled "Zsolt helye" / "Mónika helye":
     // one explicit tap authorizes its use as a departure point.
     stop();clearHits();hideKeyboardMode();clearGpsTimeout();
     if(select(saved)){
      gpsNotice('success','');
      showRoute();
     }else gpsNotice('error','Nem sikerült beállítani az indulási helyet.');
     return;
    }
    const original=$('hhSmartHubCurrentPositionV860');
    if(!original||typeof original.click!=='function'||original.disabled){
     gpsNotice('error','Hely nem érhető el. Válassz címet vagy megállót.');
     return;
    }
    stop();clearHits();hideKeyboardMode();
    if(typeof input.blur==='function')input.blur();
    gpsNotice('loading','Helyzet keresése…');
    gpsTimeout=w.setTimeout(()=>{
     gpsTimeout=null;
     if(gpsStatus.dataset.state==='loading')
      gpsNotice('error','Hely nem érhető el. Válassz címet vagy megállót.');
    },16000);
    original.click();
   });
   w.addEventListener('hh-guardian-origin-gps-status-v1165',event=>{
    const kind=event?.detail?.kind;
    if(kind==='loading')gpsNotice('loading','Helyzet keresése…');
    else if(kind==='success'){gpsNotice('success','');showRoute()}
    else if(kind==='error')gpsNotice('error','Hely nem érhető el. Válassz címet vagy megállót.');
   });
   w.addEventListener('focus',gpsLabel);
  }
  go.addEventListener('click',()=>{
   if(origin&&destination){
    // Reveal existing source-verified BKK plans, never fabricate a route here.
    $('guardianMapSearchExitV819')?.click();
    w.setTimeout(()=>$('hhSmartHubTripPlansV804')?.scrollIntoView?.({
     behavior:'smooth',block:'nearest'
    }),120);
   }else search();
  });
  w.addEventListener('hh-guardian-map-route-state-v836',routeState);
  w.addEventListener('hh-guardian-map-destination-v819',e=>{
   if(g()?.validPlace(e?.detail)){
    destination=e.detail;card.classList.add('hh-map-has-destination-v836');
    gpsLabel();
   }
  });
  const reset=()=>{
   clearGpsTimeout();stop();clearHits();destination=null;origin=null;input.value='';
   if(gps){gps.disabled=false;gps.setAttribute('aria-busy','false');gps.textContent='📍 Jelenlegi helyem';gpsLabel()}
   if(gpsStatus){gpsStatus.hidden=true;gpsStatus.textContent=''}
   input.classList.remove('hh-origin-confirmed-v836');
   go.textContent='⌕';go.title='Kiindulási pont keresése';
   go.setAttribute('aria-label',go.title);
   card.classList.remove('hh-map-has-destination-v836');
   hideKeyboardMode();
  };
  w.addEventListener('storage',e=>{if(e.key==='hh-profile')reset()});
  const switcher=$('guardianProfileSwitch');
  if(switcher)switcher.addEventListener('click',()=>w.setTimeout(reset,0));
  w.addEventListener('pagehide',()=>{clearGpsTimeout();stop();hideKeyboardMode()});
  w.addEventListener('resize',positionSoon,{passive:true});
  if(w.visualViewport?.addEventListener){
   w.visualViewport.addEventListener('resize',positionSoon,{passive:true});
   w.visualViewport.addEventListener('scroll',positionSoon,{passive:true});
  }
 }
 if(w?.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {verified,displayName,profileOrigin,init,version:'1168'};
});
