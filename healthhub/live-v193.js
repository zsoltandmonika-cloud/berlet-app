(function(){
'use strict';
/* HealthHub v1.93 — Activity profile switch parity
   Uses the real current HealthHub avatar and the existing profile picker.
   The generated hero portrait block is fully covered, never used as identity. */

function profileCode(){return localStorage.getItem('hh-profile')==='m'?'m':'z'}
function profileName(){return profileCode()==='m'?'Mónika':'Zsolt'}
function otherName(){return profileCode()==='m'?'Zsolt':'Mónika'}

function currentAvatarSrc(){
  var a=document.getElementById('personHome')||document.getElementById('personH');
  return (a&&(a.currentSrc||a.src))||'';
}

function openProfilePicker(ev){
  if(ev){ev.preventDefault();ev.stopPropagation();}
  if(typeof window.openPicker==='function'){
    window.openPicker();
  }else{
    var next=profileCode()==='m'?'z':'m';
    if(typeof window.setProfile==='function')window.setProfile(next);
    else localStorage.setItem('hh-profile',next);
  }
  setTimeout(ensureProfileSwitch,80);
  setTimeout(ensureProfileSwitch,260);
}

function ensureProfileSwitch(){
  var hero=document.querySelector('#hhActivityPage191 .a191Hero');
  if(!hero)return;

  var oldHits=hero.querySelectorAll('.a191HeroHits .prof');
  oldHits.forEach(function(b){b.style.display='none';b.setAttribute('aria-hidden','true')});

  var b=hero.querySelector('.a193ProfileSwitch');
  if(!b){
    b=document.createElement('button');
    b.type='button';
    b.className='a193ProfileSwitch';
    b.addEventListener('click',openProfilePicker,{capture:true});
    hero.appendChild(b);
  }

  var src=currentAvatarSrc();
  var name=profileName();
  var code=profileCode();
  b.classList.toggle('monika',code==='m');
  b.classList.toggle('zsolt',code==='z');
  b.title='Profilváltás: '+otherName();
  b.setAttribute('aria-label',name+' profil. Kattintásra profilváltás.');

  var img=b.querySelector('img');
  if(!img){
    img=document.createElement('img');
    img.className='a193Avatar';
    b.appendChild(img);
  }
  if(src&&img.src!==src)img.src=src;
  img.alt=name;

  var txt=b.querySelector('.a193ProfileText');
  if(!txt){
    txt=document.createElement('span');
    txt.className='a193ProfileText';
    txt.innerHTML='<b></b><small>Profilváltás</small>';
    b.appendChild(txt);
  }
  txt.querySelector('b').textContent=name;

  var badge=b.querySelector('.a193SwitchBadge');
  if(!badge){
    badge=document.createElement('span');
    badge.className='a193SwitchBadge';
    badge.textContent='⇄';
    badge.setAttribute('aria-hidden','true');
    b.appendChild(badge);
  }
}

function style(){
  if(document.getElementById('hh-v193-style'))return;
  var s=document.createElement('style');
  s.id='hh-v193-style';
  s.textContent=
  '.a191HeroHits .prof{display:none!important}'+
  '.a193ProfileSwitch{position:absolute;left:1.7%;top:1.7%;z-index:12;width:31.5%;height:32.5%;border:1px solid rgba(255,255,255,.9);border-radius:17px;background:rgba(255,255,255,.97);box-shadow:0 5px 16px rgba(24,61,87,.16);padding:5px 7px;display:flex;align-items:center;gap:6px;color:#173d61;text-align:left;overflow:hidden;cursor:pointer;-webkit-tap-highlight-color:transparent}'+
  '.a193ProfileSwitch:active{transform:scale(.985)}'+
  '.a193Avatar{width:47px;height:47px;flex:0 0 47px;border-radius:50%;object-fit:cover;display:block;background:#eef5f8;border:3px solid #198fe6;box-shadow:0 2px 8px rgba(22,64,94,.13)}'+
  '.a193ProfileSwitch.monika .a193Avatar{border-color:#ff2f7f}.a193ProfileSwitch.zsolt .a193Avatar{border-color:#198fe6}'+
  '.a193ProfileText{display:block;min-width:0;line-height:1.05}.a193ProfileText b{display:block;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a193ProfileText small{display:block;margin-top:4px;font-size:6.7px;color:#6f8495;white-space:nowrap}'+
  '.a193SwitchBadge{position:absolute;right:5px;bottom:4px;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:#173d61;color:#fff;font-size:10px;font-weight:900;line-height:1;box-shadow:0 2px 5px rgba(20,55,80,.18)}'+
  '.a193ProfileSwitch.monika .a193SwitchBadge{background:#ff2f7f}'+
  '@media(max-width:390px){.a193ProfileSwitch{width:32.5%;padding:4px 5px;gap:4px}.a193Avatar{width:43px;height:43px;flex-basis:43px}.a193ProfileText b{font-size:9.5px}.a193ProfileText small{font-size:6px}.a193SwitchBadge{width:15px;height:15px;font-size:9px}}';
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

document.documentElement.dataset.healthhubActivityProfile='1.93';
window.HH_LIVE_BUILD='v1.93-activity-real-profile';
})();