(function(){
 'use strict';
 /* v591: identify the Mérések subpage without changing its data renderer.
    Follow the existing section render so no stale title/old profile UI leaks. */
 function mark(){
  var section=document.getElementById('healthSection');
  if(!section)return;
  var heading=section.querySelector('#healthSubTitle');
  var title=heading?String(heading.textContent||'').trim().toLocaleLowerCase('hu-HU'):'';
  var active=(window.healthSectionKind==='measurements'&&title==='mérések');
  section.setAttribute('data-hh-measurements-hero-v591',active?'on':'off');
 }
 var previous=window.renderHealthSection;
 if(typeof previous==='function'){
  window.renderHealthSection=async function(){
   var result=await previous.apply(this,arguments);
   mark();
   return result;
  };
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mark,{once:true});
 else mark();
 window.addEventListener('healthhub:profile-changed',function(){setTimeout(mark,80)});
 setTimeout(mark,150);
})();
