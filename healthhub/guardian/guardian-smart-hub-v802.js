/* Smart Hub v802.0 · destination-first planning entrypoint.
 * Places resolved by Google Maps after explicit user action, never invented here.
 * No autocomplete, client geocoder, storage, GPS request, or secret.
 * Street View opens the external Instant Street View website (not live video).
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_SMART_HUB_DESTINATION_V802=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 function destination(value){
  const s=String(value||'').trim().replace(/\s+/g,' ').slice(0,140);
  if(s.length<2 || /[\u0000-\u001f\u007f]/.test(s))return null;
  return s;
 }
 function searchTerm(value){
  const s=destination(value);if(!s)return null;
  // Budapest is a search hint, not an invented destination or confirmed match.
  return s+' Budapest';
 }
 function urls(value){
  const term=searchTerm(value);if(!term)return null;
  const encoded=encodeURIComponent(term);
  return {
   directions:'https://www.google.com/maps/dir/?api=1&destination='+encoded+'&travelmode=transit',
   search:'https://www.google.com/maps/search/?api=1&query='+encoded,
   street:'https://www.instantstreetview.com/s/'+encoded
  };
 }
 function init(){
  const doc=w&&w.document;
  if(!doc)return;
  const form=doc.getElementById('hhSmartHubDestinationFormV802');
  const input=doc.getElementById('hhSmartHubDestinationInputV802');
  const directions=doc.getElementById('hhSmartHubDirectionsV802');
  const search=doc.getElementById('hhSmartHubPlaceV802');
  const street=doc.getElementById('hhSmartHubStreetV802');
  const status=doc.getElementById('hhSmartHubDestinationStatusV802');
  if(!form||!input||!directions||!search||!street||!status)return;
  function update(){
   const links=urls(input.value);
   for(const [link,href] of [[directions,links&&links.directions],[search,links&&links.search],[street,links&&links.street]]){
    if(href){link.href=href;link.removeAttribute('aria-disabled');link.removeAttribute('tabindex')}
    else{link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.setAttribute('tabindex','-1')}
   }
   status.textContent=links
    ?'Google Térkép az úti célt a megnyitás után azonosítja. A helyet és az útvonalat ott ellenőrizheted.'
    :'Írj be egy helynevet vagy címet. Például: Bécsi Corner.';
   return !!links;
  }
  input.addEventListener('input',update);
  form.addEventListener('submit',event=>{
   event.preventDefault();
   if(!update()){input.focus();return}
   // Explicit submission only: Google Maps resolves named destinations and location.
   w.location.assign(directions.href);
  });
  // Suggested example is local UI content, never silently submitted.
  const example=doc.getElementById('hhSmartHubExampleV802');
  if(example)example.addEventListener('click',()=>{
   input.value='Bécsi Corner';update();input.focus();
  });
  update();
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {destination,searchTerm,urls,init,version:'802.0'};
});
