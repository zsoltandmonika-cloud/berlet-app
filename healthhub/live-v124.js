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
window.HH_LIVE_BUILD="v1.24";
})();