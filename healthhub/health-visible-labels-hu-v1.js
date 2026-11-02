/* HealthHub home card labels, deliberately independent from navigation and data. */
(function(){
'use strict';
const hu=[['Nutrition','Táplálkozás'],['Daily Spark','Asztrológia'],['Daily Health','Napi egészség'],['Daily Headline','Vezércikk'],['Family Guard','Biztonság'],['Digital Health','Digitális Jólét']];
const map=new Map(hu);
let busy=false;
function apply(){
 if(busy)return;
 busy=true;
 try{
  const nodes=document.querySelectorAll('button b, button span, .dailyStrip b, .homeModule b, .detailTop b, .detailTitle h1, .dailyHealthStrip b, .homeTile b, .tile b');
  for(const el of nodes){
   const source=(el.textContent||'').trim();
   if(map.has(source))el.textContent=map.get(source);
  }
 }finally{busy=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
new MutationObserver(apply).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
