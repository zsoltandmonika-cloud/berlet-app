(function(){
"use strict";
function hasData(){
  try{
    const v=JSON.parse(localStorage.getItem("hh-health-vault-v1")||"null");
    return !!(v&&v.profiles&&v.profiles.zsolt&&v.profiles.monika);
  }catch(_){return false}
}
function showSetup(){
  if(hasData())return;
  const page=document.getElementById("healthSection");
  const box=document.getElementById("healthSubContent");
  if(!page||!box||!page.classList.contains("on"))return;
  box.innerHTML='<div class="hrSectionCard"><h3>Adatcsomag szükséges</h3><p style="font-size:9px;line-height:1.45;color:#667f92">Ezen a készüléken még nincs betöltve a migrációs csomag.</p><button class="vaultBtn primary" id="hhSetupImport">Adatcsomag importálása</button><div class="privacyNote">HealthHub_HealthRadar_Private_Migration_v1_1.json</div></div>';
  const b=document.getElementById("hhSetupImport");
  if(b)b.onclick=function(){document.getElementById("healthVaultFile")?.click()};
}
if(typeof window.renderHealthSection==="function"){
  const prev=window.renderHealthSection;
  window.renderHealthSection=function(){
    const r=prev.apply(this,arguments);
    setTimeout(showSetup,0);
    return r;
  };
}

const heroStyle=document.createElement("style");
heroStyle.id="hh-v125-health-subheroes";
heroStyle.textContent=`
.healthSubHero{
  height:165px!important;
  min-height:165px!important;
  padding:0!important;
  display:block!important;
  position:relative!important;
  overflow:hidden!important;
  background-image:var(--hh-role-atlas)!important;
  background-size:100% 200%!important;
  background-position:0 0!important;
  background-repeat:no-repeat!important;
  color:#0b2d50!important;
}
.healthSubHero:after{
  content:"";
  position:absolute;
  inset:0;
  z-index:1;
  pointer-events:none;
  background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.02) 42%,rgba(255,255,255,.28) 72%,rgba(255,255,255,.46) 100%);
}
.healthSubHero .backBtn{
  position:absolute!important;
  left:14px!important;
  top:14px!important;
  z-index:6!important;
  color:#173f61!important;
  border-color:rgba(23,63,97,.18)!important;
  background:rgba(255,255,255,.82)!important;
  box-shadow:0 4px 14px rgba(40,70,100,.10)!important;
}
.healthSubHero .healthSubAction{
  position:absolute!important;
  right:14px!important;
  top:14px!important;
  z-index:6!important;
  margin:0!important;
  color:#173f61!important;
  border-color:rgba(23,63,97,.18)!important;
  background:rgba(255,255,255,.82)!important;
  box-shadow:0 4px 14px rgba(40,70,100,.10)!important;
}
.healthSubHero>div{
  position:absolute!important;
  left:55%!important;
  right:48px!important;
  top:54%!important;
  transform:translateY(-50%)!important;
  z-index:5!important;
}
.healthSubHero h1{
  margin:2px 0 0!important;
  color:#0b2d50!important;
  font-size:25px!important;
  line-height:1.02!important;
  font-weight:900!important;
  letter-spacing:-.5px!important;
  text-shadow:0 1px 0 rgba(255,255,255,.95),0 2px 9px rgba(255,255,255,.55)!important;
}
.healthSubKicker{
  color:#173f61!important;
  font-size:9px!important;
  font-weight:800!important;
  opacity:.9!important;
  text-shadow:0 1px 0 rgba(255,255,255,.95)!important;
}
`;
document.head.appendChild(heroStyle);
window.HH_LIVE_BUILD="v1.25";
})();