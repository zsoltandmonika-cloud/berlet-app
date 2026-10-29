/* Family Guard v837 · verified selected-profile follow, read-only.
 * Reuses Family Live's authenticated Supabase and consented HH One Dropbox relay.
 * Never changes owner registration, grants permission, reads GPS sensors, shares,
 * uploads, or manufactures a position. Map camera follows only fresh verified fixes.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_PROFILE_FOLLOW_V837=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const FRESH_BROWSER_MS=20000,FRESH_NATIVE_MS=75000,MAX_ACCURACY=100;
 // v850: optional measured speed only, never computed from the portrait position.
 const MAX_SPEED_ACCURACY=40,MAX_SPEED_KMH=200,SHOW_ABOVE=5,HIDE_BELOW=4;
 function selectedProfile(storage){
  try{return storage?.getItem('hh-profile')==='m'?'monika':'zsolt'}
  catch(_){return 'zsolt'}
 }
 function snapshot(record,profile,now=Date.now()){
  if(!record||record.profile_key!==profile||
    typeof record.latitude!=='number'||typeof record.longitude!=='number'||
    typeof record.accuracy_m!=='number'||
    !Number.isFinite(record.latitude)||!Number.isFinite(record.longitude)||
    !Number.isFinite(record.accuracy_m)||Math.abs(record.latitude)>90||
    Math.abs(record.longitude)>180||record.accuracy_m<0||record.accuracy_m>MAX_ACCURACY)return null;
  const ts=Date.parse(record.updated_at),native=record.source==='HH One Native GPS';
  const freshness=native?FRESH_NATIVE_MS:FRESH_BROWSER_MS;
  if(!Number.isFinite(ts)||ts>now+5000||now-ts>freshness)return null;
  const speedKmh=typeof record.speed_kmh==='number'&&Number.isFinite(record.speed_kmh)&&
   record.speed_kmh>=0&&record.speed_kmh<=MAX_SPEED_KMH&&
   record.accuracy_m<=MAX_SPEED_ACCURACY?record.speed_kmh:null;
  return {profile,lat:record.latitude,lng:record.longitude,ts,
    source:native?'HH One Native GPS':'Family Live',accuracy:record.accuracy_m,speedKmh};
 }
 function newest(browser,native,profile,now=Date.now()){
  const a=snapshot(browser,profile,now),b=snapshot(native,profile,now);
  if(!a)return b;
  if(!b)return a;
  return b.ts>=a.ts?b:a;
 }
 // 5 km/h opens; <4 closes; the band between retains its previous state.
 // Never retain a badge for a missing, stale or malformed reading.
 function speedState(previousVisible,value){
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>MAX_SPEED_KMH)
   return {visible:false,rounded:null};
  const visible=value>SHOW_ABOVE?true:value<HIDE_BELOW?false:!!previousVisible;
  return {visible,rounded:visible?Math.round(value):null};
 }
 function canRead(live,profile){
  return !!(live?.authenticated&&(live.familyAuthorized||live.boundProfile===profile));
 }
 function preferRemote(fix,browserFixAt=0,now=Date.now()){
  if(!fix||fix.ts>now+5000)return false;
  if(now-fix.ts>(fix.source==='HH One Native GPS'?FRESH_NATIVE_MS:FRESH_BROWSER_MS))return false;
  if(!Number.isFinite(browserFixAt)||browserFixAt<=0||now-browserFixAt>FRESH_BROWSER_MS)return true;
  // A newer native fix can take precedence over a stale foreground browser camera.
  return fix.ts>=browserFixAt;
 }
 function init(){
  const d=w?.document;if(!d)return;
  const live=()=>w.HH_GUARDIAN_LIVE_V785;
  const guardian=()=>w.HH_GUARDIAN_V761;
  const getMap=()=>guardian()?.map;
  let latest=null,marker=null,markerNode=null,speedBadge=null,speedValue=null,
   routeBadge=null,routeDetails=null,speedVisible=false,
   run=0,loading=false,rerun=false,lastCenteredAt=0,lastCenteredProfile=null;
  let followRequest=false,lastAdaptivePoll=0;
  let markerCoord=null,moveToken=0,moveFrame=null,lastPaintTs=0,lastReceiveAt=0;
  let lastMotionDuration=820;
  // Camera and portrait move toward the newest REAL position, never beyond it.
  // The camera and portrait should glide for most of the observed fix cadence.
  // A re-read of the SAME timestamp must not cancel an unfinished animation.
  function smoothingMs(cadence,fastTransit=false){
   // On a moving bus, the previous 82%-of-cadence glide visibly trails a
   // fresh measured GPS fix. Finish the move quickly, still at the real fix.
   // Walking / stationary animations keep their existing calm pacing.
   if(fastTransit)return Math.min(900,Math.max(350,
    Math.round((Number.isFinite(cadence)&&cadence>0?cadence:3000)*.22)));
   if(!Number.isFinite(cadence)||cadence<=0)return 2300;
   return Math.min(3400,Math.max(950,Math.round(cadence*.82)));
  }
  function fastTransitMotion(fix,delta){
   // Never invent or publish speed: this only adjusts animation duration.
   // A trustworthy measured speed wins. A large accurate displacement can
   // speed up animation when speed telemetry is temporarily unavailable.
   if(typeof fix?.speedKmh==='number')return fix.speedKmh>=10;
   return fix?.accuracy<=35&&delta>=18;
  }
  // The moving pin and the follow-camera must use the SAME easing and duration.
  // No additional sensor, geolocation request, database call or invented GPS fix.
  function smoothStep(t){return t*t*(3-2*t)}
  function metresBetween(a,b){
   if(!a||!b)return Infinity;
   return Math.hypot(
    (b[0]-a[0])*111195*Math.cos((a[1]+b[1])*Math.PI/360),
    (b[1]-a[1])*111195);
  }
  function ignoreGpsNoise(previous,next,fix){
   if(!previous||!fix)return false;
   const metres=metresBetween(previous,next);
   // Unknown speed is not assumed to mean stopped: only sub-3m movement
   // is ignored. A verified (<4km/h) stationary reading can absorb the
   // larger random satellite scatter, relative to reported accuracy.
   const stationary=typeof fix.speedKmh==='number'&&fix.speedKmh<4;
   const threshold=stationary?Math.max(5,Math.min(12,fix.accuracy*.55)):2.8;
   return metres<threshold;
  }
  function alignFollowCamera(fix,center,duration,easing){
   if(!followOn()||!authorized()||!preferRemote(fix,localFixAt()))return;
   const map=getMap();
   if(!map||typeof map.easeTo!=='function')return;
   map.easeTo({center,zoom:Math.max(map.getZoom?.()||15,15.3),
    duration,...(easing?{easing}:{})});
   lastCenteredAt=fix.ts;lastCenteredProfile=fix.profile;
  }
  function paintCoordinate(fix){
   if(!marker||!fix||!Number.isFinite(fix.ts))return;
   if(fix.ts<=lastPaintTs)return;
   const next=[fix.lng,fix.lat],prev=markerCoord&&markerCoord.slice();
   const receivedAt=Date.now();
   const cadence=lastReceiveAt?receivedAt-lastReceiveAt:3000;
   lastReceiveAt=receivedAt;
   lastPaintTs=fix.ts;
   const age=receivedAt-fix.ts;
   const delta=metresBetween(prev,next);
   const reduce=!!w.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
   const canSmooth=!!prev&&delta>=3&&delta<=220&&age>=0&&age<=15000&&
    !d.hidden&&!reduce&&typeof w.requestAnimationFrame==='function';
   // A measured stationary device must not wander around the street just
   // because its satellite fix changes a few metres. Record freshness and
   // still update the speed bubble, but do not move the pin/camera.
   if(ignoreGpsNoise(prev,next,fix)){
    lastPaintTs=fix.ts;
    if(followOn()){lastCenteredAt=fix.ts;lastCenteredProfile=fix.profile}
    return;
   }
   moveToken++;
   if(moveFrame!==null&&w.cancelAnimationFrame)w.cancelAnimationFrame(moveFrame);
   moveFrame=null;
   if(!canSmooth){
    markerCoord=next;marker.setLngLat(next);lastMotionDuration=0;
    alignFollowCamera(fix,next,0);
    return;
   }
   const token=moveToken,start=w.performance?.now?.()??receivedAt,
    duration=smoothingMs(cadence,fastTransitMotion(fix,delta));
   lastMotionDuration=duration;
   // MapLibre's eased camera and the on-screen portrait share the same
   // destination, duration and exact easing curve. The pre-existing
   // focusLatest() sees this timestamp as handled and does not restart it.
   alignFollowCamera(fix,next,duration,smoothStep);
   function frame(stamp){
    if(token!==moveToken||!marker||d.hidden||!authorized()||
      !preferRemote(fix,localFixAt()))return;
    const progress=Math.min(1,Math.max(0,(stamp-start)/duration));
    const eased=smoothStep(progress);
    markerCoord=[
     prev[0]+(next[0]-prev[0])*eased,
     prev[1]+(next[1]-prev[1])*eased
    ];
    marker.setLngLat(markerCoord);
    if(progress<1)moveFrame=w.requestAnimationFrame(frame);
    else moveFrame=null;
   }
   moveFrame=w.requestAnimationFrame(frame);
  }
  const selected=()=>selectedProfile(w.localStorage);
  const bound=()=>live()?.boundProfile;
  const authorized=()=>canRead(live(),selected());
  const followOn=()=>guardian()?.getLocationSettings?.().follow_map===true;
  const localFixAt=()=>guardian()?.lastGpsFixAt||0;
  function clearMarker(){
   moveToken++;
   if(moveFrame!==null&&w.cancelAnimationFrame)w.cancelAnimationFrame(moveFrame);
   moveFrame=null;markerCoord=null;lastPaintTs=0;lastReceiveAt=0;lastMotionDuration=820;
   if(marker){try{marker.remove()}catch(_){}marker=null}
   markerNode=null;speedBadge=null;speedValue=null;routeBadge=null;routeDetails=null;speedVisible=false;
   guardian()?.setRemoteMarkerPreferred?.(false);
  }
  function paintTransit(fix){
   if(!routeBadge||!routeDetails||!markerNode)return;
   const transit=w.HH_GUARDIAN_ACTIVE_TRANSIT_V862;
   const state=transit?.getStatus?.(selected())||null;
   const valid=!!fix&&fix.profile===selected()&&state?.profile===selected()&&
    Number.isFinite(fix.ts)&&Date.now()-fix.ts<=(fix.source==='HH One Native GPS'?75000:20000);
   if(!valid){
    routeBadge.hidden=true;routeDetails.hidden=true;routeBadge.textContent='';
    markerNode.removeAttribute?.('data-transit-route');
    return;
   }
   const emoji=state.mode==='tram'?'🚋':state.mode==='bus'?'🚌':
    state.mode==='trolley'?'🚎':state.mode==='hev'?'🚈':
    state.mode==='metro'?'🚇':state.mode==='rail'?'🚆':'🚏';
   const category=state.onboard?'felszálltam':'tervezett';
   routeBadge.hidden=false;routeBadge.dataset.mode=state.mode;
   routeBadge.textContent=emoji+' '+state.route+' · '+category;
   routeBadge.setAttribute('aria-label',state.route+' · '+category+
    ' · saját kiválasztás, nem automatikus járműazonosítás. További adatok.');
   routeDetails.textContent=(state.onboard?
    'Saját telefonon megjelölt felszállás':'Kiválasztott tervezett járat')+
    ' · GPS és járatszám külön adat · Késés: nincs igazolt élő adat';
   markerNode.dataset.transitRoute=state.route;
  }
  function paintSpeed(fix){
   if(!speedBadge||!speedValue||!markerNode)return;
   // Location can remain valid for 75s, but MOVEMENT needs a <=25s fix.
   // A stale speed must never stay visible just because Follow is still live.
   const reading=fix?.profile===selected()&&Number.isFinite(fix.ts)&&
    fix.ts<=Date.now()+5000&&Date.now()-fix.ts<=25000?fix.speedKmh:null;
   const next=speedState(speedVisible,reading);
   speedVisible=next.visible;
   speedBadge.setAttribute('data-active',next.visible?'true':'false');
   speedBadge.setAttribute('aria-hidden',next.visible?'false':'true');
   speedValue.textContent=next.visible?next.rounded+' km/h':'';
   const owner=selected()==='monika'?'Mónika':'Zsolt';
   paintTransit(fix);
   const route=w.HH_GUARDIAN_ACTIVE_TRANSIT_V862?.getStatus?.(selected());
   markerNode.setAttribute('aria-label',owner+' · hitelesített friss profilpozíció'+
    (route?' · '+route.route+' '+(route.onboard?'felszálltam':'tervezett')+' (saját választás)':'')+
    (next.visible?' · '+next.rounded+' km/h':''));
  }
  function invalidate(){
   run++;latest=null;followRequest=false;lastCenteredAt=0;lastCenteredProfile=null;clearMarker();
  }
  function current(){
   return authorized()&&!d.hidden&&!!latest&&latest.profile===selected()&&
    preferRemote(latest,localFixAt());
  }
  function focusLatest(force=false){
   if(!current()||!followOn())return false;
   const map=getMap();
   if(!map||typeof map.easeTo!=='function')return false;
   if(force||latest.ts!==lastCenteredAt||latest.profile!==lastCenteredProfile){
    // Follow the displayed, filtered portrait, not a noisy raw satellite
    // point. User-driven Follow remains immediate and respects map settings.
    const visible=markerCoord&&lastPaintTs>=latest.ts
     ?markerCoord:[latest.lng,latest.lat];
    map.easeTo({center:visible,
     zoom:Math.max(map.getZoom?.()||15,15.3),
     duration:force?640:lastMotionDuration});
    lastCenteredAt=latest.ts;lastCenteredProfile=latest.profile;
   }
   return true;
  }
  function decorate(fix){
   const av=w.HH_GOLDEN_AVATARS_V529||{};
   const k=fix.profile,el=d.createElement('div');
   el.className='guardian-position guardian-selected-profile-position-v837';
   el.setAttribute('data-guardian-person',k==='monika'?'m':'z');
   el.setAttribute('role','img');
   el.setAttribute('aria-label',(k==='monika'?'Mónika':'Zsolt')+
    ' · hitelesített '+fix.source+' · friss saját profilpozíció');
   const photo=d.createElement('span');photo.className='guardian-position-photo';
   const img=d.createElement('img');img.alt='';img.src=k==='monika'?av.m:av.z;
   photo.appendChild(img);
   const label=d.createElement('span');label.className='guardian-position-label';
   const name=d.createElement('span');name.className='hh-guardian-speed-name-v851';
   name.textContent=k==='monika'?'Mónika':'Zsolt';
   // Only the already-followed portrait gets the bubble: no extra figure.
   const speed=d.createElement('span');speed.className='hh-guardian-speed-glass-v850';
   speed.setAttribute('data-active','false');
   speed.setAttribute('aria-hidden','true');
   const gauge=d.createElement('span');gauge.className='hh-guardian-speed-gauge-v850';
   gauge.setAttribute('aria-hidden','true');gauge.textContent='◴';
   const reading=d.createElement('span');reading.className='hh-guardian-speed-reading-v850';
   speed.append(gauge,reading);
   speedBadge=speed;speedValue=reading;
   const transit=d.createElement('button');transit.type='button';
   transit.className='hh-guardian-route-badge-v862';transit.hidden=true;
   transit.setAttribute('aria-expanded','false');
   const details=d.createElement('span');details.className='hh-guardian-route-details-v862';
   details.hidden=true;
   transit.addEventListener('click',event=>{
    event.stopPropagation();
    const open=details.hidden;
    details.hidden=!open;transit.setAttribute('aria-expanded',String(open));
   });
   routeBadge=transit;routeDetails=details;
   // Reuse one existing owner portrait and its speed name label, no avatar clone.
   label.append(name,transit,speed,details);
   el.append(photo,label);
   return el;
  }
  function showFix(fix){
   const map=getMap(),Marker=w.maplibregl?.Marker;
   if(!map||typeof Marker!=='function')return;
   if(!marker){
    markerNode=decorate(fix);
    marker=new Marker({element:markerNode,anchor:'bottom'})
     .setLngLat([fix.lng,fix.lat]).addTo(map);
    markerCoord=[fix.lng,fix.lat];lastPaintTs=fix.ts;
   }else paintCoordinate(fix);
   paintSpeed(fix);
   guardian()?.setRemoteMarkerPreferred?.(true);
   const own=d.getElementById('guardianMeState');
   if(own)own.textContent='🟢 '+fix.source+' · friss profilpozíció';
   if(followOn())focusLatest();
  }
  // A profile switch can happen while Dropbox or Supabase is still reading
  // the previous profile. Always run one fresh query once that read finishes.
  async function refresh(){
   if(d.hidden)return;
   if(loading){rerun=true;return;}
   const k=selected(),l=live();
   if(!canRead(l,k)){invalidate();return}
   const client=l?.getClient?.();
   if(!client){paintSpeed(null);return}
   loading=true;lastAdaptivePoll=Date.now();const ticket=++run;
   let db=null,native=null,revokeAt=NaN;
   try{
    // The authorized Supabase fix and consented native Dropbox fix are
    // independent. Read them concurrently, avoiding their combined latency;
    // still select ONLY the freshest verified GPS timestamp after both finish.
    // Same number of requests as before, and no new background polling.
    const relay=w.HH_GUARDIAN_NATIVE_V156;
    const dbRead=Promise.resolve().then(()=>typeof l.readSharedLocation==='function'
     ?l.readSharedLocation(k)
     :client.from('hh_guardian_live_locations')
      .select('profile_key,latitude,longitude,accuracy_m,updated_at,speed_kmh')
      .eq('profile_key',k).maybeSingle());
    const nativeRead=Promise.resolve().then(()=>relay?.connected?.()
     ?relay.read(k):null);
    const [dbOutcome,nativeOutcome]=await Promise.allSettled([dbRead,nativeRead]);
    if(dbOutcome.status==='fulfilled'&&!dbOutcome.value?.error&&dbOutcome.value?.data)
     db=dbOutcome.value.data;
    if(nativeOutcome.status==='fulfilled'){
     const n=nativeOutcome.value;
     if(n?.status==='ok')native=n.data;
     if(n?.status==='revoked')revokeAt=Date.parse(n.updated_at);
    }
    if(ticket!==run||d.hidden||k!==selected()||!authorized())return;
    // A native explicit revocation supersedes older cached server fixes.
    if(Number.isFinite(revokeAt)&&(!db||Date.parse(db.updated_at)<=revokeAt))db=null;
    const next=newest(db,native,k);
    latest=next;
    if(next&&preferRemote(next,localFixAt())){
     showFix(next);followRequest=false;
    }else{
     clearMarker();
     if(followRequest){
      const s=d.getElementById('guardianMeState');
      if(s)s.textContent='🟠 '+(k==='monika'?'Mónika':'Zsolt')+
       ' · nincs friss megosztott GPS-jel';
     }
    }
   }catch(_){
    if(ticket===run){
     if(!latest||!preferRemote(latest,localFixAt()))clearMarker();
     else paintSpeed(latest); // age-out the speed even across network outages
    }
   }finally{
    loading=false;
    if(rerun){rerun=false;w.setTimeout?.(refresh,0)}
   }
  }
  // Called synchronously on EVERY local GPS callback, before the next map
  // paint. Keep exactly one portrait for this profile: whichever verified
  // source is freshest. Never allow the older native marker to coexist with
  // a newly updated, more recent browser GPS portrait.
  function onLocalGpsFix(){
   if(!current()){if(marker)clearMarker();return false}
   if(!marker&&latest)showFix(latest);
   else guardian()?.setRemoteMarkerPreferred?.(true);
   return true;
  }
  function requestFollow(){
   followRequest=true;
   if(current()){showFix(latest);return true}
   refresh();
   return false;
  }
  function preventWrongDeviceGps(){
   const owner=bound();
   return !!(owner&&owner!==selected());
  }
  function onFollowState(){
   if(!followOn())return;
   if(current())focusLatest(true);
   else refresh();
  }
  function onProfile(){
   invalidate();refresh();
  }
  function onMapReady(){
   if(current()){
    if(!marker)showFix(latest);
    if(followOn())focusLatest(true);
   }else refresh();
  }
  const switcher=d.getElementById('guardianProfileSwitch');
  switcher?.addEventListener('click',()=>w.setTimeout(onProfile,0));
  w.addEventListener?.('storage',e=>{if(e.key==='hh-profile')onProfile()});
  // Token refresh must not flash/delete a still-fresh, authorized portrait.
  w.addEventListener?.('hh-guardian-auth-changed',()=>{
   if(!authorized()){invalidate();return}
   refresh();
  });
  w.addEventListener?.('hh-guardian-map-ready-v839',onMapReady);
  w.addEventListener?.('hh-guardian-active-transit-updated-v862',()=>{
   if(marker&&latest&&current())paintSpeed(latest);
  });
  d.addEventListener?.('visibilitychange',()=>{
   if(d.hidden){invalidate();return}
   refresh();
  });
  w.addEventListener?.('pageshow',refresh);
  w.addEventListener?.('pagehide',invalidate);
  // v868: preserve 3s moving/unknown-speed tracking, reduce verified
  // stationary reads to roughly 9s. An explicit follow still refreshes now.
  w.setInterval?.(()=>{
   if(typeof latest?.speedKmh==='number'&&latest.speedKmh<4&&
      Date.now()-lastAdaptivePoll<9000)return;
   refresh();
  },3000);
  refresh();
  return {refresh,requestFollow,focusLatest,onFollowState,onLocalGpsFix,
   preventWrongDeviceGps,get latest(){return latest},get ready(){return current()}};
 }
 let controller=null;
 function start(){
  if(controller)return controller;
  controller=init();
  return controller;
 }
 if(w?.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',start);
  else start();
 }
 return {snapshot,newest,selectedProfile,speedState,canRead,preferRemote,start,
  requestFollow(){return controller?.requestFollow()||false},
  focusLatest(force){return controller?.focusLatest(force)||false},
  preventWrongDeviceGps(){return controller?.preventWrongDeviceGps()||false},
  onFollowState(){controller?.onFollowState()},
  onLocalGpsFix(){return controller?.onLocalGpsFix()||false},
  // Read-only reuse of the ALREADY verified GPS position on this physical phone.
  // Never expose a different family member's remote fix as this device's own.
  get latestOwnFix(){
   const k=selectedProfile(w?.localStorage);
   return controller?.ready&&w?.HH_GUARDIAN_LIVE_V785?.boundProfile===k&&
    controller?.latest?.profile===k?controller.latest:null;
  },
  // Read-only, already authenticated Family Live fix for the currently followed
  // household member. No new GPS query or visibility permission is created.
  get latestAuthorizedSelectedFix(){
   const k=selectedProfile(w?.localStorage),fix=controller?.latest;
   return canRead(w?.HH_GUARDIAN_LIVE_V785,k)&&fix?.profile===k&&
    preferRemote(fix,0)?fix:null;
  },
  get ready(){return !!controller?.ready},version:'837',revision:'863',speedVersion:'862'};
});
