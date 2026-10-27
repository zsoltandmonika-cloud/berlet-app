/* SH9 Golden Standard v901 — one fixed, dark-glass Tasks link on every active page.
   No Supabase client, polling, GPS, or background network traffic. */
(function(w,d){
 'use strict';
 if(w.SH9_TASKS_GOLDEN_V901)return;
 w.SH9_TASKS_GOLDEN_V901=true;
 const HOME='/berlet-app/sh9/family-hub/';
 const STYLES=`
#sh9TasksGolden{
 box-sizing:border-box!important;
 position:fixed;top:calc(3px + env(safe-area-inset-top,0px));left:3px;right:auto;bottom:auto;
 z-index:180;display:grid!important;place-items:center;
 width:75px!important;height:30px!important;min-height:30px!important;
 max-width:75px!important;min-width:75px!important;margin:0!important;padding:5px 8px!important;
 text-decoration:none!important;text-align:center;white-space:nowrap;
 font:800 12px/1 Inter,'Segoe UI',sans-serif!important;letter-spacing:0;
 color:#f1f8ff!important;
 background:linear-gradient(140deg,rgba(25,49,83,.91),rgba(8,21,43,.86))!important;
 border:1px solid rgba(187,218,244,.52)!important;border-radius:12px!important;
 box-shadow:inset 0 1px rgba(255,255,255,.23),0 4px 14px #0006!important;
 backdrop-filter:blur(17px)!important;-webkit-backdrop-filter:blur(17px)!important;
 pointer-events:auto;cursor:pointer;transition:none!important;transform:none!important;
}
#sh9TasksGolden:focus-visible{outline:2px solid #a6e7ff;outline-offset:2px}
.fh-hero #sh9TasksGolden{
 position:absolute!important;top:calc(3px + env(safe-area-inset-top,0px))!important;
 left:3px!important;z-index:5!important;
}
`;
 function install(){
  if(!d.body)return;
  let style=d.getElementById('sh9TasksGoldenStyle');
  if(!style){style=d.createElement('style');style.id='sh9TasksGoldenStyle';style.textContent=STYLES;d.head.append(style)}
  let b=d.getElementById('sh9TasksGolden');
  if(!b){
   b=d.querySelector('.fh-hero .fh-module-badge')||d.createElement('a');
   b.id='sh9TasksGolden';b.classList.add('sh9-tasks-golden');
   if(!b.isConnected)d.body.append(b);
  }
  b.href=HOME;
  b.textContent='Tasks';
  b.setAttribute('aria-label','Family Tasks megnyitása');
  b.setAttribute('title','Family Tasks');
  d.querySelectorAll('.fh-badge').forEach(el=>{if(el!==b)el.remove()});
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
})(window,document);
