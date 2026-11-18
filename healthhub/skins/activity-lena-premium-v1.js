/* Léna Premium Activity V1 · appearance-only activation.
   Reuses the existing Activity Glass readiness and profile-changed events.
   Does not observe health data, call APIs, write storage or change navigation.
   Opt out: ?hhlenaactivity=0, or existing ?hhactivityglass=0. */
(function(){
 'use strict';
 var query;
 try{query=new URLSearchParams(window.location.search)}catch(_){query=null}
 if(query&&(query.get('hhlenaactivity')==='0'||query.get('hhactivityglass')==='0'))return;
 var root=document.documentElement,bodyObserver=null;
 function profile(){
  var code='z';
  try{code=window.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){}
  return code==='m'?'monika':'zsolt';
 }
 function sync(){
  if(root.getAttribute('data-hh-activity-glass')!=='on')return false;
  var page=document.getElementById('hhActivityPage191');
  if(!page)return false;
  // The page persists through render() and remains scoped to its own owner.
  page.setAttribute('data-hh-skin','lena-premium');
  page.setAttribute('data-hh-profile',profile());
  root.setAttribute('data-hh-activity-lena-premium','on');
  root.setAttribute('data-hh-activity-lena-build','v1');
  if(bodyObserver){bodyObserver.disconnect();bodyObserver=null}
  return true;
 }
 function setup(){
  sync();
  if(typeof MutationObserver==='function'){
   var glassObserver=new MutationObserver(sync);
   glassObserver.observe(root,{attributes:true,attributeFilter:['data-hh-activity-glass']});
   if(!document.getElementById('hhActivityPage191')&&document.body){
    bodyObserver=new MutationObserver(sync);
    bodyObserver.observe(document.body,{childList:true,subtree:false});
   }
  }
  window.addEventListener('healthhub:profile-changed',sync);
  window.addEventListener('storage',function(e){if(e.key==='hh-profile')sync()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
 else setup();
})();
