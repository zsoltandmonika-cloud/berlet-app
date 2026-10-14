/* HealthHub Digital Health navigation bridge.
 * Reads only an allowlisted page target; runs after the original HealthHub
 * bundle and extensions, and never changes profile, sync or medical records.
 */
(function(){
  'use strict';
  var target;
  try{target=new URL(window.location.href).searchParams.get('hhnav')}catch(_){return}
  if(target!=='health' && target!=='timeline')return;
  function openTarget(){
    var element=document.getElementById(target);
    if(!element || !element.classList || typeof window.show!=='function')return false;
    window.show(target);
    document.documentElement.dataset.hhDigitalNavBridge=target;
    return true;
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',openTarget,{once:true});
  }else{
    openTarget();
  }
})();
