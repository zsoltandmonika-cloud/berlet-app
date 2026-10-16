/* Nutrition v591 route bridge. Capture navigation only on the Nutrition tile.
 * Do not patch/rewrite legacy Home, profile switching, Sleep or other tiles. */
(function(){
 'use strict';
 function target(node){
  if(!node||typeof node.closest!=='function')return null;
  const premium=node.closest('#hhPremiumGrid520 .hhpg-tile[data-key="nutrition"]');
  if(premium)return premium;
  const legacy=node.closest('#home .homeModules .homeModule');
  if(!legacy)return null;
  const title=legacy.querySelector('b');
  return title&&(title.textContent||'').trim().toLocaleLowerCase('hu-HU')==='nutrition'?legacy:null;
 }
 document.addEventListener('click',function(e){
  if(!target(e.target))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  location.assign(new URL('./nutrition/',location.href).href);
 },true);
 document.documentElement.dataset.hhNutritionRoute='591';
})();