(function(){
'use strict';
/* HealthHub v1.66 — Sync Now status surface */
function pkey(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function pname(p){return p==='monika'?'Mónika':'Zsolt'}
function fmt(s){
 if(!s)return '';
 var d=new Date(s);if(isNaN(d))return '';
 var now=new Date(),same=d.toDateString()===now.toDateString();
 return (same?'ma ':'')+d.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'});
}
function statusText(profile){
 var last=localStorage.getItem('hh-sync-now-last-'+profile);
 var pending=localStorage.getItem('hh-sync-now-pending-'+profile);
 if(pending){
  var pt=Date.parse(pending)||0,lt=Date.parse(last||'')||0;
  if(pt&&Date.now()-pt>10*60*1000){localStorage.removeItem('hh-sync-now-pending-'+profile);pending=null}
  else if(pt>lt)return {kind:'pending',text:'⏳ SYNC NOW folyamatban · '+pname(profile)};
 }
 if(last)return {kind:'ok',text:'✓ Utolsó sikeres sync: '+fmt(last)+' · Health Connect → Dropbox → HealthHub'};
 return {kind:'idle',text:'Még nincs sikeres SYNC NOW ezen a profilon.'};
}
function ensureStyle(){
 if(document.getElementById('hh-v166-style'))return;
 var s=document.createElement('style');s.id='hh-v166-style';s.textContent=
 '.hhSyncStatus{margin-top:7px;padding:8px 10px;border-radius:11px;font-size:7.8px;font-weight:800;line-height:1.35;border:1px solid #dce8ef;background:#f7fbfd;color:#60788d}'+
 '.hhSyncStatus.ok{background:#edf8f4;border-color:#cce8dc;color:#236b58}'+
 '.hhSyncStatus.pending{background:#fff8e8;border-color:#f1dfae;color:#87691c}';
 document.head.appendChild(s);
}
function decorate(){
 if(window.healthSectionKind!=='measurements')return;
 var root=document.getElementById('healthSubContent');if(!root)return;
 var card=root.querySelector('.hrSectionCard');if(!card)return;
 var host=card.querySelector('.hhImportTools')||card.querySelector('.hhMeasCrudBar');if(!host)return;
 var el=card.querySelector('.hhSyncStatus');
 if(!el){el=document.createElement('div');el.className='hhSyncStatus';host.insertAdjacentElement('afterend',el)}
 var st=statusText(pkey());el.className='hhSyncStatus '+st.kind;el.textContent=st.text;
}
var original=window.hhSyncNow;
if(typeof original==='function'){
 window.hhSyncNow=function(){
  var p=pkey();
  localStorage.setItem('hh-sync-now-pending-'+p,new Date().toISOString());
  decorate();
  return original.apply(this,arguments);
 };
}
window.addEventListener('healthhub:healthconnect-imported',function(e){
 var p=(e&&e.detail&&e.detail.profile)||pkey();
 localStorage.removeItem('hh-sync-now-pending-'+p);
 if(!localStorage.getItem('hh-sync-now-last-'+p))localStorage.setItem('hh-sync-now-last-'+p,new Date().toISOString());
 setTimeout(decorate,30);
});
window.addEventListener('focus',function(){setTimeout(decorate,120)});
var prev=window.renderHealthSection;
if(typeof prev==='function')window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);ensureStyle();decorate();return r};
ensureStyle();setTimeout(decorate,180);
document.documentElement.dataset.healthhubSyncStatus='1.66';
})();