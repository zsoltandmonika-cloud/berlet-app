/* SHO shared refresh feedback v1: optional, fail-silent and independent.
 * Only actual document reloads, never navigation, polling or history restore.
 * No external audio, network access, permissions, UI or loading dependencies.
 */
(function(w,d){
 'use strict';
 try{
  if(w.__shoRefreshSoundV1)return;
  w.__shoRefreshSoundV1=true;
  const type=w.performance?.getEntriesByType?.('navigation')?.[0]?.type||
   (w.performance?.navigation?.type===1?'reload':'navigate');
  if(type!=='reload'||d.hidden||w.top!==w.self)return;
  if(new URLSearchParams(w.location.search).get('shoRefreshSound')==='off')return;
  try{if(w.localStorage?.getItem('hh-nutrition-PREVIEW-sound')==='off')return}
  catch(_){return} // unavailable preferences: prefer silence
  const Audio=w.AudioContext||w.webkitAudioContext;
  if(!Audio)return;
  let ctx=null,timer=null,closed=false;
  function close(){
   if(closed)return;
   closed=true;
   if(timer!==null)try{w.clearTimeout(timer)}catch(_){}
   try{w.removeEventListener('pagehide',close)}catch(_){}
   try{ctx?.close()?.catch(()=>{})}catch(_){}
  }
  try{
   ctx=new Audio();
   // Browser autoplay rules are authoritative. Never resume, wait for
   // another gesture or play a stale sound on a later interaction.
   if(ctx.state!=='running'){close();return}
   const duration=.18,n=Math.max(1,Math.floor(ctx.sampleRate*duration));
   const buffer=ctx.createBuffer(1,n,ctx.sampleRate),samples=buffer.getChannelData(0);
   let seed=31791;
   for(let i=0;i<n;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    samples[i]=(seed/2147483648)-1;
   }
   const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;
   source.buffer=buffer;filter.type='bandpass';filter.Q.value=.7;
   filter.frequency.setValueAtTime(2800,now);
   filter.frequency.exponentialRampToValueAtTime(850,now+duration);
   gain.gain.setValueAtTime(.0001,now);
   gain.gain.linearRampToValueAtTime(.045,now+.025);
   gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
   source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
   source.onended=close;
   w.addEventListener('pagehide',close,{once:true});
   timer=w.setTimeout(close,600);
   source.start(now);source.stop(now+duration);
  }catch(_){close()}
 }catch(_){/* Optional feedback must never interrupt the host page. */}
})(window,document);
