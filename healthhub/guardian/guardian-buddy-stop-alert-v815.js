/* Family Guard Buddy Stop Alert v815 · opt-in foreground-only journey alerts.
 * Source: BKK verified GTFS stop sequence and validated GTFS-RT bus positions.
 * No background promises, no client-side BKK API secret, no geolocation uploads.
 */
(function(w,d){
 'use strict';
 const $=id=>d.getElementById(id),C=w.HH_BUDDY_STOP_CORE_V815;
 if(!C||!$('hhStopAlertStudioV815'))return;
 const KEY='hh-buddy-stop-alert-v815',DEFAULT='Figyelem, a beállított célállomás következik!';
 const LEAVE='Mónika, ideje elindulni a Citronella utcai megállóhoz!';
 const mapRoutes=['260','17','19'];
 let routes=null,armed=null,lastDistance=null,seenVehicles=new Map(),lastTriggered=new Set(),audioCtx=null;
 const get=id=>$(id)?.value||'',status=message=>{const el=$('hhStopStatusV815');if(el)el.textContent=message};
 const profile=()=>get('hhTransitProfileV791')==='monika'?'monika':
  get('hhTransitProfileV791')==='zsolt'?'zsolt':w.localStorage?.getItem('hh-profile')==='m'?'monika':'zsolt';
 function defaults(){return {route:'260',variant:1,stopId:'',mode:'alight',watchStopId:'',
  message:DEFAULT,leaveMessage:LEAVE,sound:'mokuska',volume:75,enabled:true}}
 let prefs={zsolt:defaults(),monika:defaults()};
 function clean(o){
  const v=o&&typeof o==='object'?o:{},dflt=defaults();
  return {route:mapRoutes.includes(v.route)?v.route:dflt.route,
   variant:Number.isInteger(v.variant)&&v.variant>=0&&v.variant<5?v.variant:dflt.variant,
   stopId:typeof v.stopId==='string'&&v.stopId.length<=32?v.stopId:'',
   mode:['alight','leave'].includes(v.mode)?v.mode:'alight',
   watchStopId:typeof v.watchStopId==='string'&&v.watchStopId.length<=32?v.watchStopId:'',
   message:typeof v.message==='string'&&v.message.trim()?v.message.trim().slice(0,240):DEFAULT,
   leaveMessage:typeof v.leaveMessage==='string'&&v.leaveMessage.trim()?v.leaveMessage.trim().slice(0,240):LEAVE,
   sound:['mokuska','chime','tada','soft','silent'].includes(v.sound)?v.sound:'mokuska',
   volume:Number.isFinite(Number(v.volume))?Math.max(0,Math.min(100,Math.round(Number(v.volume)))):75,
   enabled:v.enabled!==false};
 }
 function load(){
  try{const obj=JSON.parse(w.localStorage.getItem(KEY)||'null');
   for(const p of ['zsolt','monika'])prefs[p]=clean(obj?.[p]);}catch(_){}
 }
 function save(){
  try{w.localStorage.setItem(KEY,JSON.stringify(prefs));return true}
  catch(_){status('Mentési hiba: az Edge helyi tárhelye nem írható.');return false}
 }
 function selectedVariant(){
  const r=routes?.[get('hhStopRouteV815')];return r?.variants[Number(get('hhStopDirectionV815'))]||null;
 }
 function addOption(sel,value,label){
  const opt=d.createElement('option');opt.value=String(value);opt.textContent=label;sel.append(opt);
 }
 function populateDirections(preferred){
  const el=$('hhStopDirectionV815');el.replaceChildren();const r=routes?.[get('hhStopRouteV815')];
  if(!r){addOption(el,'','BKK-megállóadatok betöltése…');return}
  r.variants.forEach((v,i)=>addOption(el,i,v.headsign));
  el.value=String(Math.min(r.variants.length-1,Math.max(0,Number(preferred)||0)));
  populateStops('');
 }
 function populateStops(preferredStop,preferredWatcher){
  const variant=selectedVariant(),el=$('hhStopTargetV815'),watch=$('hhStopWatchV815');
  el.replaceChildren();watch.replaceChildren();
  addOption(el,'','Válassz célmegállót…');
  addOption(watch,'','Válassz jelzőmegállót…');
  if(variant){
   variant.stops.forEach((s,i)=>{
    if(i>0)addOption(el,s.id,s.name);
    // 260 towards Harsánylejtő: set a manual trigger BEFORE Citronella.
    if(get('hhStopRouteV815')==='260'&&variant.headsign==='Harsánylejtő'){
     const cit=variant.stops.findIndex(st=>st.name==='Citronella utca');
     if(cit>0&&i<cit)addOption(watch,s.id,s.name);
    }
   });
  }
  if(preferredStop&&[...el.options].some(o=>o.value===preferredStop))el.value=preferredStop;
  if(preferredWatcher&&[...watch.options].some(o=>o.value===preferredWatcher))watch.value=preferredWatcher;
  showLead();
 }
 function showLead(){
  const v=selectedVariant(),t=get('hhStopTargetV815'),lead=C.leadStop(v,t);
  const el=$('hhStopLeadV815');
  if(el)el.textContent=lead?'Buddy itt jelez: '+lead.name+' · egy megállóval a cél előtt':
   'Válassz a menetirányban egy célmegállót (az első megálló nem választható).';
  const mode=get('hhStopModeV815');
  const bus=mode==='leave';
  const block=$('hhStopLeaveSettingsV815');if(block)block.hidden=!bus;
  const help=$('hhStopModeHelpV815');
  if(help)help.textContent=bus?
   'Mónika telefonján a BKK hitelesített 260-asának kiválasztott megállóhoz közeledését figyeljük. Nem számítunk ki érkezési időt.':
   'Saját telefonod friss GPS-e alapján szólunk, amikor az előző megállóhoz közeledsz.';
 }
 function render(){
  const p=prefs[profile()],route=$('hhStopRouteV815');route.value=p.route;
  populateDirections(p.variant);populateStops(p.stopId,p.watchStopId);
  for(const [id,key] of [['hhStopModeV815','mode'],['hhStopTextV815','message'],
   ['hhStopLeaveTextV815','leaveMessage'],['hhStopSoundV815','sound'],['hhStopVolumeV815','volume']])
   if($(id))$(id).value=String(p[key]);
  const output=$('hhStopVolumeValueV815');if(output)output.textContent=p.volume+'%';
  showLead();if(armed)stop('Profil vagy beállítás megváltozott · figyelés leállítva.');
 }
 function readForm(){
  return clean({route:get('hhStopRouteV815'),variant:Number(get('hhStopDirectionV815')),
   stopId:get('hhStopTargetV815'),watchStopId:get('hhStopWatchV815'),
   mode:get('hhStopModeV815'),message:get('hhStopTextV815'),
   leaveMessage:get('hhStopLeaveTextV815'),sound:get('hhStopSoundV815'),
   volume:get('hhStopVolumeV815'),enabled:true});
 }
 function store(){
  if(!routes){status('A hiteles BKK-megállósorrend még nem töltött be.');return false}
  prefs[profile()]=readForm();if(!save())return false;
  status('✓ Mentve · '+(profile()==='monika'?'Mónika':'Zsolt')+' beállításai ezen az Edge-eszközön. A figyelés külön indítandó.');
  return true;
 }
 function popup(message,title,test){
  const box=$('hhStopPopupV815');if(!box)return;
  $('hhStopPopupTitleV815').textContent=title;
  $('hhStopPopupBodyV815').textContent=message;
  $('hhStopPopupFlagV815').textContent=test?'🐿️ BUDDY · KÉZI TESZT':'🐿️ BUDDY · HELYALAPÚ JELZÉS';
  box.hidden=false;
 }
 function play(p,message){
  if(p.sound!=='silent'&&p.volume>0){
   // Play short chime through explicit test or user-armed foreground trip.
   try{
    const Audio=w.AudioContext||w.webkitAudioContext;
    if(Audio){
     audioCtx=new Audio();audioCtx.resume?.().catch(()=>{});
     const seq=p.sound==='mokuska'?[740,920,1175,950]:p.sound==='tada'?[392,523,784]:
      p.sound==='chime'?[784,1046]:[660];
     const level=Math.min(.22,.22*p.volume/100);
     seq.forEach((hz,i)=>{
      const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+.02+i*.16;
      o.type='sine';o.frequency.setValueAtTime(hz,t);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level,t+.015);
      g.gain.exponentialRampToValueAtTime(.0001,t+.13);
      o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+.15);
     });
    }
   }catch(_){}
  }
  // Voice is optional. Never promise speech when Edge/device lacks hu-HU TTS.
  if(p.sound!=='silent'&&'speechSynthesis' in w&&typeof w.SpeechSynthesisUtterance==='function'){
   try{
    const utterance=new w.SpeechSynthesisUtterance(message);
    utterance.lang='hu-HU';utterance.rate=.96;utterance.volume=p.volume/100;
    w.speechSynthesis.cancel();w.speechSynthesis.speak(utterance);
   }catch(_){}
  }
 }
 function announce(message,title,p,test=false){popup(message,title,test);play(p,message)}
 function stop(message){
  armed=null;lastDistance=null;seenVehicles.clear();lastTriggered.clear();
  $('hhStopStartV815').hidden=false;$('hhStopStopV815').hidden=true;
  if(message)status(message);
 }
 function arm(){
  if(d.hidden){status('Csak előtérben, látható Family Guard mellett indítható.');return}
  if(!routes){status('A BKK-megállóadatok még nem ellenőrizhetők.');return}
  const p=readForm(),v=routes[p.route]?.variants[p.variant];
  if(!v){status('Válassz járatot és irányt.');return}
  const target=v.stops.findIndex(s=>s.id===p.stopId);
  if(p.mode==='alight'&&(target<1||!C.leadStop(v,p.stopId))){
   status('Válassz célmegállót, amely előtt van még egy megálló.');return}
  if(p.mode==='alight'&&!w.HH_GUARDIAN_V761?.active){
   status('Először indítsd el a Family Guard saját GPS-ét a „GPS indítása” gombbal.');return}
  if(p.mode==='leave'){
   if(p.route!=='260'||v.headsign!=='Harsánylejtő'){
    status('Mónika indulásjelzőjéhez válaszd a 260-as Harsánylejtő irányát.');return}
   const bound=w.HH_GUARDIAN_LIVE_V785?.boundProfile;
   if(profile()!=='monika'||bound!=='monika'){
    status('Az indulásjelzőt Mónika saját, Mónika-profilhoz rendelt telefonján indítsd el. Másik telefonra ez a böngésző nem küld értesítést.');return}
   const trigger=v.stops.findIndex(s=>s.id===p.watchStopId);
   const citronella=v.stops.findIndex(s=>s.name==='Citronella utca');
   if(trigger<0||citronella<1||trigger>=citronella){
    status('Válaszd ki a Citronella előtti jelzőmegállót.');return}
  }
  prefs[profile()]=p;if(!save())return;
  const index=v.stops.findIndex(s=>s.id===p.watchStopId);
  armed={...p,profile:profile(),headsign:v.headsign,target:v.stops[target]||null,
   lead:C.leadStop(v,p.stopId),trigger:v.stops[index]||null,
   previousStop:v.stops[index-1]||null};
  lastDistance=null;seenVehicles.clear();lastTriggered.clear();
  $('hhStopStartV815').hidden=true;$('hhStopStopV815').hidden=false;
  status(p.mode==='leave'?
   '🟢 260-as indulásjelző figyelése · BKK élő járműadatokra vár · csak nyitott Edge mellett.':
   '🟢 Leszállásjelző figyelése · friss saját GPS-pontra vár · csak nyitott Edge mellett.');
 }
 function onGps(pos){
  if(!armed||armed.mode!=='alight'||armed.profile!==profile()||d.hidden)return;
  const fix=C.currentFix(pos);if(!fix)return;
  const dist=C.distance(fix,armed.lead);
  if(C.detection(lastDistance,dist)){
   const msg=armed.message;const p=armed;stop('🔔 Jelzés megtörtént · '+p.lead.name+'.');
   announce(msg,'Leszállásjelző · '+p.route,p);
  } else lastDistance=dist;
 }
 function onVehicles(event){
  if(!armed||armed.mode!=='leave'||armed.profile!==profile()||d.hidden)return;
  const payload=event?.detail||{};
  if(!Array.isArray(payload.vehicles))return;
  for(const v of payload.vehicles){
   const fix=C.liveBus(v);
   if(!fix||lastTriggered.has(fix.id)||!armed.previousStop)continue;
   const old=seenVehicles.get(fix.id);
   if(old&&fix.timestamp<=old.timestamp)continue;
   if(old&&C.directionalApproach(old,fix,armed.previousStop,armed.trigger,115)){
    const p=armed;stop('🔔 Friss járműjel a(z) '+p.trigger.name+' megálló felé · Mónika indulásjelző.');
    announce(p.leaveMessage,'Indulás a Citronellához · 260',p);break;
   }
   seenVehicles.set(fix.id,fix);
  }
 }
 async function download(){
  const urls=[new URL('./bkk-routes-v790.json',w.location.href).href,
   'https://raw.githubusercontent.com/zsoltandmonika-cloud/berlet-app/main/healthhub/guardian/bkk-routes-v790.json'];
  for(const url of urls){
   try{const res=await w.fetch(url,{cache:'no-cache'});if(!res.ok)continue;
    const doc=await res.json(),verified=C.validateRoutes(doc);
    if(verified){routes=verified;render();status('BKK megállósorrend ellenőrizve · válassz járatot, irányt és célt.');return}
   }catch(_){}
  }
  status('A BKK megállóadatai nem ellenőrizhetők. Figyelés nem indítható.');
 }
 function init(){
  load();
  for(const [id,event,cb] of [
   ['hhStopRouteV815','change',()=>{populateDirections(0);showLead();stop('Új járat kiválasztva · indítsd újra a figyelést.')}],
   ['hhStopDirectionV815','change',()=>{populateStops('','');stop('Új irány kiválasztva · indítsd újra a figyelést.')}],
   ['hhStopTargetV815','change',()=>{showLead();stop('Új célmegálló · indítsd újra a figyelést.')}],
   ['hhStopModeV815','change',()=>{showLead();stop('Üzemmód megváltozott.')}],
   ['hhStopWatchV815','change',()=>stop('Új jelzőmegálló · indítsd újra a figyelést.')],
   ['hhStopSaveV815','click',store],['hhStopStartV815','click',arm],
   ['hhStopStopV815','click',()=>stop('■ Jelzés leállítva.')],
   ['hhStopClosePopupV815','click',()=>{$('hhStopPopupV815').hidden=true}],
   ['hhStopTestV815','click',()=>{
    const p=readForm();const leaving=p.mode==='leave';
    announce(leaving?p.leaveMessage:p.message,leaving?'Mónika indulásjelző · TESZT':'Leszállásjelző · TESZT',p,true);
    status('🐿️ KÉZI TESZT: nem történt valódi jármű- vagy GPS-esemény.');
   }]
  ])$(id)?.addEventListener(event,cb);
  $('hhStopVolumeV815')?.addEventListener('input',()=>{
   $('hhStopVolumeValueV815').textContent=get('hhStopVolumeV815')+'%';
  });
  $('hhTransitProfileV791')?.addEventListener('change',render);
  w.addEventListener('storage',e=>{if(e.key==='hh-profile'||e.key===KEY){if(e.key===KEY)load();render();}});
  w.addEventListener('hh-bkk-live-verified-v815',onVehicles);
  d.addEventListener('visibilitychange',()=>{if(d.hidden&&armed)stop('⏸ Edge háttérbe került: az útfigyelés biztonságosan leállt.');});
  w.addEventListener('pagehide',()=>stop());
  download();
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init);else init();
 w.HH_BUDDY_STOP_ALERT_V815=Object.freeze({onGpsFix:onGps});
})(window,document);
