(function(){
'use strict';
/* HealthHub v1.241 — Activity runner one-click profile switch. The top-left profile card is removed; only running Léna toggles the canonical active profile. */

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
  localStorage.setItem('hh-profile',next);
  if(typeof window.setProfile==='function')window.setProfile(next);
  try{window.dispatchEvent(new CustomEvent('healthhub:profile-changed',{detail:{profile:nextProfile,source:'activity-card'}}))}catch(e){}
  if(typeof window.hhRenderActivity191==='function')window.hhRenderActivity191(nextProfile);
  setTimeout(ensureProfileSwitch,30);
  return false;
}
function ensureProfileSwitch(){
  var hero=document.querySelector('#hhActivityPage191 .a191Hero');
  if(!hero)return;

  /* Remove every old Activity profile control. The runner herself is the switch. */
  hero.querySelectorAll('.a191HeroHits .prof,.a193ProfileSwitch').forEach(function(el){el.remove()});

  var hit=hero.querySelector('.a241RunnerProfileHit');
  if(!hit){
    hit=document.createElement('button');
    hit.type='button';
    hit.className='a241RunnerProfileHit';
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
  '.a191HeroHits .prof,.a193ProfileSwitch{display:none!important}'+
  '.a241RunnerProfileHit{position:absolute;left:35%;top:2%;width:31%;height:83%;z-index:12;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:45%}'+
  '.a241RunnerProfileHit:active{background:rgba(255,255,255,.05)}'+
  '@media(max-width:390px){.a241RunnerProfileHit{left:34%;width:32%;height:82%}}';
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

document.documentElement.dataset.healthhubActivityProfile='1.241';
window.HH_LIVE_BUILD='v1.241-activity-runner-profile-switch';
})();