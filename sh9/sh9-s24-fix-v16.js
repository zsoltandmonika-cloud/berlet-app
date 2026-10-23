/* SH9 v16 · ensure the approved Hero is always visible at the top.
 * Native display physical pixels != browser CSS pixels.
 * Narrow the 3x3 grid when necessary; never clip the Hero or module controls.
 */
(function(){
 'use strict';
 var wrap=document.querySelector('.wrap'),hero=document.querySelector('.hero');
 var grid=document.querySelector('.grid'),nav=document.querySelector('.nav');
 if(!wrap||!hero||!grid||!nav)return;
 function adjust(){
  if(window.innerWidth>519||window.matchMedia('(orientation:landscape)').matches){
    grid.style.removeProperty('--sh9-v16-grid-max');return;
  }
  var vh=Math.round((window.visualViewport&&window.visualViewport.height)||window.innerHeight);
  var info=document.getElementById('sh9InfoBar6');
  var contentWidth=wrap.clientWidth-(parseFloat(getComputedStyle(wrap).paddingLeft)||0)-(parseFloat(getComputedStyle(wrap).paddingRight)||0);
  var heroHeight=hero.getBoundingClientRect().height||contentWidth*1001/1380;
  var infoHeight=info?info.getBoundingClientRect().height:58;
  var navHeight=Math.max(62,nav.getBoundingClientRect().height);
  var topPad=parseFloat(getComputedStyle(wrap).paddingTop)||6;
  var safe=8;
  // Leave room for the bottom bar, both 7px gaps, and the native viewport.
  var room=vh-topPad-heroHeight-7-infoHeight-7-navHeight-safe-12;
  var desired=Math.min(390,contentWidth*.96,Math.max(0,room));
  // On unusually short viewports allow natural vertical scroll, never crop or squash a tap target.
  if(desired<285)desired=Math.min(390,contentWidth*.96);
  grid.style.setProperty('--sh9-v16-grid-max',Math.floor(desired)+'px');
 }
 function start(){
  try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}
  adjust();
  // Avoid restoring the scroll position of a previous page into the SH9 launchpad.
  requestAnimationFrame(function(){window.scrollTo(0,0)});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
 window.addEventListener('resize',adjust,{passive:true});
 window.addEventListener('orientationchange',adjust,{passive:true});
 if(window.visualViewport)window.visualViewport.addEventListener('resize',adjust,{passive:true});
 window.addEventListener('load',function(){adjust();if(window.scrollY>0)window.scrollTo(0,0)},{once:true});
})();
