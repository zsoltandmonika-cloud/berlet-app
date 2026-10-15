/* HealthHub v549: restore exact approved Hero; no health data writes. */
(function(root){
'use strict';
var SRC='./assets/health-medical-lena-approved-v548.webp?v=549';
var watched=null,observer=null;
function sync(){
 var h=document.getElementById('heroH');if(!h)return false;
 h.classList.add('hh-health-hero-locked');
 var v={'background-image':'url("'+SRC+'")','background-size':'cover',
 'background-position':'center center','background-repeat':'no-repeat',
 'aspect-ratio':'1672 / 941','height':'auto','min-height':'0px',
 'max-height':'none','overflow':'hidden','position':'relative'};
 Object.keys(v).forEach(function(p){
  if(h.style.getPropertyValue(p)!==v[p]||h.style.getPropertyPriority(p)!=='important')
   h.style.setProperty(p,v[p],'important');
 });
 var im=h.querySelector('.hh-health-approved-image');
 if(!im){im=document.createElement('img');im.className='hh-health-approved-image';h.insertBefore(im,h.firstChild);}
 if(im.getAttribute('src')!==SRC)im.setAttribute('src',SRC);
 var props={'display':'block','visibility':'visible','opacity':'1','width':'100%',
 'height':'100%','object-fit':'cover','z-index':'50','pointer-events':'none'};
 Object.keys(props).forEach(function(p){
  if(im.style.getPropertyValue(p)!==props[p]||im.style.getPropertyPriority(p)!=='important')
   im.style.setProperty(p,props[p],'important');
 });
 h.querySelectorAll('#personH,.person,.profileHit,.heroBtns,.heroCopy,#nameH').forEach(function(el){
  if(el!==im&&(el.style.getPropertyValue('display')!=='none'||el.style.getPropertyPriority('display')!=='important'))
   el.style.setProperty('display','none','important');
 });
 if(watched!==h&&typeof root.MutationObserver==='function'){
  if(observer)observer.disconnect();watched=h;
  observer=new root.MutationObserver(function(){sync()});
  observer.observe(h,{childList:true});
 }
 return true;
}
function init(){sync();root.setTimeout(sync,300);root.setTimeout(sync,1200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
root.addEventListener('pageshow',sync);
document.addEventListener('healthhub:profile-changed',sync);
root.HH_HEALTH_HERO_V549=Object.freeze({refresh:sync});
})(window);
