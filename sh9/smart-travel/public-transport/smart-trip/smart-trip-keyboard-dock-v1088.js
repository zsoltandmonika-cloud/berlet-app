/* SH9 Smart Trip AI v1088 · BKK Golden keyboard-aware predictive address dock.
 * Reparent existing inputs and existing live suggestion lists, never clone them.
 * No new geocoding, API calls, polling or background location.
 */
(function(w,d){
 'use strict';
 function init(){
  const from=d.getElementById('st22From'),to=d.getElementById('st22To');
  const fromList=d.getElementById('st22FromList'),toList=d.getElementById('st22ToList');
  if(!from||!to||!fromList||!toList||d.getElementById('st22KeyboardDockV1088'))return;
  const fields={origin:{input:from,list:fromList},destination:{input:to,list:toList}};
  const mobile=()=>!!w.matchMedia?.('(max-width:640px)').matches;
  const dock=d.createElement('section');
  dock.id='st22KeyboardDockV1088';
  dock.className='st22-keyboard-v1088';
  dock.setAttribute('role','dialog');
  dock.setAttribute('aria-modal','true');
  dock.setAttribute('aria-label','Smart Trip AI – címkeresés');
  const heading=d.createElement('div');
  heading.className='st22-keyboard-head-v1088';
  const title=d.createElement('strong');title.id='st22KeyboardTitleV1088';
  const dismiss=d.createElement('button');dismiss.id='st22KeyboardCloseV1088';
  dismiss.type='button';dismiss.textContent='✕';dismiss.setAttribute('aria-label','Címkereső bezárása');
  heading.append(title,dismiss);
  const edit=d.createElement('div');edit.id='st22KeyboardInputSlotV1088';
  edit.className='st22-keyboard-input-v1088';
  const caption=d.createElement('div');caption.className='st22-keyboard-caption-v1088';
  caption.textContent='📍 Mentett helyek és címjavaslatok';
  dock.append(heading,edit,caption);dock.hidden=true;
  d.body.appendChild(dock);

  let active=null,fieldAnchor=null,listAnchor=null,closing=false,scheduled=false;
  const current=()=>active?fields[active]:null;
  function position(){
   scheduled=false;if(!active||dock.hidden)return;
   const vv=w.visualViewport;
   const top=vv&&Number.isFinite(vv.offsetTop)?vv.offsetTop:0;
   const height=vv&&Number.isFinite(vv.height)?vv.height:w.innerHeight;
   dock.style.top=Math.max(0,Math.round(top+6))+'px';
   dock.style.height=Math.max(155,Math.floor(height-12))+'px';
  }
  function schedule(){
   if(!active||scheduled)return;
   scheduled=true;
   if(w.requestAnimationFrame)w.requestAnimationFrame(position);
   else w.setTimeout(position,0);
  }
  function open(key){
   const target=fields[key];
   if(!mobile()||!target||closing)return;
   if(active===key){position();return}
   if(active)close();
   if(!target.input.parentNode||!target.list.parentNode)return;
   fieldAnchor=d.createComment('v1088 original Smart Trip field');
   listAnchor=d.createComment('v1088 original Smart Trip predictions');
   target.input.parentNode.insertBefore(fieldAnchor,target.input);
   target.list.parentNode.insertBefore(listAnchor,target.list);
   active=key;dock.dataset.kind=key;
   title.textContent=key==='origin'?'🚶 HONNAN indulunk?':'📍 HOVÁ szeretnél menni?';
   edit.appendChild(target.input);
   dock.appendChild(target.list);
   dock.hidden=false;
   position();
   try{target.input.focus({preventScroll:true})}catch(_){target.input.focus()}
   // The existing Smart Trip controller owns both favorite and online predictions.
   // Moving a focused field does not reliably fire focus in Edge/Samsung.
   target.input.dispatchEvent(new Event('focus'));
   // Samsung/Edge virtual keyboard resizes visualViewport in delayed phases.
   for(const ms of [80,220,440,700])w.setTimeout(()=>{if(active===key)position()},ms);
  }
  function close(){
   if(!active||closing)return;
   closing=true;
   const previous=current();
   if(d.activeElement===previous.input)previous.input.blur();
   if(fieldAnchor?.parentNode)fieldAnchor.parentNode.insertBefore(previous.input,fieldAnchor);
   if(listAnchor?.parentNode)listAnchor.parentNode.insertBefore(previous.list,listAnchor);
   fieldAnchor?.remove();listAnchor?.remove();
   fieldAnchor=null;listAnchor=null;
   // An offscreen suggestion list must not keep covering planner buttons.
   previous.list.hidden=true;
   previous.input.setAttribute('aria-expanded','false');
   active=null;
   dock.hidden=true;dock.style.top='';dock.style.height='';
   delete dock.dataset.kind;
   closing=false;
  }
  function trigger(key,event){
   if(!mobile()||active||closing||event.button>0)return;
   if(event.target?.closest?.('button'))return;
   if(event.cancelable)event.preventDefault();
   open(key);
  }
  for(const key of ['origin','destination']){
   const input=fields[key].input;
   const row=input.closest('.st22-place');
   row?.addEventListener('pointerdown',e=>trigger(key,e),{capture:true,passive:false});
   input.addEventListener('click',()=>{if(!active&&!closing&&mobile())open(key)});
   row?.addEventListener('click',()=>{if(!active&&!closing&&mobile())open(key)});
   input.addEventListener('input',e=>{
    if(e.isTrusted&&!active&&!closing&&mobile()&&d.activeElement===input)open(key);
   });
   input.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&active){e.preventDefault();close();return}
    if(e.key==='Enter'&&active){
     // "Done" should not submit an unverified free-text route.
     e.preventDefault();close();return;
    }
    if(!active&&mobile()&&e.isTrusted&&(e.key==='ArrowDown'||e.key==='Enter')){
     e.preventDefault();open(key);
    }
   },{capture:true});
   fields[key].list.addEventListener('click',e=>{
    if(active===key&&e.target.closest('button[role="option"]')){
     // Existing handler chooses the verified place first; then restore field.
     w.setTimeout(close,0);
    }
   });
  }
  dismiss.addEventListener('click',close);
  d.addEventListener('keydown',e=>{if(active&&e.key==='Escape'){e.preventDefault();close()}},{capture:true});
  w.addEventListener('resize',()=>{if(active&&!mobile())close();else schedule()},{passive:true});
  w.addEventListener('orientationchange',()=>w.setTimeout(schedule,100),{passive:true});
  w.addEventListener('pagehide',close);
  d.addEventListener('visibilitychange',()=>{if(d.hidden)close()});
  if(w.visualViewport){
   w.visualViewport.addEventListener('resize',schedule,{passive:true});
   w.visualViewport.addEventListener('scroll',schedule,{passive:true});
  }
  w.SH9_SMART_TRIP_KEYBOARD_V1088=Object.freeze({get isOpen(){return !!active},close});
 }
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);
