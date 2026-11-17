/* SHO Smart Match Timeline · snap-click V1 (read-only enhancement).
 * One very quiet click AFTER a user scroll has settled on a NEW journey.
 * CSS handles the snapping. Never responds to auto-follow, page load,
 * timetable redraw or programmatic scroll. No network, storage, GPS or UI.
 */
(function(w,d){
 "use strict";
 if(!w||!d)return;
 const rail=d.getElementById("timeline");
 if(!rail)return;
 const MAX_DISTANCE=24;
 const SNAP_TOP=10;
 const REST_MS=210;
 const INPUT_WINDOW_MS=3300;
 const SOUND_GAP_MS=260;
 let ctx=null,armed=false,baseline=null,scrollSeen=false;
 let armedAt=0,lastClickAt=0,quietTimer=null;
 let latestGesture=null;
 const reduced=()=>Boolean(w.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
 const active=()=>d.body?.classList.contains("pinned")&&!d.hidden&&!reduced();
 function nearest(){
  const parent=rail.getBoundingClientRect();
  let result=null;
  rail.querySelectorAll(":scope > .timeline-row").forEach((el,i)=>{
   const dist=Math.abs(el.getBoundingClientRect().top-parent.top-SNAP_TOP);
   if(result===null||dist<result.dist)
    result={id:el.dataset.index??String(i),dist};
  });
  return result;
 }
 // Unlock Web Audio from a real touch/mouse/keyboard user gesture only.
 // Browser and device output/mute policies remain authoritative.
 function prepareAudio(){
  if(ctx||reduced())return;
  try{
   const Audio=w.AudioContext||w.webkitAudioContext;
   if(!Audio)return;
   ctx=new Audio();
   if(ctx.state==="suspended")ctx.resume().catch(()=>{});
  }catch(_){ctx=null}
 }
 function tick(){
  if(!ctx||ctx.state!=="running")return;
  try{
   const t=ctx.currentTime;
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type="triangle";
   osc.frequency.setValueAtTime(730,t);
   osc.frequency.exponentialRampToValueAtTime(340,t+.032);
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime(.016,t+.003);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.043);
   osc.connect(gain);gain.connect(ctx.destination);
   osc.start(t);osc.stop(t+.046);
   osc.onended=()=>{try{osc.disconnect();gain.disconnect()}catch(_){}};
  }catch(_){}
 }
 function arm(){
  if(!active())return;
  prepareAudio();
  const current=nearest();
  if(!armed)baseline=current?.id??null;
  armed=true;armedAt=Date.now();scrollSeen=false;
 }
 function finish(){
  if(!active()){armed=false;return}
  const current=nearest();
  if(!current)return;
  const now=Date.now();
  if(armed&&scrollSeen&&now-armedAt<INPUT_WINDOW_MS&&
     current.id!==baseline&&current.dist<=MAX_DISTANCE&&
     now-lastClickAt>=SOUND_GAP_MS){
   tick();lastClickAt=now;
  }
  baseline=current.id;
  armed=false;scrollSeen=false;
 }
 function onScroll(){
  if(!armed)return;scrollSeen=true;
  // scrollend is not available on all Samsung browser versions.
  // Debounce as a safe fallback; never click until aligned with a card.
  if(!("onscrollend" in rail)){
   w.clearTimeout(quietTimer);
   quietTimer=w.setTimeout(finish,REST_MS);
  }
 }
 rail.addEventListener("pointerdown",arm,{passive:true});
 rail.addEventListener("wheel",()=>{if(!armed)arm()},{passive:true});
 rail.addEventListener("keydown",e=>{
  if(["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "].includes(e.key)&&!armed)arm();
 },{passive:true});
 rail.addEventListener("scroll",onScroll,{passive:true});
 if("onscrollend" in rail)rail.addEventListener("scrollend",finish,{passive:true});
 d.addEventListener("visibilitychange",()=>{
  if(d.hidden){armed=false;scrollSeen=false;w.clearTimeout(quietTimer)}
 });
})(window,document);
