/* HH One remote-service v1179: Gmail one-time account-review bridge retired.
 * This page never starts OAuth, reads Dropbox, sends commands or touches the
 * canonical HealthHub/Family Guard credential.
 * Only the old standalone service's browser-local secrets are discarded.
 */
(function(){
 'use strict';
 function retire(){
  try{localStorage.removeItem('hh-remote-service-token-v1');}catch(_){}
  try{sessionStorage.removeItem('hh-remote-service-pkce-v1');}catch(_){}
  const status=document.getElementById('retirementStatus');
  if(status)status.textContent='✅ A Gmail-jóváhagyó szerviz lezárva. Nincs új belépés, telefonparancs vagy felhőírás.';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',retire,{once:true});
 else retire();
})();
