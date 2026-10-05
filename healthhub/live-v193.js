(function(){
'use strict';
/* HealthHub v1.244 — runner tap directly calls hh191Profile; baked faces removed with same-image canvas tree patch. */

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

  /* Use Activity's own canonical switch + explicit profile render. */
  if(typeof window.hh191Profile==='function'){
    window.hh191Profile(next);
  }else{
    var profile=next==='m'?'monika':'zsolt';
    localStorage.setItem('hh-profile',next);
    if(typeof window.setProfile==='function')window.setProfile(next);
    if(typeof window.hhRenderActivity191==='function')window.hhRenderActivity191(profile);
  }
  setTimeout(ensureProfileSwitch,40);
  return false;
}
function ensureProfileSwitch(){
  var hero=document.querySelector('#hhActivityPage191 .a191Hero');
  if(!hero)return;

  /* Remove all legacy profile buttons and previous visual patches. */
  hero.querySelectorAll('.a191HeroHits .prof,.a193ProfileSwitch,.a241RunnerProfileHit,.a242FaceMask,.a242RunnerProfileHit,.a243HeroPatch,.a243RunnerProfileHit').forEach(function(el){el.remove()});

  /* Cover baked profile faces with a clean tree sample taken from the same hero bitmap. */
  var canvas=hero.querySelector('.a244HeroCanvasPatch');
  if(!canvas){
    canvas=document.createElement('canvas');
    canvas.className='a244HeroCanvasPatch';
    canvas.setAttribute('aria-hidden','true');
    hero.appendChild(canvas);
  }
  function paintPatch(){
    var img=hero.querySelector('img');if(!img||!img.naturalWidth||!img.naturalHeight)return;
    var w=320,h=120;canvas.width=w;canvas.height=h;
    var ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.clearRect(0,0,w,h);
    var sx=img.naturalWidth*.235,sy=0,sw=img.naturalWidth*.105,sh=img.naturalHeight*.31;
    ctx.drawImage(img,sx,sy,sw,sh,0,0,w/2,h);
    ctx.save();ctx.translate(w,0);ctx.scale(-1,1);
    ctx.drawImage(img,sx,sy,sw,sh,0,0,w/2,h);
    ctx.restore();
  }
  var heroImg=hero.querySelector('img');
  if(heroImg){
    if(heroImg.complete)paintPatch();
    else heroImg.addEventListener('load',paintPatch,{once:true});
  }

  /* Capture taps directly on the runner area. No separate visible control. */
  if(hero.dataset.a244RunnerBound!=='1'){
    hero.dataset.a244RunnerBound='1';
    hero.addEventListener('pointerup',function(ev){
      var r=hero.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width,y=(ev.clientY-r.top)/r.height;
      if(x>=.25&&x<=.69&&y>=0&&y<=.88){
        toggleActivityProfileOneClick(ev);
      }
    },true);
  }
  hero.title='Futó Léna: 1 kattintásos profilváltás';
}
function style(){
  var old=document.getElementById('hh-v193-style');if(old)old.remove();
  var s=document.createElement('style');
  s.id='hh-v193-style';
  s.textContent=
  '.a191HeroHits .prof,.a193ProfileSwitch,.a241RunnerProfileHit,.a242FaceMask,.a242RunnerProfileHit,.a243HeroPatch,.a243RunnerProfileHit{display:none!important}'+
  '.a244HeroCanvasPatch{position:absolute;left:0;top:0;width:24.5%;height:31%;z-index:10;pointer-events:none;display:block}'+
  '#hhActivityPage191 .a191Hero{cursor:pointer}';
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

document.documentElement.dataset.healthhubActivityProfile='1.244';
window.HH_LIVE_BUILD='v1.244-activity-runner-direct';
})();