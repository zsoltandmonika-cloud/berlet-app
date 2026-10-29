/* Volán v999: locally synthesised three-note TADÁÁ search confirmation,
 * with click-unlocked WebAudio and an accessible persistable sound toggle.
 * Triggered only after a successful, non-empty verified GTFS search.
 * No external audio assets or polling. */
(function(w,d){'use strict';
const signal=d.getElementById('signal'),find=d.getElementById('find'),KEY='sh9-volan-tadaa-v999';
if(!signal||!find)return;
let enabled=true,ctx=null;
try{enabled=w.localStorage.getItem(KEY)!=='off'}catch(_){}
function sync(){
 signal.setAttribute('aria-pressed',String(enabled));
 signal.setAttribute('aria-label','Volán TADÁÁ szignál '+(enabled?'bekapcsolva':'kikapcsolva'));
 signal.title='Volán TADÁÁ '+(enabled?'BE · koppintásra kikapcsolás':'KI · koppintásra bekapcsolás');
 signal.textContent=enabled?'♫':'♪';
}
function unlock(){
 if(!enabled)return;
 try{
  const Audio=w.AudioContext||w.webkitAudioContext;if(!Audio)return;
  ctx=ctx||new Audio();
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
 }catch(_){}
}
function play(){
 if(!enabled||!ctx||ctx.state!=='running')return;
 try{
  const now=ctx.currentTime;
  [659.25,830.61,1046.5].forEach((hz,i)=>{
   const start=now+i*.105,o=ctx.createOscillator(),g=ctx.createGain();
   o.type='sine';o.frequency.value=hz;
   g.gain.setValueAtTime(.0001,start);
   g.gain.exponentialRampToValueAtTime(.09,start+.015);
   g.gain.exponentialRampToValueAtTime(.0001,start+.22);
   o.connect(g);g.connect(ctx.destination);
   o.start(start);o.stop(start+.23);
  });
 }catch(_){}
}
// The real ZIP search intercepts #find from its ancestor's capture listener.
// Document capture executes first, inside the actual user gesture, so the
// browser permits later playback after IndexedDB queries finish.
d.addEventListener('click',e=>{
 if(e.target===find||e.target.closest?.('#find'))unlock();
},true);
signal.addEventListener('click',()=>{
 enabled=!enabled;
 try{w.localStorage.setItem(KEY,enabled?'on':'off')}catch(_){}
 sync();
 if(enabled){unlock();play()}
});
w.addEventListener('sh9:volan-results-success',e=>{
 if(Number(e.detail?.count)>0)play();
});
sync();
})(window,document);
