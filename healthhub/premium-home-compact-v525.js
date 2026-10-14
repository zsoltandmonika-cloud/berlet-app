/* HealthHub v525 · Premium Home only.
   Shorten the live date / nameday presentation without changing source elements,
   refreshers, profile data, weather requests, or the approved Léna Hero asset. */
(function(root){
 'use strict';
 var query;
 try{query=new URLSearchParams(root.location.search)}catch(_){return}
 if(query.get('hhpremium')!=='1')return;

 function compactDate(input){
  var raw=String(input||'').trim();
  // Source: "október 14., szerda · Budapest" (localized original renderer).
  var found=raw.match(/([a-záéíóöőúüű]+)\s+(\d{1,2})\.?/i);
  if(!found)return raw||'…';
  var month=found[1];
  month=month.charAt(0).toLocaleUpperCase('hu-HU')+month.slice(1);
  var place=(raw.match(/·\s*([^·]+)$/)||[])[1];
  return month+' '+found[2]+' · '+(place?place.trim():'Budapest');
 }
 function compactNameday(input){
  var raw=String(input||'').replace(/^[\s🎉🎁🎈]+/gu,'').trim();
  raw=raw.replace(/^névnap\s*:\s*/i,'').trim();
  return raw||'…';
 }
 function makeCompact(original,kind){
  if(!original||!original.parentNode)return;
  var cell=original.parentNode;
  if(cell.querySelector('.hhpg-info-short'))return;
  var live=document.createElement('span');
  live.className='hhpg-info-short hhpg-info-short-'+kind;
  live.setAttribute('aria-live','off');
  cell.appendChild(live);
  original.classList.add('hhpg-info-source');
  function update(){
   var content=kind==='date'?compactDate(original.textContent):compactNameday(original.textContent);
   if(live.textContent!==content)live.textContent=content;
  }
  update();
  if(typeof root.MutationObserver==='function'){
   new root.MutationObserver(update).observe(original,{childList:true,subtree:true,characterData:true});
  }
 }
 function mount(){
  if(document.documentElement.dataset.hhPremiumPreview!=='on')return;
  var panel=document.getElementById('hhpgInfoDashboard522');
  if(!panel||document.getElementById('hhpgV525Styles'))return;
  var link=document.createElement('link');
  link.id='hhpgV525Styles';
  link.rel='stylesheet';link.href='./premium-home-compact-v525.css?v=525-compact-glass';
  document.head.appendChild(link);
  makeCompact(document.getElementById('dateHome'),'date');
  makeCompact(document.getElementById('namedayHome'),'nameday');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 root.HH_PREMIUM_HOME_COMPACT_V525=Object.freeze({compactDate:compactDate,compactNameday:compactNameday});
})(window);
