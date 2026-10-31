/* Family Guard v1054: tall, transparent panel under the existing baked-in
   Family Guard artwork logo; this script adds NO duplicate brand/tagline.
   Only on ?devicePack=v1054, after the existing v1053 preview has mounted.
   Does not fetch, poll, start GPS, upload, or write user data. */
(function(w,d){
 'use strict';
 function install(){
  if(d.documentElement?.dataset?.hhDevicePackLayout!=='tall')return;
  const pack=d.getElementById('guardianTrioV845');
  if(!pack||d.getElementById('guardianDevicePackLogoV1054'))return;
  const header=d.createElement('div');
  header.id='guardianDevicePackLogoV1054';
  header.setAttribute('aria-hidden','true');
  header.setAttribute('title','HealthHub · Family Guard');
  // Transparent logo slot: approved branding remains intact in hero art.
  pack.insertBefore(header,pack.firstChild);
  pack.setAttribute('aria-label','Family Guard · logó és egységes Battery, GPS, Health, OTA, Wi-Fi, Mobil, Bluetooth és Cloud állapotjelzők');
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})(window,document);
