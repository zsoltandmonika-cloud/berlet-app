/* SH9 v924 GOLDEN STANDARD · global bottom navigation.
   Two approved controls (Home and Ask Léna) use the v923 transparent,
   frameless light-blue/pink icons and matching Ask caption.
   Existing third+ actions remain intact. Self-contained fallbacks for pages
   without a bottom nav; no module data, GPS or permissions are touched. */
(function(w,d){
 'use strict';
 if(w.SH9_GOLDEN_BOTTOM_NAV_V924)return;
 const ROOT='/berlet-app/',HH=ROOT+'healthhub/index.html',HOME=ROOT+'sh9/';
 const ASK_FALLBACK=HH+'?sh9nav=admin&sh9cfg=asklena';
 const NAVS='nav.sh9GlobalNavV24,nav[aria-label="SH9 Golden Standard navigáció"],nav.sh9GlobalNavV24,nav.hhBottomNav,nav.fh-standard-nav,nav.st-nav,nav.mt-nav,nav.st22-nav,nav.bottom-nav,nav.sh9-golden-fallback-v924';
 const paths={
  home:'<path d="m3 11 9-8 9 8v10h-7v-7h-4v7H3z"/>',
  ask:'<path d="M20.5 11.3c0 4.5-3.7 8.2-8.2 8.2-1.5 0-3-.4-4.2-1.1L3 20l1.5-4.6A8.25 8.25 0 1 1 20.5 11.3Z"/><path d="M9 11h6"/>',
  back:'<path d="M19 12H5m7-7-7 7 7 7"/>',
  notifications:'<path d="M6 17h12l-2-3V9a4 4 0 0 0-8 0v5zM10 20a2 2 0 0 0 4 0"/>',
  admin:'<circle cx="12" cy="12" r="3"/><path d="m9 2 1 3h4l1-3 3 2-1 3 3 2v4l-3 1 1 3-3-2-2-3h-3l-2 3-3-2 1-3-3-2V9l3-2-1-3z"/>'
 };
 const svg=type=>'<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">'+paths[type]+'</svg>';
 const readProfile=()=>{try{return w.localStorage?.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}};
 function paint(){
  d.documentElement.setAttribute('data-sh9-golden-profile',readProfile());
 }
 function ask(e){
  if(e){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation()}
  const api=w.HH_CHATGPT_PROJECT_SHORTCUT_V712;
  if(api&&typeof api.openProject==='function'){api.openProject();return}
  // Same safe, centrally administered fallback used by the SH9 launcher.
  w.location.assign(ASK_FALLBACK);
 }
 function hasText(node,text){
  return String(node?.getAttribute?.('aria-label')||'').toLowerCase().includes(text)||
   String(node?.textContent||'').toLowerCase().includes(text);
 }
 function children(nav){return Array.from(nav.children).filter(e=>e.matches?.('a,button'))}
 function candidate(nav){
  const entries=children(nav);
  let home=entries.find(e=>e.id==='navHome'||e.dataset.nav==='Kezdőlap'||hasText(e,'kezdőlap')||
    e.getAttribute('aria-label')==='HealthHub kezdőlap');
  if(!home&&nav.classList.contains('bottom-nav'))home=entries.find(e=>e.id==='navHome');
  if(!home)return null;
  let askNode=entries.find(e=>e.id==='navAsk'||e.dataset.nav==='Ask Léna'||hasText(e,'ask léna')||hasText(e,'kérdezd lénát'));
  if(!askNode&&entries.length>=2)askNode=entries[1];
  if(!askNode)return null;
  return {home,askNode,nav};
 }
 function renderIcon(node,name,label){
  const oldLabel=node.querySelector('span[data-i18n],span:not([data-icon]),small');
  const labelTag=oldLabel?.tagName?.toLowerCase()==='small'?'small':'span';
  const translation=oldLabel?.getAttribute?.('data-i18n');
  const txt=label==='home'?('Kezdőlap'):('Ask Léna');
  // Only the Home/Ask children change: never touch the other three slots.
  node.innerHTML=svg(name)+'<'+labelTag+(translation?' data-i18n="'+translation+'"':'')+'>'+txt+'</'+labelTag+'>';
 }
 function normalize(nav){
  if(!nav||nav.closest('dialog')||nav.hasAttribute('hidden')&&nav.classList.contains('sh9-golden-fallback-v924'))return;
  const item=candidate(nav);if(!item)return;
  const {home,askNode}=item;
  if(nav.dataset.sh9GoldenBottomNav==='on'&&home.dataset.sh9BottomRole==='home'&&askNode.dataset.sh9BottomRole==='ask')return;
  const nativeAsk=askNode.id==='navAsk'||askNode.dataset.nav==='Ask Léna';
  const wasNativeAsk=!!nativeAsk;
  if(home.dataset.sh9BottomRole!=='home'){
   home.dataset.sh9BottomRole='home';renderIcon(home,'home','home');
  }
  if(askNode.dataset.sh9BottomRole!=='ask'){
   askNode.dataset.sh9BottomRole='ask';
   if(!wasNativeAsk){
    askNode.setAttribute('aria-label','Ask Léna megnyitása');
    if(askNode.tagName==='A')askNode.setAttribute('href',ASK_FALLBACK);
    if(askNode.tagName==='BUTTON')askNode.dataset.nav='Ask Léna';
    askNode.addEventListener('click',ask,true);
   }
   renderIcon(askNode,'ask','ask');
  }
  // Recipe Studio's existing Ask handler must remain authoritative; only
  // move its button beside Home without changing favorites/admin behavior.
  if(askNode.id==='navAsk'&&home.nextElementSibling!==askNode)
   nav.insertBefore(askNode,home.nextElementSibling);
  nav.dataset.sh9GoldenBottomNav='on';
 }
 function fallback(){
  if(d.querySelector('nav[data-sh9-golden-bottom-nav="on"]'))return;
  // HealthHub rebuilds its DOM via document.write; let its existing shared
  // nav initialize first rather than racing and creating two bottom bars.
  const nav=d.createElement('nav');
  nav.className='sh9-golden-fallback-v924';
  nav.setAttribute('aria-label','SH9 Golden Standard navigáció');
  const actions=[
   ['Kezdőlap','home',HOME],['Ask Léna','ask',ASK_FALLBACK],
   ['Vissza','back','#'],['Értesítések','notifications',HH+'?sh9nav=notifications'],
   ['Admin','admin',HH+'?sh9nav=admin']
  ];
  for(const [label,icon,url] of actions){
   const a=d.createElement('a');a.href=url;a.setAttribute('aria-label',label);
   a.innerHTML=svg(icon)+'<span>'+label+'</span>';
   if(label==='Ask Léna')a.addEventListener('click',ask,true);
   if(label==='Vissza')a.addEventListener('click',e=>{e.preventDefault();if(w.history.length>1)w.history.back();else w.location.assign(HOME)});
   nav.appendChild(a);
  }
  d.body.appendChild(nav);
  d.body.dataset.sh9GoldenFallback='on';
  normalize(nav);
 }
 let running=false;
 function apply(){
  if(running||!d.body)return;
  running=true;
  try{
   paint();
   const navs=Array.from(d.querySelectorAll(NAVS));
   for(const nav of navs)normalize(nav);
   const genuine=navs.some(n=>n.dataset.sh9GoldenBottomNav==='on'&&!n.classList.contains('sh9-golden-fallback-v924'));
   const existing=d.querySelector('nav.sh9-golden-fallback-v924');
   if(genuine&&existing){
    existing.remove();
    delete d.body.dataset.sh9GoldenFallback;
   }
   if(!genuine&&!existing&&!d.querySelector('#sh9GlobalNavV24'))
    fallback();
  }finally{running=false}
 }
 function mount(){
  apply();
  if(typeof MutationObserver!=='undefined'){
   const mo=new MutationObserver(changes=>{
    if(changes.some(c=>c.type==='childList'&&
      Array.from(c.addedNodes||[]).some(n=>n.nodeType===1&&
       (n.matches?.('nav')||n.querySelector?.('nav')))))apply();
   });
   mo.observe(d.body,{subtree:true,childList:true});
  }
  w.addEventListener?.('hh-family-profile-changed',paint);
  w.addEventListener?.('healthhub:profile-changed',paint);
  w.addEventListener?.('storage',e=>{if(e.key==='hh-profile')paint()});
  w.addEventListener?.('pageshow',apply);
  w.addEventListener?.('focus',paint);
  if(/\/healthhub\/(?:index\.html)?$/.test(w.location.pathname))
   w.setTimeout?.(apply,1100);
 }
 w.SH9_GOLDEN_BOTTOM_NAV_V924=Object.freeze({version:'924-global',refresh:apply});
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(window,document);
