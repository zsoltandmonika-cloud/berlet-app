/* SHO universal TV shortcut v7: 31.5x31.5 (-30%) at module-panel top-left (same API).
 * "TV-re" opens ONLY a built-in 16:9 demo screen for a known module.
 * Never screen-captures sensitive phone pages or transports GPS, medical data,
 * personal content, URLs, credentials, or OneDrive tokens over public pairing.
 * The saved TV must reply before the remote sends the module command.
 */
(function(w,d){
 'use strict';
 // One position rule: top-left of the visible SHO panel, not the browser.
 // We do NOT alter the panel's CSS positioning, overflow, or module layout.
 function repairPanelAnchorV7(){
  if(!d.body||!d.head||!d.getElementById)return;
  var badge=d.getElementById('shoTvShortcutV1');
  if(badge&&badge.parentNode!==d.body)d.body.appendChild(badge);
  if(!d.getElementById('shoTvShortcutPanelV7')){
   var css=d.createElement('style');css.id='shoTvShortcutPanelV7';
   css.textContent=[
    '#shoTvShortcutV1.sho-tv-shortcut-v1{position:fixed!important;right:auto!important;bottom:auto!important;width:31.5px!important;height:31.5px!important;min-width:0!important;min-height:0!important;z-index:70!important;box-sizing:border-box!important;border-radius:9.1px!important;font-size:6.3px!important;gap:.7px!important;padding:0!important}',
    '#shoTvShortcutV1.sho-tv-shortcut-v1 svg{width:14px!important;height:13.3px!important}',
    '@media print{#shoTvShortcutV1.sho-tv-shortcut-v1{display:none!important}}'
   ].join('');
   d.head.appendChild(css);
  }
  if(!badge||!badge.style||!badge.style.setProperty)return;
  var panel=d.querySelector&&d.querySelector('main.shell,div.shell,.st-shell,.app,.sport-shell,main.wrap,.wrap,main');
  // The fallback is the viewport origin for pages without an identifiable
  // module panel. The live panel is measured again after viewport rotation.
  var rect=panel&&panel.getBoundingClientRect?panel.getBoundingClientRect():null;
  var x=rect&&isFinite(rect.left)?Math.max(0,Math.round(rect.left)):0;
  var y=rect&&isFinite(rect.top)?Math.max(0,Math.round(rect.top)):0;
  badge.style.setProperty('left',x+'px','important');
  badge.style.setProperty('top',y+'px','important');
 }
 function bindPanelAnchorV7(){
  if(w.__SHO_TV_PANEL_ANCHOR_BOUND_V7)return;
  w.__SHO_TV_PANEL_ANCHOR_BOUND_V7=true;
  if(w.addEventListener){
   w.addEventListener('resize',repairPanelAnchorV7);
   w.addEventListener('orientationchange',repairPanelAnchorV7);
   w.addEventListener('pageshow',repairPanelAnchorV7);
  }
  if(w.visualViewport&&w.visualViewport.addEventListener)
   w.visualViewport.addEventListener('resize',repairPanelAnchorV7);
 }
 // Repair an already-mounted shortcut from a cached old script, no duplicate.
 bindPanelAnchorV7();
 if(w.SHO_TV_SHORTCUT_V1){
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',repairPanelAnchorV7,{once:true});
  else repairPanelAnchorV7();
  if(w.addEventListener)w.addEventListener('pageshow',repairPanelAnchorV7);
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
  if(exists){exists.href=LINK+'?show='+module;repairPanelAnchorV7();return;}
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
  repairPanelAnchorV7();
 }
 function start(){
  mount();
  repairPanelAnchorV7();
  if(w.addEventListener)w.addEventListener('pageshow',function(){mount();repairPanelAnchorV7()});
 }
 w.SHO_TV_SHORTCUT_V1=Object.freeze({moduleForPath:moduleForPath,mount:mount});
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window,document);