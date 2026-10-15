/* HealthHub v545 | Consistent Egészség naming and canonical Health page route.
   View-only labels + navigation; never edit locked Home Hero/grid or legacy archive. */
(function(root){
 'use strict';
 var NAME='Egészség';
 var ids=['navHomeBar','navHealthBar','navTimelineBar','navDetailBar'];
 var ready=false;
 function normalize(){
   ids.forEach(function(id){
     var bar=document.getElementById(id);
     if(!bar)return;
     bar.querySelectorAll('button').forEach(function(button){
       if((button.getAttribute('onclick')||'').indexOf("show('health')")<0)return;
       var last=button.lastChild;
       if(last&&last.nodeType===3){
         if(last.nodeValue!==NAME)last.nodeValue=NAME;
       }else{
         var textNode=Array.prototype.find.call(button.childNodes,function(n){return n.nodeType===3});
         if(textNode){if(textNode.nodeValue!==NAME)textNode.nodeValue=NAME;}
         else button.appendChild(document.createTextNode(NAME));
       }
       if(button.getAttribute('aria-label')!=='Egészség modul megnyitása')
         button.setAttribute('aria-label','Egészség modul megnyitása');
     });
   });
   var title=document.querySelector('#health .heroCopy .screenTitle');
   if(title&&title.textContent!==NAME)title.textContent=NAME;
   var legacy=document.querySelector('#home .homeModule.healthTile b');
   if(legacy&&legacy.textContent!==NAME)legacy.textContent=NAME;
 }
 function openHealthPage(){
   if(typeof root.show!=='function')return false;
   root.show('health'); // Existing HealthRadar screen, existing storage and records
   return true;
 }
 // One reliable route for Premium Home's already approved Egészség tile.
 function onHomeTileClick(event){
   var target=event.target;
   var tile=target&&target.closest?target.closest('#home .hhpg-tile[data-key="health"]'):null;
   if(!tile||!openHealthPage())return;
   event.preventDefault();
   event.stopPropagation();
   if(event.stopImmediatePropagation)event.stopImmediatePropagation();
   normalize();
 }
 function init(){
   if(ready)return;
   ready=true;
   normalize();
   if(typeof root.MutationObserver==='function'){
     ids.forEach(function(id){
       var bar=document.getElementById(id);
       if(!bar)return;
       var observer=new root.MutationObserver(normalize);
       observer.observe(bar,{childList:true,subtree:true,characterData:true});
     });
   }
 }
 document.addEventListener('click',onHomeTileClick,true);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 root.addEventListener('pageshow',normalize);
 root.addEventListener('healthhub:profile-changed',normalize);
 root.HH_HEALTH_NAV_V545=Object.freeze({open:openHealthPage,refreshLabels:normalize});
})(window);
