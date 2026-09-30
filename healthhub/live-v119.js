(function(){
"use strict";
/* HealthHub v1.19 home microcopy polish:
   - remove profile-name chevron glyph
   - full Hungarian weekday on hero date
   - Daily Headline without 07:00 suffix */
function hhPolishHome(){
  ["nameHome","nameH","nameT"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.textContent=(el.textContent||"").replace(/[⌄∨v]\s*$/,"").trim();
  });

  const d=new Date();
  const full=new Intl.DateTimeFormat("hu-HU",{
    month:"long",
    day:"numeric",
    weekday:"long"
  }).format(d);
  ["dateHome","dateH","dateT"].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.textContent=full+" · Budapest";
  });

  const headline=document.querySelector("#home .newsStrip b");
  if(headline) headline.textContent="Daily Headline";
}

hhPolishHome();

if(typeof window.setProfile==="function"){
  const prevSetProfile=window.setProfile;
  window.setProfile=function(){
    const r=prevSetProfile.apply(this,arguments);
    setTimeout(hhPolishHome,0);
    return r;
  };
}

if(typeof window.dateFmt==="function"){
  window.dateFmt=function(){ hhPolishHome(); };
}

const obs=new MutationObserver(()=>hhPolishHome());
["nameHome","nameH","nameT"].forEach(id=>{
  const el=document.getElementById(id);
  if(el) obs.observe(el,{childList:true,characterData:true,subtree:true});
});

window.HH_LIVE_BUILD="v1.19";
})();