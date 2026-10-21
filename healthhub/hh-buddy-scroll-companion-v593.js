/* HHSP1 v595 · Buddy in Records + Medications.
 * Reuses the approved Nutrition mascot. Audible, restrained mechanical
 * ticks occur only when a real user scrolls to a different card/chip.
 * Selection keeps the gentle click + tada. No visible sound toggle.
 * Never touches health records, medications or their cloud storage.
 */
(function(root){
'use strict';
var params;try{params=new URLSearchParams(root.location.search)}catch(_){return}
if(params.get('hhscrollselect')==='0'||params.get('hhpremium')==='0')return;
var ctx=null,gestureUntil=0,lastTickAt=0;
var reduce=false;
try{reduce=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(_){}
function make(tag,cl,txt){var x=document.createElement(tag);if(cl)x.className=cl;if(txt!=null)x.textContent=txt;return x}
function unlockAudio(){
 try{
  var AC=root.AudioContext||root.webkitAudioContext;
  if(!AC)return null;
  ctx=ctx||new AC();
  if(ctx.state==='suspended')ctx.resume().catch(function(){});
  return ctx;
 }catch(_){return null}
}
function note(freq,offset,duration,volume,type){
 if(!ctx)return;
 var t=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();
 osc.type=type||'sine';osc.frequency.setValueAtTime(freq,t+offset);
 gain.gain.setValueAtTime(.0001,t+offset);
 gain.gain.exponentialRampToValueAtTime(volume,t+offset+.006);
 gain.gain.exponentialRampToValueAtTime(.0001,t+offset+duration);
 osc.connect(gain);gain.connect(ctx.destination);
 osc.start(t+offset);osc.stop(t+offset+duration+.014);
}
function tick(){
 // A single brief, audible mechanical detent, NOT the tada melody.
 if(!ctx)return;
 try{
  note(950,0,.046,.075,'triangle');
  note(1430,.012,.034,.024,'sine');
 }catch(_){}
}
function tada(){
 if(!unlockAudio())return;
 try{
  tick();
  note(523.25,.08,.15,.027,'sine');
  note(659.25,.185,.16,.031,'sine');
  note(783.99,.29,.22,.034,'sine');
 }catch(_){}
}
function animate(kind,source){
 if(reduce||(kind==='records'&&source&&source.dataset&&source.dataset.hhKey==='omsz'))return;
 var section=document.getElementById('healthSubContent');
 var buddy=section&&section.querySelector('.hhRsmToolbar .hhBuddy593');
 if(!buddy)return;
 buddy.classList.remove('hhBuddy593Celebrate');
 // Restart only on deliberate selection, never on a continuous swipe.
 void buddy.offsetWidth;buddy.classList.add('hhBuddy593Celebrate');
}
function railIndex(rail,selector){
 var items=Array.from(rail.querySelectorAll(selector)).filter(function(el){return !el.hidden&&!el.disabled});
 if(!items.length)return -1;
 var left=rail.getBoundingClientRect().left,closest=-1,distance=Infinity;
 items.forEach(function(el,i){
  var delta=Math.abs(el.getBoundingClientRect().left-left);
  if(delta<distance){distance=delta;closest=i}
 });
 return closest;
}
function attachRail(rail,selector){
 if(!rail||rail.dataset.hhBuddyTickV595==='on')return;
 rail.dataset.hhBuddyTickV595='on';
 var last=railIndex(rail,selector);
 function begin(){
  // Unlock WebAudio under an actual touch/pointer/keyboard gesture on mobile.
  gestureUntil=Date.now()+4000;
  unlockAudio();
 }
 function finish(){gestureUntil=Date.now()+1000}
 rail.addEventListener('pointerdown',begin,{passive:true});
 rail.addEventListener('touchstart',begin,{passive:true});
 rail.addEventListener('pointerup',finish,{passive:true});
 rail.addEventListener('pointercancel',finish,{passive:true});
 rail.addEventListener('touchend',finish,{passive:true});
 rail.addEventListener('touchcancel',finish,{passive:true});
 rail.addEventListener('wheel',begin,{passive:true});
 rail.addEventListener('keydown',function(e){
  if(['ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(e.key))begin();
 });
 rail.addEventListener('scroll',function(){
  var current=railIndex(rail,selector);
  if(current<0)return;
  if(current===last)return;
  // Filtering, re-render and Dropbox updates are silent without a gesture.
  if(Date.now()>gestureUntil){last=current;return}
  last=current;
  var now=Date.now();
  if(now-lastTickAt<90)return;
  lastTickAt=now;
  tick();
 },{passive:true});
}
function decorate(){
 var content=document.getElementById('healthSubContent'),kind=root.healthSectionKind;
 if(!content||(kind!=='records'&&kind!=='medications'))return;
 var bar=content.querySelector('.hhRsmToolbar'),heading=bar&&bar.querySelector('.hhRsmHeading');
 if(!heading)return;
 // New carousel rails are recreated on render, so rebind only to each new rail.
 attachRail(content.querySelector('.hhRsmTrack'),'.hhRsmCard');
 attachRail(content.querySelector('.hhRsmChips'),'.hhRsmChip');
 // Medication filters stay compact: Buddy belongs to Records only.
 // Both medication rails keep their existing gesture/tick handlers.
 if(kind==='medications')return;
 if(heading.querySelector('.hhBuddy593'))return;
 var buddy=make('div','hhBuddy593');
 buddy.setAttribute('aria-label','Buddy, a HealthHub mókusa');
 var art=make('span','hhBuddy593Art');
 var img=make('img','',null);
 img.src='./nutrition/nutri-chipmunk-3d-v594.webp';img.alt='Buddy mókus';
 img.loading='lazy';img.decoding='async';art.appendChild(img);
 var symbol=make('span','hhBuddy593Mark',kind==='records'?'🔎':'💊');
 symbol.setAttribute('aria-hidden','true');art.appendChild(symbol);buddy.appendChild(art);
 buddy.appendChild(make('small','hhBuddy593Label','BUDDY'));
 var count=heading.querySelector('.hhRsmCount');
 if(count)heading.insertBefore(buddy,count);else heading.appendChild(buddy);
}
function selected(e){
 var p=e.target;if(!p||!p.closest)return;
 var content=p.closest('#healthSubContent');if(!content)return;
 var chip=p.closest('.hhRsmChip');
 if(chip){
  if(chip.disabled||chip.getAttribute('aria-pressed')==='true')return;
  tada();animate(root.healthSectionKind,chip);return;
 }
 if(p.closest('.hhRsmActions, .hhMed593Add'))return;
 var card=p.closest('.hhRsmCard');
 if(card){tada();animate(root.healthSectionKind,null)}
}
// Selection audio runs on the original user click, before card actions re-render.
document.addEventListener('click',selected,true);
var visual=document.createElement('link');visual.rel='stylesheet';
visual.href='./hh-buddy-scroll-companion-v593.css?v=757-medication-compact';
document.head.appendChild(visual);
var prev=root.renderHealthSection;
if(typeof prev==='function')root.renderHealthSection=async function(){
 var r=await prev.apply(this,arguments);decorate();return r;
};
root.HH_BUDDY_SCROLL_V593=Object.freeze({decorate:decorate,version:'595',railIndex:railIndex});
})(window);
