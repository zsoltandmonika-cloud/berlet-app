/* Léna Premium Wave V2 · owner-aware palette only, no app state writes. */
(function(){
 'use strict';
 var root=document.documentElement;
 function owner(){
  var attr=root.getAttribute('data-sh9-golden-profile')||
           root.getAttribute('data-guardian-profile')||
           root.getAttribute('data-hh-profile');
  if(attr==='m'||attr==='monika')return 'm';
  if(attr==='z'||attr==='zsolt')return 'z';
  try{return localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}
 }
 function sync(){
  var wanted=owner();
  if(root.getAttribute('data-lpv-owner')!==wanted)root.setAttribute('data-lpv-owner',wanted);
 }
 sync();
 if(typeof MutationObserver==='function'){
  new MutationObserver(sync).observe(root,{attributes:true,
   attributeFilter:['data-sh9-golden-profile','data-guardian-profile','data-hh-profile']});
 }
 window.addEventListener('healthhub:profile-changed',sync);
 window.addEventListener('storage',function(e){if(e.key==='hh-profile')sync()});
})();