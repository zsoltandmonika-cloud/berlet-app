/* SH9 approved Hero v10.
 * Swap only when the exact approved image is present; otherwise preserve
 * the current production Hero. No changes to tiles, info bar or navigation.
 */
(function(){
 'use strict';
 var hero=document.querySelector('.hero');
 var img=hero&&hero.querySelector('img');
 if(!hero||!img)return;
 var src='assets/SH9_CommandCenter_Final_v10.avif?v=10';
 var probe=new Image();
 probe.onload=function(){
  img.src=src;
  img.alt='SH9 SmartHub Nine, Buddy és a kilenc saját modul-monitor. Jóváhagyott Hero.';
  hero.classList.remove('sh9-final-fallback');
  hero.classList.add('sh9-final-ready');
  hero.setAttribute('aria-label','SH9 Final, jóváhagyott kilencmonitoros Hero');
 };
 probe.onerror=function(){
  hero.classList.add('sh9-final-fallback');
 };
 probe.src=src;
})();
