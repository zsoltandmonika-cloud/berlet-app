/* HHSP1 v593 · Buddy companion: visual mascot + user-gesture WebAudio clicks/tada.
 * Reuses the APPROVED Nutrition Buddy illustration. Does not read clinical data.
 * No OMSZ-specific animations, no data writes except sound preference.
 */
(function(root){
'use strict';
var params;try{params=new URLSearchParams(root.location.search)}catch(_){return}
if(params.get('hhscrollselect')!=='1'||params.get('hhpremium')==='0')return;
var prefs='hh-premium-select-sound-v593',ctx=null,busyUntil=0;
var reduce=false;
try{reduce=!!(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(_){}
function enabled(){try{return root.localStorage.getItem(prefs)!=='off'}catch(_){return true}}
function make(tag,cl,txt){var x=document.createElement(tag);if(cl)x.className=cl;if(txt!=null)x.textContent=txt;return x}
function play(){
 if(!enabled())return;
 var now=Date.now();if(now-busyUntil<180)return;busyUntil=now;
 try{
  var AC=root.AudioContext||root.webkitAudioContext;if(!AC)return;
  ctx=ctx||new AC();if(ctx.state==='suspended')ctx.resume().catch(function(){});
  var t=ctx.currentTime;
  function note(freq,offset,duration,volume,type){
   var o=ctx.createOscillator(),g=ctx.createGain();
   o.type=type||'sine';o.frequency.setValueAtTime(freq,t+offset);
   g.gain.setValueAtTime(.0001,t+offset);
   g.gain.exponentialRampToValueAtTime(volume,t+offset+.009);
   g.gain.exponentialRampToValueAtTime(.0001,t+offset+duration);
   o.connect(g);g.connect(ctx.destination);o.start(t+offset);o.stop(t+offset+duration+.015);
  }
  // Distinct delicate wheel click, followed by the short TADA chord.
  note(740,0,.055,.026,'triangle');
  note(523.25,.087,.15,.022,'sine');
  note(659.25,.19,.155,.025,'sine');
  note(783.99,.28,.21,.027,'sine');
 }catch(_){}
}
function animate(kind,source){
 if(reduce||kind==='records'&&source&&source.dataset&&source.dataset.hhKey==='omsz')return;
 var section=document.getElementById('healthSubContent');
 var buddy=section&&section.querySelector('.hhRsmToolbar .hhBuddy593');
 if(!buddy)return;
 buddy.classList.remove('hhBuddy593Celebrate');
 // Restart only upon explicit item selection, not continuous wheel scrolling.
 void buddy.offsetWidth;buddy.classList.add('hhBuddy593Celebrate');
}
function decorate(){
 var content=document.getElementById('healthSubContent'),kind=root.healthSectionKind;
 if(!content||(kind!=='records'&&kind!=='medications'))return;
 var bar=content.querySelector('.hhRsmToolbar'),heading=bar&&bar.querySelector('.hhRsmHeading');
 if(!heading||heading.querySelector('.hhBuddy593'))return;
 var buddy=make('div','hhBuddy593');
 buddy.setAttribute('aria-label','Buddy, a HealthHub mókusa');
 var art=make('span','hhBuddy593Art');
 var img=make('img','',null);
 img.src='./nutrition/nutri-chipmunk-3d-v594.webp';img.alt='Buddy mókus';
 img.loading='lazy';img.decoding='async';art.appendChild(img);
 var symbol=make('span','hhBuddy593Mark',kind==='records'?'🔎':'💊');
 symbol.setAttribute('aria-hidden','true');art.appendChild(symbol);buddy.appendChild(art);
 buddy.appendChild(make('small','hhBuddy593Label','BUDDY'));
 var sound=make('button','hhBuddy593Sound');
 sound.type='button';sound.title='Hanghatás be- és kikapcsolása';
 function update(){sound.textContent=enabled()?'♫':'🔇';sound.setAttribute('aria-pressed',String(enabled()));sound.setAttribute('aria-label',enabled()?'Választóhang némítása':'Választóhang bekapcsolása')}
 sound.addEventListener('click',function(e){
  e.preventDefault();e.stopPropagation();
  try{root.localStorage.setItem(prefs,enabled()?'off':'on')}catch(_){}
  update();if(enabled())play();
 });
 update();buddy.appendChild(sound);
 var count=heading.querySelector('.hhRsmCount');
 if(count)heading.insertBefore(buddy,count);else heading.appendChild(buddy);
}
function selected(e){
 var p=e.target;if(!p||!p.closest)return;
 var content=p.closest('#healthSubContent');if(!content)return;
 var chip=p.closest('.hhRsmChip');
 if(chip){
  if(chip.disabled||chip.getAttribute('aria-pressed')==='true')return;
  play();animate(root.healthSectionKind,chip);return;
 }
 var action=p.closest('.hhRsmActions, .hhBuddy593Sound, .hhMed593Add');
 if(action)return;
 var card=p.closest('.hhRsmCard');
 if(card){play();animate(root.healthSectionKind,null)}
}
// Capture the original gesture. Audio is scheduled synchronously before
// the native carousel re-render; it must never play on non-user sync events.
document.addEventListener('click',selected,true);
var visual=document.createElement('link');visual.rel='stylesheet';visual.href='./hh-buddy-scroll-companion-v593.css?v=593-buddy-audio';document.head.appendChild(visual);
var prev=root.renderHealthSection;
if(typeof prev==='function')root.renderHealthSection=async function(){
 var r=await prev.apply(this,arguments);decorate();return r;
};
root.HH_BUDDY_SCROLL_V593=Object.freeze({enabled:enabled,decorate:decorate,version:'593'});
})(window);
