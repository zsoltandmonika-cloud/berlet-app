/* SHO universal TV shortcut v1.
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
  // The Media Center has the full approved C-style smart remote already.
  if(d.querySelector('.remote-smart-card[href*="sho-family-tv/remote.html"]'))return;
  var exists=d.getElementById('shoTvShortcutV1');
  if(exists){exists.href=LINK+'?show='+module;return;}
  if(!d.getElementById('shoTvShortcutStyleV1')){
   var sheet=d.createElement('style');sheet.id='shoTvShortcutStyleV1';
   sheet.textContent=[
    '.sho-tv-shortcut-v1{position:fixed;right:11px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:70;',
    'width:51px;height:46px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:0;',
    'background:linear-gradient(145deg,rgba(18,31,51,.95),rgba(30,61,81,.96));border:1px solid rgba(114,215,242,.8);',
    'border-radius:14px;color:#e7faff;text-decoration:none;font-family:system-ui,sans-serif;font-size:10px;font-weight:800;',
    'box-shadow:0 7px 24px rgba(0,0,0,.48),inset 0 1px rgba(255,255,255,.17),0 0 12px rgba(76,204,241,.2);',
    'touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
    '.sho-tv-shortcut-v1 svg{display:block;width:23px;height:22px}',
    '.sho-tv-shortcut-v1:focus-visible{outline:3px solid #a3edff;outline-offset:3px}',
    '@media(min-width:950px){.sho-tv-shortcut-v1{bottom:20px;right:20px}}',
    '@media(max-height:420px) and (orientation:landscape){.sho-tv-shortcut-v1{bottom:12px;right:12px}}',
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
  a.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.7" y="4.5" width="18.6" height="12.7" rx="2.1"/><path d="M8 21h8m-4-3.8V21m-4.2-10 2.5-2.5m-2.5 2.5 2.5 2.5M13.5 11h5"/></svg><span>TV-re</span>';
  d.body.appendChild(a);
 }
 function start(){
  mount();
  if(w.addEventListener)w.addEventListener('pageshow',mount);
 }
 w.SHO_TV_SHORTCUT_V1=Object.freeze({moduleForPath:moduleForPath,mount:mount});
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window,document);