/* HealthHub v552 | Egészség touch navigation, full Hero one-tap profile switch and live accent.
   Scoped to #health and #navHealthBar. No data-model, Home or Hero mutation. */
(function(root){
'use strict';
var PROFILE_SELECTOR='#health .kpiCard .hhLiveHead small';
var BAR_ID='navHealthBar', lastHandled=null, ignoreClick=null, touchStart=null, observer=null;
function code(){try{return root.localStorage.getItem('hh-profile')==='m'?'m':'z';}catch(_){return 'z';}}
function person(){return code()==='m'?'Mónika':'Zsolt';}
function other(){return code()==='m'?'Zsolt':'Mónika';}
function healthOn(){var h=document.getElementById('health');return !!(h&&h.classList.contains('on'));}
function bar(){return document.getElementById(BAR_ID);}
function visibleBar(){
 var b=bar();
 return healthOn()&&!!b&&(!root.getComputedStyle||root.getComputedStyle(b).display!=='none');
}
function paintHeroSwitch(){
 /* The entire original approved medical Hero is the touch surface, not a small hotspot. */
 var hero=document.querySelector('#health #heroH');
 if(!hero)return;
 hero.setAttribute('role','button');
 hero.setAttribute('tabindex','0');
 hero.setAttribute('aria-label','Profilváltás: érintsd meg a képet, váltás '+other()+' profiljára');
 hero.setAttribute('title','Érintsd meg a képet: váltás '+other()+' profiljára');
 hero.setAttribute('data-hh-hero-switch','v552');
}
function paintProfile(){
 paintHeroSwitch();
 var p=code(),html=document.documentElement;
 if(html.dataset.hhHealthProfile!==p)html.dataset.hhHealthProfile=p;
 var el=document.querySelector(PROFILE_SELECTOR);
 if(!el)return;
 var expected=person();
 if(el.textContent!==expected)el.textContent=expected;
 el.setAttribute('role','button');
 el.setAttribute('tabindex','0');
 el.setAttribute('aria-label','Profilváltás: '+other()+' adatai egy érintéssel');
 el.setAttribute('title','Váltás '+other()+' profiljára');
 el.setAttribute('data-hh-health-switch','v551');
}
function renderLater(){
 paintProfile();
 root.setTimeout(paintProfile,40);
 root.setTimeout(paintProfile,220);
}
function switchProfile(){
 if(!healthOn())return false;
 var before=code(),wanted=before==='m'?'z':'m';
 try{
  if(typeof root.hhSetActiveProfile==='function')root.hhSetActiveProfile(wanted,{source:'health-hero-v552'});
  else if(typeof root.setProfile==='function')root.setProfile(wanted,{source:'health-hero-v552'});
  else if(typeof root.hhToggleProfileOneClick==='function')root.hhToggleProfileOneClick();
  else return false;
  if(code()!==wanted){root.console&&root.console.warn('HealthHub v551: profile controller did not switch');return false;}
  renderLater();
  if(typeof root.hhRenderLiveKpis==='function'){
   Promise.resolve().then(function(){return root.hhRenderLiveKpis()}).then(paintProfile)
   .catch(function(e){root.console&&root.console.warn('Health KPI render',e);});
  }
  return true;
 }catch(e){root.console&&root.console.warn('HealthHub v551 profile switch',e);return false;}
}
function blockedByModal(){
 return !!document.querySelector('#overlay.on, dialog[open], [aria-modal="true"], .modal.on');
}
function pointIn(rect,x,y){return x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;}
function navIndex(e){
 if(!visibleBar()||blockedByModal())return -1;
 var b=bar(),buttons=Array.prototype.slice.call(b.querySelectorAll('button'));
 if(!buttons.length)return -1;
 var hit=e.target&&e.target.closest?e.target.closest('#navHealthBar button'):null;
 if(hit&&b.contains(hit))return buttons.indexOf(hit);
 if(typeof e.clientX!=='number'||typeof e.clientY!=='number')return -1;
 if(!pointIn(b.getBoundingClientRect(),e.clientX,e.clientY))return -1;
 /* A covered bar can still work, but never hijack a real control above it. */
 var action=e.target&&e.target.closest?e.target.closest('button,a,input,select,textarea,[role="button"]'):null;
 if(action&&!b.contains(action))return -1;
 for(var i=0;i<buttons.length;i++)if(pointIn(buttons[i].getBoundingClientRect(),e.clientX,e.clientY))return i;
 return -1;
}
function profileHit(e){
 if(!healthOn()||blockedByModal())return false;
 var el=document.querySelector(PROFILE_SELECTOR);if(!el)return false;
 if(e.target&&(e.target===el||(e.target.closest&&e.target.closest(PROFILE_SELECTOR)===el)))return true;
 return typeof e.clientX==='number'&&typeof e.clientY==='number'&&
   pointIn(el.getBoundingClientRect(),e.clientX,e.clientY)&&
   !(e.target&&e.target.closest&&e.target.closest('button,a,input,select,textarea,[role="button"]'));
}
function heroHit(e){
 if(!healthOn()||blockedByModal())return false;
 var hero=document.querySelector('#health #heroH');if(!hero)return false;
 var t=e.target;
 /* Never commandeer a real button, input or link drawn above the image. */
 var control=t&&t.closest?t.closest('button,a,input,select,textarea,[role="button"]'):null;
 if(control&&control!==hero)return false;
 if(t&&(t===hero||(hero.contains&&hero.contains(t))))return true;
 /* Also tolerate decorative overlays stealing a tap, but only within the Hero rectangle. */
 return typeof e.clientX==='number'&&typeof e.clientY==='number'&&
   pointIn(hero.getBoundingClientRect(),e.clientX,e.clientY);
}
function actionOf(e){
 if(profileHit(e)||heroHit(e))return 'profile';
 var i=navIndex(e);return i<0?null:'nav:'+i;
}
function suppress(e){
 if(e.cancelable)e.preventDefault();
 e.stopPropagation();
 if(e.stopImmediatePropagation)e.stopImmediatePropagation();
}
function show(id){
 if(typeof root.show!=='function')return false;
 try{root.show(id);}catch(e){root.console&&root.console.warn('HealthHub v551 nav '+id,e);return false;}
 var p=document.getElementById(id);
 return !!(p&&p.classList.contains('on'));
}
function run(a){
 if(a==='profile')return switchProfile();
 if(a.indexOf('nav:')!==0)return false;
 var i=Number(a.slice(4));
 if(i===0)return show('home');
 if(i===1)return healthOn()||show('health');
 if(i===2)return show('timeline');
 /* Original two slots have no corresponding live pages yet; keep truthful feedback. */
 if(i===3||i===4){
  var msg=i===3?'Az Elemzések modul még nem érhető el.':'A Továbbiak modul még nem érhető el.';
  if(typeof root.toast==='function')root.toast(msg);
  else root.alert(msg);
  return true;
 }
 return false;
}
function pointerDown(e){
 if(e.pointerType==='mouse'||e.isPrimary===false)return;
 var a=actionOf(e);
 touchStart=a?{id:e.pointerId,action:a,x:e.clientX,y:e.clientY}:null;
}
function pointerUp(e){
 if(!touchStart||touchStart.id!==e.pointerId)return;
 var s=touchStart;touchStart=null;
 if(Math.abs(e.clientX-s.x)>13||Math.abs(e.clientY-s.y)>13){
  /* A long swipe must never turn into a profile click on a synthetic tap. */
  ignoreClick={at:Date.now(),x:e.clientX,y:e.clientY};return;
 }
 if(actionOf(e)!==s.action)return;
 suppress(e);
 lastHandled={action:s.action,at:Date.now(),x:e.clientX,y:e.clientY};
 run(s.action);
}
function click(e){
 if(e.button!=null&&e.button!==0)return;
 if(ignoreClick&&Date.now()-ignoreClick.at<750&&
    Math.abs(e.clientX-ignoreClick.x)<22&&Math.abs(e.clientY-ignoreClick.y)<22){
  ignoreClick=null;suppress(e);return;
 }
 /* A touch route may hide Health before Android sends its synthetic click. */
 if(lastHandled&&Date.now()-lastHandled.at<750&&
    Math.abs(e.clientX-lastHandled.x)<22&&Math.abs(e.clientY-lastHandled.y)<22){
  lastHandled=null;suppress(e);return;
 }
 var a=actionOf(e);if(!a)return;
 suppress(e);run(a);
}
function key(e){
 if(e.key!=='Enter'&&e.key!==' ')return;
 var p=document.querySelector(PROFILE_SELECTOR);
 var hero=document.querySelector('#health #heroH');
 if(healthOn()&&!blockedByModal()&&((p&&e.target===p)||(hero&&e.target===hero))){
  suppress(e);switchProfile();
 }
}
function init(){
 paintProfile();
 var card=document.querySelector('#health .kpiCard');
 if(card&&typeof root.MutationObserver==='function'&&!observer){
  observer=new root.MutationObserver(function(){paintProfile()});
  observer.observe(card,{childList:true,subtree:true});
 }
 renderLater();
}
root.addEventListener('pointerdown',pointerDown,true);
root.addEventListener('pointerup',pointerUp,true);
root.addEventListener('pointercancel',function(){touchStart=null;},true);
root.addEventListener('click',click,true);
document.addEventListener('keydown',key,true);
root.addEventListener('healthhub:profile-changed',renderLater);
root.addEventListener('storage',function(e){if(e.key==='hh-profile')renderLater();});
root.addEventListener('pageshow',renderLater);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
root.HH_HEALTH_TOUCH_V552=Object.freeze({refresh:renderLater,toggle:switchProfile});
})(window);
