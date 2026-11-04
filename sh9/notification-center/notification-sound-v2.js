/* SHO notification sound v2 · optional, quiet and foreground-only.
 * Audio starts only after user activation; NEVER when rehydrating existing notifications.
 * Background push requires a separate server/service-worker integration. */
(function(w,d){
'use strict';
if(w.SHO_NOTIFICATION_SOUND_V2)return;
let ctx=null,unlocked=false,lastPlayed=0;
const core=()=>w.SHO_NOTIFICATION_CORE_V1;
const visible=()=>d.visibilityState!=='hidden';
function unlock(){
 if(!visible())return Promise.resolve(false);
 const Audio=w.AudioContext||w.webkitAudioContext;
 if(!Audio)return Promise.resolve(false);
 try{
  if(!ctx)ctx=new Audio();
  unlocked=true;
  return ctx.state==='suspended'&&typeof ctx.resume==='function'?
   Promise.resolve(ctx.resume()).then(()=>true,()=>false):Promise.resolve(true);
 }catch(_){return Promise.resolve(false)}
}
function bell(){
 if(!unlocked||!visible()||!ctx||ctx.state!=='running')return false;
 const now=Date.now();
 if(now-lastPlayed<600)return false; // Rapid burst: at most one tiny ding.
 try{
  const t=ctx.currentTime;
  const tone=(freq,offset,volume,duration)=>{
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type='sine';
   osc.frequency.setValueAtTime(freq,t+offset);
   osc.frequency.exponentialRampToValueAtTime(freq*.988,t+offset+duration);
   gain.gain.setValueAtTime(.0001,t+offset);
   gain.gain.exponentialRampToValueAtTime(volume,t+offset+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,t+offset+duration);
   osc.connect(gain);gain.connect(ctx.destination);
   osc.start(t+offset);osc.stop(t+offset+duration+.006);
  };
  tone(988,0,.012,.16);
  tone(1318,.055,.005,.22);
  lastPlayed=now;
  return true;
 }catch(_){return false}
}
function receive(event){
 const item=event?.detail,api=core();
 if(!item||!api||item.profile!==api.profile()||!api.soundEnabled(item.profile)||!visible())return;
 bell();
}
d.addEventListener('pointerdown',()=>{void unlock()},{capture:true,passive:true});
d.addEventListener('keydown',()=>{void unlock()},{capture:true,passive:true});
w.addEventListener('sho:notification-received',receive);
w.SHO_NOTIFICATION_SOUND_V2=Object.freeze({
 version:2,
 preview:async()=>{if(!visible())return false;const ok=await unlock();return ok&&bell()}
});
})(window,document);
