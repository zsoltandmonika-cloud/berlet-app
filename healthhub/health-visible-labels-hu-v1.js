/* HealthHub home tile labels. UI only; preserves routes, stored content and handlers. */
(function(){
'use strict';
const labels=new Map([['Nutrition','Táplálkozás'],['Daily Spark','Asztrológia'],['Daily Health','Napi egészség']]);
function apply(){
  let english=false;
  try{english=localStorage.getItem('sh9-language-v1')==='en'}catch(_){}
  if(english)return;
  document.querySelectorAll('.homeModule b,.dailyStrip b,.detailTop b,.detailTitle h1,.dailyHealthStrip b').forEach(el=>{
    const source=(el.textContent||'').trim();
    if(labels.has(source))el.textContent=labels.get(source);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('sh9-language-change',apply);
})();