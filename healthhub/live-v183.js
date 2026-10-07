(function(){
'use strict';
/* HealthHub v1.83 — Home icon parity + HealthRadar insight mirror */

function profileName(){return localStorage.getItem('hh-profile')==='m'?'Mónika':'Zsolt'}
function syncInsight(){
 var src=document.getElementById('insightH'),dst=document.getElementById('todayInsight');
 if(src&&dst&&src.textContent.trim())dst.textContent=src.textContent.trim();
 var title=document.getElementById('todayTitle');
 if(title)title.textContent='✨ '+profileName()+' Today';
 var insightRow=dst&&dst.closest('.todayRow');
 if(insightRow){
  var b=insightRow.querySelector('b');
  if(b)b.textContent='Mai HealthRadar insight';
  var ico=insightRow.querySelector('.ico');
  if(ico){ico.classList.add('hhHomeFeatureIcon');ico.innerHTML='<span aria-hidden="true">💡</span>'}
 }
 var next=document.getElementById('homeNext'),nextRow=next&&next.closest('.todayRow');
 if(nextRow){
  var ni=nextRow.querySelector('.ico');
  if(ni){ni.classList.add('hhHomeFeatureIcon');ni.innerHTML='<span aria-hidden="true">📅</span>'}
 }
}
function style(){
 if(document.getElementById('hh-v183-style'))return;
 var s=document.createElement('style');s.id='hh-v183-style';s.textContent=
 '#home .dailyStrip{grid-template-columns:50px minmax(0,1fr) 18px!important;padding:10px 12px!important;min-height:76px}'+
 '#home .dailyStrip .stripIcon{width:46px;height:46px;border-radius:15px;background:linear-gradient(145deg,#fff,#f5f8fb);display:grid;place-items:center;font-size:30px!important;line-height:1;box-shadow:0 5px 14px rgba(38,74,101,.10);align-self:center}'+
 '#home .dailyStrip b{font-size:12.5px!important}#home .dailyStrip p{font-size:9.2px!important}'+
 '#home .todayRow .ico.hhHomeFeatureIcon{width:46px!important;height:46px!important;flex:0 0 46px!important;border-radius:15px!important;background:linear-gradient(145deg,#fff,#f5f8fb)!important;display:grid!important;place-items:center!important;box-shadow:0 5px 14px rgba(38,74,101,.10)!important;font-size:28px!important;line-height:1!important}'+
 '#home .todayRow .ico.hhHomeFeatureIcon span{display:block;line-height:1}'+
 '#home .todayRow{gap:10px!important;min-height:58px}#home .todayRow b{font-size:10.5px!important}#home .todayRow small{font-size:8.2px!important;line-height:1.35}';
 document.head.appendChild(s);
}
style();syncInsight();

var prevSync=window.hhSyncFullMigrationDashboard;
if(typeof prevSync==='function'){
 window.hhSyncFullMigrationDashboard=async function(){
  var r=await prevSync.apply(this,arguments);
  setTimeout(syncInsight,40);
  return r;
 };
}
var prevSet=window.setProfile;
if(typeof prevSet==='function'){
 window.setProfile=function(){
  var r=prevSet.apply(this,arguments);
  setTimeout(syncInsight,140);
  return r;
 };
}
var prevShow=window.show;
if(typeof prevShow==='function'){
 window.show=function(){
  var r=prevShow.apply(this,arguments);
  setTimeout(syncInsight,80);
  return r;
 };
}
window.addEventListener('healthhub:profile-changed',function(){setTimeout(syncInsight,120)});
var obs=new MutationObserver(function(m){
 if(m.some(function(x){return x.target&&x.target.id==='insightH'}))syncInsight();
});
var ins=document.getElementById('insightH');if(ins)obs.observe(ins,{childList:true,characterData:true,subtree:true});
setTimeout(syncInsight,500);setTimeout(syncInsight,1600);
document.documentElement.dataset.healthhubHomeInfo='1.83';
})();