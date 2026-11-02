/* Nutrition v1137 · Only wires the two NEW utility tiles.
 * The original favorites and manual-entry buttons keep their existing handlers.
 * TADAAA sound fires only after the canonical diary confirms a saved record. */
(function(w,d){
 'use strict';
 if(w.HH_NUTRITION_QUICK_GLASS_V1137)return;
 const $=id=>d.getElementById(id);
 function notify(message){
  const status=$('hhManualToast1135');
  if(status){status.textContent=message;status.hidden=false;w.setTimeout(()=>{status.hidden=true},3000)}
 }
 function clickExisting(id){
  const target=$(id);
  if(!target){notify('Ez a Nutrition funkció még nem töltődött be. Frissítsd az oldalt.');return}
  target.click();
 }
 function diary(){
  const log=$('log');
  if(!log)return notify('A Napi napló még nem töltődött be.');
  const heading=$('hhDiaryEntryCount1134')?.closest('.row')||log;
  heading.scrollIntoView({behavior:w.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  if(!log.hasAttribute('tabindex'))log.setAttribute('tabindex','-1');
  try{log.focus({preventScroll:true})}catch(_){}
 }
 function tada(){
  try{
   if(w.localStorage?.getItem('hh-quick-wheel-sound-v1')==='off')return;
   const Audio=w.AudioContext||w.webkitAudioContext;
   if(!Audio)return;
   const ctx=new Audio();
   const start=ctx.currentTime+.014;
   // An original four-tone confirmation, low volume, shared sound preference.
   const notes=[[523.25,0,.14],[659.25,.125,.14],[783.99,.25,.17],[1046.5,.39,.30]];
   for(const [hz,offset,duration]of notes){
    const osc=ctx.createOscillator(),gain=ctx.createGain(),t=start+offset;
    osc.type='sine';osc.frequency.setValueAtTime(hz,t);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.linearRampToValueAtTime(.030,t+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+duration+.02);
   }
   w.setTimeout(()=>ctx.close().catch(()=>{}),1300);
  }catch(_){/* Sound is optional and never affects saving. */}
 }
 function init(){
  $('hhQuickOwnFoodsV1137')?.addEventListener('click',()=>clickExisting('newFood'));
  $('hhQuickDiaryV1137')?.addEventListener('click',diary);
  w.addEventListener('hh:nutrition:manual-saved',tada);
 }
 w.HH_NUTRITION_QUICK_GLASS_V1137={version:'1137',init};
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(window,document);
