/* Smart Trip AI v1022: full native HealthHub journey workspace.
 * Retains the approved Smart Trip launcher art and Golden Glass cards.
 * The former MÁVPlusz popup script is NOT loaded; no provider UI appears.
 */
(function(w,d){
 'use strict';
 const trigger=d.getElementById('smartTripOpen'),legacy=d.getElementById('smartTripPanel');
 if(legacy)legacy.hidden=true;
 if(!trigger)return;
 trigger.removeAttribute('aria-controls');
 trigger.setAttribute('aria-label','Smart Trip AI · saját teljes képernyős útvonaltervező megnyitása');
 trigger.setAttribute('aria-expanded','false');
 trigger.addEventListener('click',()=>{w.location.assign('./smart-trip/')});
})(window,document);