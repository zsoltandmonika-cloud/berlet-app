/* Family Guard v1071 · compact 4×2 in the original right-side glass box.
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
  if(!hero||!pack||!logo||pack.parentElement!==hero||
     (logo.parentElement!==pack&&logo.parentElement!==hero))return false;
  const cards=[...pack.children].filter(node=>node!==logo);
  const required=['guardianBatteryV841','guardianGpsCardV845','guardianHealthCardV845',
   'guardianPackOtaV1053','guardianPackWifiV1053','guardianPackMobileV1053',
   'guardianPackBluetoothV1053','guardianPackCloudV1053'];
  // Fail safe: only replace the layout if all original eight live indicators exist.
  if(cards.length!==8||cards.some((node,i)=>node.id!==required[i]))return false;
  // Retrofit the ORIGINAL transparent box in the top-right area.
  // Logo stays INSIDE the same parent panel as all eight status indicators.
  if(logo.parentElement!==pack||pack.firstElementChild!==logo)
   pack.insertBefore(logo,pack.firstChild);
  pack.setAttribute('aria-label','Family Guard · logó és nyolc ellenőrzött állapotjelző egyetlen jobb oldali dobozban, négy oszlop és két sor');
  root.dataset.hhGuardianLandscapeV1070='on';
  return true;
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 w.HH_GUARDIAN_LANDSCAPE_V1070=Object.freeze({mount});
})(window,document);
