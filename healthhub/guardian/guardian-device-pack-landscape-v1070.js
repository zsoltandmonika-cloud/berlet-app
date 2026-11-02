/* Family Guard v1070 · 4×2 landscape eight-indicator hero.
 * Presentation only. Requires the existing verified live v1056 pack.
 * Does not alter any device state, GPS, Health, OTA, map or navigation action.
 */
(function(w,d){
 'use strict';
 function mount(){
  const root=d.documentElement;
  if(root?.dataset?.hhDevicePackLiveV1056!=='on')return false;
  if(root.dataset.hhGuardianLandscapeV1070==='on')return true;
  const hero=d.querySelector('.guardian-hero');
  const pack=d.getElementById('guardianTrioV845');
  const logo=d.getElementById('guardianDevicePackLogoV1054');
  if(!hero||!pack||!logo||pack.parentElement!==hero||logo.parentElement!==pack)return false;
  const cards=[...pack.children].filter(node=>node!==logo);
  const required=['guardianBatteryV841','guardianGpsCardV845','guardianHealthCardV845',
   'guardianPackOtaV1053','guardianPackWifiV1053','guardianPackMobileV1053',
   'guardianPackBluetoothV1053','guardianPackCloudV1053'];
  // Fail safe: only replace the layout if all original eight live indicators exist.
  if(cards.length!==8||cards.some((node,i)=>node.id!==required[i]))return false;
  // Put the existing approved image in its own top-right slot so the eight
  // original nodes flow into exactly four landscape columns and two rows.
  hero.insertBefore(logo,pack);
  pack.setAttribute('aria-label','Family Guard · nyolc ellenőrzött állapotjelző, négy oszlop és két sor');
  root.dataset.hhGuardianLandscapeV1070='on';
  return true;
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 w.HH_GUARDIAN_LANDSCAPE_V1070=Object.freeze({mount});
})(window,document);
