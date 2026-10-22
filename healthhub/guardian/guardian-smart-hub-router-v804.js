/* Smart Arrival v804 · honest static BKK three-line pilot router.
 * Source: official GTFS stops and stop ORDER for 260, 17 and 19 only.
 * Walking distances are direct-line comparisons, NOT pedestrian navigation.
 * No schedules, ETA, real-time route planning or unsupported other 387 lines.
 */
(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.HH_SMART_HUB_ROUTER_V804=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const SOURCE='BKK Zrt., CC BY 4.0';
 const LINES=new Set(['260','17','19']);
 const WALK=1000,CHANGE=180,MAX_RESULTS=3;
 let start=null,target=null,feed=null,plans=[],loading=null,priority='transfers',activeGuide=null,activeStep=0;
 const $=id=>w&&w.document&&w.document.getElementById(id);
 function distance(a,b){
  if(!a||!b||![a.lat,a.lng,b.lat,b.lng].every(Number.isFinite))return Infinity;
  const rad=Math.PI/180,lat=(a.lat+b.lat)/2*rad;
  const dx=(a.lng-b.lng)*rad*Math.cos(lat),dy=(a.lat-b.lat)*rad;
  return Math.round(6371000*Math.hypot(dx,dy));
 }
 function validate(doc){
  if(!doc||doc.schemaVersion!==1||doc.source!==SOURCE||!doc.routes)return null;
  const date=Date.parse(doc.generatedAt||'');
  if(!Number.isFinite(date)||date>Date.now()+60000||Date.now()-date>14*86400000)return null;
  const lines=[];
  for(const id of LINES){
   const r=doc.routes[id];
   if(!r||!Array.isArray(r.variants)||!r.variants.length)return null;
   for(let index=0;index<r.variants.length;index++){
    const v=r.variants[index];
    if(!Array.isArray(v.stops)||v.stops.length<2||!Array.isArray(v.shape)||v.shape.length<2)return null;
    const stops=[];
    for(const s of v.stops){
     if(!s||typeof s.name!=='string'||!Number.isFinite(s.lng)||!Number.isFinite(s.lat)||Math.abs(s.lng)>180||Math.abs(s.lat)>90)return null;
     stops.push({name:s.name.slice(0,100),lat:s.lat,lng:s.lng,id:String(s.id||'')});
    }
    lines.push({id,headsign:String(v.headsign||'').slice(0,100),stops,shape:v.shape});
   }
  }
  return lines;
 }
 function nearStops(line,point,max=WALK){
  return line.stops.map((stop,i)=>({stop,i,walk:distance(stop,point)}))
   .filter(x=>x.walk<=max).sort((a,b)=>a.walk-b.walk).slice(0,14);
 }
 function plan(lines,origin,destination,preference='transfers'){
  if(!Array.isArray(lines)||!origin||!destination||distance(origin,destination)<100)return [];
  const begins=lines.map(line=>nearStops(line,origin));
  const ends=lines.map(line=>nearStops(line,destination));
  const candidates=[];
  for(let a=0;a<lines.length;a++){
   const routeA=lines[a];
   for(const enter of begins[a])for(const exit of ends[a]){
    if(exit.i<=enter.i)continue;
    const stops=exit.i-enter.i;
    candidates.push({legs:[{line:routeA,enter:enter.stop,exit:exit.stop,stopCount:stops}],
     walk:enter.walk+exit.walk,score:enter.walk+exit.walk+stops*90,
     transfer:0,approach:enter.walk,finish:exit.walk});
   }
   for(let b=0;b<lines.length;b++){
    if(a===b||lines[b].id===routeA.id||!begins[a].length||!ends[b].length)continue;
    const routeB=lines[b];
    for(const enter of begins[a]){
     for(let ix=enter.i+1;ix<routeA.stops.length;ix++){
      const changing=routeA.stops[ix];
      for(let iy=0;iy<routeB.stops.length-1;iy++){
       const changeWalk=distance(changing,routeB.stops[iy]);
       if(changeWalk>CHANGE)continue;
       for(const exit of ends[b]){
        if(exit.i<=iy)continue;
        const stops=ix-enter.i+exit.i-iy;
        const approach=enter.walk,finish=exit.walk;
        const walk=approach+changeWalk+finish;
        candidates.push({legs:[
         {line:routeA,enter:enter.stop,exit:changing,stopCount:ix-enter.i},
         {line:routeB,enter:routeB.stops[iy],exit:exit.stop,stopCount:exit.i-iy}
        ],walk,transfer:1,approach,changeWalk,finish,
        score:walk+stops*90+450});
       }
      }
     }
    }
   }
  }
  const unique=new Map();
  for(const candidate of candidates){
   const k=candidate.legs.map(l=>l.line.id+':'+l.enter.id+':'+l.exit.id).join('|');
   if(!unique.has(k)||unique.get(k).score>candidate.score)unique.set(k,candidate);
  }
  return rankCandidates([...unique.values()],preference).slice(0,MAX_RESULTS);
 }
 // Transfers always outrank walking distance by default; both are approximate heuristics.
 function rankCandidates(candidates,preference='transfers'){
  const list=Array.isArray(candidates)?candidates.slice():[];
  return list.sort((a,b)=>preference==='walking'
   ? a.walk-b.walk||a.transfer-b.transfer||a.score-b.score
   : a.transfer-b.transfer||a.walk-b.walk||a.score-b.score);
 }
 // This is an itinerary preview, NOT live navigation or a pedestrian route.
 function itinerarySteps(itinerary,origin,destination){
  if(!itinerary||!Array.isArray(itinerary.legs)||!itinerary.legs.length||!origin||!destination)return [];
  const steps=[];
  const first=itinerary.legs[0];
  steps.push({kind:'walk',title:'Séta az induló megállóhoz',
   detail:String(origin.name||'Indulási hely')+' → '+first.enter.name,
   note:'Kb. '+itinerary.approach+' m légvonalban, nem ellenőrzött gyalogút.'});
  itinerary.legs.forEach((leg,index)=>{
   if(index>0){
    const prev=itinerary.legs[index-1];
    steps.push({kind:'transfer',title:'Átszállás · '+leg.line.id+'-es járat',
     detail:prev.exit.name+' → '+leg.enter.name,
     note:'Kb. '+itinerary.changeWalk+' m légvonalban a megállók között; a gyalogos út eltérhet.'});
   }
   steps.push({kind:'board',title:'Felszállás · '+leg.line.id+'-es járat',
    detail:leg.enter.name+' · Irány: '+(leg.line.headsign||'végállomás ellenőrzendő'),
    note:'Menetrendi megálló; indulási idő és aktuális járműpozíció nem része ennek a tervnek.'});
   steps.push({kind:'ride',title:'Utazás · '+leg.stopCount+' megálló',
    detail:leg.enter.name+' → '+leg.exit.name,
    note:'A megállók sorrendje hivatalos BKK GTFS-adat.'});
   steps.push({kind:'alight',title:'Leszállás · '+leg.exit.name,
    detail:'Szállj le itt a(z) '+leg.line.id+'-es járatról.',note:'Menetrendi megálló'});
  });
  const last=itinerary.legs[itinerary.legs.length-1];
  steps.push({kind:'walk',title:'Séta az úti célhoz',
   detail:last.exit.name+' → '+String(destination.name||'Úti cél'),
   note:'Kb. '+itinerary.finish+' m légvonalban, nem ellenőrzött gyalogút.'});
  return steps;
 }
 function setPreference(value){
  if(value!=='transfers'&&value!=='walking')return false;
  priority=value;activeGuide=null;activeStep=0;renderGuide();render();
  return true;
 }
 function makeStepContent(parent,step,index){
  const d=w.document;
  const item=d.createElement('li');item.className='hh-smart-trip-detail-step-v805 hh-smart-trip-step-'+step.kind;
  const num=d.createElement('span');num.className='hh-smart-trip-detail-index-v805';num.textContent=String(index+1);
  const copy=d.createElement('div');copy.className='hh-smart-trip-detail-copy-v805';
  const title=d.createElement('strong');title.textContent=step.title;
  const detail=d.createElement('span');detail.textContent=step.detail;
  const note=d.createElement('small');note.textContent=step.note;
  copy.append(title,detail,note);item.append(num,copy);parent.append(item);
 }
 function renderGuide(){
  const host=$('hhSmartHubGuideV805');
  if(!host||!w.document)return;
  host.hidden=!activeGuide;
  if(!activeGuide)return;
  const all=activeGuide.steps,step=all[activeStep];
  const heading=$('hhSmartHubGuideTitleV805'),number=$('hhSmartHubGuideProgressV805');
  const detail=$('hhSmartHubGuideStepV805');
  const back=$('hhSmartHubGuideBackV805'),next=$('hhSmartHubGuideNextV805');
  if(heading)heading.textContent='GO · '+activeGuide.itinerary.legs.map(l=>l.line.id).join(' → ');
  if(number)number.textContent='Lépés '+(activeStep+1)+' / '+all.length;
  if(detail){detail.replaceChildren();const list=w.document.createElement('ol');list.className='hh-smart-trip-detail-list-v805';makeStepContent(list,step,activeStep);detail.append(list)}
  if(back)back.disabled=activeStep===0;
  if(next)next.textContent=activeStep===all.length-1?'Terv bezárása ✓':'Következő lépés →';
 }
 function startGuide(itinerary){
  const steps=itinerarySteps(itinerary,start,target);
  if(!steps.length)return false;
  activeGuide={itinerary,steps};activeStep=0;
  renderGuide();
  focus(itinerary);
  const guide=$('hhSmartHubGuideV805');
  if(guide&&guide.scrollIntoView)guide.scrollIntoView({behavior:'smooth',block:'nearest'});
  return true;
 }
 function guideNext(){
  if(!activeGuide)return;
  if(activeStep>=activeGuide.steps.length-1){activeGuide=null;activeStep=0;renderGuide();return}
  activeStep++;renderGuide();
 }
 function guideBack(){if(activeGuide&&activeStep>0){activeStep--;renderGuide()}}
 function closeGuide(){activeGuide=null;activeStep=0;renderGuide()}
 function clearMap(){
  const map=w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.map;
  if(!map||!map.getLayer||!map.getSource)return;
  try{
   for(const id of ['hh-smart-hub-itinerary-v804-line','hh-smart-hub-itinerary-v804-outline'])
    if(map.getLayer(id))map.removeLayer(id);
   if(map.getSource('hh-smart-hub-itinerary-v804'))map.removeSource('hh-smart-hub-itinerary-v804');
  }catch(_){}
 }
 function focus(itinerary){
  const map=w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.map;
  if(!map||!map.getSource||!map.addSource||!map.addLayer)return;
  const id='hh-smart-hub-itinerary-v804';
  const features=[];
  for(const leg of itinerary.legs){
   const shape=leg.line.shape;
   if(shape.length>1)features.push({type:'Feature',
    properties:{route:leg.line.id},
    geometry:{type:'LineString',coordinates:shape}});
  }
  if(!features.length)return;
  const data={type:'FeatureCollection',features};
  try{
   if(map.getSource(id))map.getSource(id).setData(data);
   else{
    map.addSource(id,{type:'geojson',data});
    map.addLayer({id:id+'-outline',type:'line',source:id,
     paint:{'line-width':9,'line-color':'#fff','line-opacity':.83}});
    map.addLayer({id:id+'-line',type:'line',source:id,
     paint:{'line-width':5,'line-color':'#00d4ff','line-opacity':.92}});
   }
   const points=[originPoint(),target,...itinerary.legs.flatMap(l=>[l.enter,l.exit])].filter(Boolean);
   const lngs=points.map(p=>p.lng),lats=points.map(p=>p.lat);
   map.fitBounds([[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]],
    {padding:{top:72,bottom:75,left:50,right:50},maxZoom:15.9,duration:700});
   const el=$('guardianMap');if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(_){}
 }
 function originPoint(){return start}
 function render(){
  const host=$('hhSmartHubTripPlansV804'),note=$('hhSmartHubTripStatusV804');
  if(!host||!note||!w.document)return;
  host.replaceChildren();
  const optTransfers=$('hhSmartHubPriorityTransfersV805'),optWalking=$('hhSmartHubPriorityWalkingV805');
  if(optTransfers)optTransfers.setAttribute('aria-pressed',String(priority==='transfers'));
  if(optWalking)optWalking.setAttribute('aria-pressed',String(priority==='walking'));
  if(!start||!target){
   note.textContent='Az útvonaljavaslathoz válassz ki egy indulási helyet és egy úti célt.';return
  }
  if(!feed){note.textContent='A hivatalos BKK megállóadatok betöltése…';return}
  plans=plan(feed,start,target,priority);
  note.textContent=plans.length?
   plans.length+' BKK-vonaljavaslat · '+(priority==='transfers'?'legkevesebb átszállás előre':'kevesebb légvonalbeli gyaloglás előre')+
    ' · csak 260, 17, 19. Nem teljes BKK-tervező.':
   'A 260-as, 17-es és 19-es járat alapján nincs igazolható összeköttetés. Más BKK-járattal lehet útvonal.';
  plans.forEach((p,i)=>{
   const row=w.document.createElement('article');row.className='hh-smart-trip-card-v804';
   const heading=w.document.createElement('strong');
   heading.textContent=(i+1)+'. ajánlat · '+p.legs.map(l=>l.line.id).join(' → ')+(p.transfer?' · 1 átszállás':' · közvetlen');
   row.append(heading);
   for(const [idx,leg] of p.legs.entries()){
    const line=w.document.createElement('div');line.className='hh-smart-trip-stage-v804';
    line.textContent=leg.line.id+' · '+leg.enter.name+' → '+leg.exit.name+' · '+leg.stopCount+' megálló';
    row.append(line);
    if(idx===0&&p.transfer){
     const t=w.document.createElement('small');t.textContent='Átszállás: kb. '+p.changeWalk+' m légvonalban';
     row.append(t);
    }
   }
   const details=w.document.createElement('small');
   details.textContent='Indulóhely → megálló: '+p.approach+' m · megálló → cél: '+p.finish+' m (légvonalban). Nem gyalogos útvonal, nem élő ETA.';
   const actions=w.document.createElement('div');actions.className='hh-smart-trip-actions-v805';
   const go=w.document.createElement('button');go.type='button';
   go.className='hh-smart-trip-go-v805';go.textContent='GO · Út indítása ▶';
   go.setAttribute('aria-label','A(z) '+(i+1)+'. útvonal lépésenkénti megnyitása, nem élő navigáció');
   go.addEventListener('click',()=>startGuide(p));
   const detailBox=w.document.createElement('details');detailBox.className='hh-smart-trip-details-v805';
   const summary=w.document.createElement('summary');summary.textContent='Részletek ▾';
   const stages=w.document.createElement('ol');stages.className='hh-smart-trip-detail-list-v805';
   itinerarySteps(p,start,target).forEach((stage,index)=>makeStepContent(stages,stage,index));
   detailBox.append(summary,stages);
   const map=w.document.createElement('button');map.type='button';map.textContent='Vonalak a térképen ↗';
   map.addEventListener('click',()=>focus(p));
   actions.append(go,detailBox,map);
   row.append(details,actions);host.append(row);
  });
 }
 async function download(){
  const urls=[new URL('./bkk-routes-v790.json',w.location.href).href,
   'https://raw.githubusercontent.com/zsoltandmonika-cloud/berlet-app/main/healthhub/guardian/bkk-routes-v790.json'];
  for(const url of urls){
   try{
    const res=await w.fetch(url,{cache:'no-cache'});
    if(!res.ok)continue;
    const checked=validate(await res.json());
    if(checked){feed=checked;render();return true}
   }catch(_){}
  }
  const note=$('hhSmartHubTripStatusV804');
  if(note)note.textContent='A hivatalos BKK megállóadatok nem érhetők el. Útvonalat nem találunk ki.';
  return false;
 }
 function setJourney(origin,destination){
  // Apply both endpoints atomically, including null clears. Never reuse stale routes.
  const valid=p=>p&&typeof p.name==='string'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng);
  start=valid(origin)?origin:null;
  target=valid(destination)?destination:null;
  plans=[];activeGuide=null;activeStep=0;clearMap();renderGuide();render();
  return Boolean(start&&target);
 }
 function setPlace(kind,place){
  if(!place||!Number.isFinite(place.lat)||!Number.isFinite(place.lng))return;
  if(kind==='origin')start=place;
  else if(kind==='destination')target=place;
  else return;
  activeGuide=null;activeStep=0;clearMap();renderGuide();render();
 }
 function init(){
  if(!$('hhSmartHubTripPlansV804')||!w.fetch)return;
  const transfers=$('hhSmartHubPriorityTransfersV805'),walking=$('hhSmartHubPriorityWalkingV805');
  if(transfers)transfers.addEventListener('click',()=>setPreference('transfers'));
  if(walking)walking.addEventListener('click',()=>setPreference('walking'));
  const next=$('hhSmartHubGuideNextV805'),back=$('hhSmartHubGuideBackV805'),close=$('hhSmartHubGuideCloseV805');
  if(next)next.addEventListener('click',guideNext);
  if(back)back.addEventListener('click',guideBack);
  if(close)close.addEventListener('click',closeGuide);
  renderGuide();render();loading=download();
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {distance,validate,nearStops,plan,rankCandidates,itinerarySteps,setPreference,setPlace,setJourney,startGuide,get selection(){return {start,target}},get preference(){return priority},version:'805'};
});
