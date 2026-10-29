/* SH9 Smart Trip v1003 · MÁVPlusz heavy-lifting within HealthHub Golden Shell
 * Source: an actual, user-shared MÁVPlusz itinerary URL (Kazincbarcika->Budapest).
 * This is a provider-hosted planner shell, NOT a source-code copy or API.
 * Cross-origin frame restrictions belong to MÁVPlusz. We never bypass them.
 * No polling, downloads, remote analytics, Supabase or second route algorithm.
 */
(function(w,d){'use strict';
const BASE='https://mavplusz.hu/';
const p={};
// Only verified official place tokens from the original user-shared MÁVPlusz URL.
// For any other place, the provider's OWN search UI must resolve locations.
const VERIFIED={
 budapest:'BUDAPEST*::47.4978789,19.0402383::OSM:Budapest',
 kazincbarcika:'KAZINCBARCIKA*::48.2544414,20.6223251::OSM:Kazincbarcika'
};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const validDate=v=>typeof v==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(new Date(v+'T12:00:00Z').getTime())&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const validTime=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
function build(query){
 const from=norm(query?.from),to=norm(query?.to);
 if(!to)return {ok:false,error:'Adj meg egy célállomást.'};
 if(from&&from===to)return {ok:false,error:'Az indulás és a cél nem lehet azonos.'};
 const knownFrom=VERIFIED[from],knownTo=VERIFIED[to];
 const date=query?.date,time=query?.time;
 if(!validDate(date)||!validTime(time))return {ok:false,error:'Érvényes dátum és időpont szükséges.'};
 if(!knownFrom||!knownTo){
  // No made-up stop IDs or invalid deep links. The official UI is capable
  // of resolving the free-text place names, but cross-origin programmatic
  // auto-entry is intentionally not attempted.
  return {ok:true,url:BASE,prepared:false,reason:'A két hely MÁVPlusz-azonosítója még nincs megerősítve. A hivatalos tervezőben válaszd ki őket.',from:query.from||'',to:query.to||''};
 }
 const qs=new URLSearchParams({
  ui_itineraryView:'full',
  fromPlace:knownFrom,toPlace:knownTo,
  date,time,
  arriveBy:query.mode==='arrive'?'true':'false',
  mode:'WALK,TRANSIT',showIntermediateStops:'true',
  maxWalkDistance:'1609',ignoreRealtimeUpdates:'true',
  numItineraries:'15',otherThanPreferredRoutesPenalty:'900'
 });
 return {ok:true,url:BASE+'#/?'+qs.toString(),prepared:true,from:query.from,to:query.to,
  reason:'Hivatalos MÁVPlusz megosztási link alapján előkészítve. Nem jelenti a foglalás vagy egy konkrét találat kiválasztását.'};
}
function el(tag,cls,txt){const e=d.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e}
let overlay=null,frame=null,launchLink=null,description=null,loading=null,mode='iframe',previousFocus=null,lastQuery=null;
function ensure(){
 if(overlay)return;
 overlay=el('section','sh9-provider-shell-v1003');overlay.id='sh9MavPluszShellV1003';overlay.hidden=true;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Smart Trip AI · MÁVPlusz útvonaltervező');
 const header=el('div','sh9-provider-header-v1003');
 const brand=el('div','sh9-provider-brand-v1003');
 brand.append(el('strong','','✨ SMART TRIP AI'),el('span','','MÁVPlusz · BKK + Volán + MÁV'));
 const close=el('button','sh9-provider-close-v1003','✕');close.type='button';close.setAttribute('aria-label','Smart Trip útvonaltervező bezárása');
 close.addEventListener('click',hide);
 header.append(brand,close);overlay.append(header);
 const toolbar=el('div','sh9-provider-toolbar-v1003');
 description=el('div','sh9-provider-description-v1003');
 loading=el('small','sh9-provider-support-v1003','A MÁVPlusz saját útvonaltervezője dolgozik. Ha a böngésző tiltja a beágyazást, nyisd meg a hivatalos nézetet.');
 const actions=el('div','sh9-provider-actions-v1003');
 const appLaunch=el('button','sh9-provider-app-v1003','📱 MÁVPlusz alkalmazás megnyitása');appLaunch.type='button';
 appLaunch.title='Androidon a rendszer átadhatja a hivatkozást a telepített MÁVPlusz alkalmazásnak. A konkrét útvonal átvétele az alkalmazástól függ.';
 appLaunch.hidden=!/Android/i.test(w.navigator?.userAgent||'');
 appLaunch.addEventListener('click',()=>{
  // The existing HH One Android WebView intercepts an external main-frame
  // https navigation and hands it to ACTION_VIEW, allowing Android's verified
  // app-link chooser to offer MÁVPlusz. No fake intent://, package guess or JS bridge.
  if(launchLink?.href)w.location.assign(launchLink.href);
 });
 if(!appLaunch.hidden)toolbar.append(appLaunch);
 launchLink=el('a','sh9-provider-launch-v1003','↗ MÁVPlusz megnyitása böngészőben');launchLink.href=BASE;launchLink.target='_blank';launchLink.rel='noopener noreferrer';
 const back=el('button','sh9-provider-bkk-v1003','🚋 BKK-tervező');back.type='button';
 back.addEventListener('click',()=>{
  if(!lastQuery)return;
  try{w.sessionStorage.setItem('sh9-bkk-grand-planner-handoff-v1',JSON.stringify({...lastQuery,created:Date.now(),source:'sh9-smart-trip-provider-fallback-v1003'}))}catch(_){}
  w.location.assign('../../../healthhub/guardian/#hhSmartHubDestinationV802');
 });
 actions.append(launchLink,back);
 toolbar.append(description,loading,actions);overlay.append(toolbar);
 const stage=el('div','sh9-provider-stage-v1003');
 frame=el('iframe','sh9-provider-frame-v1003');frame.title='Hivatalos MÁVPlusz útvonaltervező';
 frame.setAttribute('referrerpolicy','no-referrer');frame.setAttribute('loading','eager');
 // Avoid sandboxing the official payment or authentication context; however
 // all payment takes place on the provider's own origin, not HealthHub.
 stage.append(frame);overlay.append(stage);
 const foot=el('div','sh9-provider-foot-v1003','A járatok, menetrendek és foglalás a MÁV-csoport rendszerében működnek. A HealthHub nem olvassa ki a beágyazott oldal adatait és nem foglal jegyet.');
 overlay.append(foot);
 d.body.append(overlay);
 d.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)hide()});
}
function open(query){
 const result=build(query);
 if(!result.ok)return result;
 ensure();lastQuery={...query};previousFocus=d.activeElement;
 description.replaceChildren();
 description.append(el('strong','',(query.from||'Indulás kiválasztása')+' → '+query.to));
 description.append(el('span','',query.date+' · '+query.time+(query.mode==='arrive'?' · Érkezés eddig':' · Indulás ekkor')));
 loading.textContent=result.prepared
  ?'Valódi MÁVPlusz-helyazonosítókkal előkészítve. Ha a beágyazás üres, válaszd a hivatalos webes nézetet vagy az Android-appot.'
  :'⚠️ '+result.reason;
 launchLink.href=result.url;
 overlay.hidden=false;d.documentElement.classList.add('sh9-provider-open-v1003');
 // The official site may refuse framing via CSP or X-Frame-Options. A frame
 // load event is not evidence that the provider UI actually rendered.
 frame.src=result.url;
 closeButtonFocus();
 return {ok:true,prepared:result.prepared,url:result.url};
}
function closeButtonFocus(){overlay.querySelector('.sh9-provider-close-v1003')?.focus({preventScroll:true})}
function hide(){if(!overlay)return;overlay.hidden=true;frame.removeAttribute('src');d.documentElement.classList.remove('sh9-provider-open-v1003');previousFocus?.focus?.({preventScroll:true})}
w.SH9_SMART_TRIP_MAVPLUSZ_V1003=Object.freeze({build,open,close:hide});
})(window,document);