(function(){
 'use strict';
 /* v589: move the original Ask Lena profile indicator from its copy column
    into the Hero container, preserving its identity, live profile text and
    any listeners. The existing page owns profile, chat, speech and research. */
 function dock(){
   var page=document.getElementById('hhLenaSmart299');
   if(!page)return;
   var inner=page.querySelector('.askHero .askHeroInner');
   var pill=page.querySelector('#hhSP299.askProfile');
   if(!inner||!pill)return;
   if(pill.parentElement!==inner)inner.appendChild(pill);
   pill.dataset.hhAskDock='589';
 }
 window.addEventListener('healthhub:ask-lena-open',dock);
 window.addEventListener('healthhub:profile-changed',function(){setTimeout(dock,0)});
 window.addEventListener('pageshow',dock);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',dock,{once:true});
 else dock();
})();
