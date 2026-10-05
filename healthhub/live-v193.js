(function(){
'use strict';
/* HealthHub v1.243 — runner-only canonical profile switch; baked faces patched from the hero background. */

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
  var current=profileCode();
  var next=current==='m'?'z':'m';
  var nextProfile=next==='m'?'monika':'zsolt';

  /* Exact HealthHub base profile path: setProfile -> cur + localStorage + apply(). */
  localStorage.setItem('hh-profile',next);
  if(typeof window.setProfile==='function')window.setProfile(next);

  setTimeout(function(){
    /* Some legacy wrappers repaint asynchronously; force the canonical value once more. */
    localStorage.setItem('hh-profile',next);
    if(typeof window.hhRenderActivity191==='function')window.hhRenderActivity191(nextProfile);
    ensureProfileSwitch();
  },45);
  return false;
}
function ensureProfileSwitch(){
  var hero=document.querySelector('#hhActivityPage191 .a191Hero');
  if(!hero)return;

  /* Remove every legacy profile control. */
  hero.querySelectorAll('.a191HeroHits .prof,.a193ProfileSwitch,.a241RunnerProfileHit,.a242FaceMask,.a242RunnerProfileHit').forEach(function(el){el.remove()});

  /* The approved v192 hero has the old two faces baked into the bitmap.
     Patch that small source area with a neighbouring tree segment from the same hero image. */
  var patch=hero.querySelector('.a243HeroPatch');
  if(!patch){
    patch=document.createElement('div');
    patch.className='a243HeroPatch';
    var img=hero.querySelector('img');
    var src=img&&(img.currentSrc||img.src);
    if(src)patch.style.backgroundImage='url("'+src.replace(/"/g,'%22')+'")';
    patch.setAttribute('aria-hidden','true');
    hero.appendChild(patch);
  }

  var hit=hero.querySelector('.a243RunnerProfileHit');
  if(!hit){
    hit=document.createElement('button');
    hit.type='button';
    hit.className='a243RunnerProfileHit';
    hit.onclick=toggleActivityProfileOneClick;
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
  '.a191HeroHits .prof,.a193ProfileSwitch,.a241RunnerProfileHit,.a242FaceMask,.a242RunnerProfileHit{display:none!important}'+
  '.a243HeroPatch{position:absolute;left:0;top:0;width:24.5%;height:31%;z-index:10;pointer-events:none;background-repeat:no-repeat;background-size:416.7% 322.6%;background-position:26.3% 0;border:0}'+
  '.a243RunnerProfileHit{position:absolute;left:25%;top:0;width:43%;height:91%;z-index:15;border:0;background:transparent;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;border-radius:42%}'+
  '.a243RunnerProfileHit:active{background:rgba(255,255,255,.045)}'+
  '@media(max-width:390px){.a243HeroPatch{width:25%;height:31%}.a243RunnerProfileHit{left:24%;width:45%;height:91%}}';
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

document.documentElement.dataset.healthhubActivityProfile='1.243';
window.HH_LIVE_BUILD='v1.243-activity-runner-canonical-switch';
})();