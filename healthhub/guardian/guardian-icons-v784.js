/* Family Guard v784 · curated translucent SVG landmark icon set.
 * Presentation only. No profile-avatar modifications, no new data flow, no GPS
 * calls, no personal coordinates or user-supplied HTML injected into markup.
 */
(function(w,d){
'use strict';
const ART=Object.freeze({
 home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9"/><path d="M10 21v-8h4v8"/><path d="M3 10h2m14 0h2"/>',
 work:'<rect x="3.5" y="9" width="7" height="12" rx="1"/><rect x="10.5" y="3" width="10" height="18" rx="1"/><path d="M7 12h.01M7 16h.01M14 7h2m-2 4h2m-2 4h2m-2 4h2"/>',
 doctor:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
 family:'<circle cx="8" cy="8" r="2.6"/><circle cx="16.5" cy="9" r="2.3"/><path d="M2.8 20v-2.5a5.2 5.2 0 0 1 10.4 0V20z"/><path d="M14 14a4.9 4.9 0 0 1 7.2 4.2V20h-5"/>',
 favorite:'<path d="M20.8 5.8a5.1 5.1 0 0 0-7.2 0L12 7.4l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2L12 21l8.8-8a5.1 5.1 0 0 0 0-7.2Z"/>',
 bus:'<rect x="4" y="3" width="16" height="15.5" rx="3"/><path d="M4 10.5h16M8 15h1m6 0h1M7 3V2m10 1V2M7 18.5V22m10-3.5V22"/><path d="M8 6.5h8"/>',
 tram:'<rect x="5" y="5" width="14" height="13" rx="2.8"/><path d="M8 5 12 2l4 3M5 10h14M8 14h1m6 0h1M7 20l10 3m0-3L7 23M8 18h8"/>',
 shopping:'<circle cx="9" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/><path d="M2 4h3l2.5 11.5h11l3-8.5H6M8 16.5h11"/>',
 other:'<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>'
});
const KINDS=Object.freeze(Object.keys(ART));
function draw(el,kind){
 if(!el||!Object.prototype.hasOwnProperty.call(ART,kind))return false;
 // ART is entirely hardcoded; no user strings, markup or coordinates are accepted.
 el.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+ART[kind]+'</svg>';
 if(typeof el.setAttribute==='function')el.setAttribute('data-guardian-icon-kind',kind);
 return true;
}
function decoratePicker(){
 if(typeof d.querySelectorAll!=='function')return;
 d.querySelectorAll('[data-guardian-landmark-kind]').forEach(function(button){
  const kind=button.dataset&&button.dataset.guardianLandmarkKind;
  const medal=typeof button.querySelector==='function'&&button.querySelector('.guardian-landmarks-emoji');
  if(medal&&draw(medal,kind)&&typeof button.setAttribute==='function'){
   button.setAttribute('data-guardian-icon-kind',kind);
  }
 });
}
w.HH_GUARDIAN_ICONS_V784=Object.freeze({draw,decoratePicker,kinds:KINDS});
decoratePicker();
})(window,document);
