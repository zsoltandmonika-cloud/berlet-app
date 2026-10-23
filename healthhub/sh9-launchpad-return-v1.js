/* SH9 central navigation · v1
 * Small, standalone return link. No HealthHub profile/nav/data hooks modified.
 * Works both at /healthhub/ and /healthhub/guardian/.
 */
(function(){
  'use strict';
  var id='hhSh9ReturnV1';
  var script=document.currentScript;
  var assetRoot=script && script.src ? script.src : new URL('./sh9-launchpad-return-v1.js',document.baseURI).href;
  var target=new URL('../sh9/',assetRoot).href;
  var logo=new URL('../sh9/assets/sh9-icon.png',assetRoot).href;
  function mount(){
    if(document.getElementById(id)||!document.body)return;
    if(!document.getElementById(id+'Style')){
      var style=document.createElement('style');
      style.id=id+'Style';
      style.textContent=
        '#'+id+'{position:fixed!important;right:11px!important;bottom:calc(86px + env(safe-area-inset-bottom,0px))!important;z-index:950;display:inline-flex!important;align-items:center;justify-content:center;gap:6px;min-width:76px;height:42px;padding:5px 10px 5px 7px;box-sizing:border-box;background:linear-gradient(138deg,rgba(24,62,112,.93),rgba(5,21,48,.95));border:1px solid rgba(130,200,255,.7);border-radius:999px;color:#f3fbff!important;text-decoration:none!important;font:750 12px/1 system-ui,-apple-system,Segoe UI,sans-serif!important;letter-spacing:.02em;box-shadow:0 5px 19px rgba(0,0,0,.45),inset 0 1px 1px rgba(255,255,255,.19);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);touch-action:manipulation}' +
        '#'+id+':hover{border-color:#d3efff;box-shadow:0 5px 22px rgba(21,124,254,.4),inset 0 1px 1px rgba(255,255,255,.24)}' +
        '#'+id+':focus-visible{outline:3px solid #76d6ff;outline-offset:3px}' +
        '#'+id+' img{display:block;width:29px;height:29px;object-fit:contain;border-radius:50%;flex:none}' +
        '@media(max-width:370px){#'+id+'{right:7px!important;bottom:calc(79px + env(safe-area-inset-bottom,0px))!important;min-width:70px;height:40px;padding:4px 8px 4px 5px}}' +
        '@media print{#'+id+'{display:none!important}}';
      document.head.appendChild(style);
    }
    var link=document.createElement('a');
    link.id=id;
    link.href=target;
    link.setAttribute('aria-label','Vissza az SH9 Launchpadre');
    link.title='SH9 · Launchpad';
    var img=document.createElement('img');
    img.src=logo;
    img.alt='';
    img.decoding='async';
    img.onerror=function(){this.style.display='none';};
    var label=document.createElement('span');
    label.textContent='SH9';
    link.appendChild(img);
    link.appendChild(label);
    document.body.appendChild(link);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
