(function(){
'use strict';
/* HealthHub v1.275 — crisp vector scale + exact live LCD overlay */
var ID='hh-v275-weight-style';
function install(){
  if(document.getElementById(ID)) return;
  var s=document.createElement('style'); s.id=ID;
  s.textContent=[
    '.hhWScale{overflow:hidden!important;border-radius:24px!important;filter:drop-shadow(0 10px 18px rgba(24,56,82,.16))!important;}',
    '.hhWScale img{display:block!important;width:100%!important;height:auto!important;image-rendering:auto!important;}',
    '.hhWDisplay{left:27%!important;top:5.37%!important;width:46%!important;height:28.32%!important;padding:0!important;border:0!important;border-radius:14px!important;background:transparent!important;box-shadow:none!important;display:grid!important;grid-template-rows:50% 50%!important;gap:0!important;overflow:hidden!important;}',
    '.hhWDisplay:after{display:none!important;content:none!important;}',
    '.hhWLcdTop,.hhWLcdBottom{min-height:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) 16%!important;column-gap:2%!important;align-items:center!important;background:transparent!important;padding:3.5% 4% 2.5% 6%!important;overflow:hidden!important;}',
    '.hhWLcdTop{border-bottom:2px solid rgba(239,255,255,.94)!important;border-radius:0!important;}',
    '.hhWLcdBottom{border-radius:0!important;}',
    '.hhWLcdTag{display:none!important;}',
    '.hhWLcdTop>span:nth-child(2),.hhWLcdBottom>span:nth-child(2){display:flex!important;align-items:center!important;width:100%!important;height:100%!important;min-width:0!important;}',
    '.hhWSeg{display:block!important;width:100%!important;height:100%!important;max-height:none!important;overflow:visible!important;}',
    '.hhWLcdBottom .hhWSeg{height:100%!important;}',
    '.hhWSeg .on{fill:#efffff!important;filter:drop-shadow(0 0 1.4px rgba(255,255,255,.8))!important;}',
    '.hhWSeg .off{fill:rgba(225,252,255,.07)!important;}',
    '.hhWLcdUnit{font-size:clamp(10px,3.2vw,18px)!important;font-weight:850!important;line-height:1!important;color:#efffff!important;align-self:end!important;justify-self:end!important;padding:0 0 14% 0!important;text-shadow:0 0 2px rgba(255,255,255,.35)!important;}'
  ].join('');
  document.head.appendChild(s);
  document.documentElement.dataset.healthhubWeight='1.275';
  window.HH_LIVE_BUILD='v275-weight-vector';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
window.addEventListener('healthhub:profile-changed',install);
})();