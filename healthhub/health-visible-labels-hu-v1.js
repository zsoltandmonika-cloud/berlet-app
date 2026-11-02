/* HealthHub visible navigation labels: Hungarian and Canadian English. UI only. */
(function(){
'use strict';
const pairs=[
 ['Egészség','Health'],['HealthRadar','Health'],
 ['Leletek','Medical Records'],['Alvás','Sleep'],['Aktivitás','Activity'],
 ['Digitális Jólét','Digital Health'],['Táplálkozás','Nutrition'],
 ['Kérdezd Lénát','Ask Léna'],['Biztonság','Family Guard'],
 ['Asztrológia','Astrology'],['Vezércikk','Headline News'],
 ['Napi egészség','Daily Health'],
 ['Nutrition','Táplálkozás'],['Daily Spark','Asztrológia'],
 ['Daily Health','Napi egészség'],['Daily Headline','Vezércikk'],
 ['Family Guard','Biztonság'],['Digital Health','Digitális Jólét'],
 ['Ask Léna','Kérdezd Lénát']
];
const en=new Map([...pairs.slice(0,12),['Daily Spark','Astrology'],['Daily Headline','Headline News'],['Wellbeing','Digital Health'],['Medical Records','Medical Records']]);
const hu=new Map([...pairs.slice(12),['Health','Egészség'],['Medical Records','Leletek'],['Sleep','Alvás'],['Activity','Aktivitás'],['Astrology','Asztrológia'],['Headline News','Vezércikk'],['Wellbeing','Digitális Jólét']]);
const selectors='button b,button span,button small,a b,a span,a small,.dailyStrip b,.homeModule b,.detailTop b,.detailTitle h1,.dailyHealthStrip b,.homeTile b,.tile b,.screenTitle';
let busy=false;
function apply(){
 if(busy)return;
 busy=true;
 try{
  const english=localStorage.getItem('sh9-language-v1')==='en';
  const dict=english?en:hu;
  for(const el of document.querySelectorAll(selectors)){
   if(el.children.length)continue;
   const value=(el.textContent||'').trim();
   const next=dict.get(value);
   if(next&&next!==value)el.textContent=next;
  }
 }catch(e){console.warn('HealthHub labels:',e)}
 finally{busy=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
window.addEventListener('pageshow',apply);
window.addEventListener('storage',e=>{if(e.key==='sh9-language-v1')apply()});
window.addEventListener('sh9-language-change',apply);
})();
