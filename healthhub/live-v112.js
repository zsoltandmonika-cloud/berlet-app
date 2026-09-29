(function(){
"use strict";

const css=`
/* HealthHub v1.12 visual hotfix */

/* HealthRadar hero: preserve the doctor's original proportions.
   The role atlas top row is 3:1, so width-driven scaling distorted Léna. */
#heroH,
#heroH.night,
#heroH.evening{
  height:205px!important;
  background-image:var(--hh-role-atlas)!important;
  background-size:auto 200%!important;
  background-position:left top!important;
  background-repeat:no-repeat!important;
}

/* Keep the live title/buttons on the bright area of the non-distorted image. */
.healthHeroOnlyTitle{
  left:56%!important;
  right:34px!important;
  top:52%!important;
  font-size:29px!important;
}
#heroH .heroBtns{right:10px!important;top:10px!important}

/* Ask Léna: force the compact medical banner so the old full-width photo
   can never stretch inside the HealthRadar page. */
#health .ask.hhAskCompact{
  height:112px!important;
  min-height:112px!important;
  max-height:112px!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 122px 28px!important;
  align-items:center!important;
  overflow:hidden!important;
  padding:0 8px 0 15px!important;
  border-radius:16px!important;
  background:linear-gradient(135deg,var(--a),color-mix(in srgb,var(--a) 55%,#3d2868))!important;
  color:#fff!important;
}
#health .ask.hhAskCompact>img{display:none!important}
#health .ask.hhAskCompact .askText{position:relative;z-index:3;min-width:0}
#health .ask.hhAskCompact .askText b{display:block;font-size:19px!important;line-height:1.05;margin-bottom:6px;color:#fff}
#health .ask.hhAskCompact .askText small{display:block;font-size:9px!important;line-height:1.3;color:#fff;opacity:.95}
#health .ask.hhAskCompact .askDoc{
  align-self:stretch!important;
  min-width:122px!important;
  background-image:var(--hh-role-atlas)!important;
  background-repeat:no-repeat!important;
  background-size:auto 224px!important;
  background-position:22% 0!important;
}
#health .ask.hhAskCompact .askArrow{font-size:28px;font-weight:400;text-align:center;color:#fff;z-index:3}
`;

const style=document.createElement("style");
style.id="hh-v112-style";
style.textContent=css;
document.head.appendChild(style);

function repairAsk(){
  const ask=document.querySelector("#health .ask");
  if(!ask)return;
  ask.className="ask hhAskCompact";
  ask.setAttribute("onclick","toast('Ask Léna teljes képernyő következik')");
  ask.innerHTML=
    '<div class="askText"><b>Ask Léna</b><small>Kérdezz az egészségedről, leletekről, gyógyszerekről…</small></div>'+
    '<div class="askDoc" aria-hidden="true"></div>'+
    '<span class="askArrow">›</span>';
}
repairAsk();

/* Some older bundle code may repaint HealthRadar after load/profile change. */
setTimeout(repairAsk,120);
setTimeout(repairAsk,700);

window.HH_LIVE_BUILD="v1.12";
})();