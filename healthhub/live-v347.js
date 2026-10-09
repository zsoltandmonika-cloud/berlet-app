(function(){
'use strict';
// v347: keep the approved hero; move its caption to the upper right
// and replace the brain emoji with the exact user-provided original Ask Léna icon (WebP lossless layout, high-quality compression).
var originalIcon='data:image/webp;base64,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';
function install(){
 var page=document.getElementById('hhLenaSmart299');
 if(!page)return;
 if(!document.getElementById('hhLena347Style')){
  var css=document.createElement('style');css.id='hhLena347Style';
  css.textContent=[
   '#hhLenaSmart299 .askHeroInner{position:relative!important}',
   '#hhLenaSmart299 .askHeroCopy{position:absolute!important;top:9px!important;right:clamp(10px,3vw,24px)!important;width:min(56%,245px)!important;max-width:245px!important;padding:0!important;box-sizing:border-box!important;display:flex!important;flex-direction:column!important;align-items:flex-end!important;text-align:right!important;z-index:3!important}',
   '#hhLenaSmart299 .askHeroCopy h1{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;white-space:nowrap!important;margin:0 0 3px!important;padding:0!important;line-height:1.25!important;font-size:clamp(22px,5vw,29px)!important;color:#153d59!important}',
   '#hhLenaSmart299 .askHeroCopy h1 .hhAskOriginalLogo347{width:39px;height:39px;display:block;flex:0 0 39px;object-fit:cover;border-radius:50%;box-shadow:0 1px 5px #55358922}',
   '#hhLenaSmart299 .askHeroCopy .askSub{text-align:right!important;margin:0 0 9px!important;font-size:clamp(10px,2.5vw,12px)!important;line-height:1.4!important}',
   '#hhLenaSmart299 .askHeroCopy .askProfile{align-self:flex-end!important;margin:0!important;white-space:nowrap}',
   '@media(max-width:390px){#hhLenaSmart299 .askHeroCopy{right:9px!important;width:57%!important}#hhLenaSmart299 .askHeroCopy h1{font-size:22px!important}#hhLenaSmart299 .askHeroCopy h1 .hhAskOriginalLogo347{width:34px;height:34px;flex-basis:34px}#hhLenaSmart299 .askHeroCopy .askSub{font-size:10px!important}}'
  ].join('');
  document.head.appendChild(css);
 }
 var h=page.querySelector('.askHeroCopy h1');
 if(!h||h.dataset.hhLenaBrand347==='yes')return;
 var img=document.createElement('img');
 img.className='hhAskOriginalLogo347';img.src=originalIcon;img.alt='';img.setAttribute('aria-hidden','true');
 img.width=39;img.height=39;img.decoding='async';
 h.replaceChildren(img,document.createTextNode('Ask Léna'));
 h.dataset.hhLenaBrand347='yes';
}
window.addEventListener('healthhub:ask-lena-open',install);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else setTimeout(install,0);
document.documentElement.dataset.healthhubHeroBrand='347';
})();