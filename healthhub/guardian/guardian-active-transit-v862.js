/* Family Guard v862 · Active Transit status (web only).
 * Consent driven: explicit boarding or plan selection. No separate GPS watch,
 * no background location, no GPS history. Status is not boarding proof.
 * Shared status goes through authenticated family RLS, never a public endpoint.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_ACTIVE_TRANSIT_V862=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const KEY='hh-guardian-active-transit-v862';
 const TABLE='hh_guardian_active_transit';
 const MODES=new Set(['bus','tram','trolley','metro','hev','rail','other']);
 const MAX_TIME=2*3600000,MAX_AGE=20000;
 const $=id=>w?.document?.getElementById(id);
 const profile=()=>w?.localStorage?.getItem('hh-profile')==='m'?'monika':'zsolt';
 const own=()=>w?.HH_GUARDIAN_LIVE_V785?.boundProfile||null;
 const authorized=()=>!!w?.HH_GUARDIAN_LIVE_V785?.authenticated;
 const client=()=>authorized()?w?.HH_GUARDIAN_LIVE_V785?.getClient?.():null;
 const displayed=()=>profile();
 let active=null,remote=new Map(),lastFix=null,network=null,waiting=false;
 let uiReady=false,syncBusy=false,refreshBusy=false,lastSuggestAt=0,lastBroadcast=0;
 const name=p=>p==='monika'?'Mónika':'Zsolt';
 const elementId=id=>$(id);
 function normalize(raw,now=Date.now()){
  if(!raw||!['zsolt','monika'].includes(raw.profile_key)||
   typeof raw.route_id!=='string'||!/^[0-9A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű-]{1,16}$/.test(raw.route_id)||
   !MODES.has(raw.mode)||!['manual','planned'].includes(raw.selection)||
   typeof raw.onboard!=='boolean')return null;
  const start=Date.parse(raw.started_at),expires=Date.parse(raw.expires_at);
  if(!Number.isFinite(start)||!Number.isFinite(expires)||start>now+60000||
   expires<=now||expires-start>MAX_TIME+60000)return null;
  return {profile:raw.profile_key,route:raw.route_id,mode:raw.mode,
   selection:raw.selection,onboard:raw.onboard,started:start,expires};
 }
 function ownState(){return active&&active.profile===displayed()&&active.expires>Date.now()?active:null}
 function getStatus(which=displayed(),now=Date.now()){
  if(which===displayed()&&ownState()&&(!own()||own()===which))return active;
  const entry=remote.get(which);
  return entry&&entry.expires>now?entry:null;
 }
 const safeMode=mode=>MODES.has(mode)?mode:'other';
 function lineMode(leg){
  const id=String(leg?.line?.id||'').trim();
  if(!id)return null;
  return {id,mode:safeMode(String(leg?.line?.mode||(/^(17|19|1|41)$/.test(id)?'tram':'bus')))};
 }
 function pillText(item){
  if(!item)return '';
  return item.route+' · '+(item.onboard?'felszálltam':'tervezett');
 }
 function announce(){
  w?.dispatchEvent?.(new w.CustomEvent('hh-guardian-active-transit-updated-v862',{
   detail:{profile:displayed()}
  }));
  render();
 }
 function save(){
  try{
   const store=w.sessionStorage;
   if(!store)return;
   if(active)store.setItem(KEY,JSON.stringify({
    profile_key:active.profile,route_id:active.route,mode:active.mode,
    selection:active.selection,onboard:active.onboard,
    started_at:new Date(active.started).toISOString(),
    expires_at:new Date(active.expires).toISOString()}));
   else store.removeItem(KEY);
  }catch(_){}
 }
 function restore(){
  try{
   const s=JSON.parse(w?.sessionStorage?.getItem(KEY)||'null');
   const restored=normalize(s);
   if(restored&&(!own()||restored.profile===own()))active=restored;
  }catch(_){}
 }
 async function send(){
  const item=ownState(),c=client();
  // Do not publish a status from a browser viewing the OTHER profile.
  if(!item||!c||own()!==item.profile)return;
  if(syncBusy)return;
  syncBusy=true;
  try{
   const session=await c.auth.getUser();
   if(!session?.data?.user?.id)return;
   const payload={profile_key:item.profile,owner_id:session.data.user.id,
    route_id:item.route,mode:item.mode,selection:item.selection,onboard:item.onboard,
    started_at:new Date(item.started).toISOString(),
    updated_at:new Date().toISOString(),expires_at:new Date(item.expires).toISOString()};
   const {error}=await c.from(TABLE).upsert(payload,{onConflict:'profile_key'});
   if(!error)lastBroadcast=Date.now();
  }catch(_){}
  finally{syncBusy=false}
 }
 async function stopShared(which){
  const c=client();
  if(!c||own()!==which)return;
  try{await c.from(TABLE).delete().eq('profile_key',which)}catch(_){}
 }
 function choose(route,mode,selection='manual',onboard=true){
  const line=String(route||'').trim();
  if(!/^[0-9A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű-]{1,16}$/.test(line)||!MODES.has(mode))return false;
  const bound=own();
  if(bound&&bound!==displayed()){setNote('Ez a készülék a másik profilhoz van rendelve. Válts a saját profilodra.');return false}
  const now=Date.now();
  active={profile:displayed(),route:line,mode,selection,
   onboard:!!onboard,started:now,expires:now+MAX_TIME};
  waiting=false;save();announce();send();
  setNote((onboard?'Felszállás megjelölve: ':'Kiválasztott útvonal: ')+
   line+'. A járatszám saját választás, nem igazolt járműazonosítás.');
  return true;
 }
 function planned(itinerary){
  const leg=itinerary?.legs?.[0],line=lineMode(leg);
  if(!line)return false;
  waiting=false;return choose(line.id,line.mode,'planned',false);
 }
 function stop(){
  const prior=active?.profile;
  active=null;waiting=false;save();announce();
  if(prior)stopShared(prior);
  setNote('Utazási mód kikapcsolva.');
 }
 function nearestSegmentMeters(p,a,b){
  if(!p||!a||!b)return Infinity;
  if(![p.lat,p.lng,a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return Infinity;
  const rad=Math.PI/180,cos=Math.cos(p.lat*rad);
  const x1=(a.lng-p.lng)*111100*cos,y1=(a.lat-p.lat)*111100;
  const x2=(b.lng-p.lng)*111100*cos,y2=(b.lat-p.lat)*111100;
  const dx=x2-x1,dy=y2-y1,denom=dx*dx+dy*dy;
  const t=denom?Math.max(0,Math.min(1,-(x1*dx+y1*dy)/denom)):0;
  return Math.hypot(x1+t*dx,y1+t*dy);
 }
 function candidates(lines,fix,limit=5){
  if(!Array.isArray(lines)||!fix||!Number.isFinite(fix.lat)||!Number.isFinite(fix.lng)||
   !Number.isFinite(fix.accuracy)||fix.accuracy>100)return [];
  const output=new Map();
  for(const line of lines){
   const key=String(line?.id||''),stops=line?.stops;
   if(!key||!Array.isArray(stops)||stops.length<2||
     ['960','917','917A'].includes(key))continue;
   let nearest=Infinity;
   for(let i=1;i<stops.length;i++){
    const a=stops[i-1],b=stops[i];
    if(Math.abs(a.lat-fix.lat)>.004&&Math.abs(b.lat-fix.lat)>.004)continue;
    const distance=nearestSegmentMeters(fix,a,b);
    if(distance<nearest)nearest=distance;
   }
   if(nearest>Math.max(75,fix.accuracy+45))continue;
   const old=output.get(key);
   if(!old||nearest<old.distance)output.set(key,{
    id:key,mode:safeMode(line.mode),distance:Math.round(nearest)});
  }
  return [...output.values()].sort((a,b)=>a.distance-b.distance||
   a.id.localeCompare(b.id,'hu')).slice(0,limit);
 }
 function setNote(text){const el=$('hhActiveTransitStatusV862');if(el)el.textContent=text}
 function renderCandidates(){
  const out=$('hhActiveTransitCandidatesV862');
  if(!out)return;
  out.replaceChildren();
  if(!waiting||!lastFix){
   if(waiting)setNote('GPS-jelre várunk. A járatot kézzel is megadhatod.');
   return;
  }
  if(!network)network=w?.HH_SMART_HUB_ROUTER_V804?.networkLines||null;
  const rows=candidates(network,lastFix);
  for(const row of rows){
   const b=w.document.createElement('button');b.type='button';
   b.className='hh-transit-candidate-v862';b.dataset.mode=row.mode;
   b.textContent=row.id+' · közel '+row.distance+' m';
   b.title='Közeli vonal a statikus BKK-megállósorrend alapján. Nem igazolt felszállás.';
   b.addEventListener('click',()=>choose(row.id,row.mode));
   out.append(b);
  }
  if(rows.length)setNote('Közeli lehetséges járatok. Koppints a helyes járatszámra, vagy add meg kézzel.');
  else setNote('Nem találtam megbízható közeli járatot. Add meg a járatszámot kézzel.');
 }
 function render(){
  const bar=$('hhActiveTransitPanelV862');
  if(!bar)return;
  const selected=displayed(),state=ownState();
  const message=$('hhActiveTransitCurrentV862'),select=$('hhActiveTransitSelectV862');
  const stopBtn=$('hhActiveTransitStopV862'),startBtn=$('hhActiveTransitBoardV862');
  if(message)message.textContent=state?
   name(selected)+' · '+pillText(state)+' · '+(lastFix&&Date.now()-lastFix.ts<=MAX_AGE?'GPS friss':'GPS-jelre vár') :
   waiting?'Válassz egy járatot a GPS-találatok közül.':
    'Nincs aktív utazás.';
  if(select)select.hidden=!waiting;
  if(stopBtn)stopBtn.hidden=!state&&!waiting;
  if(startBtn)startBtn.textContent=state?.onboard?'🚋 Másik járatra szálltam':'🚋 Felszálltam';
 }
 function board(){
  const bound=own();
  if(bound&&bound!==displayed()){
   setNote('A GPS ehhez a profilhoz nem a saját telefonról érkezik. Válts profilt.');
   return;
  }
  waiting=true;render();
  if(!w?.HH_GUARDIAN_V761?.active){
   // Explicit button press. The established GPS owner/consent rules stay intact.
   w?.HH_GUARDIAN_V761?.startFollowing?.();
  }
  if(lastFix&&Date.now()-lastFix.ts<MAX_AGE)renderCandidates();
  else setNote('Helymeghatározás indul. Várjuk a friss GPS-jelet, vagy add meg a járatszámot kézzel.');
  $('hhActiveTransitManualV862')?.focus?.();
 }
 function ownGpsFix(pos){
  if(!pos?.coords)return;
  const ts=Number(pos.timestamp),c=pos.coords;
  if(!Number.isFinite(ts)||Date.now()-ts>MAX_AGE||ts>Date.now()+5000||
   !Number.isFinite(c.latitude)||!Number.isFinite(c.longitude)||
   !Number.isFinite(c.accuracy)||c.accuracy>100)return;
  lastFix={lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,ts};
  if(waiting&&Date.now()-lastSuggestAt>8000){
   lastSuggestAt=Date.now();renderCandidates();
  }
  render();
 }
 async function refresh(){
  if(refreshBusy)return;
  const c=client(),selected=displayed();
  if(!c)return;
  const live=w.HH_GUARDIAN_LIVE_V785;
  if(!(live?.familyAuthorized||live?.boundProfile===selected))return;
  refreshBusy=true;
  try{
   const {data,error}=await c.from(TABLE)
    .select('profile_key,route_id,mode,selection,onboard,started_at,expires_at')
    .eq('profile_key',selected).maybeSingle();
   if(error)return;
   const checked=normalize(data);
   if(checked)remote.set(selected,checked);else remote.delete(selected);
   announce();
  }catch(_){}
  finally{refreshBusy=false}
 }
 function init(){
  if(uiReady||!w?.document||!$('hhActiveTransitPanelV862'))return;
  uiReady=true;restore();
  $('hhActiveTransitBoardV862')?.addEventListener('click',board);
  $('hhActiveTransitStopV862')?.addEventListener('click',stop);
  $('hhActiveTransitConfirmV862')?.addEventListener('click',()=>{
   const line=$('hhActiveTransitManualV862')?.value;
   const mode=$('hhActiveTransitModeV862')?.value||'bus';
   if(!choose(line,mode))setNote('Adj meg érvényes járatszámot, és válaszd ki a jármű típusát.');
  });
  $('hhActiveTransitManualV862')?.addEventListener('keydown',e=>{
   if(e.key==='Enter'){e.preventDefault();$('hhActiveTransitConfirmV862')?.click?.()}
  });
  w.addEventListener?.('hh-guardian-own-fix-v862',e=>ownGpsFix(e.detail));
  w.addEventListener?.('hh-transit-network-ready-v862',()=>{network=w?.HH_SMART_HUB_ROUTER_V804?.networkLines||null;if(waiting)renderCandidates()});
  w.addEventListener?.('hh-guardian-auth-changed',refresh);
  w.addEventListener?.('pageshow',refresh);
  w.addEventListener?.('storage',e=>{
   if(e.key==='hh-profile'){active=null;waiting=false;lastFix=null;restore();render();refresh()}
  });
  $('guardianProfileSwitch')?.addEventListener('click',()=>w.setTimeout?.(()=>{
   active=null;waiting=false;lastFix=null;restore();render();refresh()
  },0));
  w.document.addEventListener?.('visibilitychange',()=>{if(!w.document.hidden)refresh()});
  w.setInterval?.(()=>{if(!w.document.hidden)refresh()},10000);
  render();refresh();
 }
 if(w?.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {normalize,nearestSegmentMeters,candidates,choose,planned,stop,getStatus,
  ownGpsFix,refresh,init,version:'862'};
});
