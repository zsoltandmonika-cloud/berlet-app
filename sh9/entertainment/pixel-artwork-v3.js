/* SHO Entertainment · pixel-perfect approved mobile navigation, real events preserved.
   HD artwork covers decorative content only; every visible interaction is a real DOM control.
 */
(function(){
'use strict';
const root=document.querySelector('.hero');
if(!root)return;
const $=id=>document.getElementById(id);
function feedback(){try{navigator.vibrate?.(8)}catch(_){}}
function favorites(){
 const toggle=$('favoritesToggle');
 if(toggle&&toggle.getAttribute('aria-pressed')!=='true')toggle.click();
 $('mozi')?.scrollIntoView({behavior:'smooth',block:'start'});
 feedback();
}
const fav=$('pixelFavlist'),heart=$('pixelHeart');
fav?.addEventListener('click',favorites);
heart?.addEventListener('click',favorites);
const sound=$('pixelSound'),nativeSound=$('soundToggle');
function syncSound(){
 if(!sound||!nativeSound)return;
 const enabled=nativeSound.getAttribute('aria-pressed')==='true';
 sound.setAttribute('aria-pressed',String(enabled));
 sound.setAttribute('aria-label',enabled?'Hangeffektek kikapcsolása':'Hangeffektek bekapcsolása');
 sound.textContent=enabled?'♫':'♪';
}
sound?.addEventListener('click',function(){nativeSound?.click();syncSound()});
syncSound();
const nativeBell=document.querySelector('.top-bell'),pixelBell=$('pixelBell');
function syncBell(){
 if(!pixelBell)return;
 const notificationHref=nativeBell?.getAttribute('href');
 if(notificationHref)pixelBell.href=notificationHref;
 pixelBell.setAttribute('aria-label',nativeBell?.getAttribute('aria-label')||'SHO értesítések');
}
syncBell();
window.addEventListener('sho:notifications-changed',syncBell);
window.addEventListener('focus',syncBell);
const section=$('upcoming'),title=$('upTitle'),date=$('upDate'),state=$('upState');
const detail=$('pixelEventDetail'),editor=$('pixelEventEdit');
function renderReferenceEvent(){
 if(!section||!title||!date||!state)return;
 const initial=title.textContent.toLocaleLowerCase('hu-HU').includes('elvált nők klubja')
  &&date.getAttribute('datetime')?.startsWith('2026-11-13T19:00')
  &&state.textContent.trim()==='Tervezett program';
 section.classList.toggle('pixel-reference',Boolean(initial));
 const url=$('upDetails')?.getAttribute('href');
 if(detail){
  if(url&&/^https:\/\//i.test(url))detail.href=url;
  detail.hidden=!url||!/^https:\/\//i.test(url);
 }
}
detail?.addEventListener('click',feedback);
editor?.addEventListener('click',function(){feedback();$('upEdit')?.click()});
if(section){
 const observer=new MutationObserver(renderReferenceEvent);
 for(const node of [title,date,state])if(node)observer.observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['datetime']});
}
window.addEventListener('pageshow',renderReferenceEvent);
window.addEventListener('storage',renderReferenceEvent);
renderReferenceEvent();
})();
