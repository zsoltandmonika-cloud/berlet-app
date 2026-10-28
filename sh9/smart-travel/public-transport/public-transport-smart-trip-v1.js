/* SH9 Public Transport Smart Trip v1 · destination-only one-shot Guardian route handoff, no live multimodal claims. */
(function(){
'use strict';
const openButton=document.getElementById('smartTripOpen'),panel=document.getElementById('smartTripPanel'),form=document.getElementById('smartTripForm'),destination=document.getElementById('smartTripDestination'),closeButton=document.getElementById('smartTripClose');
if(!openButton||!panel||!form||!destination)return;
function show(visible){
 panel.hidden=!visible;openButton.setAttribute('aria-expanded',String(visible));
 if(visible){panel.scrollIntoView({behavior:'smooth',block:'nearest'});destination.focus()}
 else openButton.focus();
}
openButton.addEventListener('click',()=>show(panel.hidden));
closeButton?.addEventListener('click',()=>show(false));
form.addEventListener('submit',event=>{
 event.preventDefault();
 const to=destination.value.trim().replace(/\s+/g,' ').slice(0,120);
 if(!to){destination.focus();return}
 const draft={source:'sh9-bkk-grand-v3',created:Date.now(),from:'',to,mode:'now',date:'',time:''};
 try{sessionStorage.setItem('sh9-bkk-grand-planner-handoff-v1',JSON.stringify(draft))}catch(_){
  const status=document.getElementById('smartTripStatus');
  if(status)status.textContent='A cél automatikus átadása nem sikerült. A BKK-tervezőben add meg újra.';
 }
 window.location.assign('../../../healthhub/guardian/#hhSmartHubDestinationV802');
});
window.SH9_PUBLIC_TRANSPORT_SMART_TRIP_V1=Object.freeze({open:()=>show(true),close:()=>show(false)});
})();
