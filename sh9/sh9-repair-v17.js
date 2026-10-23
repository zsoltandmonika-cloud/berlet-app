/* SH9 v17. Actual WebView viewport, not a 740px CSS breakpoint.
   Resize only the square tile GRID; preserve the approved imagery and routes. */
(function(){
 'use strict';
 var root=document.querySelector('.wrap'),hero=document.querySelector('.hero');
 var info=document.getElementById('sh9InfoBar6');
 var grid=document.querySelector('.grid'),nav=document.querySelector('.nav');
 if(!root||!hero||!info||!grid||!nav)return;
 function fit(){
  if(window.matchMedia('(orientation:landscape)').matches||window.innerWidth>650){
   grid.style.removeProperty('--sh9-v17-grid-width');return;
  }
  var vp=window.visualViewport, height=vp?vp.height:window.innerHeight;
  var heroHeight=hero.getBoundingClientRect().height;
  var infoHeight=info.getBoundingClientRect().height;
  var navHeight=nav.getBoundingClientRect().height||62;
  var style=getComputedStyle(root);
  var sidePads=(parseFloat(style.paddingLeft)||7)+(parseFloat(style.paddingRight)||7);
  var topPad=parseFloat(style.paddingTop)||7;
  var availWidth=root.clientWidth-sidePads;
  // Gap after the Hero and after the information strip is exactly 7 CSS px.
  var available=height-topPad-heroHeight-infoHeight-navHeight-14-12-12;
  var target=Math.floor(Math.min(390,availWidth*.96,available));
  // On a shorter viewport, allow scroll instead of cropping or impossibly small targets.
  if(target<282)target=Math.floor(Math.min(390,availWidth*.96));
  grid.style.setProperty('--sh9-v17-grid-width',target+'px');
 }
 fit();
 window.addEventListener('resize',fit,{passive:true});
 if(window.visualViewport)window.visualViewport.addEventListener('resize',fit,{passive:true});
 var heroImg=hero.querySelector('img');
 if(heroImg)heroImg.addEventListener('load',fit,{once:true});
})();