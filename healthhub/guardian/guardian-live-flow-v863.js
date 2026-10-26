/* Family Guard v863 · One-handed full-viewport Live Trip Flow.
 * Reuses authorized local Guardian GPS and verified BKK stop order.
 * No new GPS tracker, no invented ETA, no definitive vehicle identification.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_GUARDIAN_LIVE_FLOW_V863=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const $=id=>w?.document?.getElementById(id);
 const engine=()=>w?.HH_GUARDIAN_LIVE_FLOW_CORE_V863;
 const activeTransit=()=>w?.HH_GUARDIAN_ACTIVE_TRANSIT_V862;
 const network=()=>w?.HH_SMART_HUB_ROUTER_V804?.networkLines;
 const selected=()=>w?.localStorage?.getItem('hh-profile')==='m'?'monika':'zsolt';
 const own=()=>w?.HH_GUARDIAN_LIVE_V785?.boundProfile;
 const emoji=mode=>({tram:'🚋',bus:'🚌',trolley:'🚎',metro:'🚇',hev:'🚈',rail:'🚆'})[mode]||'🚏';
 const d=()=>w?.document;
 let opened=false,variant=null,route=null,mode=null,fix=null,previous=null,chosen=null;
 let forced=null,warning=null,preview=false,manuallyDismissed='',lastAuto='',lastPos=null;
 let warningState={reverse:0,off:0,lastTs:0}, lastRenderedSegment=-2,initialized=false;
 function isOwner(){
  const bind=own();return !bind||bind===selected();
 }
 function state(){return activeTransit()?.getStatus?.(selected())||null}
 function resetRoute(){
  variant=null;forced=null;warning=null;warningState={reverse:0,off:0,lastTs:0};
  lastRenderedSegment=-2;lastPos=null;
 }
 function routeKey(s){return s?s.profile+':'+s.route+':'+s.started+':'+s.onboard:''}
 function currentFix(){
  const e=engine();
  if(e?.isFresh(fix))return fix;
  const follow=w?.HH_GUARDIAN_PROFILE_FOLLOW_V837;
  const verified=isOwner()?follow?.latestOwnFix:follow?.latestAuthorizedSelectedFix;
  if(verified?.profile===selected()&&e?.isFresh(verified)){
   return {lat:verified.lat,lng:verified.lng,accuracy:verified.accuracy,ts:verified.ts};
  }
  return null;
 }
 function show(open=true){
  const overlay=$('hhLiveFlowV863');if(!overlay)return false;
  opened=open;overlay.hidden=!open;
  d()?.body?.classList?.toggle('hh-live-flow-open-v863',open);
  if(open){
   $('hhLiveFlowCloseV863')?.focus?.();
   render();
  }
  return true;
 }
 function close(){
  const key=routeKey(state());
  if(key)manuallyDismissed=key;
  preview=false;show(false);
 }
 function setPlannedLeg(leg){
  const id=String(leg?.line?.id||'');
  if(!id||!leg?.line)return false;
  forced={id,headsign:String(leg.line.headsign||''),stopIds:leg.line.stops?.map(s=>s.id)||[]};
  return true;
 }
 function openFromStatus(auto=true){
  const s=state();
  if(!s||!isOwner())return false;
  const key=routeKey(s);
  if(opened&&route===s.route&&chosen?.started===s.started)return true;
  route=s.route;mode=s.mode;chosen=s;preview=false;
  resetRoute();
  // Keep planned direction passed from the router before this call.
  if(forced?.id!==s.route)forced=null;
  if(auto&&manuallyDismissed===key)return false;
  show(true);return true;
 }
 function previewRoute(id,transport,newFix=null,oldFix=null){
  if(!isOwner()||!routeIdOk(id)||!engine()||state()?.onboard)return false;
  const s=state();
  if(s&&s.route!==id)return false;
  const current=newFix&&engine().isFresh(newFix)?newFix:currentFix();
  const old=oldFix&&engine().isFresh(oldFix,current?.ts,90000)?oldFix:previous;
  const opts=engine().match(network(),id,current,old);
  if(!opts.auto)return false; // Never identify based on a single reading.
  const key='preview:'+id+':'+opts.auto.line.headsign;
  if(lastAuto===key)return false;
  lastAuto=key;route=id;mode=transport;chosen=null;preview=true;
  resetRoute();variant=opts.auto.line;previous=old;fix=current;
  updateEstimate();show(true);return true;
 }
 function routeIdOk(text){return /^[0-9A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű-]{1,16}$/.test(String(text||''))}
 function variants(){
  return engine()?.variants?.(network(),route)||[];
 }
 function chooseVariant(line){
  if(!line||String(line.id)!==String(route))return false;
  variant=line;forced={id:route,headsign:line.headsign,
   stopIds:line.stops.map(s=>s.id)};
  warning=null;warningState={reverse:0,off:0,lastTs:0};
  lastRenderedSegment=-2;render();return true;
 }
 function selectedVariant(options){
  const matches=variants();
  if(!matches.length)return null;
  if(forced?.id===route){
   const exact=matches.find(line=>line.headsign===forced.headsign&&
    line.stops.length===forced.stopIds.length&&
    line.stops.every((stop,i)=>stop.id===forced.stopIds[i]));
   if(exact)return exact;
   const heading=matches.filter(line=>line.headsign===forced.headsign);
   if(heading.length===1)return heading[0];
  }
  if(matches.length===1)return matches[0];
  return options?.auto?.line||null;
 }
 function updateEstimate(){
  const e=engine();if(!e||!route)return;
  const nowFix=currentFix();
  if(!variant){
   const result=nowFix?e.match(network(),route,nowFix,previous):null;
   variant=selectedVariant(result);
  }
  if(!variant||!nowFix){lastPos=null;warning=null;return}
  const projected=e.snap(variant,nowFix);
  if(!projected)return;
  lastPos=projected.distance<=Math.max(85,nowFix.accuracy+40)?projected:null;
  const status=e.warningUpdate(warningState,variant,nowFix,previous);
  warningState=status;warning=status.alert;
 }
 function setFix(next,authorizedFamilyRead=false){
  const e=engine();
  if(!e?.isFresh(next)||(!isOwner()&&!authorizedFamilyRead))return;
  if(fix&&next.ts<=fix.ts)return;
  previous=fix&&next.ts-fix.ts<=90000?fix:null;fix=next;
  if(opened){
   updateEstimate();render();
  }
 }
 function takeGps(pos){
  const c=pos?.coords;if(!c)return;
  setFix({lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,ts:pos.timestamp});
 }
 function sync(){
  const s=state();
  const button=$('hhLiveFlowOpenV863');
  if(button)button.hidden=!s;
  if(!s){
   if(!preview&&opened)show(false);
   if(!preview){route=null;chosen=null;resetRoute()}
   return;
  }
  if(!isOwner()){
   // Mónika's route may be viewed from Zsolt's phone, but never changed there.
   if(opened&&(route!==s.route||chosen?.started!==s.started)){
    resetRoute();route=s.route;mode=s.mode;chosen=s;preview=false;
    updateEstimate();render();
   }
   return;
  }
  const key=routeKey(s);
  if(route!==s.route||chosen?.started!==s.started||chosen?.onboard!==s.onboard){
   const keep=forced?.id===s.route?forced:null;
   resetRoute();forced=keep;
   route=s.route;mode=s.mode;chosen=s;preview=false;
   if(manuallyDismissed!==key){updateEstimate();show(true)}
  }else if(opened){updateEstimate();render()}
 }
 function addText(parent,tag,text,cls){
  const item=d().createElement(tag);item.textContent=text;
  if(cls)item.className=cls;
  parent.append(item);return item;
 }
 function renderDirections(){
  const host=$('hhLiveFlowDirectionsV863');
  if(!host)return;
  host.replaceChildren();
  if(!route)return;
  const variantsForRoute=variants();
  if(!variantsForRoute.length)return;
  if(variant&&warning===null)return;
  addText(host,'small',variant?'Ellenőrizheted vagy módosíthatod az irányt:':
   'Válaszd ki az utazás irányát, ha nem egyértelmű a GPS-jel:','hh-flow-direction-caption-v863');
  for(const item of variantsForRoute.slice(0,8)){
   const b=d().createElement('button');b.type='button';
   b.className='hh-flow-direction-choice-v863';
   b.textContent='Irány: '+(item.headsign||item.stops[item.stops.length-1]?.name);
   b.setAttribute('aria-pressed',String(variant===item));
   b.addEventListener('click',()=>chooseVariant(item));host.append(b);
  }
 }
 function renderStops(){
  const host=$('hhLiveFlowStopsV863');if(!host)return;
  host.replaceChildren();
  if(!variant){
   addText(host,'p','A járat iránya még nem azonosítható. Válassz irányt, vagy várj friss GPS-mérésre.','hh-flow-empty-v863');
   lastRenderedSegment=-2;return;
  }
  const list=d().createElement('ol');list.className='hh-flow-stop-list-v863';
  const estimated=lastPos?.index??-1;
  for(let i=0;i<variant.stops.length;i++){
   const stop=variant.stops[i],item=d().createElement('li');
   item.className='hh-flow-stop-v863';
   if(lastPos&&i<=estimated)item.dataset.passed='estimated';
   if(lastPos&&i===estimated+1)item.dataset.upcoming='true';
   addText(item,'span',i===0?'●':i===variant.stops.length-1?'◎':'○','hh-flow-stop-dot-v863');
   addText(item,'strong',stop.name,'hh-flow-stop-name-v863');
   if(lastPos&&i===estimated+1)addText(item,'small','Következő (GPS-becslés)','hh-flow-next-label-v863');
   list.append(item);
   if(lastPos&&i===estimated){
    const marker=d().createElement('li');marker.className='hh-flow-position-v863';
    marker.dataset.mode=mode||'other';
    const relative=Math.round(Math.max(0,Math.min(1,lastPos.fraction))*100);
    marker.style.setProperty('--flow-progress',relative+'%');
    addText(marker,'span',emoji(mode)+' '+route+' · ITT JÁRSZ','hh-flow-position-label-v863');
    addText(marker,'small',relative+'% a két megálló között · GPS-becslés','hh-flow-position-percent-v863');
    list.append(marker);
   }
  }
  host.append(list);
  if(lastPos&&estimated!==lastRenderedSegment){
   lastRenderedSegment=estimated;
   // Only the inner sheet scrolls; fixed one-handed controls remain visible.
   const current=list.querySelector('.hh-flow-position-v863');
   if(current&&opened)w.requestAnimationFrame?.(()=>current.scrollIntoView?.({block:'center',behavior:'smooth'}));
  }
 }
 function render(){
  const overlay=$('hhLiveFlowV863');
  if(!overlay||!opened)return;
  const s=state(),nowFix=currentFix();
  const title=$('hhLiveFlowTitleV863'),caption=$('hhLiveFlowCaptionV863'),
   stateLine=$('hhLiveFlowStateV863'),alarm=$('hhLiveFlowWarningV863');
  overlay.dataset.mode=mode||'other';
  overlay.dataset.alarm=warning?'red':'normal';
  if(title)title.textContent=emoji(mode)+' '+(route||'—')+' · Live Trip Flow';
  if(caption)caption.textContent=!isOwner()?'Családi megtekintés · megosztott GPS-alapú becslés':
   preview?'GPS alapján valószínű vonal · még nem megerősített':
   s?.onboard?'Felszállás megjelölve · járat GPS-szel becsülve':
   'Tervezett útvonal · felszállás még nincs megerősítve';
  if(stateLine)stateLine.textContent=!nowFix?'GPS-jelre várunk · a pozíció nem élő':
   !variant?'GPS friss · útirány még nem azonosítható':
   !lastPos?'GPS friss · nincs elég pontos hely a kiválasztott vonalon':
   'GPS alapú becslés · '+lastPos.from.name+' → '+lastPos.to.name+
   ' · ±'+Math.round(nowFix.accuracy)+' m';
  if(alarm){
   alarm.hidden=!warning;
   if(warning)alarm.textContent=warning==='possible-reverse'?
    '⚠️ Lehet, hogy rossz irányba haladsz. Ellenőrizd a végállomást!':
    '⚠️ Eltérés a kiválasztott járat útvonalától. Ellenőrizd a járatszámot!';
  }
  const confirm=$('hhLiveFlowConfirmV863'),end=$('hhLiveFlowEndV863');
  if(confirm)confirm.hidden=!isOwner()||!(preview||(s?.selection==='planned'&&!s.onboard));
  if(confirm)confirm.textContent=preview?'✓ Igen, ezen utazom':
   !s?.onboard?'✓ Felszálltam a '+route+'-re':'✓ Megerősítve';
  if(end)end.hidden=preview||!s||!isOwner();
  const switcher=$('hhLiveFlowSwitchLineV863');
  if(switcher)switcher.hidden=!isOwner();
  renderDirections();renderStops();
 }
 function openManually(){
  const s=state();
  if(s){
   route=s.route;mode=s.mode;chosen=s;preview=false;
   manuallyDismissed='';updateEstimate();show(true);
  }else if(preview)show(true);
 }
 function confirm(){
  if(preview){
   if(variant)setPlannedLeg({line:variant});
   const confirmed=activeTransit()?.choose?.(route,mode,'manual',true);
   if(confirmed){preview=false;chosen=state();render()}
  }else if(state()&&!state().onboard){
   activeTransit()?.choose?.(state().route,state().mode,'planned',true);
  }
 }
 function changeDirection(){
  const box=$('hhLiveFlowDirectionsV863');
  if(!box)return;
  variant=null;forced=null;warning=null;warningState={reverse:0,off:0,lastTs:0};
  render();
  box.scrollIntoView?.({block:'center',behavior:'smooth'});
 }
 function endTrip(){activeTransit()?.stop?.();preview=false;show(false)}
 function init(){
  if(initialized||!d()||!$('hhLiveFlowV863'))return;
  initialized=true;
  $('hhLiveFlowCloseV863')?.addEventListener('click',close);
  $('hhLiveFlowCloseBottomV863')?.addEventListener('click',close);
  $('hhLiveFlowSwitchLineV863')?.addEventListener('click',()=>{
   const label=$('hhActiveTransitBoardV862');
   close();
   label?.click?.();
   $('hhActiveTransitPanelV862')?.scrollIntoView?.({block:'center',behavior:'smooth'});
  });
  $('hhLiveFlowOpenV863')?.addEventListener('click',openManually);
  $('hhLiveFlowChangeV863')?.addEventListener('click',changeDirection);
  $('hhLiveFlowConfirmV863')?.addEventListener('click',confirm);
  $('hhLiveFlowEndV863')?.addEventListener('click',endTrip);
  w.addEventListener?.('hh-guardian-own-fix-v862',event=>takeGps(event.detail));
  w.addEventListener?.('hh-guardian-active-transit-updated-v862',sync);
  w.addEventListener?.('hh-transit-network-ready-v862',()=>{if(opened){updateEstimate();render()}});
  w.addEventListener?.('pageshow',sync);
  w.addEventListener?.('storage',event=>{
   if(event.key==='hh-profile'){preview=false;fix=null;previous=null;show(false);resetRoute();sync()}
  });
  d().addEventListener?.('keydown',e=>{if(e.key==='Escape'&&opened)close()});
  d().addEventListener?.('visibilitychange',()=>{
   if(!d().hidden&&opened){updateEstimate();render()}
  });
  w.setInterval?.(()=>{
   if(d().hidden)return;
   sync();
   if(opened){
    const fresh=currentFix();
    if(fresh&&(!fix||fresh.ts>fix.ts)){setFix(fresh,true)}
    else {
     if(!fresh){lastPos=null;warning=null;warningState={reverse:0,off:0,lastTs:0}}
     render();
    }
   }
  },6000);
  // Reopening/reloading a live route must not unexpectedly cover the page.
  // Only a NEW explicit boarding/route selection or a strong GPS preview opens it.
  const remembered=state();
  if(remembered){chosen=remembered;route=remembered.route;mode=remembered.mode}
  sync();
 }
 if(d()){
  if(d().readyState==='loading')d().addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {init,previewRoute,setPlannedLeg,openManually,close,setFix,chooseVariant,get active(){return opened},
  version:'863'};
});
