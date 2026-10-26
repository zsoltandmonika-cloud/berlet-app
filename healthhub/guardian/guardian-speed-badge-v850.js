/* Family Guard v850 · profile-tinted name + expandable glass speed row.
 * Read-only. Never polls GPS, requests permissions or uploads sensor records.
 * Exact speed data only, supplied by a verified live own/selected-profile fix.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_SPEED_BADGE_V850=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const SHOW_ABOVE=5,HIDE_BELOW=4,MAX_SPEED=200,MAX_AGE=25000,MAX_ACCURACY=40;
 function decide(wasVisible,speed,accuracy,updatedAt,now=Date.now()){
  const ts=typeof updatedAt==='number'?updatedAt:Date.parse(updatedAt||'');
  if(typeof speed!=='number'||!Number.isFinite(speed)||speed<0||speed>MAX_SPEED||
    typeof accuracy!=='number'||!Number.isFinite(accuracy)||accuracy<0||accuracy>MAX_ACCURACY||
    !Number.isFinite(ts)||ts>now+5000||now-ts>MAX_AGE)return {visible:false,text:''};
  const visible=speed>SHOW_ABOVE||(!!wasVisible&&speed>=HIDE_BELOW);
  // GPS precision is not fabricated; round only for compact display.
  return {visible,text:visible?String(Math.round(speed))+' km/h':''};
 }
 function update(node,reading){
  if(!node||typeof node.querySelector!=='function'||!w?.document?.createElement)return false;
  const label=node.querySelector('.guardian-position-label');
  if(!label)return false;
  let name=label.querySelector?.('.guardian-speed-name-v850');
  let speedRow=label.querySelector?.('.guardian-speed-row-v850');
  if(!name||!speedRow){
   const original=String(label.textContent||'').trim().split(/\s+/)[0];
   label.textContent='';
   name=w.document.createElement('span');
   name.className='guardian-speed-name-v850';
   name.textContent=original;
   speedRow=w.document.createElement('span');
   speedRow.className='guardian-speed-row-v850';
   speedRow.setAttribute('aria-hidden','true');
   const gauge=w.document.createElement('span');
   gauge.className='guardian-speed-gauge-v850';
   gauge.textContent='◴';
   gauge.setAttribute('aria-hidden','true');
   const value=w.document.createElement('span');
   value.className='guardian-speed-value-v850';
   speedRow.append(gauge,value);
   label.append(name,speedRow);
  }
  const stamp=reading?.ts;
  const now=reading?.now??Date.now();
  const state=decide(label.__hhSpeedVisibleV850===true,reading?.speed,reading?.accuracy,stamp,now);
  label.__hhSpeedVisibleV850=state.visible;
  label.classList?.toggle('guardian-speed-open-v850',state.visible);
  const value=speedRow.querySelector?.('.guardian-speed-value-v850');
  if(value)value.textContent=state.text;
  const title=name?.textContent||'Profil';
  node.setAttribute?.('aria-label',title+' · '+(state.visible?state.text+' · élő GPS-sebesség':'GPS-pozíció'));
  return state.visible;
 }
 function hide(node){
  if(!node||typeof node.querySelector!=='function')return false;
  const label=node.querySelector('.guardian-position-label');
  if(!label)return false;
  label.__hhSpeedVisibleV850=false;
  label.classList?.remove('guardian-speed-open-v850');
  const value=label.querySelector?.('.guardian-speed-value-v850');
  if(value)value.textContent='';
  return true;
 }
 return {decide,update,hide,version:'850'};
});
