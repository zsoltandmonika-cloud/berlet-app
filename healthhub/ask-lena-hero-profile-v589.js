(function(){
 'use strict';
 /* v589: move the original Ask Lena profile indicator from its copy column
    into the Hero container, preserving its identity, live profile text and
    any listeners. The existing page owns profile, chat, speech and research. */
 function key(){try{return localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(e){return 'z'}}
 function label(code){return code==='m'?'Mónika':'Zsolt'}
 function flip(event){
   if(event.type==='keydown'&&event.key!=='Enter'&&event.key!==' ')return;
   var setter=window.hhSetActiveProfile||window.setProfile;
   if(typeof setter!=='function')return;
   event.preventDefault();
   event.stopPropagation();
   var next=key()==='m'?'z':'m';
   setter(next,{source:'ask-lena-hero-v589'});
   dock();
 }
 function dock(){
   var page=document.getElementById('hhLenaSmart299');
   if(!page)return;
   var inner=page.querySelector('.askHero .askHeroInner');
   var pill=page.querySelector('#hhSP299.askProfile');
   if(!inner||!pill)return;
   if(pill.parentElement!==inner)inner.appendChild(pill);
   pill.dataset.hhAskDock='589';
   pill.setAttribute('role','button');
   pill.setAttribute('tabindex','0');
   pill.setAttribute('aria-label','Aktív profil: '+label(key())+'. Profilváltás: '+label(key()==='m'?'z':'m')+'.');
   if(pill.dataset.hhAskProfileBound589!=='1'){
     pill.dataset.hhAskProfileBound589='1';
     pill.addEventListener('click',flip);
     pill.addEventListener('keydown',flip);
   }
 }
 window.addEventListener('healthhub:ask-lena-open',dock);
 window.addEventListener('healthhub:profile-changed',function(){setTimeout(dock,0)});
 window.addEventListener('pageshow',dock);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',dock,{once:true});
 else dock();
})();
