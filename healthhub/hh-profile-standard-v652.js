/* HealthHub v652 | One Nutrition-standard profile pill across the family app.
 * UI only. Canonical profile handlers remain authoritative; no patient data writes.
 * Sound matches the Nutrition tone('tap'): 900Hz sine, 40ms, 0.012 gain, 9ms vibration.
 */
(function(root){
'use strict';
var ID='hhProfileStandard652',STYLE='hhProfileStandardStyle652',pending=false,ctx=null;
function current(){
 try{return root.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}
}
function name(p){return p==='m'?'Mónika':'Zsolt'}
function nutrition(){return !!document.getElementById('profileBtn')}
function digital(){return !!document.getElementById('hhDigitalProfileDock')}
function style(){
 if(document.getElementById(STYLE))return;
 var s=document.createElement('style');s.id=STYLE;
 s.textContent=
 'html[data-hh-unified-profile="on"] :is(#hhProfileDock554,#hhSP299,#hhDigitalProfileDock,'+
 '#healthSubProfile.hhRecordsQuickProfile,.hhSleepProfileHit,.hhSleepProfileName,'+
 '#home .profileHit,#health .profileHit,#timeline .profileHit,'+
 '#hhLenaSmart299 .askProfile,#health .kpiCard .hhLiveHead small[role="button"]){display:none!important;pointer-events:none!important}'+
 'html body #hhOneRag500,html body #hhOneFallback501{display:none!important;visibility:hidden!important;pointer-events:none!important}'+
 'html:has(#haOv.on) body #hhOneRag500,html:has(#haOv.on) body #hhOneFallback501{display:flex!important;visibility:visible!important;pointer-events:auto!important}'+
 '.hhProfileStandardHost652{position:relative!important}'+
 '#'+ID+'{position:absolute!important;left:13px!important;bottom:12px!important;right:auto!important;top:auto!important;'+
 'min-height:34px!important;padding:6px 12px!important;color:#f7f9ff!important;'+
 'border:1px solid var(--hh-profile-pill-accent,#79bfff)!important;border-radius:999px!important;'+
 'background:rgba(6,20,44,.80)!important;-webkit-backdrop-filter:blur(10px)!important;backdrop-filter:blur(10px)!important;'+
 'box-shadow:0 2px 12px #0008!important;font:760 12px/1.2 Inter,Segoe UI,Roboto,system-ui,sans-serif!important;'+
 'white-space:nowrap!important;z-index:24!important;cursor:pointer!important;touch-action:manipulation!important;'+
 'display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;'+
 '-webkit-tap-highlight-color:transparent!important}'+
 'html[data-hh-profile-code="m"] #'+ID+',html[data-profile="monika"] #'+ID+'{--hh-profile-pill-accent:#f9a6d3}'+
 '#'+ID+':focus-visible{outline:3px solid #e6f4ff!important;outline-offset:3px!important}'+
 '.hhProfileStandardHost652.hhProfileNoHero652 > #'+ID+'{top:12px!important;bottom:auto!important}'+
 '@media(max-width:480px){#'+ID+'{min-height:30px!important;font-size:11px!important;padding:5px 9px!important}}';
 document.head.appendChild(s);
}
function tapSound(){
 try{
  if(root.localStorage.getItem('hh-nutrition-PREVIEW-sound')==='off')return;
  var C=root.AudioContext||root.webkitAudioContext;
  if(!C)return;
  if(!ctx)ctx=new C();
  if(ctx.state==='suspended')ctx.resume();
  var now=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine';o.frequency.value=900;
  g.gain.setValueAtTime(.0001,now);
  g.gain.exponentialRampToValueAtTime(.012,now+.012);
  g.gain.exponentialRampToValueAtTime(.0001,now+.04+.035);
  o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+.04+.045);
 }catch(_){}
 try{if(root.navigator&&typeof root.navigator.vibrate==='function')root.navigator.vibrate(9)}catch(_){}
}
function switchProfile(){
 var before=current(),next=before==='m'?'z':'m',handled=false;
 if(digital()){
  var legacy=document.getElementById('hhDigitalProfileDock');
  if(legacy&&typeof legacy.click==='function'){legacy.click();handled=true}
 }else if(typeof root.hhToggleProfileOneClick==='function'){
  root.hhToggleProfileOneClick();handled=true;
 }else if(typeof root.setProfile==='function'){
  root.setProfile(next);handled=true;
 }
 if(handled){tapSound();schedule()}
}
function activePage(){
 var pages=document.querySelectorAll('.page.on');
 return pages.length?pages[pages.length-1]:null;
}
function findHost(){
 if(digital()){
  var digitalHero=document.querySelector('.hero-art')||document.querySelector('.hero-stage');
  return digitalHero?{node:digitalHero,hero:true}:null;
 }
 var page=activePage();
 if(!page)return null;
 var selectors=['.hhSleepDoctorHero','.healthSubHero','.askHero .askHeroInner',
  '#heroHome','#heroH','#heroT','.hhActivityDoctorHero','.hhActivityHero',
  '.hhSleepHero','.hhLiveHero','.hero'];
 var hero=null;
 for(var i=0;i<selectors.length;i++){
  hero=page.querySelector(selectors[i]);
  if(hero)break;
 }
 return {node:hero||page,hero:!!hero};
}
function update(){
 if(nutrition())return; // The screenshot's original Nutrition switch owns its sound/behaviour.
 var found=findHost(),b=document.getElementById(ID);
 if(!found||!found.node){
  if(b)b.hidden=true;
  return;
 }
 var host=found.node;
 if(!b){
  b=document.createElement('button');b.type='button';b.id=ID;
  b.addEventListener('click',switchProfile);
 }
 if(b.parentNode!==host)host.appendChild(b);
 host.classList.add('hhProfileStandardHost652');
 host.classList.toggle('hhProfileNoHero652',!found.hero);
 b.hidden=false;
 var p=current(),next=p==='m'?'z':'m';
 document.documentElement.dataset.hhProfileCode=p;
 b.textContent=name(p)+' ⇄';
 b.title='Profilváltás: '+name(next);
 b.setAttribute('aria-label','Egyérintéses profilváltás '+name(next)+' profiljára');
}
function schedule(){
 if(pending)return;
 pending=true;
 (root.requestAnimationFrame||function(f){root.setTimeout(f,30)})(function(){pending=false;update()});
}
function mount(){
 if(nutrition())return;
 if(document.documentElement.dataset.hhUnifiedProfile==='on')return;
 document.documentElement.dataset.hhUnifiedProfile='on';
 style();update();
 var observer=new MutationObserver(function(changes){
  // Only structural/class changes can alter the active page or hero.
  if(changes.some(function(c){return c.type==='childList'||(c.type==='attributes'&&c.attributeName==='class')}))schedule();
 });
 observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 root.addEventListener('healthhub:profile-changed',schedule);
 root.addEventListener('storage',function(e){if(e.key==='hh-profile')schedule()});
 root.addEventListener('pageshow',schedule);
 root.addEventListener('resize',schedule);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
root.HH_PROFILE_STANDARD_V652={refresh:schedule,version:'652'};
})(window);
