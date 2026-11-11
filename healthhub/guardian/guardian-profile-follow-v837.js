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
 const VERIFIED_LAST_KNOWN_MS=12*60*60*1000;
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
 // Independently verified sources can disagree by kilometres. A newer
 // timestamp alone must not pull the map away from the registered phone.
 function gpsDistance(a,b){
  const lat=(a.lat+b.lat)*Math.PI/360;
  return Math.hypot((a.lng-b.lng)*111195*Math.cos(lat),(a.lat-b.lat)*111195);
 }
 function resolveSources(browser,native,profile,priorNative=null,now=Date.now()){
  // The browser/Supabase row has no physical Android device attestation.
  // Until the phone cutover is verified, Monika's remote location must come
  // exclusively from a fresh, owner-checked HH One native Dropbox snapshot.
  const a=snapshot(browser,profile,now),b=snapshot(native,profile,now);
  const threshold=(x,y)=>Math.max(500,6*(x.accuracy+y.accuracy));
  if(a&&b&&gpsDistance(a,b)>threshold(a,b))
   return {fix:b,conflict:true,anchor:b,distance:gpsDistance(a,b)};
  if(a&&!b&&priorNative?.profile===profile&&gpsDistance(a,priorNative)>threshold(a,priorNative))
   return {fix:null,conflict:true,anchor:priorNative,distance:gpsDistance(a,priorNative)};
  return {fix:profile==='monika'?b:newest(browser,native,profile,now),conflict:false,anchor:b||null,distance:0};
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
  // A recent local GPS reading takes priority over another data feed.
  return false;
 }
 function init(){
  const d=w?.document;if(!d)return;
  const live=()=>w.HH_GUARDIAN_LIVE_V785;
  const guardian=()=>w.HH_GUARDIAN_V761;
  const getMap=()=>guardian()?.map;
  let latest=null,marker=null,markerNode=null,speedBadge=null,speedValue=null,
   routeBadge=null,routeDetails=null,speedVisible=false,
   run=0,loading=false,rerun=false,lastCenteredAt=0,lastCenteredProfile=null;
  let followRequest=false,lastAdaptivePoll=0,nativeAnchor=null;
  // A verified Gmail Dropbox OAuth session is sufficient to read Monika's
  // own natív GPS. Supabase login is not proof of this Android phone.
  let authorizedNativeProfile=null;
  let markerCoord=null,moveToken=0,moveFrame=null,lastPaintTs=0,lastReceiveAt=0;
  let lastKnownVisible=false;
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
  const authorized=()=>authorizedNativeProfile===selected(); // native GPS proof only
  const followOn=()=>guardian()?.getLocationSettings?.().follow_map===true;
  // Profile selection does not identify this browser's physical phone.
  // Zsolt's local/home GPS cannot preempt Monika's remote native camera.
  const remoteOnlyMonikaView=()=>selected()==='monika'&&
   (!/Android/i.test(String(w.navigator?.userAgent||''))||
    live()?.boundProfile!=='monika');
  const localFixAt=()=>0; // Browser location may not preempt a named native route.
  function showNativeSource(profile,source){
   const panel=d.getElementById('guardianNativeGpsSourceV1174');
   const msg=d.getElementById('guardianNativeGpsMessageV1174');
   const connect=d.getElementById('guardianNativeGpsConnectV1174');
   if(!panel||!msg)return;
   panel.hidden=false;
   const route=w.HH_GUARDIAN_GPS_ROUTER_V1177?.forProfile?.(profile);
   const title=d.getElementById('guardianNativeGpsTitleV1177');
   if(title)title.textContent=(profile==='monika'?'🩷 ':'🔵 ')+(route?.name||'GPS');
   const account=route?.activeReadAccount==='gmail'?'Gmail bridge':'Outlook';
   const valid=source?.status==='ok'?snapshot(source.data,profile):null;
   const needsConnection=!source||source.status==='not-connected'||source.status==='error';
   if(connect)connect.hidden=!needsConnection||profile!=='monika';
   if(valid){
    const t=new Date(valid.ts).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    msg.textContent='✅ '+(route?.name||'GPS')+' · HH Connect natív GPS · '+account+' · '+t+' · ±'+Math.round(valid.accuracy)+' m';
   }else if(needsConnection){
    msg.textContent='🟠 '+(route?.name||'GPS')+' · '+account+' kapcsolat nem olvasható. Más profil pozíciója nem használható.';
   }else{
    msg.textContent='🟠 '+(route?.name||'GPS')+' · nincs friss hitelesített natív GPS-jel · NEM ÉLŐ'+(source?.status==='revoked'?' (megosztás leállítva)':'');
   }
  }
  // Display the age of an authenticated old reading; never re-center the
  // camera, show a stale portrait or describe it as a live position.
  function unavailableLabel(profile,db,native){
   const person=profile==='monika'?'Mónika':'Zsolt',now=Date.now();
   const candidates=[db,native].filter(row=>{
    if(!row||row.profile_key!==profile)return false;
    const ts=Date.parse(row.updated_at);
    return Number.isFinite(ts)&&ts<=now+5000&&
     typeof row.latitude==='number'&&Number.isFinite(row.latitude)&&Math.abs(row.latitude)<=90&&
     typeof row.longitude==='number'&&Number.isFinite(row.longitude)&&Math.abs(row.longitude)<=180&&
     typeof row.accuracy_m==='number'&&Number.isFinite(row.accuracy_m)&&row.accuracy_m>=0&&row.accuracy_m<=100;
   }).sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
   if(!candidates.length)return '🟠 '+person+' · '+(profile==='monika'?'nincs friss, telefonhoz kötött natív GPS-jel · NEM ÉLŐ':'nincs friss hitelesített GPS-jel');
   const time=new Date(candidates[0].updated_at).toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'});
   return '🕘 '+person+' · utolsó ismert GPS: '+time+' · NEM ÉLŐ';
  }
  function showUnavailable(profile,db,native){
   // Do not overwrite the owner's genuinely active foreground GPS diagnostics.
   if(guardian()?.active)return;
   const label=unavailableLabel(profile,db,native);
   const own=d.getElementById('guardianMeState');
   if(own)own.textContent=label;
   const mapLabel=d.getElementById('guardianMapLabel');
   if(mapLabel)mapLabel.textContent=label;
  }
  function showConflict(state){
   const el=d.getElementById('guardianGpsSourceConflictV1072');
   if(!el)return;
   el.hidden=!state;
   if(!state){el.textContent='';return}
   const person=state.profile==='monika'?'Mónika':'Zsolt';
   const km=(state.distance/1000).toFixed(1).replace('.',',');
   el.textContent='⚠ '+person+': a GPS-források kb. '+km+' km-re térnek el. '+
    'Az eltérő böngészős pozícióra nem ugrunk át; ellenőrizni kell az eszközhozzárendelést.';
  }
  function clearMarker(){
   lastKnownVisible=false;
   moveToken++;
   if(moveFrame!==null&&w.cancelAnimationFrame)w.cancelAnimationFrame(moveFrame);
   moveFrame=null;markerCoord=null;lastPaintTs=0;lastReceiveAt=0;lastMotionDuration=820;
   w.HH_GUARDIAN_SMART_PLACES_V1068?.onFix?.(null,null);
   if(marker){try{marker.remove()}catch(_){}marker=null}
   markerNode=null;speedBadge=null;speedValue=null;routeBadge=null;routeDetails=null;speedVisible=false;
   guardian()?.setRemoteMarkerPreferred?.(false);
  }
  // Preserve a verified same-profile portrait only during a temporary
  // outage or freshness gap. The marker is fixed, explicitly NOT LIVE,
  // and is never used for camera follow, movement or speed reporting.
  function retainLastKnown(profile,reason){
   const age=Date.now()-(latest?.ts??NaN);
   if(!marker||!markerNode||latest?.profile!==profile||
    latest?.source!=='HH One Native GPS'||authorizedNativeProfile!==profile||
    !Number.isFinite(age)||age< -5000||age>VERIFIED_LAST_KNOWN_MS){
    return false;
   }
   moveToken++;
   if(moveFrame!==null&&w.cancelAnimationFrame)w.cancelAnimationFrame(moveFrame);
   moveFrame=null;
   lastKnownVisible=true;
   markerNode.classList?.add('guardian-selected-stale-v1181');
   const when=new Date(latest.ts).toLocaleTimeString('hu-HU',
    {hour:'2-digit',minute:'2-digit'});
   const who=profile==='monika'?'Mónika':'Zsolt';
   markerNode.setAttribute?.('aria-label',who+
    ' · UTOLSÓ ISMERT HELY '+when+' · NEM ÉLŐ');
   if(speedBadge){
    speedBadge.setAttribute?.('data-active','false');
    speedBadge.setAttribute?.('aria-hidden','true');
   }
   if(speedValue)speedValue.textContent='';
   speedVisible=false;
   if(routeBadge){routeBadge.hidden=true;routeBadge.textContent=''}
   if(routeDetails){routeDetails.hidden=true;routeDetails.textContent=''}
   markerNode.removeAttribute?.('data-transit-route');
   const status='🕘 '+who+' · UTOLSÓ ISMERT HELY '+when+
    ' · NEM ÉLŐ'+(reason?' · '+reason:'');
   const own=d.getElementById('guardianMeState');
   if(own)own.textContent=status;
   const mapLabel=d.getElementById('guardianMapLabel');
   if(mapLabel)mapLabel.textContent=status;
   return true;
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
   run++;latest=null;nativeAnchor=null;authorizedNativeProfile=null;followRequest=false;lastCenteredAt=0;lastCenteredProfile=null;clearMarker();
   showConflict(null);
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
   lastKnownVisible=false;
   markerNode?.classList?.remove('guardian-selected-stale-v1181');
   if(!marker){
    markerNode=decorate(fix);
    marker=new Marker({element:markerNode,anchor:'bottom'})
     .setLngLat([fix.lng,fix.lat]).addTo(map);
    markerCoord=[fix.lng,fix.lat];lastPaintTs=fix.ts;
   }else paintCoordinate(fix);
   paintSpeed(fix);
   // One verified fix, one existing portrait; Smart Places adds no GPS read.
   w.HH_GUARDIAN_SMART_PLACES_V1068?.onFix?.(fix,markerNode);
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
   const k=selected();
   // Supabase login remains for other features, never for GPS coordinates.
   loading=true;lastAdaptivePoll=Date.now();const ticket=++run;
   let db=null,native=null,revokeAt=NaN;
   try{
    // Exactly one native GPS route per selected profile. No Supabase GPS query.
    const relay=w.HH_GUARDIAN_GPS_ROUTER_V1177;
    const dbRead=Promise.resolve({data:null,error:null});
    const nativeRead=Promise.resolve().then(()=>relay?.connected?.()
     ?relay.read(k):{status:'not-connected',data:null});
    // v1073: Display a verified newer native phone fix without waiting for a
    // slower Supabase response. Retain the full two-source conflict resolution
    // once both reads complete; never add another GPS or network request.
    Promise.resolve(nativeRead).then(out=>{
     if(ticket!==run||d.hidden||k!==selected()||out?.status!=='ok')return;
     const first=snapshot(out.data,k);
     if(first)authorizedNativeProfile=k;
     if(!first||!authorized()||!preferRemote(first,localFixAt())||
        (latest?.profile===k&&latest.ts>=first.ts))return;
     nativeAnchor=first;latest=first;
     showFix(first);
    }).catch(()=>{});
    const [dbOutcome,nativeOutcome]=await Promise.allSettled([dbRead,nativeRead]);
    if(dbOutcome.status==='fulfilled'&&!dbOutcome.value?.error&&dbOutcome.value?.data)
     db=dbOutcome.value.data;
    if(nativeOutcome.status==='fulfilled'){
     const n=nativeOutcome.value;
     if(n?.status==='ok')native=n.data;
     if(n?.status==='revoked')revokeAt=Date.parse(n.updated_at);
    }
    if(ticket!==run||d.hidden||k!==selected())return;
    const source=nativeOutcome.status==='fulfilled'?nativeOutcome.value:{status:'error'};
    const fresh=snapshot(native,k),status=source?.status;
    // Explicit revocation, broken phone authorization and missing grant
    // must clear the icon. A 75s stale *but verified* GPS report is different.
    const temporarilyUnavailable=status==='error'||
     status==='ok'&&!fresh;
    if(fresh)authorizedNativeProfile=k;
    showNativeSource(k,source);
    if(!fresh&&temporarilyUnavailable&&retainLastKnown(k,
     status==='error'?'átmeneti kapcsolat hiba':'GPS-jel frissítésére vár')){
     showConflict(null);return;
    }
    if(!fresh||!authorized()){
     authorizedNativeProfile=null;
     latest=null;nativeAnchor=null;clearMarker();
     showUnavailable(k,k==='monika'?null:db,native);
     return;
    }
    // A native explicit revocation supersedes older cached server fixes.
    if(Number.isFinite(revokeAt)&&(!db||Date.parse(db.updated_at)<=revokeAt))db=null;
    const choice=resolveSources(db,native,k,nativeAnchor);
    nativeAnchor=choice.anchor;
    showConflict(choice.conflict?{profile:k,distance:choice.distance}:null);
    const next=choice.fix;
    if(next&&preferRemote(next,localFixAt())){
     latest=next;showFix(next);followRequest=false;
    }else{
     if(!retainLastKnown(k,'GPS-jel frissítésére vár')){
      latest=null;clearMarker();showUnavailable(k,k==='monika'?null:db,native);
     }
    }
   }catch(_){
    if(ticket===run){
     if(!retainLastKnown(k,'átmeneti hálózati hiba')){
      if(!latest||!preferRemote(latest,localFixAt())){
       latest=null;clearMarker();
       showUnavailable(k,k==='monika'?null:db,native);
      }else paintSpeed(latest);
     }
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
   if(!current()){
    if(marker&&(!lastKnownVisible||!retainLastKnown(selected(),'GPS-jel frissítésére vár')))clearMarker();
    return false;
   }
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
   if(remoteOnlyMonikaView())return true;
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
 return {snapshot,newest,resolveSources,selectedProfile,speedState,canRead,preferRemote,start,
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
