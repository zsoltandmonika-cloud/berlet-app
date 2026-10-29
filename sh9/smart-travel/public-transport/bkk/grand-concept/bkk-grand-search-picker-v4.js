/* SH9 BKK Grand v4 · original field predictive suggestions and native pickers.
 * Same Photon/favorite normalization as HealthHub Family Guard, no duplicate
 * inputs, no auto-selection, no background polling and no location tracking.
 */
(function(w,d){
 'use strict';
 const $=id=>d.getElementById(id);
 const core=w.HH_SMART_HUB_FIELDS_V806;
 const input={origin:$('from'),destination:$('to')};
 const date=$('date'),time=$('time');
 if(!core||!input.origin||!input.destination||!date||!time)return;
 const root=$('planner'),route=root?.querySelector('.routebox'),modeGroup=root?.querySelector('.mode');
 if(!root||!route||!modeGroup)return;
 const mobile=()=>!!w.matchMedia?.('(max-width:640px)').matches;
 const selected={origin:null,destination:null};
 let active=null,fieldAnchor=null,listAnchor=null,closing=false;
 let debounce=0,controller=null,token=0,lastFetch=0,scheduled=false;
 const results=d.createElement('section');
 results.id='bkkGrandPredictionsV4';results.className='bkk-grand-predictions-v4';
 results.setAttribute('role','listbox');
 results.setAttribute('aria-label','Prediktív hely- és címjavaslatok');
 results.hidden=true;
 route.insertAdjacentElement('afterend',results);
 for(const key of ['origin','destination']){
  input[key].setAttribute('aria-controls','bkkGrandPredictionsV4');
  input[key].setAttribute('aria-autocomplete','list');
  input[key].setAttribute('spellcheck','false');
 }
 const dock=d.createElement('section');
 dock.id='bkkGrandKeyboardDockV4';dock.className='bkk-grand-keyboard-v4';
 dock.setAttribute('role','dialog');dock.setAttribute('aria-modal','true');
 dock.setAttribute('aria-label','BKK címkereső');
 dock.innerHTML='<div class="bkk-grand-keyboard-head-v4"><strong id="bkkGrandKeyboardTitleV4">📍 BKK címkereső</strong><button type="button" id="bkkGrandKeyboardCloseV4" aria-label="Kereső bezárása">✕</button></div><div id="bkkGrandInputSlotV4" class="bkk-grand-keyboard-input-v4"></div><div class="bkk-grand-keyboard-caption-v4">📍 Mentett helyek és valós címjavaslatok</div>';
 dock.hidden=true;d.body.appendChild(dock);
 const slot=$('bkkGrandInputSlotV4'),title=$('bkkGrandKeyboardTitleV4');
 const say=$('toast');
 function inform(message){
  if(!message)return;
  // The Grand page already owns an accessible toast.
  if(say){say.textContent=message;say.hidden=false;
   w.clearTimeout(inform.timer);inform.timer=w.setTimeout(()=>say.hidden=true,3200)}
 }
 function stop(){
  token++;if(debounce){w.clearTimeout(debounce);debounce=0}
  if(controller){try{controller.abort()}catch(_){}controller=null}
 }
 function position(){
  scheduled=false;if(!active||dock.hidden)return;
  const vv=w.visualViewport;
  const top=vv&&Number.isFinite(vv.offsetTop)?vv.offsetTop:0;
  const height=vv&&Number.isFinite(vv.height)?vv.height:w.innerHeight;
  dock.style.top=Math.max(0,Math.round(top+6))+'px';
  dock.style.height=Math.max(148,Math.floor(height-12))+'px';
 }
 function schedulePosition(){
  if(scheduled||!active)return;
  scheduled=true;
  if(w.requestAnimationFrame)w.requestAnimationFrame(position);
  else w.setTimeout(position,0);
 }
 function draw(items){
  results.replaceChildren();
  for(const item of items){
   const btn=d.createElement('button');btn.type='button';
   btn.className='bkk-grand-prediction-v4';btn.setAttribute('role','option');
   const pin=d.createElement('span');pin.className='bkk-grand-prediction-pin-v4';
   pin.textContent='📍';pin.setAttribute('aria-hidden','true');
   const copy=d.createElement('span');copy.className='bkk-grand-prediction-copy-v4';
   const heading=d.createElement('strong');heading.textContent=item.displayName||item.name;
   const small=d.createElement('small');small.textContent=
    item.displayName&&item.displayName!==item.name?
     item.name+(item.subtitle?' · '+item.subtitle:''):
     item.subtitle||'OpenStreetMap · cím';
   copy.append(heading,small);
   const tag=d.createElement('span');tag.className='bkk-grand-prediction-tag-v4';
   tag.textContent=item.source==='favorite'?'KEDVENC':item.source==='shared'?'KÖZÖS':'CÍM';
   btn.append(pin,copy,tag);
   btn.addEventListener('click',()=>{
    if(!active||!core.validPlace(item))return;
    const key=active;
    const label=core.displayPlace(item);
    selected[key]={name:item.name,displayName:item.displayName||'',lat:item.lat,lng:item.lng,subtitle:item.subtitle||''};
    input[key].value=label;
    stop();close();
   });
   results.append(btn);
  }
  results.hidden=items.length===0;
  if(active)input[active].setAttribute('aria-expanded',String(items.length>0));
 }
 function favorites(query){
  try{return core.favoriteSuggestions(w.localStorage,query,40)}catch(_){return []}
 }
 function search(allowRemote){
  const key=active;
  if(!key)return;
  stop();
  const raw=input[key].value.trim(),local=favorites(raw);
  draw(raw?local:favorites(''));
  const query=core.queryText(raw);
  if(!allowRemote||!query)return;
  const request=token;
  const delay=Math.max(500,1500-(Date.now()-lastFetch));
  debounce=w.setTimeout(async()=>{
   debounce=0;
   if(request!==token||key!==active||input[key].value.trim()!==raw)return;
   const url=core.searchUrl(raw);if(!url)return;
   lastFetch=Date.now();
   const abort=w.AbortController?new w.AbortController():null;
   controller=abort;
   try{
    const res=await w.fetch(url,{mode:'cors',cache:'no-store',
     signal:abort?.signal});
    if(!res.ok)throw Error('HTTP '+res.status);
    const list=core.normalizeResults(await res.json());
    if(request!==token||key!==active||input[key].value.trim()!==raw)return;
    const existing=new Set(local.map(p=>p.lat.toFixed(5)+':'+p.lng.toFixed(5)));
    draw([...local,...list.filter(p=>{
     const id=p.lat.toFixed(5)+':'+p.lng.toFixed(5);
     if(existing.has(id))return false;
     existing.add(id);return true;
    })].slice(0,50));
   }catch(e){
    if(e?.name!=='AbortError'&&request===token){
     draw(local);if(!local.length)inform('Az online címjavaslatok átmenetileg nem elérhetők.');
    }
   }finally{if(controller===abort)controller=null}
  },delay);
 }
 function open(key){
  if(!input[key]||closing)return;
  if(active===key){position();return}
  if(active)close();
  active=key;
  if(mobile()){
   fieldAnchor=d.createComment('BKK original location input');
   listAnchor=d.createComment('BKK original prediction list');
   input[key].parentNode.insertBefore(fieldAnchor,input[key]);
   results.parentNode.insertBefore(listAnchor,results);
   slot.append(input[key]);dock.append(results);
   title.textContent=key==='origin'?'🚶 HONNAN indulunk?':'📍 HOVÁ szeretnél menni?';
   dock.hidden=false;position();
   try{input[key].focus({preventScroll:true})}catch(_){input[key].focus()}
   [90,250,500,800].forEach(ms=>w.setTimeout(()=>{if(active===key)position()},ms));
  }
  input[key].setAttribute('aria-expanded','true');
  search(true);
 }
 function close(){
  if(!active||closing)return;
  closing=true;stop();
  const key=active;
  if(d.activeElement===input[key])input[key].blur();
  if(fieldAnchor?.parentNode)fieldAnchor.parentNode.insertBefore(input[key],fieldAnchor);
  if(listAnchor?.parentNode)listAnchor.parentNode.insertBefore(results,listAnchor);
  fieldAnchor?.remove();listAnchor?.remove();fieldAnchor=null;listAnchor=null;
  input[key].setAttribute('aria-expanded','false');active=null;
  results.replaceChildren();results.hidden=true;
  dock.hidden=true;dock.style.top='';dock.style.height='';
  closing=false;
 }
 for(const key of ['origin','destination']){
  const field=input[key];
  field.addEventListener('pointerdown',event=>{
   if(!mobile()||active||closing||event.button>0)return;
   event.preventDefault();open(key);
  },{passive:false});
  field.addEventListener('click',()=>{if(!active&&!closing)open(key)});
  field.addEventListener('focus',()=>{if(!active&&!closing)open(key)});
  field.addEventListener('input',()=>{
   selected[key]=null;
   if(active!==key)open(key);
   search(true);
  });
  field.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();close()}
  });
 }
 d.getElementById('bkkGrandKeyboardCloseV4').addEventListener('click',close);
 d.addEventListener('pointerdown',event=>{
  if(!active||mobile())return;
  if(!root.contains(event.target))close();
 },{capture:true,passive:true});
 d.getElementById('swap')?.addEventListener('click',()=>{
  const temp=selected.origin;selected.origin=selected.destination;selected.destination=temp;
  close();
 });
 w.addEventListener('resize',()=>{if(active&&!mobile())close();else schedulePosition()},{passive:true});
 w.addEventListener('orientationchange',()=>w.setTimeout(schedulePosition,100),{passive:true});
 w.addEventListener('pagehide',close);
 if(w.visualViewport){
  w.visualViewport.addEventListener('resize',schedulePosition,{passive:true});
  w.visualViewport.addEventListener('scroll',schedulePosition,{passive:true});
 }
 function picker(trigger,native){
  if(!trigger||!native)return;
  const activate=()=>{
   try{
    if(typeof native.showPicker==='function'){native.showPicker();return}
   }catch(_){}
   try{native.focus({preventScroll:true});native.click()}catch(_){native.focus()}
  };
  trigger.addEventListener('click',event=>{
   if(event.target===native)return;
   activate();
  });
  trigger.addEventListener('keydown',event=>{
   if(event.key==='Enter'||event.key===' '){event.preventDefault();activate()}
  });
  native.addEventListener('change',()=>{
   const now=d.querySelector('[data-mode="now"].on');
   // Explicitly choosing a date/time switches to departure-at, retaining
   // the native change listener already installed by the Golden shell.
   if(now) d.querySelector('[data-mode="depart"]')?.click();
  });
 }
 picker($('bkkGrandDateTriggerV4'),date);
 picker($('bkkGrandTimeTriggerV4'),time);
 w.SH9_BKK_GRAND_PREDICTIVE_V4=Object.freeze({
  get selection(){return {...selected}},
  version:'4'
 });
})(window,document);
