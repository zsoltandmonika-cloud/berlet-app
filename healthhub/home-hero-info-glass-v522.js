/* HealthHub v522: live Home Hero Info Glass. Uses the existing source DOM nodes only.
   Premium Home by default; classic Home only via ?hhpremium=0. Approved photos, profiles and data remain authoritative. */
(function(root){
 'use strict';
 var params;
 try{params=new URLSearchParams(root.location.search)}catch(_){return}
 if(params.get('hhpremium')==='0')return;
 function mount(){
  if(document.documentElement.dataset.hhPremiumPreview!=='on')return;
  var hero=document.querySelector('#home #heroHome');
  if(!hero||document.getElementById('hhpgInfoDashboard522'))return;
  var ids=['dateHome','weatherHome','namedayHome'];
  var nodes=ids.map(function(id){return document.getElementById(id)});
  if(nodes.some(function(node){return !node}))return;
  var link=document.createElement('link');
  link.rel='stylesheet';link.href='./home-hero-info-glass-v522.css?v=522';
  document.head.appendChild(link);
  var panel=document.createElement('div');panel.id='hhpgInfoDashboard522';
  panel.className='hhpg-info-panel';
  panel.setAttribute('role','group');
  panel.setAttribute('aria-label','Napi információk: dátum, időjárás és névnap');
  ['DÁTUM','IDŐJÁRÁS','NÉVNAP'].forEach(function(label,i){
   var cell=document.createElement('div');cell.className='hhpg-info-cell';
   var heading=document.createElement('span');heading.className='hhpg-info-heading';
   heading.textContent=label;
   cell.appendChild(heading);
   var node=nodes[i];
   // The static legacy icon is no weather observation; let the original updater replace this text.
   if(i===1&&(node.textContent||'').trim()==='☀ Budapest')node.textContent='Időjárás betöltése…';
   node.className+=' hhpg-info-value';
   cell.appendChild(node);
   panel.appendChild(cell);
  });
  hero.appendChild(panel);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
})(window);
