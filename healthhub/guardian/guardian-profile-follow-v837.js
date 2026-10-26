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
  return {profile,lat:record.latitude,lng:record.longitude,ts,
    source:native?'HH One Native GPS':'Family Live',accuracy:record.accuracy_m};
 }
 function newest(browser,native,profile,now=Date.now()){
  const a=snapshot(browser,profile,now),b=snapshot(native,profile,now);
  if(!a)return b;
  if(!b)return a;
  return b.ts>=a.ts?b:a;
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
  let latest=null,marker=null,run=0,loading=false,rerun=false,lastCenteredAt=0,lastCenteredProfile=null;
  let followRequest=false;
  const selected=()=>selectedProfile(w.localStorage);
  const bound=()=>live()?.boundProfile;
  const authorized=()=>canRead(live(),selected());
  const followOn=()=>guardian()?.getLocationSettings?.().follow_map===true;
  const localFixAt=()=>guardian()?.lastGpsFixAt||0;
  function clearMarker(){
   if(marker){try{marker.remove()}catch(_){}marker=null}
   guardian()?.setRemoteMarkerPreferred?.(false);
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
    map.easeTo({center:[latest.lng,latest.lat],
     zoom:Math.max(map.getZoom?.()||15,15.3),duration:force?640:820});
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
   label.textContent=k==='monika'?'Mónika':'Zsolt';
   el.append(photo,label);
   return el;
  }
  function showFix(fix){
   const map=getMap(),Marker=w.maplibregl?.Marker;
   if(!map||typeof Marker!=='function')return;
   if(!marker){
    marker=new Marker({element:decorate(fix),anchor:'bottom'})
     .setLngLat([fix.lng,fix.lat]).addTo(map);
   }else marker.setLngLat([fix.lng,fix.lat]);
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
   if(!client)return;
   loading=true;const ticket=++run;
   let db=null,native=null,revokeAt=NaN;
   try{
    const res=await client.from('hh_guardian_live_locations')
     .select('profile_key,latitude,longitude,accuracy_m,updated_at,speed_kmh')
     .eq('profile_key',k).maybeSingle();
    if(!res.error&&res.data)db=res.data;
    const relay=w.HH_GUARDIAN_NATIVE_V156;
    if(relay?.connected?.()){
     const n=await relay.read(k);
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
    if(ticket===run&&(!latest||!preferRemote(latest,localFixAt())))clearMarker();
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
  d.addEventListener?.('visibilitychange',()=>{
   if(d.hidden){invalidate();return}
   refresh();
  });
  w.addEventListener?.('pageshow',refresh);
  w.addEventListener?.('pagehide',invalidate);
  w.setInterval?.(refresh,5000);
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
 return {snapshot,newest,selectedProfile,canRead,preferRemote,start,
  requestFollow(){return controller?.requestFollow()||false},
  focusLatest(force){return controller?.focusLatest(force)||false},
  preventWrongDeviceGps(){return controller?.preventWrongDeviceGps()||false},
  onFollowState(){controller?.onFollowState()},
  onLocalGpsFix(){return controller?.onLocalGpsFix()||false},
  get ready(){return !!controller?.ready},version:'837',revision:'839'};
});
