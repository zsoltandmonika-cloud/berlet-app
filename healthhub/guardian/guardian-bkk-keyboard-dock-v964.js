/* Family Guard v964: Android keyboard-safe BKK Honnan/Hová suggestions.
   Keep the original route inputs and result nodes/listeners. Only the visible
   editor is mirrored; the existing verified-suggestion logic remains intact.
   Results are temporarily portalled to body, outside blurred glass containing blocks. */
(function(w,d){
 'use strict';
 if(!w||!d)return;
 function init(){
  const originals={
   origin:d.getElementById('hhSmartHubFromV806'),
   destination:d.getElementById('hhSmartHubToV806')
  };
  const results=d.getElementById('hhSmartHubNativeResultsV803');
  const locate=d.getElementById('hhSmartHubCurrentPositionV860');
  if(!originals.origin||!originals.destination||!results||d.getElementById('hhBkkKeyboardDockV964'))return;
  const narrow=()=>w.matchMedia&&w.matchMedia('(max-width:640px)').matches;
  const dock=d.createElement('section');
  dock.id='hhBkkKeyboardDockV964';
  dock.className='hh-bkk-keyboard-v964';
  dock.setAttribute('aria-label','BKK címkereső · billentyűzetbarát találatok');
  dock.innerHTML='<div class="hh-bkk-keyboard-head-v964"><strong id="hhBkkKeyboardTitleV964">📍 Helykeresés</strong><button type="button" id="hhBkkKeyboardCloseV964" aria-label="Címkereső bezárása">✕</button></div><div class="hh-bkk-keyboard-input-row-v964"><input id="hhBkkKeyboardInputV964" type="search" autocomplete="off" autocorrect="off" enterkeyhint="search" maxlength="120" aria-controls="hhSmartHubNativeResultsV803" aria-label="Cím vagy mentett hely keresése"><button type="button" id="hhBkkKeyboardGpsV964" aria-label="Jelenlegi GPS-pozíció használata" title="Jelenlegi pozícióm">⌖</button></div><div class="hh-bkk-keyboard-caption-v964">📍 Mentett helyek és címjavaslatok</div>';
  dock.hidden=true;
  d.body.appendChild(dock);
  const input=d.getElementById('hhBkkKeyboardInputV964');
  const title=d.getElementById('hhBkkKeyboardTitleV964');
  const gps=d.getElementById('hhBkkKeyboardGpsV964');
  let kind=null,anchor=null,syntheticFocus=false,scheduled=false;
  let blurTimer=0;
  function position(){
   scheduled=false;
   if(!kind)return;
   const vv=w.visualViewport;
   const top=vv&&Number.isFinite(vv.offsetTop)?vv.offsetTop:0;
   const height=vv&&Number.isFinite(vv.height)?vv.height:w.innerHeight;
   // The visual viewport ends just above the Android keyboard.
   dock.style.top=Math.max(0,Math.round(top+7))+'px';
   dock.style.height=Math.max(155,Math.round(height-14))+'px';
  }
  function schedule(){
   if(!kind||scheduled)return;
   scheduled=true;
   w.requestAnimationFrame?w.requestAnimationFrame(position):w.setTimeout(position,0);
  }
  function syncOriginalFocus(){
   // Original controller uses focus to choose origin/destination, but focusing
   // its offscreen input would steal the Android keyboard from this overlay.
   syntheticFocus=true;
   try{originals[kind].dispatchEvent(new Event('focus'))}
   finally{syntheticFocus=false}
  }
  function open(nextKind){
   if(!narrow()||!originals[nextKind])return;
   if(blurTimer){w.clearTimeout(blurTimer);blurTimer=0}
   if(!kind){
    anchor=d.createComment('BKK result list return point v964');
    results.parentNode.insertBefore(anchor,results);
    dock.appendChild(results);
    dock.hidden=false;
   }
   kind=nextKind;
   dock.dataset.kind=kind;
   title.textContent=kind==='origin'?'🚶 HONNAN keresünk?':'📍 HOVÁ szeretnél menni?';
   gps.hidden=kind!=='origin'||!locate;
   input.placeholder=originals[kind].placeholder;
   input.value=originals[kind].value;
   syncOriginalFocus();
   position();
   try{input.focus({preventScroll:true})}catch(_){input.focus()}
   [90,230,430,700].forEach(ms=>w.setTimeout(()=>{if(kind)position()},ms));
  }
  function close(){
   if(!kind)return;
   kind=null;
   if(blurTimer){w.clearTimeout(blurTimer);blurTimer=0}
   input.blur();
   dock.hidden=true;
   dock.style.top='';dock.style.height='';
   if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(results,anchor);
   if(anchor)anchor.remove();
   anchor=null;
  }
  for(const k of ['origin','destination']){
   const original=originals[k];
   original.addEventListener('pointerdown',e=>{
    if(!narrow()||e.button>0)return;
    e.preventDefault();
    open(k);
   },{passive:false});
   original.addEventListener('click',e=>{
    if(!narrow())return;
    e.preventDefault();
    open(k);
   });
   original.addEventListener('focus',()=>{
    if(!syntheticFocus&&narrow())open(k);
   });
  }
  input.addEventListener('input',()=>{
   if(!kind)return;
   const original=originals[kind];
   original.value=input.value;
   original.dispatchEvent(new Event('input',{bubbles:true}));
  });
  input.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();close();return}
   if(e.key==='Enter'&&kind){
    e.preventDefault();
    originals[kind].dispatchEvent(new KeyboardEvent('keydown',{
     key:'Enter',bubbles:true,cancelable:true
    }));
   }
  });
  input.addEventListener('blur',()=>{
   // Allow tapping one of the predicted result buttons before restoring it.
   if(blurTimer)w.clearTimeout(blurTimer);
   blurTimer=w.setTimeout(()=>{
    blurTimer=0;
    if(kind&&d.activeElement!==input&&!dock.contains(d.activeElement))close();
   },320);
  });
  results.addEventListener('click',e=>{
   if(e.target.closest('button.hh-smart-hub-result-v803'))
    w.setTimeout(close,0); // existing selection handler executes first
  });
  d.getElementById('hhBkkKeyboardCloseV964').addEventListener('click',close);
  gps.addEventListener('click',()=>{
   close();
   if(locate&&!locate.disabled)locate.click();
  });
  w.addEventListener('resize',()=>{if(kind&&!narrow())close();else schedule()},{passive:true});
  w.addEventListener('orientationchange',()=>w.setTimeout(schedule,100),{passive:true});
  w.addEventListener('pagehide',close);
  d.addEventListener('visibilitychange',()=>{if(d.hidden)close()});
  if(w.visualViewport){
   w.visualViewport.addEventListener('resize',schedule,{passive:true});
   w.visualViewport.addEventListener('scroll',schedule,{passive:true});
  }
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);
