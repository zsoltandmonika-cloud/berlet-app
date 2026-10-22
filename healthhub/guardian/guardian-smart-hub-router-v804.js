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
 let start=null,target=null,feed=null,plans=[],loading=null;
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
 function plan(lines,origin,destination){
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
  return [...unique.values()].sort((a,b)=>a.score-b.score).slice(0,MAX_RESULTS);
 }
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
  if(!start||!target){note.textContent='Az útvonaljavaslathoz válassz ki egy indulási helyet és egy úti célt.';return}
  if(!feed){note.textContent='A hivatalos BKK megállóadatok betöltése…';return}
  plans=plan(feed,start,target);
  note.textContent=plans.length?plans.length+' menetrendi vonaljavaslat · csak 260, 17, 19 · az itt jelzett gyaloglási távolság légvonalbeli becslés, nem gyalogos útvonal.':
   'A 260-as, 17-es és 19-es járat alapján nincs igazolható összeköttetés ezen két hely között. Ez nem jelenti azt, hogy más BKK-járattal ne lenne útvonal.';
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
     const t=w.document.createElement('small');
     t.textContent='Átszállás: kb. '+p.changeWalk+' m légvonalban';row.append(t);
    }
   }
   const details=w.document.createElement('small');
   details.textContent='Indulóhely → megálló: '+p.approach+' m · megálló → cél: '+p.finish+' m (légvonalban). Menetrendi idő és élő érkezés nincs számítva.';
   const btn=w.document.createElement('button');btn.type='button';btn.textContent='Vonalak a térképen ↗';
   btn.addEventListener('click',()=>focus(p));
   row.append(details,btn);host.append(row);
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
 function setPlace(kind,place){
  if(!place||!Number.isFinite(place.lat)||!Number.isFinite(place.lng))return;
  if(kind==='origin')start=place;
  else if(kind==='destination')target=place;
  else return;
  clearMap();render();
 }
 function init(){
  if(!$('hhSmartHubTripPlansV804')||!w.fetch)return;
  render();loading=download();
 }
 if(w&&w.document){
  if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',init);
  else init();
 }
 return {distance,validate,nearStops,plan,setPlace,get selection(){return {start,target}},version:'804'};
});
