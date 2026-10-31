/* Family Guard v1056 · official supplied SH9 logo and full-height status glass.
 * Hero presentation only. Reuses existing verified 8-indicator source logic.
 * No new GPS request, native permissions, cloud calls or OTA action.
 */
(function(w,d){
 'use strict';
 function mount(){
  if(d.documentElement?.dataset?.hhDevicePackLiveV1056!=='on')return false;
  const header=d.getElementById('guardianDevicePackLogoV1054');
  if(!header)return false;
  if(header.dataset.liveLogoV1056==='ready')return true;
  header.dataset.liveLogoV1056='ready';
  header.removeAttribute('aria-hidden');
  header.setAttribute('role','img');
  header.setAttribute('aria-label','SH9 Family Guard · Biztonság és monitoring');
  header.textContent='';
  const logo=d.createElement('img');
  logo.className='fg-brand-image-v1056';
  logo.src='../assets/sh9-family-guard-logo-v1056.webp';
  logo.alt='SH9 Family Guard · Biztonság és monitoring';
  logo.width=160;logo.height=51;logo.decoding='async';
  logo.setAttribute('draggable','false');
  header.appendChild(logo);
  return true;
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 w.HH_GUARDIAN_DEVICE_PACK_LIVE_V1056=Object.freeze({mount});
})(window,document);
