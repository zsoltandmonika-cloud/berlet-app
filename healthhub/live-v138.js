(function(){
'use strict';

/* v1.38: move Admin Data Hub entry from floating FAB into the Továbbiak screen. */
function ensureStyle(){
  if(document.getElementById('hh-v138-style'))return;
  var s=document.createElement('style');s.id='hh-v138-style';
  s.textContent=
    '.haFab{display:none!important}'+
    '.hhAdminMenuCard{border:1px solid #d9e6ef;background:linear-gradient(145deg,#f8fbfd,#eef6fb);border-radius:16px;padding:12px;margin-bottom:8px;box-shadow:0 6px 16px rgba(31,65,91,.055)}'+
    '.hhAdminMenuCard .hhAdminTop{display:flex;align-items:center;gap:10px}'+
    '.hhAdminMenuIcon{width:38px;height:38px;border-radius:12px;background:#173f62;color:#fff;display:grid;place-items:center;font-size:18px;flex:none}'+
    '.hhAdminMenuText{min-width:0;flex:1}.hhAdminMenuText b{display:block;font-size:11px;color:#173f62}.hhAdminMenuText small{display:block;font-size:8px;line-height:1.35;color:#73879a;margin-top:2px}'+
    '.hhAdminMenuBtn{border:0;border-radius:12px;background:#173f62;color:#fff;padding:8px 10px;font-size:8px;font-weight:850;white-space:nowrap;cursor:pointer}';
  document.head.appendChild(s);
}
function decorate(){
  var fab=document.querySelector('.haFab');if(fab)fab.style.display='none';
  if(window.healthSectionKind!=='more')return;
  var root=document.getElementById('healthSubContent');if(!root||document.getElementById('hhAdminMenuCard'))return;
  var card=document.createElement('div');card.id='hhAdminMenuCard';card.className='hhAdminMenuCard';
  card.innerHTML='<div class="hhAdminTop"><div class="hhAdminMenuIcon">⚙</div><div class="hhAdminMenuText"><b>Admin Data Hub</b><small>Import, export, backup, snapshot és adatkezelési eszközök.</small></div><button type="button" class="hhAdminMenuBtn" onclick="haOpen()">Megnyitás ›</button></div>';
  root.insertBefore(card,root.firstChild);
}
var prev=window.renderHealthSection;
if(typeof prev==='function'){
  window.renderHealthSection=async function(){var r=await prev.apply(this,arguments);ensureStyle();decorate();return r};
}
ensureStyle();
setTimeout(decorate,120);
document.documentElement.dataset.healthhubAdminMenu='1.38';
window.HH_LIVE_BUILD='v1.38-admin-in-more';
})();