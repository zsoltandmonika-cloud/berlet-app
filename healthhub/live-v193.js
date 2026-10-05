(function(){
'use strict';
/* HealthHub v1.242 — runner-only one-click profile switch; legacy baked profile faces are visually removed. */

function profileCode(){
 try{
  if(typeof cur!=='undefined'&&(cur==='m'||cur==='z'))return cur;
 }catch(e){}
 return localStorage.getItem('hh-profile')==='m'?'m':'z';
}
function profileName(){return profileCode()==='m'?'Mónika':'Zsolt'}
function otherName(){return profileCode()==='m'?'Zsolt':'Mónika'}

function currentAvatarSrc(){
  var a=document.getElementById('personHome')||document.getElementById('personH');
  return (a&&(a.currentSrc||a.src))||'';
}

function toggleActivityProfileOneClick(ev){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  var next=profileCode()==='m'?'z':'m';
  var nextProfile=next==='m'?'monika':'zsolt';

  /* Use the exact same canonical switch path that already works in HealthRadar. */
  if(typeof window.setProfile==='function')window.setProfile(next);
  else localStorage.setItem('hh-profile',next);

  setTimeout(function(){
    /* Defensive sync in case an older wrapper forgot to persist the base profile. */
    if(localStorage.getItem('hh-profile')!==next)localStorage.setItem('hh-profile',next);

    var finish=function(){
      if(typeof window.hhRenderActivity191==='function')window.hhRenderActivity191(nextProfile);
      ensureProfileSwitch();
    };

    if(typeof window.hhHealthCloudSync==='function'){
      Promise.resolve(window.hhHealthCloudSync(false)).catch(function(){}).finally(finish);
    }else finish();

    try{window.dispatchEvent(new CustomEvent('healthhub:profile-changed',{detail:{profile:nextProfile,source:'activity-runner'}}))}catch(e){}
  },60);
  return false;
}
function ensureProfileSwitch(){
  var hero=document.querySelector('#hhActivityPage191 .a191Hero');
  if(!hero)return;

  /* No profile buttons/cards. The runner is the only profile switch. */
  hero.querySelectorAll('.a191HeroHits .prof,.a193ProfileSwitch').forEach(function(el){el.remove()});

  var mask=hero.querySelector('.a242FaceMask');
  if(!mask){
    mask=document.createElement('div');
    mask.className='a242FaceMask';
    mask.setAttribute('aria-hidden','true');
    hero.appendChild(mask);
  }

  var hit=hero.querySelector('.a242RunnerProfileHit');
  if(!hit){
    hit=document.createElement('button');
    hit.type='button';
    hit.className='a242RunnerProfileHit';
    hit.addEventListener('click',toggleActivityProfileOneClick,{capture:true});
    hero.appendChild(hit);
  }
  hit.title='Profilváltás: '+otherName();
  hit.setAttribute('aria-label','Futó Léna. Egy kattintás: váltás '+otherName()+' profiljára.');
}
function style(){
  var old=document.getElementById('hh-v193-style');if(old)old.remove();
  var s=document.createElement('style');
  s.id='hh-v193-style';
  s.textContent=
  '.a191HeroHits .prof,.a193ProfileSwitch,.a241RunnerProfileHit{display:none!important}'+
  '.a242FaceMask{position:absolute;left:0;top:0;width:24.5%;height:31%;z-index:10;pointer-events:none;border:0;border-radius:0 0 28px 0;background:linear-gradient(135deg,rgba(227,240,218,.96) 0%,rgba(196,220,178,.88) 56%,rgba(170,207,154,.38) 100%);backdrop-filter:blur(28px) saturate(.82);-webkit-backdrop-filter:blur(28px) saturate(.82);box-shadow:10px 8px 24px rgba(74,105,64,.06)}'+
  '.a242RunnerProfileHit{position:absolute;left:32%;top:0;width:34%;height:88%;z-index:14;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:44%}'+
  '.a242RunnerProfileHit:active{background:rgba(255,255,255,.055)}'+
  '@media(max-width:390px){.a242FaceMask{width:25%;height:31%}.a242RunnerProfileHit{left:31%;width:35%;height:88%}}';
  document.head.appendChild(s);
}
style();
var obs=new MutationObserver(function(){clearTimeout(window.__hh193);window.__hh193=setTimeout(ensureProfileSwitch,20)});
function start(){
  var p=document.getElementById('hhActivityPage191');
  if(p)obs.observe(p,{childList:true,subtree:true});
  ensureProfileSwitch();
}
setTimeout(start,80);
setTimeout(ensureProfileSwitch,350);
setInterval(function(){
  var p=document.getElementById('hhActivityPage191');
  if(p&&p.classList.contains('on'))ensureProfileSwitch();
},1200);

var oldOpen=window.hhOpenActivity;
if(typeof oldOpen==='function'){
  window.hhOpenActivity=function(){
    var r=oldOpen.apply(this,arguments);
    setTimeout(ensureProfileSwitch,35);
    return r;
  };
}

document.documentElement.dataset.healthhubActivityProfile='1.242';
window.HH_LIVE_BUILD='v1.242-activity-runner-profile-reload';
})();