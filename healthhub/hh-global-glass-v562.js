/* HealthHub v562 | Shared, non-invasive theme identity for all detail pages.
 * UI palette only: profile records, health data, storage and navigation unchanged.
 * Preserves explicit ?hhpremium=0 legacy fallback and ?hhglobalglass=0 kill switch. */
(function(root){
 'use strict';
 function enabled(){
  try{var q=new URLSearchParams(root.location.search);return q.get('hhpremium')!=='0'&&q.get('hhglobalglass')!=='0';}
  catch(_){return true;}
 }
 function current(){
  try{return root.localStorage.getItem('hh-profile')==='m'?'m':'z';}
  catch(_){return 'z';}
 }
 function sync(){
  var html=document.documentElement;
  if(!enabled()){delete html.dataset.hhSystemGlass;delete html.dataset.hhSystemProfile;return;}
  html.dataset.hhSystemGlass='on';
  html.dataset.hhSystemProfile=current();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
 else sync();
 root.addEventListener('healthhub:profile-changed',sync);
 root.addEventListener('storage',function(e){if(e.key==='hh-profile')sync();});
 root.addEventListener('pageshow',sync);
 root.HH_GLOBAL_GLASS_V562=Object.freeze({refresh:sync,version:'562'});
})(window);
