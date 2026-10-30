/* Family Guard v969: restore keyboard-aware predictive BKK search in v968 Golden Standard.
 * Keep the REAL Honnan/Hová input, its native input/focus listeners and the
 * same prediction list. One modal surface only; zero automatic selections.
 * On mobile, temporarily portal the focused input and results to document.body.
 * On close, restore their exact original DOM positions.
 */
(function(w,d){
 'use strict';
 if(!w||!d)return;
 function init(){
  const inputs={
   origin:d.getElementById('hhSmartHubFromV806'),
   destination:d.getElementById('hhSmartHubToV806')
  };
  const results=d.getElementById('hhSmartHubNativeResultsV803');
  const locate=d.getElementById('hhSmartHubCurrentPositionV860');
  if(!inputs.origin||!inputs.destination||!results||d.getElementById('hhBkkKeyboardDockV964'))return;
  // Samsung browser/WebView sometimes reports a fine pointer even on a phone.
  // Screen width is the stable condition; desktop keeps its inline suggestions.
  const mobile=()=>!!(w.matchMedia&&w.matchMedia('(max-width:640px)').matches);
  const dock=d.createElement('section');
  dock.id='hhBkkKeyboardDockV964';
  dock.className='hh-bkk-keyboard-v964';
  dock.setAttribute('role','dialog');
  dock.setAttribute('aria-modal','true');
  dock.setAttribute('aria-label','BKK helykereső és címjavaslatok');
  dock.innerHTML='<div class="hh-bkk-keyboard-head-v964"><strong id="hhBkkKeyboardTitleV964">📍 Helykeresés</strong><button type="button" id="hhBkkKeyboardCloseV964" aria-label="Címkereső bezárása">✕</button></div><div class="hh-bkk-keyboard-input-row-v964"><span id="hhBkkKeyboardInputSlotV964" class="hh-bkk-keyboard-input-slot-v964"></span><button type="button" id="hhBkkKeyboardGpsV964" aria-label="Jelenlegi GPS-pozíció használata" title="Jelenlegi pozícióm">⌖</button></div><div class="hh-bkk-keyboard-caption-v964">📍 Mentett helyek és címjavaslatok</div>';
  dock.hidden=true;
  d.body.appendChild(dock);
  const slot=d.getElementById('hhBkkKeyboardInputSlotV964');
  const title=d.getElementById('hhBkkKeyboardTitleV964');
  const gps=d.getElementById('hhBkkKeyboardGpsV964');
  let active=null,inputMarker=null,resultsMarker=null,schedulePending=false,closing=false;
  function position(){
   schedulePending=false;
   if(!active)return;
   const vv=w.visualViewport;
   const top=vv&&Number.isFinite(vv.offsetTop)?vv.offsetTop:0;
   const height=vv&&Number.isFinite(vv.height)?vv.height:w.innerHeight;
   dock.style.top=Math.max(0,Math.round(top+7))+'px';
   dock.style.height=Math.max(156,Math.floor(height-14))+'px';
  }
  function schedule(){
   if(!active||schedulePending)return;
   schedulePending=true;
   if(w.requestAnimationFrame)w.requestAnimationFrame(position);
   else w.setTimeout(position,0);
  }
  function focusRealField(field){
   try{field.focus({preventScroll:true})}catch(_){field.focus()}
  }
  function open(kind){
   const field=inputs[kind];
   if(!mobile()||!field||closing)return;
   if(active===kind){position();return}
   if(active)close();
   // Leave exact comment anchors to restore the DOM when typing ends.
   if(!field.parentNode||!results.parentNode)return;
   inputMarker=d.createComment('v965 original field');
   resultsMarker=d.createComment('v965 original predictions');
   field.parentNode.insertBefore(inputMarker,field);
   results.parentNode.insertBefore(resultsMarker,results);
   active=kind;
   dock.dataset.kind=kind;
   title.textContent=kind==='origin'?'🚶 HONNAN indulunk?':'📍 HOVÁ szeretnél menni?';
   gps.hidden=kind!=='origin'||!locate;
   slot.appendChild(field);
   dock.appendChild(results);
   dock.hidden=false;
   position();
   // Reparenting a previously focused input can suppress its next native focus
   // event. Guarantee that the existing BKK controller refreshes saved
   // suggestions. Dispatch ONLY focus, never click/input or an auto-selection.
   focusRealField(field);
   field.dispatchEvent(new Event('focus'));
   [80,180,330,550,800].forEach(delay=>w.setTimeout(()=>{
    if(active===kind)position();
   },delay));
  }
  function close(){
   if(!active||closing)return;
   closing=true;
   const kind=active,field=inputs[kind];
   // No focus-driven reopen while moving nodes back.
   if(d.activeElement===field)field.blur();
   if(inputMarker&&inputMarker.parentNode)inputMarker.parentNode.insertBefore(field,inputMarker);
   if(resultsMarker&&resultsMarker.parentNode)resultsMarker.parentNode.insertBefore(results,resultsMarker);
   if(inputMarker)inputMarker.remove();
   if(resultsMarker)resultsMarker.remove();
   inputMarker=null;resultsMarker=null;
   active=null;
   dock.hidden=true;dock.style.top='';dock.style.height='';
   delete dock.dataset.kind;
   closing=false;
  }
  for(const kind of ['origin','destination']){
   const field=inputs[kind];
   const row=field.closest('.hh-smart-hub-field-v806');
   const trigger=event=>{
    if(!mobile()||active||closing||event.button>0)return;
    // Golden Standard v968 moved the real inputs into a compact grid.
    // Catch taps on the FIELD ROW, not just the input's text pixels.
    // The same real input is moved into the full-width top editor.
    if(event.target.closest('button'))return; // GPS and swap keep their actions
    if(event.cancelable)event.preventDefault();
    open(kind);
   };
   // Capture also handles a tap swallowed by the new Golden grid.
   if(row){
    row.addEventListener('pointerdown',trigger,{capture:true,passive:false});
    row.addEventListener('click',()=>{
     if(!active&&!closing&&mobile())open(kind);
    });
   }
   field.addEventListener('pointerdown',trigger,{passive:false});
   field.addEventListener('click',()=>{
    if(!active&&!closing&&mobile())open(kind);
   });
   // v1034: NEVER pop the fullscreen destination sheet on focus alone.
   // Mobile Chrome/Samsung can restore input focus during navigation/page load.
   // Require a deliberate user tap, typed input or keyboard activation.
   field.addEventListener('input',event=>{
    if(event.isTrusted&&!active&&!closing&&mobile()&&d.activeElement===field)open(kind);
   });
   field.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&active){event.preventDefault();close();return}
    if(!active&&!closing&&mobile()&&event.isTrusted&&
      (event.key==='Enter'||event.key==='ArrowDown')){
     event.preventDefault();open(kind);
    }
   });
  }
  // In the original BKK controller, only a result-button click selects a place.
  // Keep its handler in charge and close only after its click has run.
  results.addEventListener('click',event=>{
   if(active&&event.target.closest('button.hh-smart-hub-result-v803')){
    w.setTimeout(close,0);
   }
  });
  d.getElementById('hhBkkKeyboardCloseV964').addEventListener('click',close);
  gps.addEventListener('click',()=>{
   close();
   if(locate&&!locate.disabled)locate.click();
  });
  w.addEventListener('resize',()=>{if(active&&!mobile())close();else schedule()},{passive:true});
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
