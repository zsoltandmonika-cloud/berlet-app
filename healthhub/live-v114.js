(function(){
"use strict";
const css=`
/* HealthHub v1.14 hero consistency hotfix
   Daily Spark + Daily Briefing now use the same 205px hero height as HealthRadar.
   Backgrounds keep their native aspect ratio, so Léna is cropped, never stretched. */

.sparkHero,
.briefHero{
  height:205px!important;
  min-height:205px!important;
  max-height:205px!important;
  overflow:hidden!important;
  background-image:var(--hh-role-atlas)!important;
  background-repeat:no-repeat!important;
  background-size:200% auto!important;
}

.sparkHero{
  background-position:0% 100%!important;
}

.briefHero{
  background-position:100% 100%!important;
}

/* Keep hero text/actions comfortably inside the shorter unified header. */
.sparkHero h1,
.briefHero h1{
  line-height:1.02!important;
  margin-bottom:3px!important;
}

.sparkHero .back,
.sparkHero .open,
.briefHero .back,
.briefHero .open{
  top:12px!important;
}

/* Defensive rule against any old IMG-based hero styling in cached bundle code. */
.sparkHero img,
.briefHero img{
  width:100%!important;
  height:100%!important;
  object-fit:cover!important;
  object-position:center!important;
}
`;
const s=document.createElement("style");
s.id="hh-v114-style";
s.textContent=css;
document.head.appendChild(s);
window.HH_LIVE_BUILD="v1.14";
})();