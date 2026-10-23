/* SH9 Golden v15. Load only the approved image assets; leave navigation and live data alone. */
(function(){
 'use strict';
 var hero=document.querySelector('.hero'),image=hero&&hero.querySelector('img');
 if(hero&&image){
   var src='assets/SH9_Hero_Approved_S24_v15.webp?v=15';
   var probe=new Image();
   probe.onload=function(){
     image.src=src;
     image.alt='SH9 Command Center: Buddy fejhallgatóval, kilenc modul monitoron, esti Budapest.';
     hero.classList.remove('sh9-final-fallback');hero.classList.add('sh9-final-ready');
     hero.setAttribute('aria-label','Jóváhagyott SH9 Hero, Samsung S24 Ultra');
   };
   probe.onerror=function(){hero.classList.add('sh9-final-fallback')};
   probe.src=src;
 }
 var tileArt=new Image();
 tileArt.onload=function(){document.documentElement.classList.add('sh9-v15-art-ready')};
 tileArt.onerror=function(){document.documentElement.classList.remove('sh9-v15-art-ready')};
 tileArt.src='assets/SH9_Tiles_Golden_v15.webp?v=15';
})();