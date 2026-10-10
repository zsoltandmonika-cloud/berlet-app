(function(){
'use strict';
/* v340: one compact Ask Léna composer, profile-coloured research progress,
   completion melody + vibration. Existing model, identity checks and mic remain unchanged. */
var audio=null,alertPlayed=false;
function el(id){return document.getElementById(id)}
function currentProfile(){return localStorage.getItem('hh-profile')==='m'?'monika':'zsolt'}
function style(){
 if(el('hhLenaUI340Css'))return;
 var s=document.createElement('style');s.id='hhLenaUI340Css';
 s.textContent=[
 '#hhLenaSmart299{--lena-ui:#2f78b7;--lena-ui-dark:#195e93;--lena-ui-soft:#edf6ff;--lena-ui-border:#b6d7e8}',
 '#hhLenaSmart299[data-profile="monika"]{--lena-ui:#d95690;--lena-ui-dark:#b43c74;--lena-ui-soft:#fff1f7;--lena-ui-border:#eab9d2}',
 '#hhLenaSmart299 .hhLenaLegacyActions340{display:none!important}',
 '#hhLenaSmart299 .askCard:has(#hhLenaComposer340)>h2{display:block!important;color:var(--lena-ui-dark)!important;margin:1px 4px 12px!important;font-size:18px!important;line-height:1.35!important}',
 '#hhLenaSmart299 .askCard:has(#hhLenaComposer340){padding:14px!important}',
 '#hhLenaSmart299 #hhLenaComposer340{position:relative;box-sizing:border-box;width:100%;height:284px;min-height:284px;display:flex;flex-direction:column;border:2px solid var(--lena-ui-border);border-radius:28px;background:#fff;box-shadow:0 6px 24px rgba(52,88,117,.06);padding:15px 14px 10px;transition:border-color .18s,box-shadow .18s}',
 '#hhLenaSmart299 #hhLenaComposer340:focus-within{border-color:var(--lena-ui);box-shadow:0 0 0 3px color-mix(in srgb,var(--lena-ui) 12%,transparent)}',
 '#hhLenaSmart299 #hhLenaComposer340 .hhLenaInput340{position:relative;flex:1;min-height:45px}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhSQ299{display:block!important;box-sizing:border-box!important;width:100%!important;height:160px!important;min-height:160px!important;max-height:190px!important;resize:none!important;overflow-y:auto!important;margin:0!important;padding:1px 3px!important;border:0!important;box-shadow:none!important;outline:0!important;background:transparent!important;font:500 17px/1.5 system-ui,sans-serif!important;color:#253d4d!important;caret-color:var(--lena-ui)!important}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhSQ299::placeholder{color:#667e8e;opacity:1}',
 '#hhLenaSmart299 #hhLenaComposer340 .hhLenaFakeCaret340{position:absolute;top:5px;left:84px;width:2px;height:21px;background:var(--lena-ui);pointer-events:none;display:none;animation:hhLenaCaret340 .95s steps(2,start) infinite}',
 '#hhLenaSmart299 #hhLenaComposer340:not(.has-value):not(.focused) .hhLenaFakeCaret340{display:block}',
 '@keyframes hhLenaCaret340{50%{opacity:0}}',
 '#hhLenaSmart299 #hhLenaComposer340 .hhLenaToolbar340{width:100%;display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:5px;min-height:41px}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhMic299{display:grid!important;place-items:center!important;box-sizing:border-box!important;flex:0 0 40px!important;width:40px!important;height:40px!important;min-height:40px!important;padding:0!important;border:0!important;border-radius:50%!important;background:transparent!important;color:#667a8b!important;box-shadow:none!important;font-size:0!important}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhMic299::before{content:"🎙";font-size:23px;line-height:1}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhMic299[aria-pressed="true"]{background:#ffe6f0!important;color:#ad245c!important;box-shadow:0 0 0 2px #e28daf!important}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhMic299[aria-pressed="true"]::before{content:"⏹"!important;font-size:23px}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhMic299:has(+ #hhRun299:disabled){opacity:.5}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhRun299{display:grid!important;place-items:center!important;box-sizing:border-box!important;flex:0 0 42px!important;width:42px!important;height:42px!important;min-height:42px!important;padding:0 0 3px!important;border:0!important;border-radius:50%!important;background:var(--lena-ui)!important;color:white!important;box-shadow:0 3px 11px color-mix(in srgb,var(--lena-ui) 23%,transparent)!important;font:700 29px/1 system-ui,sans-serif!important}',
 '#hhLenaSmart299 #hhLenaComposer340 #hhRun299:disabled{opacity:.55!important}',
 '#hhLenaSmart299 #hhAi331Privacy{margin:8px 3px 8px!important;font-size:10px!important;color:#718391!important}',
 '#hhLenaSmart299 #hhAi331Terminal{display:none;box-sizing:border-box;width:100%;height:284px;min-height:284px;max-height:284px;overflow:hidden;border-radius:26px!important;background:#fff!important;color:var(--lena-ui-dark)!important;border:2px solid var(--lena-ui-border)!important;padding:15px!important;margin:14px 0 8px!important;box-shadow:0 5px 18px rgba(49,87,112,.055)!important;font:13px/1.6 ui-monospace,Consolas,monospace!important}',
 '#hhLenaSmart299 #hhAi331Terminal.on{display:block!important}',
 '#hhLenaSmart299 #hhAi331Terminal .hhAi331Title{color:var(--lena-ui-dark)!important;font-size:13px!important;font-weight:800!important;margin:0 0 8px!important}',
 '#hhLenaSmart299 #hhAi331Terminal .hhAi331Cursor{background:var(--lena-ui)!important;height:15px!important}',
 '#hhLenaSmart299 #hhAi331Lines{min-height:36px;max-height:202px!important;overflow:auto!important;color:var(--lena-ui-dark)!important;font-size:13px!important;line-height:1.63!important}',
 '#hhLenaSmart299 #hhAi331Lines p{margin:3px 0!important}',
 '#hhLenaSmart299 #hhAi331Answer{box-sizing:border-box;width:100%;margin-top:12px}',
 '@media(max-width:440px){#hhLenaSmart299 #hhLenaComposer340{padding:13px 12px 8px;height:284px;min-height:284px}#hhLenaSmart299 #hhAi331Terminal{padding:13px!important;height:284px;min-height:284px}}',
 '@media(prefers-reduced-motion:reduce){#hhLenaSmart299 #hhLenaComposer340 .hhLenaFakeCaret340{animation:none}}'
 ].join('');
 document.head.appendChild(s);
}
function primeAudio(){
 try{
  var AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  if(!audio)audio=new AC();
  if(audio.state==='suspended')audio.resume().catch(function(){});
 }catch(e){}
}
function tone(f,start,duration,volume){
 if(!audio||audio.state!=='running')return;
 var o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+start;
 o.type='sine';o.frequency.setValueAtTime(f,t);
 g.gain.setValueAtTime(.0001,t);
 g.gain.exponentialRampToValueAtTime(volume,t+.025);
 g.gain.exponentialRampToValueAtTime(.0001,t+duration);
 o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration+.02);
}
function tada(){
 try{
  if(navigator.vibrate)navigator.vibrate(35);
 }catch(e){}
 try{
  if(!audio||audio.state!=='running')return;
  // Quiet confirmation only after a real completed answer, not at mic pauses.
  // SpeechRecognition system sounds are controlled by Android rather than this app.
  tone(523.25,.01,.13,.009);
  tone(659.25,.15,.13,.010);
  tone(783.99,.31,.23,.011);
  tone(1046.5,.31,.20,.006);
 }catch(e){}
}
function syncEntry(){
 var q=el('hhSQ299'),shell=el('hhLenaComposer340');if(!q||!shell)return;
 shell.classList.toggle('has-value',!!q.value);
 q.style.setProperty('height','160px','important');
 q.style.setProperty('height',Math.max(160,Math.min(q.scrollHeight,190))+'px','important');
}
function setProfile(){
 var page=el('hhLenaSmart299');if(page)page.dataset.profile=currentProfile();
}
function install(){
 var page=el('hhLenaSmart299'),q=el('hhSQ299'),send=el('hhRun299'),mic=el('hhMic299');
 if(!page||!q||!send||!mic)return;
 style();setProfile();
 if(el('hhLenaComposer340')){syncEntry();return}
 var original=send.closest('.askActions');if(!original)return;
 var outer=document.createElement('div');outer.id='hhLenaComposer340';
 outer.innerHTML='<div class="hhLenaInput340"><span class="hhLenaFakeCaret340" aria-hidden="true"></span></div><div class="hhLenaToolbar340"></div>';
 q.parentNode.insertBefore(outer,q);
 outer.querySelector('.hhLenaInput340').appendChild(q);
 var toolbar=outer.querySelector('.hhLenaToolbar340');
 toolbar.appendChild(mic);toolbar.appendChild(send);
 original.classList.add('hhLenaLegacyActions340');
 q.setAttribute('placeholder','Ask Léna');
 q.setAttribute('enterkeyhint','send');
 q.setAttribute('rows','1');
 send.textContent='↑';send.title='Kutatás indítása';send.setAttribute('aria-label','Kutatás indítása');
 mic.setAttribute('aria-label','Diktálás');mic.setAttribute('title','Diktálás');
 var oldHeader=page.querySelector('.askCard:has(#hhLenaComposer340) > h2');
 if(oldHeader){oldHeader.textContent='💬 Kérdezd Lénát';oldHeader.removeAttribute('aria-hidden')}
 var terminal=el('hhAi331Terminal');
 if(terminal){
  var heading=terminal.querySelector('.hhAi331Title');
  if(heading)heading.innerHTML='✦ Léna kutat <span class="hhAi331Cursor" aria-hidden="true"></span>';
 }
 q.addEventListener('input',syncEntry);
 q.addEventListener('focus',function(){outer.classList.add('focused')});
 q.addEventListener('blur',function(){outer.classList.remove('focused')});
 q.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!e.ctrlKey&&!e.altKey){
   e.preventDefault();
   if(!send.disabled){alertPlayed=false;primeAudio();send.click()}
  }
 });
 send.addEventListener('pointerdown',function(){alertPlayed=false;primeAudio()},{passive:true});
 send.addEventListener('keydown',function(){alertPlayed=false;primeAudio()});
 mic.addEventListener('pointerdown',primeAudio,{passive:true});
 syncEntry();
}
window.addEventListener('healthhub:ask-lena-open',function(){
 install();alertPlayed=false;
});
window.addEventListener('healthhub:profile-changed',function(){
 setProfile();alertPlayed=false;
});
window.addEventListener('healthhub:ask-lena-complete',function(evt){
 if(alertPlayed||!evt.detail||!evt.detail.successful||evt.detail.profile!==currentProfile())return;
 alertPlayed=true;tada();
});
document.documentElement.dataset.healthhubAskLenaChat='340';
})();
