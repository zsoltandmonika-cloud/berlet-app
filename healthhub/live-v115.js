(function(){
"use strict";
const css=`
/* HealthHub v1.15 approved Daily hero assets */
.sparkHero{
  height:205px!important;
  min-height:205px!important;
  max-height:205px!important;
  background-image:url("./assets/daily-spark-approved.webp?v=115")!important;
  background-size:cover!important;
  background-position:center center!important;
  background-repeat:no-repeat!important;
  overflow:hidden!important;
}
.briefHero{
  height:205px!important;
  min-height:205px!important;
  max-height:205px!important;
  background-image:url("./assets/daily-news-approved.webp?v=117")!important;
  background-size:cover!important;
  background-position:center center!important;
  background-repeat:no-repeat!important;
  overflow:hidden!important;
}
.sparkHero img,.briefHero img{
  width:100%!important;
  height:100%!important;
  object-fit:cover!important;
  object-position:center center!important;
}
`;
const s=document.createElement("style");
s.id="hh-v115-style";
s.textContent=css;
document.head.appendChild(s);
window.HH_LIVE_BUILD="v1.15";
})();