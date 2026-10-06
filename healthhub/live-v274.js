(function(){
'use strict';
/* HealthHub v1.274 — Weight scale visual: reference large dual LCD */
var STYLE_ID='hh-v274-weight-display';
function install(){
  if(document.getElementById(STYLE_ID)) return;
  var s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=[
    '.hhWScale{overflow:visible!important;}',
    '.hhWDisplay{',
      'left:23.35%!important;top:1.7%!important;width:53.3%!important;height:37.4%!important;',
      'padding:5.7% 7.2% 8.7%!important;',
      'display:grid!important;grid-template-rows:1fr 1fr!important;gap:0!important;',
      'background:linear-gradient(180deg,#1b1d20 0%,#131416 100%)!important;',
      'border:1px solid rgba(255,255,255,.14)!important;',
      'border-radius:clamp(12px,4vw,20px)!important;',
      'box-shadow:0 4px 9px rgba(0,0,0,.28),inset 0 1px 1px rgba(255,255,255,.08)!important;',
      'color:#efffff!important;overflow:hidden!important;',
    '}',
    '.hhWDisplay:after{content:"beurer";position:absolute;left:0;right:0;bottom:1.15%;text-align:center;color:#d5d7da;font-size:clamp(8px,2.5vw,14px);font-weight:750;letter-spacing:-.035em;line-height:1;}',
    '.hhWLcdTop,.hhWLcdBottom{',
      'min-height:0!important;display:grid!important;',
      'grid-template-columns:0 minmax(0,1fr) 13%!important;',
      'column-gap:2%!important;align-items:center!important;',
      'background:linear-gradient(135deg,#0787ff 0%,#0878f0 48%,#0a82f5 100%)!important;',
      'padding:1.5% 3.2% 1.3%!important;',
      'overflow:hidden!important;',
    '}',
    '.hhWLcdTop{border-radius:clamp(4px,1.5vw,8px) clamp(4px,1.5vw,8px) 0 0!important;border-bottom:1.6px solid rgba(238,255,255,.92)!important;}',
    '.hhWLcdBottom{border-radius:0 0 clamp(4px,1.5vw,8px) clamp(4px,1.5vw,8px)!important;}',
    '.hhWLcdTag{display:none!important;}',
    '.hhWLcdUnit{',
      'font-size:clamp(8px,2.5vw,14px)!important;font-weight:800!important;',
      'color:#efffff!important;align-self:center!important;padding:0!important;',
      'text-shadow:0 0 2px rgba(255,255,255,.38)!important;',
    '}',
    '.hhWSeg{width:100%!important;height:94%!important;align-self:center!important;}',
    '.hhWLcdBottom .hhWSeg{height:94%!important;}',
    '.hhWSeg .on{fill:#efffff!important;filter:drop-shadow(0 0 1.25px rgba(255,255,255,.72))!important;}',
    '.hhWSeg .off{fill:rgba(220,251,255,.075)!important;}'
  ].join('');
  document.head.appendChild(s);
  document.documentElement.dataset.healthhubWeight='1.274';
  window.HH_LIVE_BUILD='v274-weight-large-dual-lcd';
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
window.addEventListener('healthhub:profile-changed',install);
})();