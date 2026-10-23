/* SH9 v24 · shared Golden Standard dock for active HealthHub modules.
   Intentionally never installed on /sh9/: that approved v23 Launcher is frozen.
   Emergency bypass: ?sh9dock=0. */
(function(w,d){
'use strict';
if(w.SH9_UNIFIED_NAV_V24)return;
if(new URLSearchParams(w.location.search).get('sh9dock')==='0')return;
const root='/berlet-app/';
const hub=root+'sh9/';
const hh=root+'healthhub/index.html';
const path=w.location.pathname;
const isHH=/\/healthhub\/(?:index\.html)?$/.test(path);
const isSupported=isHH||/\/healthhub\/(guardian|digital-health|nutrition)\/(?:index\.html)?$/.test(path);
if(!isSupported)return;
let historyStack=[],suspendTracking=false;
function currentPage(){let e=d.querySelector('.page.on');return e&&e.id||'home';}
function trackPage(){
 if(!isHH||typeof w.show!=='function'||w.show.sh9DockWrappedV24)return;
 const original=w.show;
 function trackingShow(id){
  const from=currentPage();
  if(!suspendTracking&&from&&id&&from!==id){historyStack.push(from);if(historyStack.length>24)historyStack.shift();}
  return original.apply(this,arguments);
 }
 trackingShow.sh9DockWrappedV24=true;w.show=trackingShow;
}
function notice(message){
 let toast=d.getElementById('sh9DockToastV24');
 if(!toast){toast=d.createElement('div');toast.id='sh9DockToastV24';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.hidden=true;d.body.appendChild(toast);}
 toast.textContent=message;toast.hidden=false;
 w.clearTimeout(notice.timer);notice.timer=w.setTimeout(function(){toast.hidden=true},2700);
}
function enterTimeline(){
 if(isHH&&typeof w.show==='function'){w.show('timeline');return;}
 w.location.assign(hh+'?sh9nav=timeline');
}
function enterAdmin(){
 if(isHH&&typeof w.openHealthSection==='function'){
  if(typeof w.show==='function')w.show('health');
  w.openHealthSection('more');return;
 }
 if(isHH){notice('Az Admin most nem érhető el.');return;}
 w.location.assign(hh+'?sh9nav=admin');
}
function back(){
 if(isHH&&historyStack.length&&typeof w.show==='function'){
  let target=historyStack.pop();
  if(target&&d.getElementById(target)){
   suspendTracking=true;
   try{w.show(target);}finally{suspendTracking=false;}
   return;
  }
 }
 if(w.history.length>1){w.history.back();return;}
 w.location.assign(hub);
}
function handle(action){
 switch(action){
 case 'Kezdőlap':w.location.assign(hub);break;
 case 'Idővonal':enterTimeline();break;
 case 'Vissza':back();break;
 case 'Értesítések':notice('Az SH9 értesítési központja még fejlesztés alatt áll.');break;
 case 'Admin':enterAdmin();break;
 }
}
function display(nav){
 if(!isHH)return;
 let isTimeline=currentPage()==='timeline';
 nav.querySelectorAll('button').forEach(function(b){b.classList.toggle('active',isTimeline&&b.dataset.nav==='Idővonal');});
}
function initialize(){
 if(d.getElementById('sh9GlobalNavV24'))return;
 const existing=d.querySelector('#navHomeBar,#guardianHHNav,#nutritionHHNav,.hhBottomNav');
 if(!existing)return;
 trackPage();
 const holder=d.createElement('div');
 holder.innerHTML="<nav id=\"sh9GlobalNavV24\" class=\"sh9GlobalNavV24\" aria-label=\"SH9 egységes alsó navigáció\">\n<button type=\"button\" data-nav=\"Kezdőlap\" aria-label=\"Kezdőlap\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m3 11 9-8 9 8v10h-7v-7h-4v7H3z\"/></svg><span>Kezdőlap</span></button>\n<button type=\"button\" data-nav=\"Idővonal\" aria-label=\"Idővonal\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 6v6l4 2\"/></svg><span>Idővonal</span></button>\n<button type=\"button\" data-nav=\"Vissza\" aria-label=\"Vissza az előző oldalra\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M19 12H5m7-7-7 7 7 7\"/></svg><span>Vissza</span></button>\n<button type=\"button\" data-nav=\"Értesítések\" aria-label=\"Értesítések\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 17h12l-2-3V9a4 4 0 0 0-8 0v5zM10 20a2 2 0 0 0 4 0\"/></svg><span>Értesítések</span></button>\n<button type=\"button\" data-nav=\"Admin\" aria-label=\"Admin\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"m9 2 1 3h4l1-3 3 2-1 3 3 2v4l-3 1 1 3-3 2-2-3h-3l-2 3-3-2 1-3-3-1V9l3-2-1-3z\"/></svg><span>Admin</span></button>\n</nav>";
 const dock=holder.firstElementChild;
 dock.querySelectorAll('button[data-nav]').forEach(function(b){
  b.addEventListener('click',function(){handle(b.dataset.nav);});
 });
 d.body.appendChild(dock);
 d.documentElement.dataset.sh9UnifiedNav='on';
 display(dock);
 if(isHH){
  const observer=new MutationObserver(function(){display(dock);});
  const app=d.querySelector('.app')||d.body;
  observer.observe(app,{subtree:true,attributes:true,attributeFilter:['class']});
  // Cross-module routes opened by the shared dock.
  const routed=new URLSearchParams(w.location.search).get('sh9nav');
  if(routed==='timeline'||routed==='admin'){
   w.setTimeout(function(){
    trackPage();
    if(routed==='timeline')enterTimeline();else enterAdmin();
    // Do not silently reopen after reload.
    try{const url=new URL(w.location.href);url.searchParams.delete('sh9nav');w.history.replaceState(w.history.state,'',url.toString());}catch(e){}
   },400);
  }
 }
 w.SH9_UNIFIED_NAV_V24=Object.freeze({version:'24.0',goHome:function(){w.location.assign(hub)},goBack:back});
}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',initialize,{once:true});
else initialize();
})(window,document);
