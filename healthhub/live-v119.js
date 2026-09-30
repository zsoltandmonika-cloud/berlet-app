(function(){
"use strict";
/* HealthHub v1.21 UI fixes:
   - idempotent home microcopy polish (no MutationObserver loop)
   - reliable profile switching on picker buttons
   - full Hungarian weekday
   - Daily Headline labels */

function setTextIfChanged(el, value){
  if(el && el.textContent !== value) el.textContent = value;
}

function hhPolishHome(){
  ["nameHome","nameH","nameT"].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    const clean=(el.textContent||"").replace(/[⌄∨v]\s*$/,"").trim();
    setTextIfChanged(el,clean);
  });

  const d=new Date();
  const full=new Intl.DateTimeFormat("hu-HU",{
    month:"long",
    day:"numeric",
    weekday:"long"
  }).format(d);
  ["dateHome","dateH","dateT"].forEach(id=>{
    setTextIfChanged(document.getElementById(id),full+" · Budapest");
  });

  setTextIfChanged(document.querySelector("#home .newsStrip b"),"Daily Headline");
  setTextIfChanged(document.querySelector("#briefing .detailTop b"),"Daily Headline");
  setTextIfChanged(document.querySelector("#briefing .detailTitle h1"),"Daily Headline");
}

function hhSwitchProfile(profile){
  if(profile!=="z" && profile!=="m") return;
  try{
    window.cur=profile;
    if(typeof cur!=="undefined") cur=profile;
  }catch(_){}
  localStorage.setItem("hh-profile",profile);
  if(typeof window.apply==="function") window.apply();
  else if(typeof apply==="function") apply();
  const overlay=document.getElementById("overlay");
  if(overlay) overlay.classList.remove("on");
  setTimeout(hhPolishHome,0);
}

window.hhSwitchProfile=hhSwitchProfile;

// Keep the original app API working, but remove the fragile wrapper chain.
window.setProfile=hhSwitchProfile;

function bindProfilePicker(){
  const overlay=document.getElementById("overlay");
  if(!overlay) return;

  const choices=overlay.querySelectorAll(".choice");
  choices.forEach(btn=>{
    const label=(btn.textContent||"").toLowerCase();
    const profile=label.includes("mónika")||label.includes("monika") ? "m" : "z";
    btn.onclick=function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      hhSwitchProfile(profile);
    };
    btn.style.pointerEvents="auto";
    btn.style.cursor="pointer";
  });

  overlay.style.pointerEvents="auto";
  const picker=overlay.querySelector(".picker");
  if(picker) picker.style.pointerEvents="auto";
}

hhPolishHome();
bindProfilePicker();

if(typeof window.dateFmt==="function"){
  const originalDateFmt=window.dateFmt;
  window.dateFmt=function(){
    try{ originalDateFmt.apply(this,arguments); }catch(_){}
    hhPolishHome();
  };
}

// Observe only the overlay being rebuilt; do not observe name text mutations.
const bodyObs=new MutationObserver(()=>bindProfilePicker());
bodyObs.observe(document.body,{childList:true,subtree:true});

window.HH_LIVE_BUILD="v1.21";
})();