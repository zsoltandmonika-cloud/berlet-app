/* HealthHub Digital Health / Wellbeing tile navigation hotfix.
 * Works on the actual post-bootstrap Home DOM, including dynamically replaced tiles.
 * Does not alter HealthHub private data, Sleep, profile switching or other modules.
 */
(function(){
  'use strict';
  var DEST='./digital-health/';
  var FLAG='data-hh-digital-health-link';
  function wellbeingTile(node){
    if(!node || typeof node.closest!=='function') return null;
    var tile=node.closest('#home .homeModules .homeModule');
    if(!tile) return null;
    var label=tile.querySelector('b');
    return label && (label.textContent||'').trim().toLocaleLowerCase('hu-HU')==='wellbeing' ? tile : null;
  }
  function openDigitalHealth(e){
    if(e && e.type==='click'){
      var tile=wellbeingTile(e.target);
      if(!tile) return;
      e.preventDefault();
      e.stopPropagation();
      if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
    }
    window.location.assign(new URL(DEST,window.location.href).href);
  }
  function mark(){
    document.querySelectorAll('#home .homeModules .homeModule').forEach(function(tile){
      var name=tile.querySelector('b');
      if(!name || (name.textContent||'').trim().toLocaleLowerCase('hu-HU')!=='wellbeing')return;
      tile.setAttribute(FLAG,'1');
      tile.setAttribute('title','Digital Health / Wellbeing megnyitása');
      tile.setAttribute('aria-label','Digital Health / Wellbeing megnyitása');
      tile.style.pointerEvents='auto';
      tile.style.cursor='pointer';
      tile.style.touchAction='manipulation';
      // Direct handler is the fallback; delegated capture survives DOM redraw.
      tile.onclick=openDigitalHealth;
    });
  }
  var css=document.createElement('style');
  css.id='hh-digital-health-home-click-v435';
  css.textContent='#home .homeModules .homeModule['+FLAG+']{position:relative;pointer-events:auto!important;cursor:pointer!important;touch-action:manipulation!important}';
  document.head.appendChild(css);
  document.addEventListener('click',openDigitalHealth,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mark,{once:true});else mark();
  document.addEventListener('hh:profile-changed',mark);
  window.addEventListener('pageshow',mark);
  document.documentElement.dataset.hhDigitalHealthTile='435-click-ready';
})();
