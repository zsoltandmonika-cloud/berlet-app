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
 let start=null,target=null,feed=null,network=null,timetable=null,plans=[],loading=null,priority='transfers',activeGuide=null,activeStep=0;
 let timeChoice={mode:'now',at:null};
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
    note:'A megállók sorrendje hivatalos BKK GTFS-adat. A csatlakozás menetrend szerint még nem ellenőrzött.'});
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
 function flowNode(list,kind,name,description,route,routeMode){
  const d=w.document,item=d.createElement('li');
  item.className='hh-trip-flow-item-v854 hh-trip-flow-'+kind+'-v854';
  const rail=d.createElement('span');rail.className='hh-trip-flow-rail-v854';
  const dot=d.createElement('span');dot.className='hh-trip-flow-dot-v854';
  dot.setAttribute('aria-hidden','true');rail.append(dot);
  const copy=d.createElement('div');copy.className='hh-trip-flow-copy-v854';
  const title=d.createElement('strong');
  if(route){
   const tag=d.createElement('span');tag.className='hh-trip-line-v854';
   tag.dataset.route=String(route);
   tag.dataset.mode=String(routeMode||(String(route)==='260'?'bus':'tram'));
   tag.textContent=String(route);
   title.append(tag,d.createTextNode(' '+name));
  }else title.textContent=name;
  copy.append(title);
  if(description){
   const meta=d.createElement('small');meta.textContent=description;copy.append(meta);
  }
  item.append(rail,copy);list.append(item);
}
function renderTimeline(host,itinerary){
  const d=w.document,list=d.createElement('ol');
  list.className='hh-trip-flow-list-v854';
  flowNode(list,'start',String(start?.name||'Indulási hely'),'Kiindulópont');
  flowNode(list,'walk','Séta az első megállóhoz',
   'Kb. '+itinerary.approach+' m légvonalban · a gyalogos út eltérhet');
  itinerary.legs.forEach((leg,index)=>{
   if(index>0){
    const prev=itinerary.legs[index-1];
    const meters=distance(prev.exit,leg.enter);
    flowNode(list,'walk','Átszállás · gyaloglás a következő megállóhoz',
     'Kb. '+meters+' m légvonalban · csatlakozás nincs ellenőrizve');
   }
   flowNode(list,'stop',leg.enter.name,'Felszállás');
   flowNode(list,'ride',leg.line.headsign||'Irány a járat kijelzőjén',
    leg.stopCount+' megálló · statikus BKK megállósorrend',leg.line.id,leg.line.mode);
   flowNode(list,'stop',leg.exit.name,'Leszállás');
  });
  flowNode(list,'walk','Séta a célhoz',
   'Kb. '+itinerary.finish+' m légvonalban · a gyalogos út eltérhet');
  flowNode(list,'end',String(target?.name||'Úti cél'),'Érkezési hely');
  host.append(list);
}
function renderGuide(){
  const host=$('hhSmartHubGuideV805');
  if(!host||!w.document)return;
  host.hidden=!activeGuide;
  if(!activeGuide)return;
  const heading=$('hhSmartHubGuideTitleV805'),number=$('hhSmartHubGuideProgressV805');
  const detail=$('hhSmartHubGuideStepV805');
  if(heading)heading.textContent='Trip Plan Flow · '+activeGuide.itinerary.legs.map(l=>l.line.id).join(' → ');
  if(number)number.textContent='Teljes útvonal · '+activeGuide.itinerary.transfer+
   (activeGuide.itinerary.transfer===1?' átszállás':' átszállás')+
   ' · '+Math.round(activeGuide.itinerary.walk)+' m gyaloglás (légvonal)';
  if(detail){detail.replaceChildren();renderTimeline(detail,activeGuide.itinerary)}
}
 function startGuide(itinerary){
  const steps=itinerarySteps(itinerary,start,target);
  if(!steps.length)return false;
  activeGuide={itinerary,steps};activeStep=0;
  renderGuide();
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
  const map=w&&w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.map;
  if(!map||!map.getLayer||!map.getSource)return;
  try{
   for(const id of ['hh-smart-hub-itinerary-v804-points','hh-smart-hub-itinerary-v804-line','hh-smart-hub-itinerary-v804-outline'])
    if(map.getLayer(id))map.removeLayer(id);
   if(map.getSource('hh-smart-hub-itinerary-v804'))map.removeSource('hh-smart-hub-itinerary-v804');
  }catch(_){}
 }
 function focus(itinerary){
  const map=w&&w.HH_GUARDIAN_V761&&w.HH_GUARDIAN_V761.map;
  if(!map||!map.getSource||!map.addSource||!map.addLayer)return;
  const id='hh-smart-hub-itinerary-v804';
  const features=[];
  for(const leg of itinerary.legs){
   const shape=leg.line.shape;
   if(shape.length>1)features.push({type:'Feature',
    properties:{route:leg.line.id},
    geometry:{type:'LineString',coordinates:shape}});
  }
  const pointFeatures=itinerary.legs.flatMap(leg=>[leg.enter,leg.exit].map(stop=>({
   type:'Feature',properties:{name:stop.name},
   geometry:{type:'Point',coordinates:[stop.lng,stop.lat]}
  })));
  // On the broader network we only have official stop points, NOT vehicle-road geometry.
  // Do not connect them into invented map lines.
  const data={type:'FeatureCollection',features:[...features,...pointFeatures]};
  try{
   if(map.getSource(id))map.getSource(id).setData(data);
   else{
    map.addSource(id,{type:'geojson',data});
    map.addLayer({id:id+'-outline',type:'line',source:id,
     paint:{'line-width':9,'line-color':'#fff','line-opacity':.83}});
    map.addLayer({id:id+'-line',type:'line',source:id,
     paint:{'line-width':5,'line-color':'#00d4ff','line-opacity':.92}});
    map.addLayer({id:id+'-points',type:'circle',source:id,filter:['==',['geometry-type'],'Point'],
     paint:{'circle-radius':6,'circle-color':'#1b9def','circle-stroke-color':'#fff','circle-stroke-width':2}});
   }
   const points=[originPoint(),target,...itinerary.legs.flatMap(l=>[l.enter,l.exit])].filter(Boolean);
   const lngs=points.map(p=>p.lng),lats=points.map(p=>p.lat);
   map.fitBounds([[Math.min(...lngs),Math.min(...lats)],[Math.max(...lngs),Math.max(...lats)]],
    {padding:{top:72,bottom:75,left:50,right:50},maxZoom:15.9,duration:700});
   const el=$('guardianMap');if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(_){}
 }
 function originPoint(){return start}
 // Only explicitly source-backed, matched timetable data may populate time slots.
 // Current stop-order graph has NO timetable object; it will never fabricate one.
 function verifiedTiming(p,now=Date.now()){
  const t=p&&p.timing;
  if(!t||t.verified!==true||t.source!=='BKK_GTFS'||
    typeof t.generatedAt!=='string'||!Number.isFinite(Date.parse(t.generatedAt)))return null;
  const created=Date.parse(t.generatedAt);
  if(created>now+60000||now-created>24*3600000)return null;
  const departure=Date.parse(t.departure),arrival=Date.parse(t.arrival);
  if(!Number.isFinite(departure)||!Number.isFinite(arrival)||arrival<=departure||
    arrival-departure>5*3600000||departure<now-5*60000||departure>now+72*3600000)return null;
  if(!Array.isArray(t.matchedLegs)||t.matchedLegs.length!==p.legs.length)return null;
  if(!t.matchedLegs.every((entry,i)=>entry&&
   String(entry.lineId)===String(p.legs[i].line.id)&&
   String(entry.boardStopId)===String(p.legs[i].enter.id)&&
   String(entry.alightStopId)===String(p.legs[i].exit.id)&&
   typeof entry.tripId==='string'&&entry.tripId.length>0))return null;
  // Delays must be computed from matched journeys upstream, never inferred here.
  const waiting=typeof t.waitMinutes==='number'?t.waitMinutes:NaN;
  const walking=typeof t.walkMinutes==='number'?t.walkMinutes:NaN;
  return {departure,arrival,durationMinutes:Math.round((arrival-departure)/60000),
   waitMinutes:Number.isFinite(waiting)&&waiting>=0?waiting:null,
   walkMinutes:t.walkVerified===true&&Number.isFinite(walking)&&walking>=0?walking:null,
   estimatedWalkMinutes:Number.isFinite(walking)&&walking>=0?walking:null,
   firstBoard:Number.isFinite(Date.parse(t.firstBoard))?Date.parse(t.firstBoard):null,
   departureStop:typeof t.departureStop==='string'?t.departureStop:null,
   generatedAt:created};
 }
 function routeRating(p,now=Date.now()){
  const timing=verifiedTiming(p,now);
  const transfers=Number(p?.transfer);
  const transferGood=Number.isFinite(transfers)&&transfers<2&&transfers>=0;
  const walkVerified=!!timing&&timing.walkMinutes!==null;
  const waitingVerified=!!timing&&timing.waitMinutes!==null;
  const walkGood=walkVerified&&timing.walkMinutes<5;
  const waitGood=waitingVerified&&timing.waitMinutes<5;
  // Static walk is straight-line only: never pretend it proves <5 actual minutes.
  const possibleEasyWalk=!walkVerified&&Number.isFinite(p?.walk)&&p.walk<350;
  const complete=!!timing&&walkVerified&&waitingVerified;
  const perfect=complete&&transferGood&&walkGood&&waitGood;
  const stars=perfect?5:Math.min(4,1+(transferGood?1:0)+
   ((walkVerified?walkGood:possibleEasyWalk)?1:0)+(waitGood?1:0));
  const waitCost=waitingVerified?timing.waitMinutes:20;
  const walkCost=walkVerified?timing.walkMinutes:(Number(p?.walk)||1000)/70;
  const transferCost=(Number.isFinite(transfers)?transfers:4)*10;
  const score=transferCost+walkCost+waitCost;
  return {stars,perfect,preliminary:!complete,score,timing,
   description:perfect?'Mindhárom feltétel teljesül (séta, átszállás, várakozás)':
    complete?'Ellenőrzött, de nem teljesíti mindhárom 5 csillagos feltételt':
    'Előzetes értékelés · nincs ellenőrzött gyaloglási és várakozási idő'};
 }
 function rankOffers(items,now=Date.now()){
  return (Array.isArray(items)?items.slice():[]).sort((a,b)=>{
   const x=routeRating(a,now),y=routeRating(b,now);
   // Schedule-matched services go ahead of untimed static possibilities.
   return Number(!!y.timing)-Number(!!x.timing)||
    y.stars-x.stars||x.score-y.score||
    (Number(a.transfer)||0)-(Number(b.transfer)||0)||
    (Number(a.walk)||0)-(Number(b.walk)||0);
  });
 }
 function prettyClock(timestamp){
  try{return new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',
   hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(timestamp))}
  catch(_){return ''}
 }
 function timeControls(){
  const modes={now:'hhPlannerNowV939',depart:'hhPlannerDepartV939',arrive:'hhPlannerArriveV939'};
  for(const [mode,id] of Object.entries(modes))$(''+id)?.setAttribute?.('aria-pressed',String(timeChoice.mode===mode));
  const field=$('hhPlannerDateV939'),label=$('hhPlannerTimeLabelV939');
  if(field)field.hidden=timeChoice.mode==='now';
  if(label){label.hidden=timeChoice.mode==='now';label.textContent=timeChoice.mode==='arrive'?'Mikorra szeretnél megérkezni?':'Mikor szeretnél indulni?'}
  const note=$('hhPlannerTimeStatusV939');
  // Normal mode is already clear from the selected button. Keep live
  // validation messages, but do not repeat the user's selection in prose.
  if(note)note.textContent='';
 }
 function setTimeChoice(mode,at=null,now=Date.now()){
  if(!['now','depart','arrive'].includes(mode))return false;
  if(mode!=='now'&&(!Number.isFinite(at)||at<now-60000||at>now+36*3600000))return false;
  timeChoice={mode,at:mode==='now'?null:at};
  activeGuide=null;activeStep=0;renderGuide();timeControls();render();return true;
 }
 function localDateTime(timestamp){
  const d=new Date(timestamp),pad=n=>String(n).padStart(2,'0');
  return [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-')+'T'+[pad(d.getHours()),pad(d.getMinutes())].join(':');
 }
 function render(){
  const host=$('hhSmartHubTripPlansV804'),note=$('hhSmartHubTripStatusV804');
  if(!host||!note||!w.document)return;
  host.replaceChildren();
  const optTransfers=$('hhSmartHubPriorityTransfersV805'),optWalking=$('hhSmartHubPriorityWalkingV805');
  if(optTransfers)optTransfers.setAttribute('aria-pressed',String(priority==='transfers'));
  if(optWalking)optWalking.setAttribute('aria-pressed',String(priority==='walking'));
  if(!start||!target){
   note.textContent='';return
  }
  if(!feed&&!network){note.textContent='A hivatalos BKK megállóadatok betöltése…';return}
  const networkModule=w.HH_SMART_HUB_NETWORK_V806;
  const broad=network&&networkModule;
  const raw=(broad?networkModule.plan(network,start,target,priority):(feed?plan(feed,start,target,priority):[]))
   .filter(option=>option&&Array.isArray(option.legs)&&option.legs.length&&
    option.legs.every(leg=>leg&&leg.line&&
     !['960','917','917A'].includes(String(leg.line.id).trim())));
  const schedules=w.HH_BKK_TIMETABLE_V859;
  const query=timeChoice.mode==='now'?{mode:'now'}:{...timeChoice};
  plans=rankOffers(raw.map(option=>{
   if(!timetable||!schedules?.findTiming)return option;
   const match=timeChoice.mode==='now'
    ?schedules.findTiming(timetable,option)
    :schedules.findTimings?.(timetable,option,query,1)?.[0];
   return match?{...option,timing:match}:option;
  }));
  const coverage=$('hhSmartHubCoverageV806');
  if(coverage)coverage.textContent=broad?'Teljesebb BKK hálózati pilot · statikus GTFS':'260 · 17 · 19 · hálózati adat még nincs';

  const timeMatches=plans.filter(p=>verifiedTiming(p)).length;
  note.textContent=plans.length?
   plans.length+' BKK útvonaljavaslat · '+(timeChoice.mode!=='now'&&timeMatches===0
    ?'A választott időpontra nincs igazolt menetrendi találat; a megjelenő útvonalak csak statikus lehetőségek.'
    :timetable?timeMatches+' útvonalhoz ellenőrzött tervezett időpont, valós idejű késés nélkül.'
    :'menetrendi időadat még nem elérhető, csak statikus útvonalak.')+
    ' · gyaloglás légvonalból becsült.':
   (broad?'Nem találtam ellenőrizhető statikus útvonalat a rendelkezésre álló BKK-mintákon. Lehet másik útvonal vagy több átszállás.':
    'A 260-as, 17-es és 19-es járat között nincs statikus összeköttetés. A teljesebb BKK-adatok betöltéséig ez még korlátozott pilot.');
  plans.forEach((p,i)=>{
   const d=w.document,row=d.createElement('article');
   row.className='hh-smart-trip-card-v804 hh-trip-card-compact-v854';
   const head=d.createElement('div');head.className='hh-trip-card-head-v854';
   const rating=routeRating(p);
   let currentPlan=p;
   let timeHeader=null,clocks=null,minutes=null,boarding=null,provisional=null;
   const heading=d.createElement('span');heading.className='hh-trip-stars-v857';
   heading.textContent='★'.repeat(rating.stars)+'☆'.repeat(5-rating.stars);
   heading.setAttribute('role','img');
   heading.setAttribute('aria-label',rating.stars+' csillag az ötből. '+rating.description);
   heading.title=rating.description;
   const transfers=d.createElement('span');transfers.className='hh-trip-transfer-count-v854';
   transfers.textContent=p.transfer+' átszállás';
   head.append(heading,transfers);row.append(head);
   if(rating.timing){
    timeHeader=d.createElement('div');timeHeader.className='hh-trip-times-v857';
    clocks=d.createElement('strong');clocks.textContent=
     prettyClock(rating.timing.departure)+' → '+prettyClock(rating.timing.arrival);
    minutes=d.createElement('b');minutes.textContent=
     rating.timing.durationMinutes+' perc';
    const provenance=d.createElement('small');
    provenance.className='hh-trip-timing-source-v966';
    provenance.textContent='BKK menetrend · tervezett idő, nem élő';
    timeHeader.append(clocks,minutes,provenance);row.append(timeHeader);
   }
   const line=d.createElement('div');line.className='hh-trip-card-lines-v854';
   for(const [index,leg] of p.legs.entries()){
    if(index){
     const arrow=d.createElement('span');arrow.className='hh-trip-card-arrow-v854';
     arrow.textContent='›';arrow.setAttribute('aria-hidden','true');line.append(arrow);
    }
    const badge=d.createElement('span');badge.className='hh-trip-line-v854';
    badge.dataset.route=String(leg.line.id);
    badge.dataset.mode=String(leg.line.mode||(String(leg.line.id)==='260'?'bus':'tram'));
    badge.textContent=String(leg.line.id);
    line.append(badge);
   }
   row.append(line);
   const stop=d.createElement('small');stop.className='hh-trip-card-stops-v854';
   stop.textContent=p.legs[0].enter.name+' → '+p.legs[p.legs.length-1].exit.name;
   const walk=d.createElement('small');walk.className='hh-trip-card-walk-v854';
   const walkDistance=Number(p.walk);
   const walkMin=Number.isFinite(walkDistance)&&walkDistance>=0
    ?Math.ceil(walkDistance/70):null;
   walk.textContent='🚶 '+(walkMin!==null?'kb. '+walkMin+' perc · ':'')+
    'kb. '+Math.round(p.walk)+' m gyaloglás (légvonalból becsült)';
   row.append(stop,walk);
   if(rating.timing){
    boarding=d.createElement('small');boarding.className='hh-trip-card-boarding-v859';
    boarding.textContent=(rating.timing.firstBoard?prettyClock(rating.timing.firstBoard)+' · ':'')+
     (rating.timing.departureStop||p.legs[0].enter.name)+' · tervezett járatindulás';
    row.append(boarding);
   }else{
    provisional=d.createElement('small');provisional.className='hh-trip-card-time-v854';
    provisional.textContent='Nincs igazolt indulási idő ehhez az útvonalhoz · csak statikus útvonal';
    row.append(provisional);
   }
   const actions=d.createElement('div');actions.className='hh-smart-trip-actions-v805 hh-trip-actions-v854';
   const flow=d.createElement('button');flow.type='button';
   flow.className='hh-smart-trip-go-v805';
   flow.textContent='Útvonal áttekintése ▾';
   flow.setAttribute('aria-label','A(z) '+(i+1)+'. útvonal teljes, függőleges Trip Plan Flow nézete');
   flow.addEventListener('click',()=>selectCard());
   const next=d.createElement('button');next.type='button';
   next.className='hh-next-button-v939';
   next.textContent='◷ Következő járat';
   next.setAttribute('aria-expanded','false');
   next.setAttribute('aria-controls','hhNextDeparturesV939-'+i);
   next.setAttribute('aria-label','Ugyanezen az útvonalon a megjelenített járatot követő indulás');
   const nextPanel=d.createElement('div');
   nextPanel.id='hhNextDeparturesV939-'+i;
   nextPanel.className='hh-next-departures-v939';nextPanel.hidden=true;
   nextPanel.setAttribute('role','status');
   nextPanel.setAttribute('aria-live','polite');
   next.addEventListener('click',()=>{
    // v967: Advance from the displayed trip. Do not repeat an existing
    // departure by looking up the first three services from NOW again.
    const now=Date.now();
    const lastDeparture=Date.parse(currentPlan.timing?.departure);
    const sched=w.HH_BKK_TIMETABLE_V859;
    const following=timetable&&sched?.nextTiming
     ?sched.nextTiming(timetable,currentPlan,lastDeparture,now):null;
    const checked=following?verifiedTiming({...currentPlan,timing:following},now):null;
    nextPanel.hidden=false;
    next.setAttribute('aria-expanded','true');
    nextPanel.replaceChildren();
    if(!checked){
     const message=d.createElement('span');
     message.textContent='A következő 12 órában nincs igazolt későbbi indulás ezen a járatsorrenden. Ez nem jelenti azt, hogy a járat nem közlekedik.';
     nextPanel.append(message);return;
    }
    currentPlan={...currentPlan,timing:following};
    plans[i]=currentPlan;
    if(!timeHeader){
     timeHeader=d.createElement('div');
     timeHeader.className='hh-trip-times-v857';
     clocks=d.createElement('strong');minutes=d.createElement('b');
     const provenance=d.createElement('small');
     provenance.className='hh-trip-timing-source-v966';
     provenance.textContent='BKK menetrend · tervezett idő, nem élő';
     timeHeader.append(clocks,minutes,provenance);
     row.insertBefore(timeHeader,line);
    }
    clocks.textContent=prettyClock(checked.departure)+' → '+prettyClock(checked.arrival);
    minutes.textContent=checked.durationMinutes+' perc';
    if(!boarding){
     boarding=d.createElement('small');
     boarding.className='hh-trip-card-boarding-v859';
     row.insertBefore(boarding,actions);
    }
    boarding.textContent=(checked.firstBoard?prettyClock(checked.firstBoard)+' · ':'')+
     (checked.departureStop||currentPlan.legs[0].enter.name)+' · tervezett járatindulás';
    if(provisional){provisional.remove();provisional=null}
    const updatedRating=routeRating(currentPlan,now);
    heading.textContent='★'.repeat(updatedRating.stars)+'☆'.repeat(5-updatedRating.stars);
    heading.setAttribute('aria-label',updatedRating.stars+' csillag az ötből. '+updatedRating.description);
    heading.title=updatedRating.description;
    const status=d.createElement('span');
    status.textContent='✓ Következő menetrendi járat: '+
     prettyClock(checked.firstBoard||checked.departure)+' → érkezés '+
     prettyClock(checked.arrival)+' · ugyanazon az útvonalon';
    nextPanel.append(status);
   });
   const map=d.createElement('button');map.type='button';map.textContent='Térkép ↗';
   map.addEventListener('click',()=>focus(currentPlan));
   const ticket=d.createElement('a');ticket.className='hh-smart-trip-ticket-v806';
   ticket.href='https://bkk.hu/mobiljegy';ticket.target='_blank';
   ticket.rel='noopener noreferrer';ticket.textContent='🎫 Jegy / bérlet ↗';
   actions.append(flow,next,map,ticket);
   const chooseTrip=d.createElement('button');chooseTrip.type='button';
   chooseTrip.className='hh-active-route-select-v862';
   chooseTrip.textContent='✓ Kiválasztom ezt az útvonalat';
   chooseTrip.setAttribute('aria-label','Ezt a(z) '+p.legs.map(l=>l.line.id).join(' → ')+' útvonalat választom, felszállás nélkül');
   chooseTrip.addEventListener('click',()=>{
    const active=w.HH_GUARDIAN_ACTIVE_TRANSIT_V862;
    if(active?.planned(currentPlan)){selectCard();focus(currentPlan)}
   });
   row.append(actions,chooseTrip,nextPanel);host.append(row);
   row.tabIndex=0;
   row.setAttribute('aria-label','A(z) '+(i+1)+'. útvonal áttekintése');
   function selectCard(){
    for(const node of host.querySelectorAll('.hh-smart-trip-card-v804'))node.classList.remove('hh-smart-trip-selected-v806');
    row.classList.add('hh-smart-trip-selected-v806');
    startGuide(currentPlan);
   }
   row.addEventListener('click',event=>{
    if(event.target?.closest?.('button,a,summary'))return;
    selectCard();
   });
   row.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&event.target===row){
     event.preventDefault();selectCard();
    }
   });
  });
 }
 async function downloadTimetable(){
  const module=w.HH_BKK_TIMETABLE_V859;
  if(!module||!module.validate||!w.fetch)return false;
  const urls=[new URL('./bkk-timetable-v859.json',w.location.href).href,
   'https://raw.githubusercontent.com/zsoltandmonika-cloud/berlet-app/main/healthhub/guardian/bkk-timetable-v859.json'];
  for(const url of urls){
   try{
    const res=await w.fetch(url,{cache:'no-store'});
    if(!res.ok)continue;
    const checked=module.validate(await res.json());
    if(checked){timetable=checked;render();return true}
   }catch(_){}
  }
  timetable=null;return false;
 }
 async function downloadNetwork(){
  const module=w.HH_SMART_HUB_NETWORK_V806;
  if(!module||!module.validate)return false;
  try{
   const res=await w.fetch(new URL('./bkk-network-v806.json',w.location.href).href,{cache:'no-store'});
   if(!res.ok)return false;
   const checked=module.validate(await res.json());
   if(!checked)return false;
   network=checked;render();
   w.dispatchEvent?.(new w.CustomEvent('hh-transit-network-ready-v862'));
   return true;
  }catch(_){return false}
 }
 async function download(){
  const urls=[new URL('./bkk-routes-v790.json',w.location.href).href,
   'https://raw.githubusercontent.com/zsoltandmonika-cloud/berlet-app/main/healthhub/guardian/bkk-routes-v790.json'];
  for(const url of urls){
   try{
    const res=await w.fetch(url,{cache:'no-cache'});
    if(!res.ok)continue;
    const checked=validate(await res.json());
    if(checked){feed=checked;render();downloadNetwork();return true}
   }catch(_){}
  }
  const note=$('hhSmartHubTripStatusV804');
  if(note)note.textContent='A hivatalos BKK megállóadatok nem érhetők el. Útvonalat nem találunk ki.';
  downloadNetwork();
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
  const dateInput=$('hhPlannerDateV939'),dateStatus=$('hhPlannerTimeStatusV939');
  const choices={now:'hhPlannerNowV939',depart:'hhPlannerDepartV939',arrive:'hhPlannerArriveV939'};
  const report=()=>{if(dateStatus)dateStatus.textContent='A kiválasztott időpont érvénytelen vagy 36 órán túli. Ellenőrizd a dátumot.'};
  for(const [mode,id] of Object.entries(choices)){
   $(id)?.addEventListener('click',()=>{
    if(mode==='now'){setTimeChoice('now');return}
    if(!dateInput)return;
    // Keep date/time local to the browser (Europe/Budapest on the user's phone).
    const floor=Math.ceil((Date.now()+15*60000)/60000)*60000;
    const selected=timeChoice.mode==='now'?floor:timeChoice.at;
    dateInput.value=localDateTime(selected);
    if(!setTimeChoice(mode,selected))report();
   });
  }
  dateInput?.addEventListener('change',()=>{
   if(timeChoice.mode==='now')return;
   const millis=Date.parse(dateInput.value);
   if(!setTimeChoice(timeChoice.mode,millis))report();
  });
  timeControls();
  const transfers=$('hhSmartHubPriorityTransfersV805'),walking=$('hhSmartHubPriorityWalkingV805');
  if(transfers)transfers.addEventListener('click',()=>setPreference('transfers'));
  if(walking)walking.addEventListener('click',()=>setPreference('walking'));
  const next=$('hhSmartHubGuideNextV805'),back=$('hhSmartHubGuideBackV805'),close=$('hhSmartHubGuideCloseV805');
  if(next)next.addEventListener('click',guideNext);
  if(back)back.addEventListener('click',guideBack);
  if(close)close.addEventListener('click',closeGuide);
  renderGuide();render();loading=download();downloadTimetable();
  // The static schedule is date-sensitive; update offers when the page becomes visible.
  if(w.addEventListener)w.addEventListener('focus',()=>{
   // Long-lived mobile tab: only re-fetch if its daily GTFS snapshot expired.
   const age=timetable?Date.now()-Date.parse(timetable.generatedAt):Infinity;
   if(age>30*3600000)downloadTimetable();
   else render();
  });
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {distance,validate,nearStops,plan,rankCandidates,itinerarySteps,verifiedTiming,routeRating,rankOffers,prettyClock,setPreference,setPlace,setJourney,startGuide,setTimeChoice,get timeChoice(){return {...timeChoice}},get selection(){return {start,target}},get preference(){return priority},get networkLines(){return network||feed},version:'862'};
});
