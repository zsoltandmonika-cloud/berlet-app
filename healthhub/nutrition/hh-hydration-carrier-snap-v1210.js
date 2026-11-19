/* HealthHub Nutrition v1210 · outer hydration carrier: viewport snap + soft click.
 * ONLY scroll the page. Never resize, transform or reflow the approved artwork.
 * No hooks into hydration, diary, RAG, food or Buddy handlers.
 */
(function(root){
 'use strict';
 function start(){
  const card=document.querySelector('#balanceCard > .hh-water.glass');
  if(!card)return;
  const SOUND_KEY='hh-nutrition-PREVIEW-sound';
  const MOBILE_LIMIT=700;
  const BOTTOM_DOCK_PX=72;
  const SETTLE_MS=185;
  let audio=null,armed=false,moved=false,snapping=false,latched=false;
  let gestureY=root.scrollY||0,snapY=0,settleTimer=0,snapTimer=0;

  function isMobile(){
   return root.innerWidth<=MOBILE_LIMIT;
  }
  function soundEnabled(){
   try{return root.localStorage.getItem(SOUND_KEY)!=='off'}catch(_){return false}
  }
  function primeSound(){
   // A sound context is only initialized from a genuine touch/pointer/keyboard
   // gesture. The phone's and Nutrition's silence preferences are respected.
   if(!isMobile()||!soundEnabled())return;
   try{
    const C=root.AudioContext||root.webkitAudioContext;
    if(!C)return;
    if(!audio)audio=new C();
    if(audio.state==='suspended'){
     const activation=audio.resume();
     if(activation&&activation.catch)activation.catch(function(){});
    }
   }catch(_){}
  }
  function clickOnce(){
   if(!soundEnabled()||!audio||audio.state!=='running')return;
   try{
    const now=audio.currentTime;
    const osc=audio.createOscillator(),gain=audio.createGain();
    osc.type='triangle';
    osc.frequency.setValueAtTime(1160,now);
    osc.frequency.exponentialRampToValueAtTime(620,now+.065);
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.019,now+.005);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.078);
    osc.connect(gain);gain.connect(audio.destination);
    osc.start(now);osc.stop(now+.084);
   }catch(_){}
  }
  function eligible(){
   if(!isMobile()||document.hidden)return false;
   if(document.querySelector('dialog[open]'))return false;
   const focus=document.activeElement;
   if(focus&&/^(INPUT|TEXTAREA|SELECT)$/.test(focus.tagName||''))return false;
   return true;
  }
  function measure(){
   if(!eligible())return null;
   const rect=card.getBoundingClientRect();
   // Dock is deliberately outside the artwork; reserve its visible area.
   const viewHeight=root.innerHeight;
   const usable=viewHeight-BOTTOM_DOCK_PX-Math.max(0,Number.parseFloat(
    root.getComputedStyle(document.documentElement).getPropertyValue('--sat-bottom')||'0'
   )||0);
   if(!Number.isFinite(usable)||usable<380||rect.height>usable-18)return null;
   const center=usable/2;
   const delta=rect.top+rect.height/2-center;
   const current=root.scrollY||0;
   const scrollElement=document.scrollingElement||document.documentElement;
   const max=Math.max(0,scrollElement.scrollHeight-viewHeight);
   const target=Math.max(0,Math.min(max,current+delta));
   if(Math.abs((target-current)-delta)>10)return null; // cannot genuinely center
   return {delta,target};
  }
  function stopSnap(){
   snapping=false;
   root.clearTimeout(snapTimer);snapTimer=0;
  }
  function finishSnap(){
   if(!snapping)return;
   const position=measure();
   const aligned=!!position&&Math.abs(position.delta)<=7&&
    Math.abs((root.scrollY||0)-snapY)<=10;
   stopSnap();
   if(aligned&&!latched){
    latched=true;
    clickOnce();
   }
  }
  function maybeSnap(){
   if(!armed||!moved||snapping)return;
   armed=false;moved=false;
   const position=measure();
   if(!position)return;
   if(Math.abs(position.delta)>Math.min(165,root.innerHeight*.23))return;
   if(Math.abs(position.delta)<=4){
    if(!latched){latched=true;clickOnce();}
    return;
   }
   snapping=true;snapY=position.target;
   const reduceMotion=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);
   try{
    root.scrollTo({top:snapY,behavior:reduceMotion?'auto':'smooth'});
   }catch(_){
    stopSnap();return;
   }
   // scrollend support varies between Android WebViews. Scroll idleness is
   // the primary success signal; this timeout only avoids a stuck state.
   snapTimer=root.setTimeout(finishSnap,1000);
  }
  function onScroll(){
   const current=root.scrollY||0;
   if(Math.abs(current-gestureY)>=9)moved=true;
   if(latched){
    const position=measure();
    if(!position||Math.abs(position.delta)>185)latched=false;
   }
   if(!armed&&!snapping)return;
   root.clearTimeout(settleTimer);
   settleTimer=root.setTimeout(function(){
    if(snapping)finishSnap();
    else maybeSnap();
   },SETTLE_MS);
  }
  function cancelSnap(){
   root.clearTimeout(settleTimer);settleTimer=0;
   if(snapping)stopSnap(); // new human gesture overrides animation + click
  }
  function arm(){
   if(!isMobile())return;
   cancelSnap();
   armed=true;moved=false;gestureY=root.scrollY||0;
   primeSound();
  }
  document.addEventListener('pointerdown',arm,{passive:true});
  // On some Samsung WebViews touchstart precedes or replaces pointerdown.
  document.addEventListener('touchstart',arm,{passive:true});
  root.addEventListener('wheel',arm,{passive:true});
  document.addEventListener('keydown',function(e){
   if(['ArrowDown','ArrowUp','PageDown','PageUp',' ','Home','End'].includes(e.key))arm();
  });
  root.addEventListener('scroll',onScroll,{passive:true});
  root.addEventListener('scrollend',function(){
   root.clearTimeout(settleTimer);
   if(snapping)finishSnap();
   else maybeSnap();
  },{passive:true});
  root.addEventListener('resize',function(){cancelSnap();armed=false;moved=false});
  document.addEventListener('visibilitychange',function(){
   if(document.hidden){cancelSnap();armed=false;moved=false}
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})(window);
