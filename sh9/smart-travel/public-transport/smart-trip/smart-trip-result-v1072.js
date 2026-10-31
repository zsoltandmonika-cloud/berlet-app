/* SH9 Smart Trip result v1072: one verified journey at a time.
 * UI only: no API calls, no invented walking paths, no synthetic transit trips.
 * Future BKK/MAV/Volan legs can be rendered when a separately verified adapter exists.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_SMART_TRIP_RESULT_V1072=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX=8,MAX_MS=24*60*60000;
 // Future provider slots are deliberately not active booking/routing integrations.
 // Wolt is a delivery service, not a passenger transport leg.
 const FUTURE_PROVIDERS=Object.freeze({
  fotaxi:{kind:'taxi',status:'not-connected'},
  uber:{kind:'ridehail',status:'not-connected'},
  sharedCar:{kind:'carshare',status:'not-connected'},
  wolt:{kind:'delivery',status:'not-connected'}
 });
 const txt=(x,n=110)=>String(x??'').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,n);
 const ms=x=>{const t=Date.parse(x||'');return Number.isFinite(t)?t:NaN};
 function identity(leg,source){
  if(leg.kind==='walk')return {kind:'walk',name:'Séta',icon:'🚶'};
  const agency=txt(leg.agency||leg.operator||'',80).toLocaleLowerCase('hu-HU');
  const vehicle=txt(leg.vehicleType||leg.mode||'',50).toUpperCase();
  const route=txt(leg.service||'',50);
  // Only render real booked/quoted passenger legs after future adapter verification.
  if(agency.includes('főtaxi')||agency.includes('fotaxi'))return {kind:'taxi',name:'Főtaxi',icon:'🚕'};
  if(agency.includes('uber'))return {kind:'ridehail',name:'Uber',icon:'🚘'};
  if(vehicle==='SHARED_CAR'||vehicle==='CARSHARE')return {kind:'carshare',name:'Közösségi autó',icon:'🚙'};
  if(agency.includes('wolt'))return {kind:'delivery',name:'Wolt · kiszállítás',icon:'📦'};
  const src=source?.kind==='local-private-gtfs'?txt(source.name,90).toLocaleLowerCase('hu-HU'):'';
  if(agency.includes('volán')||agency.includes('volan'))return {kind:'volan',name:'Volán',icon:'🚌'};
  if(agency.includes('bkk')||agency.includes('budapesti közlekedési')){
   if(vehicle.includes('TRAM'))return {kind:'tram',name:'BKK villamos',icon:'🚋'};
   if(vehicle.includes('RAIL')||vehicle.includes('SUBURBAN')||vehicle.includes('HEV')||vehicle.includes('HÉV'))return {kind:'hev',name:'HÉV',icon:'🚈'};
   if(vehicle.includes('SUBWAY')||vehicle.includes('METRO'))return {kind:'metro',name:'BKK metró',icon:'🚇'};
   return {kind:'bus',name:'BKK busz',icon:'🚌'};
  }
  if(agency.includes('máv')||agency.includes('mav')||src.includes('máv')||src.includes('mav'))return {kind:'mav',name:'MÁV',icon:'🚆'};
  if(vehicle.includes('TRAM'))return {kind:'tram',name:'Villamos',icon:'🚋'};
  if(vehicle.includes('BUS'))return {kind:'bus',name:'Autóbusz',icon:'🚌'};
  if(vehicle.includes('HEV')||vehicle.includes('HÉV'))return {kind:'hev',name:'HÉV',icon:'🚈'};
  return {kind:'rail',name:'Vasút',icon:'🚆'};
 }
 function normalizeJourney(raw,source){
  if(!raw||!Array.isArray(raw.segments||raw.legs))return null;
  const original=raw.segments||raw.legs;
  if(original.length<1||original.length>18)return null;
  const segments=[];
  for(const leg of original){
   if(!leg||!['walk','ride',undefined].includes(leg.kind))return null;
   const start=ms(leg.departure),end=ms(leg.arrival);
   if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>MAX_MS)return null;
   if(segments.length&&start<segments[segments.length-1].endMs)return null;
   const kind=leg.kind==='walk'?'walk':'ride';
   const from=txt(leg.from),to=txt(leg.to);
   if(!from||!to)return null;
   if(kind==='walk'&&(leg.walkingVerified!==true||!Number.isFinite(leg.distanceMeters)||leg.distanceMeters<0||leg.distanceMeters>30000))return null;
   const branded=identity(leg,source);
   if(branded.kind==='delivery')return null; // Food delivery is not a passenger itinerary.
   segments.push({
    kind,brand:branded.kind,brandName:branded.name,icon:branded.icon,
    from,to,startMs:start,endMs:end,service:kind==='walk'?'':txt(leg.service||'Járat',55),
    direction:kind==='walk'?'':txt(leg.headsign||'',85),
    distanceMeters:kind==='walk'?Math.round(leg.distanceMeters):null
   });
  }
  const first=segments[0],last=segments[segments.length-1];
  if(Math.abs(ms(raw.departure)-first.startMs)>60000||Math.abs(ms(raw.arrival)-last.endMs)>60000)return null;
  const duration=Math.round((last.endMs-first.startMs)/60000);
  if(duration<1||duration>1440)return null;
  const rides=segments.filter(s=>s.kind==='ride');
  if(!rides.length)return null;
  const transferCount=rides.length-1;
  if(Number.isFinite(raw.transfers)&&raw.transfers!==transferCount)return null;
  let interchangeWait=0;
  for(let i=1;i<segments.length;i++){
   const gap=Math.max(0,Math.round((segments[i].startMs-segments[i-1].endMs)/60000));
   interchangeWait+=gap;
  }
  const walk=segments.filter(s=>s.kind==='walk');
  const walkingMinutes=walk.reduce((sum,s)=>sum+Math.round((s.endMs-s.startMs)/60000),0);
  const fullDoor=source.coverage==='door-to-door'&&walk.length>=2&&
   first.kind==='walk'&&last.kind==='walk';
  const stars=fullDoor&&transferCount<=1&&interchangeWait<=7&&walkingMinutes<=12?5:
   transferCount<=1&&interchangeWait<=15?4:transferCount<=2?3:2;
  return {
   departure:new Date(first.startMs).toISOString(),arrival:new Date(last.endMs).toISOString(),
   startMs:first.startMs,endMs:last.endMs,durationMinutes:duration,transfers:transferCount,
   interchangeWait,walkingMinutes:walk.length?walkingMinutes:null,
   walkingMeters:walk.length?walk.reduce((sum,s)=>sum+s.distanceMeters,0):null,
   doorToDoor:fullDoor,stars:Math.min(fullDoor?5:4,stars),segments
  };
 }
 function prepare(journeys,source){
  if(!source||source.verified!==true||!['local-private-gtfs','verified-multimodal'].includes(source.kind)||
     !['station-to-station','door-to-door'].includes(source.coverage)||
     (source.kind==='local-private-gtfs'&&source.coverage!=='station-to-station')||
     !Array.isArray(journeys))return null;
  const label=txt(source.name,100)||'Ellenőrzött menetrend';
  const items=[],dedup=new Set();
  for(const raw of journeys.slice(0,60)){
   const j=normalizeJourney(raw,source);
   if(!j)continue;
   const key=j.segments.map(s=>s.brand+':'+s.from+':'+s.service+'@'+s.startMs+'>'+s.to).join('|');
   if(dedup.has(key))continue;dedup.add(key);items.push(j);
   if(items.length>=MAX)break;
  }
  if(!items.length)return null;
  return {items,source:{
   name:label,coverage:source.coverage,
   generatedAt:txt(source.generatedAt||'',40),
   attribution:txt(source.attribution||'',80),
   walkTimeEstimated:source.walkTimeEstimated===true,
   live:false,verified:true
  }};
 }
 function mount(w,d){
  const dialog=d.getElementById('st22ResultDialog'),panel=d.getElementById('st22ResultBody'),
   counter=d.getElementById('st22ResultCounter'),next=d.getElementById('st22ResultNext'),
   close=d.getElementById('st22ResultClose'),back=d.getElementById('st22ResultBack'),sound=d.getElementById('st22ResultSound');
  if(!dialog||!panel||!counter||!next||!close||!back||!sound)return null;
  const KEY='sh9-smart-trip-result-tadaa-v1072';
  let state=null,index=0,focused=null,context=null,enabled=true;
  try{enabled=w.localStorage.getItem(KEY)!=='off'}catch(_){}
  function buttonSound(){
   sound.textContent=enabled?'♫ Hang BE':'♪ Hang KI';
   sound.setAttribute('aria-pressed',String(enabled));
   sound.setAttribute('aria-label','TADAAA szignál '+(enabled?'bekapcsolva':'kikapcsolva'));
  }
  function unlockSound(){
   if(!enabled)return;
   try{
    const AC=w.AudioContext||w.webkitAudioContext;if(!AC)return;
    context=context||new AC();
    if(context.state==='suspended')void context.resume().catch(()=>{});
   }catch(_){}
  }
  function tada(){
   if(!enabled||!context||context.state!=='running')return;
   try{
    const t=context.currentTime;
    [659.25,830.61,1046.5].forEach((hz,i)=>{
     const start=t+i*.12,o=context.createOscillator(),g=context.createGain();
     o.type='sine';o.frequency.value=hz;
     g.gain.setValueAtTime(.0001,start);
     g.gain.exponentialRampToValueAtTime(.055,start+.018);
     g.gain.exponentialRampToValueAtTime(.0001,start+.23);
     o.connect(g);g.connect(context.destination);o.start(start);o.stop(start+.24);
    });
   }catch(_){}
  }
  const node=(tag,cls,value,parent)=>{
   const el=d.createElement(tag);
   if(cls)el.className=cls;
   if(value!==undefined&&value!==null)el.textContent=String(value);
   if(parent)parent.appendChild(el);
   return el;
  };
  const time=t=>new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',hour:'2-digit',minute:'2-digit'}).format(new Date(t));
  const day=t=>new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',year:'numeric',month:'short',day:'numeric'}).format(new Date(t));
  function draw(){
   if(!state)return;
   const j=state.items[index],source=state.source;
   panel.replaceChildren();counter.textContent=(index+1)+' / '+state.items.length;
   next.disabled=index>=state.items.length-1;
   next.textContent=next.disabled?'Nincs több ellenőrzött javaslat':'Következő javaslat  ❯';
   const head=node('section','st22-r-hero',null,panel);
   const top=node('div','st22-r-rating',null,head);
   node('strong','',index===0?'✨ Léna ajánlása':'✨ Alternatív útiterv',top);
   const stars=node('span','st22-r-stars',null,top);
   stars.textContent='★'.repeat(j.stars)+'☆'.repeat(5-j.stars);
   stars.setAttribute('aria-label',j.stars+' az 5-ből, ellenőrzött menetrendi értékelés');
   node('div','st22-r-route',j.segments[0].from+' → '+j.segments[j.segments.length-1].to,head);
   const times=node('div','st22-r-times',null,head);
   node('div','',day(j.startMs)+'\n'+time(j.startMs),times);
   node('span','st22-r-arrow','→',times);
   node('div','',day(j.endMs)+'\n'+time(j.endMs),times);
   const metrics=node('div','st22-r-metrics',null,head);
   [
    [j.durationMinutes+' p','Teljes menetidő'],
    [String(j.transfers),'Átszállás'],
    [j.interchangeWait+' p','Csatlakozási várakozás'],
    [j.walkingMinutes===null?'Nincs adat':j.walkingMinutes+' p','Tervezett séta']
   ].forEach(([val,label])=>{
    const card=node('div','st22-r-metric',null,metrics);
    node('strong','',val,card);node('small','',label,card);
   });
   const meta=node('p','st22-r-evidence',null,panel);
   meta.textContent='✓ '+source.name+' · Ellenőrzött menetrend, nem élő járatkövetés'+
    (source.generatedAt?' · Forrásfrissítés: '+source.generatedAt.slice(0,10):'')+
    (source.attribution?' · '+source.attribution:'')+
    (source.walkTimeEstimated?' · Sétaidők: szolgáltatói becslés':'');
   if(!j.doorToDoor){
    const warn=node('p','st22-r-limitation',null,panel);
    warn.textContent='ⓘ Egyelőre állomástól állomásig ellenőrzött útvonal. A háztól a megállóig és a célig tartó séta nincs kiszámítva. BKK/Volán kombináció csak hiteles közös tervezőadat után.';
   }
   node('h3','st22-r-section','Útiterv · lépésről lépésre',panel);
   const timeline=node('ol','st22-r-timeline',null,panel);
   j.segments.forEach((s,i)=>{
    if(i>0&&s.startMs>j.segments[i-1].endMs){
     const gap=Math.round((s.startMs-j.segments[i-1].endMs)/60000);
     const wait=node('li','st22-r-step st22-r-gap',null,timeline);
     node('div','st22-r-step-icon','◷',wait);
     const b=node('div','st22-r-step-text',null,wait);
     node('strong','',gap+' perc csatlakozási várakozás',b);
    }
    const step=node('li','st22-r-step st22-r-'+s.brand,null,timeline);
    node('div','st22-r-step-icon',s.icon,step);
    const body=node('div','st22-r-step-text',null,step);
    const label=node('div','st22-r-step-head',null,body);
    node('span','st22-r-provider st22-r-provider-'+s.brand,s.brandName,label);
    if(s.kind==='ride')node('b','st22-r-line',s.service,label);
    node('strong','st22-r-stop',s.from+' → '+s.to,body);
    node('small','',time(s.startMs)+' – '+time(s.endMs)+
      (s.kind==='walk'?' · '+s.distanceMeters+' m':s.direction?' · Irány: '+s.direction:''),body);
   });
   const rationale=node('div','st22-r-rationale',null,panel);
   node('strong','','✨ Léna értékelése',rationale);
   node('p','',j.transfers===0?'Átszállás nélküli menetrendi lehetőség.':
    j.transfers===1?'Egy átszállásos, ellenőrzött menetrendi útvonal.':
    j.transfers+' átszállás szükséges.',rationale);
   node('p','',j.doorToDoor?'A gyalogos szakaszok útvonaladata hiteles forrásból származik; a sétaidő becslés.':
    'Az ötcsillagos, ajtótól ajtóig minősítéshez a gyalogos összeköttetést is ellenőrizni kell.',rationale);
  }
  function open(data){
   if(!data||!data.items?.length||!data.source?.verified)return false;
   state=data;index=0;focused=d.activeElement;
   draw();
   if(!dialog.open){try{dialog.showModal()}catch(_){return false}}
   close.focus?.({preventScroll:true});tada();return true;
  }
  function hide(){if(dialog.open)dialog.close();state=null}
  close.addEventListener('click',hide);
  back.addEventListener('click',hide);
  next.addEventListener('click',()=>{if(state&&index<state.items.length-1){index++;draw();panel.scrollTop=0}});
  sound.addEventListener('click',()=>{
   enabled=!enabled;try{w.localStorage.setItem(KEY,enabled?'on':'off')}catch(_){}
   buttonSound();if(enabled){unlockSound();tada()}
  });
  dialog.addEventListener('close',()=>{if(focused?.focus)focused.focus({preventScroll:true});focused=null;state=null});
  buttonSound();
  return {open,close:hide,unlockSound,displayed:()=>state?{index,count:state.items.length}:null};
 }
 return Object.freeze({identity,normalizeJourney,prepare,mount,FUTURE_PROVIDERS});
});
