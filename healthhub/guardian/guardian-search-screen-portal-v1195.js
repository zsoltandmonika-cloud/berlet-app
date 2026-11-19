/* Family Guard v1195 · mobile screen-layer anchor.
 * Mobile Samsung Internet/WebView can treat fixed descendants of the map card
 * as card-relative. Move the ONE EXISTING search tray into body when normal
 * map is visible. Fullscreen returns it to its original place in the map.
 * Preserve the v819 map search, v832 keyboard and all live/data modules.
 */
(function(w,d){
 'use strict';
 if(!w||!d)return;
 const card=d.querySelector('.map-card');
 const tray=d.getElementById('guardianMapSearchV819');
 const input=d.getElementById('guardianMapSearchInputV819');
 if(!card||!tray||!input||tray.parentElement!==card)return;
 const anchor=d.createComment('guardian-original-search-v1195');
 card.insertBefore(anchor,tray);
 const ROOT_ATTR='data-hh-search-typing-v1195';
 const DOCK_ATTR='data-hh-screen-dock-v1195';
 let queued=false,portal=false;
 const mobile=()=>{
  const portrait=w.matchMedia?.('(max-width:900px) and (orientation:portrait)')?.matches;
  const touch=w.matchMedia?.('(pointer:coarse)')?.matches||
   (Number(w.navigator?.maxTouchPoints)||0)>0;
  return !!(portrait&&(touch||w.innerWidth<=600));
 };
 function currentNav(){
  for(const id of ['sh9TransitNavV927','sh9GlobalNavV24','guardianHHNav']){
   const n=d.getElementById(id);
   if(!n||n.hidden)continue;
   const style=w.getComputedStyle?.(n);
   if(style&&(style.display==='none'||style.visibility==='hidden'))continue;
   const r=n.getBoundingClientRect();
   if(Number.isFinite(r.top)&&r.top>0&&r.top<w.innerHeight)return r;
  }
  return null;
 }
 function restore(){
  d.documentElement.removeAttribute(ROOT_ATTR);
  if(!portal)return;
  if(anchor.parentNode)anchor.parentNode.insertBefore(tray,anchor.nextSibling);
  tray.removeAttribute(DOCK_ATTR);
  portal=false;
 }
 function sync(){
  queued=false;
  if(!mobile()||d.documentElement.dataset.sh9Transit==='on'||
      card.classList.contains('hh-map-full-v819')||
      d.body.classList.contains('hh-map-full-v819')){
   restore();return;
  }
  const nav=currentNav(),rect=card.getBoundingClientRect();
  if(!nav||!Number.isFinite(rect.left)||!Number.isFinite(rect.width)||rect.width<180){
   restore();return;
  }
  const left=Math.max(0,Math.round(rect.left));
  const width=Math.min(Math.round(rect.width),Math.max(0,w.innerWidth-left));
  if(width<180){restore();return}
  if(!portal){
   d.body.appendChild(tray);
   tray.setAttribute(DOCK_ATTR,'on');
   portal=true;
  }
  tray.style.setProperty('--hh-search-screen-left-v1195',left+'px');
  tray.style.setProperty('--hh-search-screen-width-v1195',width+'px');
  tray.style.setProperty('--hh-search-screen-bottom-v1195',
   Math.max(0,Math.round(w.innerHeight-nav.top))+'px');
  const focused=d.activeElement===input&&card.classList.contains('hh-map-typing-v832');
  if(focused){
   const vv=w.visualViewport;
   const vh=vv&&Number.isFinite(vv.height)?vv.height:w.innerHeight;
   const off=vv&&Number.isFinite(vv.offsetTop)?vv.offsetTop:0;
   const height=tray.offsetHeight||52;
   const top=Math.max(off+10,Math.round(off+vh-height-10));
   tray.style.setProperty('--hh-search-typing-top-v1195',top+'px');
   tray.style.setProperty('--hh-search-typing-results-v1195',
     Math.min(310,Math.max(70,Math.floor(top-off-20)))+'px');
   d.documentElement.setAttribute(ROOT_ATTR,'on');
  }else d.documentElement.removeAttribute(ROOT_ATTR);
 }
 function schedule(){
  if(queued)return;
  queued=true;
  if(w.requestAnimationFrame)w.requestAnimationFrame(sync);
  else w.setTimeout(sync,0);
 }
 ['resize','orientationchange','scroll','pageshow'].forEach(n=>
  w.addEventListener(n,schedule,{passive:true}));
 if(w.visualViewport?.addEventListener){
  w.visualViewport.addEventListener('resize',schedule,{passive:true});
  w.visualViewport.addEventListener('scroll',schedule,{passive:true});
 }
 input.addEventListener('focus',()=>{
  schedule();
  w.setTimeout(schedule,100);
  w.setTimeout(schedule,350);
 },{passive:true});
 input.addEventListener('blur',()=>w.setTimeout(schedule,450));
 if(w.MutationObserver){
  const observer=new w.MutationObserver(schedule);
  observer.observe(card,{attributes:true,attributeFilter:['class']});
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',schedule,{once:true});
 else schedule();
 w.setTimeout(schedule,250);
 w.setTimeout(schedule,1000);
})(window,document);
