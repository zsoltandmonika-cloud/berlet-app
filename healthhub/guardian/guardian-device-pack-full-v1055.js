/* Family Guard v1055 preview-only branding. Original image, GPS, data and map stay unchanged. */
(function(w,d){
 'use strict';
 function install(){
  if(d.documentElement?.dataset?.hhDevicePackFullV1055!=='on')return false;
  const head=d.getElementById('guardianDevicePackLogoV1054');
  if(!head||head.dataset.brandV1055==='ready')return false;
  head.dataset.brandV1055='ready';
  head.removeAttribute('aria-hidden');
  head.removeAttribute('title');
  head.setAttribute('role','img');
  head.setAttribute('aria-label','HealthHub Family Guard');
  // An independent, scalable rendition of the existing pink/blue shield brand.
  // No supplementary words beyond the approved brand title.
  head.innerHTML='<svg class="fg-shield-v1055" viewBox="0 0 64 74" aria-hidden="true" focusable="false">'+
   '<defs><linearGradient id="fgShieldGradV1055" x1="0" y1="0" x2="1" y2="1">'+
   '<stop offset="0" stop-color="#ff57bf"/><stop offset=".36" stop-color="#d457fb"/>'+
   '<stop offset=".72" stop-color="#6390ff"/><stop offset="1" stop-color="#30e4eb"/>'+
   '</linearGradient></defs>'+
   '<path d="M32 3 56 12v22c0 15-9 27-24 37C17 61 8 49 8 34V12L32 3Z"'+
   ' fill="rgba(31,49,130,.16)" stroke="url(#fgShieldGradV1055)" stroke-width="5.3"/>'+
   '<path d="M12 30c14-6 25-6 42 0M16 39c11-4 24-4 33 0"'+
   ' fill="none" stroke="#5de5ff" stroke-opacity=".62" stroke-width="3" stroke-linecap="round"/>'+
   '<path d="M19 23h25v24H19z" fill="none" stroke="#f9b9ff" stroke-opacity=".65" stroke-width="1.5"/>'+
   '</svg>'+
   '<span class="fg-brand-name-v1055"><span class="fg-brand-small-v1055">HealthHub</span>'+
   '<strong class="fg-brand-big-v1055">Family <em>Guard</em></strong></span>';
  return true;
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
 w.HH_GUARDIAN_FULL_PACK_V1055=Object.freeze({install});
})(window,document);
