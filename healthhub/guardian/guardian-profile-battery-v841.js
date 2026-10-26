/* Family Guard v841 · Selected owner's battery, never the VIEWER's battery.
 * Authenticated HH One GPS telemetry uses the existing read-only private
 * Dropbox bridge and approved device-registry owner binding. No new writer,
 * browser battery probe, permissions, GPS access or data sharing.
 * The actual source payload requires a NEW SIGNED HH One Android release.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_BATTERY_V841=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const FRESH_MS=125000;
 function selectedProfile(storage){
  try{return storage?.getItem('hh-profile')==='m'?'monika':'zsolt'}
  catch(_){return 'zsolt'}
 }
 function validSnapshot(record,profile,now=Date.now()){
  if(!record||record.profile_key!==profile||
   !Number.isInteger(record.battery_pct)||
   record.battery_pct<0||record.battery_pct>100)return null;
  const date=Date.parse(record.updated_at);
  if(!Number.isFinite(date)||date>now+5000||now-date>FRESH_MS)return null;
  const charging=typeof record.battery_charging==='boolean'?record.battery_charging:null;
  return {profile,percent:record.battery_pct,charging,ts:date};
 }
 function tone(percent){
  if(!Number.isInteger(percent)||percent<0||percent>100)return 'unknown';
  if(percent<15)return 'critical';
  if(percent<30)return 'red';
  if(percent<70)return 'amber';
  return 'green';
 }
 function permitted(auth,profile){
  return !!(auth?.authenticated&&
   (auth.familyAuthorized||auth.boundProfile===profile));
 }
 function init(){
  const d=w?.document;
  const badge=d?.getElementById('guardianBatteryV841');
  const text=d?.getElementById('guardianBatteryTextV841');
  const icon=d?.getElementById('guardianBatteryFillV841');
  if(!d||!badge||!text||!icon)return null;
  const relay=()=>w.HH_GUARDIAN_NATIVE_V156;
  const auth=()=>w.HH_GUARDIAN_LIVE_V785;
  const getProfile=()=>selectedProfile(w.localStorage);
  let seq=0,pending=false,queued=false,last=null;
  function paint(record){
   last=record;
   const p=record?.percent;
   badge.dataset.level=tone(p);
   badge.dataset.charging=String(record?.charging===true);
   badge.style.setProperty('--hh-batt-percent',Number.isInteger(p)?p+'%':'0%');
   text.textContent=Number.isInteger(p)?p+'%':'—';
   const owner= getProfile()==='monika'?'Mónika':'Zsolt';
   const condition=p<15?'kritikusan alacsony':p<30?'alacsony':p<70?'közepes':'megfelelő';
   const chargeState=record?.charging===true?' · töltés alatt':
    record?.charging===false?' · nem tölt':' · a töltés állapota nem ismert';
   const label=Number.isInteger(p)?
    owner+' telefonja · '+p+'% · '+condition+' töltöttség'+chargeState:
    owner+' telefonja · nincs friss, hitelesített akkumulátoradat';
   badge.setAttribute('aria-label',label);
   badge.title=label;
  }
  async function refresh(){
   if(d.hidden)return;
   if(pending){queued=true;return}
   const profile=getProfile(),r=relay();
   if(!permitted(auth(),profile)||!r?.connected?.()){
    paint(null);return;
   }
   pending=true;const ticket=++seq;
   try{
    const response=await r.read(profile);
    if(ticket!==seq||d.hidden||profile!==getProfile()||!permitted(auth(),profile))return;
    const next=response?.status==='ok'?validSnapshot(response.data,profile):null;
    paint(next);
   }catch(_){
    if(ticket===seq)paint(null);
   }finally{
    pending=false;
    if(queued){queued=false;w.setTimeout?.(refresh,0)}
   }
  }
  function onProfileChanged(){
   // A profile switch invalidates even a pending request immediately,
   // so never flash Zsolt's battery level on Mónika's page or vice versa.
   seq++;paint(null);refresh();
  }
  const switcher=d.getElementById('guardianProfileSwitch');
  switcher?.addEventListener('click',()=>w.setTimeout?.(onProfileChanged,0));
  w.addEventListener?.('storage',e=>{if(e.key==='hh-profile')onProfileChanged()});
  w.addEventListener?.('hh-guardian-auth-changed',onProfileChanged);
  d.addEventListener?.('visibilitychange',()=>{if(d.hidden){seq++;paint(null)}else refresh()});
  w.addEventListener?.('pageshow',refresh);
  w.setInterval?.(refresh,30000);
  paint(null);refresh();
  return {refresh,onProfileChanged,get value(){return last}};
 }
 let state=null;
 function start(){
  if(state)return state;
  state=init();
  return state;
 }
 if(w?.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',start);
  else start();
 }
 return {selectedProfile,validSnapshot,tone,permitted,start,version:'841'};
});
