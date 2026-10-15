(function(){
'use strict';
/* v587: visual state only, scoped to the EXISTING HealthRadar overview.
   Data, profile, record and calendar rendering stay with v111/v132-v135.
   ?hhoverviewglass=0 disables this skin without replacing any functionality. */
var MARK='hhOverviewV587',wrapped=null;
function active(){
 try{return new URLSearchParams(location.search).get('hhoverviewglass')!=='0'}
 catch(e){return true}
}
function sync(){
 var page=document.getElementById('healthSection');
 if(!page)return;
 page.dataset[MARK]=(active()&&window.healthSectionKind==='overview')?'on':'off';
}
function attach(){
 if(typeof window.renderHealthSection!=='function')return;
 if(window.renderHealthSection.__hhOverviewSkinV587){sync();return}
 var original=window.renderHealthSection;
 async function render(){
  sync();
  var result=await original.apply(this,arguments);
  sync();
  return result;
 }
 render.__hhOverviewSkinV587=true;
 wrapped=render;
 window.renderHealthSection=render;
 sync();
}
function start(){
 attach();
 setTimeout(attach,170);
 setTimeout(sync,420);
 window.addEventListener('healthhub:profile-changed',function(){setTimeout(sync,35)});
 window.addEventListener('pageshow',sync);
 var retries=0;
 var timer=setInterval(function(){
  if(wrapped!==window.renderHealthSection)attach();
  sync();
  if(++retries>=7)clearInterval(timer);
 },350);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
