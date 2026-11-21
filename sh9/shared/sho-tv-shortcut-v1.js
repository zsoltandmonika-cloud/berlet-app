/* SHO universal TV shortcut v3 premium 45x45 layout (same API).
 * "TV-re" opens ONLY a built-in 16:9 demo screen for a known module.
 * Never screen-captures sensitive phone pages or transports GPS, medical data,
 * personal content, URLs, credentials, or OneDrive tokens over public pairing.
 * The saved TV must reply before the remote sends the module command.
 */
(function(w,d){
 'use strict';
 if(w.SHO_TV_SHORTCUT_V1)return;
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
  if(exists){exists.href=LINK+'?show='+module;return;}
  if(!d.getElementById('shoTvShortcutStyleV1')){
   var sheet=d.createElement('style');sheet.id='shoTvShortcutStyleV1';
   sheet.textContent=[
    '.sho-tv-shortcut-v1{position:fixed;left:11px;top:calc(64px + env(safe-area-inset-top,0px));right:auto;bottom:auto;z-index:70;',
    'width:45px;height:45px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1px;',
    'background:linear-gradient(145deg,rgba(32,54,84,.91),rgba(12,26,49,.92));border:1px solid rgba(151,208,242,.52);',
    'border-radius:13px;color:#eaf7ff;text-decoration:none;font-family:system-ui,sans-serif;font-size:9px;font-weight:750;letter-spacing:.01em;',
    'box-shadow:0 6px 18px rgba(0,5,21,.37),inset 0 1px rgba(255,255,255,.20),0 0 10px rgba(62,154,228,.13);',
    '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
    '.sho-tv-shortcut-v1 svg{display:block;width:20px;height:19px}',
    '.sho-tv-shortcut-v1:focus-visible{outline:2px solid #a3edff;outline-offset:3px}',
    '@media(min-width:950px){.sho-tv-shortcut-v1{top:20px;left:20px;right:auto;bottom:auto}}',
    '@media(max-height:420px) and (orientation:landscape){.sho-tv-shortcut-v1{top:12px;left:12px;right:auto;bottom:auto}}',
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
 }
 function start(){
  mount();
  if(w.addEventListener)w.addEventListener('pageshow',mount);
 }
 w.SHO_TV_SHORTCUT_V1=Object.freeze({moduleForPath:moduleForPath,mount:mount});
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window,document);