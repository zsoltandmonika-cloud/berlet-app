/* SHO universal TV shortcut v6: 31.5x31.5 (-30%) at absolute viewport top-left (same API).
 * "TV-re" opens ONLY a built-in 16:9 demo screen for a known module.
 * Never screen-captures sensitive phone pages or transports GPS, medical data,
 * personal content, URLs, credentials, or OneDrive tokens over public pairing.
 * The saved TV must reply before the remote sends the module command.
 */
(function(w,d){
 'use strict';
 // One placement rule everywhere. 45px -> 31.5px = exactly 30% smaller.
 // Keep the same shortcut and link; only size and top-left placement change.
 function repairGlobalAnchorV6(){
  if(!d.body||!d.head||!d.getElementById)return;
  var badge=d.getElementById('shoTvShortcutV1');
  // The previous Home-only version reparented into the hero and overrode
  // fixed positioning with an !important absolute rule. Undo both.
  if(badge&&badge.parentNode!==d.body)d.body.appendChild(badge);
  if(!d.getElementById('shoTvShortcutGlobalV6')){
   var css=d.createElement('style');css.id='shoTvShortcutGlobalV6';
   css.textContent=[
    '#shoTvShortcutV1.sho-tv-shortcut-v1{position:fixed!important;left:0!important;top:0!important;right:auto!important;bottom:auto!important;width:31.5px!important;height:31.5px!important;min-width:0!important;min-height:0!important;z-index:70!important;box-sizing:border-box!important;border-radius:9.1px!important;font-size:6.3px!important;gap:.7px!important;padding:0!important}',
    '#shoTvShortcutV1.sho-tv-shortcut-v1 svg{width:14px!important;height:13.3px!important}',
    '@media print{#shoTvShortcutV1.sho-tv-shortcut-v1{display:none!important}}'
   ].join('');
   d.head.appendChild(css);
  }
 }
 // Repair an already-mounted shortcut from a cached old script, no duplicate.
 if(w.SHO_TV_SHORTCUT_V1){
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',repairGlobalAnchorV6,{once:true});
  else repairGlobalAnchorV6();
  if(w.addEventListener)w.addEventListener('pageshow',repairGlobalAnchorV6);
  return;
 }
 var LINK='https://mediaradar.pages.dev/sho-family-tv/remote.html';
 var ROOT='/berlet-app/';
 function moduleForPath(path){
  if(typeof path!=='string'||path.indexOf(ROOT)!==0)return '';
  var p=path.slice(ROOT.length);
  if(p.indexOf('healthhub/guardian/')===0)return 'guard';
  if(p.indexOf('healthhub/')===0)return 'health';
  if(p.indexOf('sh9/entertainment/')===0)return 'media';
  if(p.indexOf('sh9/smart-travel/')===0)return 'travel';
  if(p.indexOf('sh9/shopping/')===0)return 'shop';
  if(p.indexOf('sh9/sport/')===0)return 'sports';
  if(p.indexOf('sh9/family-hub/')===0)return 'guard';
  if(p.indexOf('sh9/')===0||p==='sh9')return 'home';
  return '';
 }
 function mount(){
  if(!d.body||!d.head)return;
  var module=moduleForPath(w.location&&w.location.pathname);
  if(!module)return;
  // Smart Entertainment is already navigable via its full-width Media Center hero.
  // A second tiny floating TV button looks redundant next to the premium media entry.
  // Inside the Media Center, retain only the approved inline image remote.
  var route=w.location&&w.location.pathname||'';
  if(/^\/berlet-app\/sh9\/entertainment\/(?:index\.html)?$/.test(route))return;
  if(d.querySelector('.remote-smart-card[href*="sho-family-tv/remote.html"], .media-inline-remote[href*="sho-family-tv/remote.html"]'))return;
  var exists=d.getElementById('shoTvShortcutV1');
  if(exists){exists.href=LINK+'?show='+module;repairGlobalAnchorV6();return;}
  if(!d.getElementById('shoTvShortcutStyleV1')){
   var sheet=d.createElement('style');sheet.id='shoTvShortcutStyleV1';
   sheet.textContent=[
    '.sho-tv-shortcut-v1{position:fixed;left:0;top:0;right:auto;bottom:auto;z-index:70;',
    'width:31.5px;height:31.5px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:.7px;',
    'background:linear-gradient(145deg,rgba(32,54,84,.91),rgba(12,26,49,.92));border:1px solid rgba(151,208,242,.52);',
    'border-radius:9.1px;color:#eaf7ff;text-decoration:none;font-family:system-ui,sans-serif;font-size:6.3px;font-weight:750;letter-spacing:.01em;',
    'box-shadow:0 6px 18px rgba(0,5,21,.37),inset 0 1px rgba(255,255,255,.20),0 0 10px rgba(62,154,228,.13);',
    '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
    '.sho-tv-shortcut-v1 svg{display:block;width:14px;height:13.3px}',
    '.sho-tv-shortcut-v1:focus-visible{outline:2px solid #a3edff;outline-offset:3px}',
    '@media(min-width:950px){.sho-tv-shortcut-v1{top:0;left:0;right:auto;bottom:auto}}',
    '@media(max-height:420px) and (orientation:landscape){.sho-tv-shortcut-v1{top:0;left:0;right:auto;bottom:auto}}',
    '@media print{.sho-tv-shortcut-v1{display:none!important}}'
   ].join('');
   d.head.appendChild(sheet);
  }
  var a=d.createElement('a');
  a.id='shoTvShortcutV1';a.className='sho-tv-shortcut-v1';
  a.href=LINK+'?show='+module;
  a.target='_blank';a.rel='noopener noreferrer';
  a.setAttribute('aria-label','TV-re: '+module+' modul 16:9-es mintanézete. Személyes adatok nélkül.');
  a.title='TV-re · 16:9 demó · mentett Xiaomi párosítás';
  a.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.7" y="4.5" width="18.6" height="14.4" rx="2.5"/><path d="M9 21.2h6m-3-2.3v2.3"/><path d="m10.5 9 4 2.7-4 2.7z"/></svg><span>TV-re</span>';
  d.body.appendChild(a);
  repairGlobalAnchorV6();
 }
 function start(){
  mount();
  repairGlobalAnchorV6();
  if(w.addEventListener)w.addEventListener('pageshow',function(){mount();repairGlobalAnchorV6()});
 }
 w.SHO_TV_SHORTCUT_V1=Object.freeze({moduleForPath:moduleForPath,mount:mount});
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window,document);