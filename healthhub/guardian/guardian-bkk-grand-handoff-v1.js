/* SH9 BKK V3 → Family Guard planner one-shot local handoff. No background data requests or polling. */
(function(){
'use strict';
if(window.location.hash!=='#hhSmartHubDestinationV802')return;
const KEY='sh9-bkk-grand-planner-handoff-v1';
let raw=null;
try{raw=sessionStorage.getItem(KEY);if(raw)sessionStorage.removeItem(KEY)}catch(_){return}
if(!raw)return;
let d;
try{d=JSON.parse(raw)}catch(_){return}
if(!d||d.source!=='sh9-bkk-grand-v3'||typeof d.from!=='string'||typeof d.to!=='string'||!Number.isFinite(d.created)||Date.now()-d.created>600000||d.created-Date.now()>60000)return;
function install(){
 const from=document.getElementById('hhSmartHubFromV806'),to=document.getElementById('hhSmartHubToV806');
 if(!from||!to)return;
 from.value=d.from.slice(0,120);to.value=d.to.slice(0,120);
 const mode=['now','depart','arrive'].includes(d.mode)?d.mode:'now';
 const modeId={now:'hhPlannerNowV939',depart:'hhPlannerDepartV939',arrive:'hhPlannerArriveV939'}[mode];
 document.getElementById(modeId)?.click();
 if(mode!=='now'&&/^\d{4}-\d\d-\d\d$/.test(d.date)&&/^\d\d:\d\d$/.test(d.time)){
  const input=document.getElementById('hhPlannerDateV939');
  if(input){input.value=d.date+'T'+d.time;input.dispatchEvent(new Event('change',{bubbles:true}))}
 }
 const status=document.getElementById('hhSmartHubDestinationStatusV802');
 if(status)status.textContent='✓ BKK Grand útvonal átvéve. Válaszd ki a megállót vagy címet a találatokból, majd indítsd a keresést.';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
