/* SH9 shared reservation v986: prepares preferences locally; purchase stays with MÁV. */
(function(w,d){
'use strict';
const root=d.querySelector('#planner');if(!root)return;
const service=w.location.pathname.includes('/volan/')?'volan':'mav';
const form=d.createElement('details');form.id='sh9ReservationV986';form.className='sh9-reservation-v986';
const head=d.createElement('summary');head.textContent='🎫 Ülőhely foglalása · MÁV / Volán';
const body=d.createElement('div');body.className='sh9-reservation-body-v986';
const description=d.createElement('p');
description.textContent='Foglalási előkészítés. Az ülőhely tényleges elérhetőségét és árát a hivatalos MÁV felület mutatja.';
function field(name,options){
 const label=d.createElement('label');label.textContent=name;
 const select=d.createElement('select');
 for(const [value,title] of options){const option=d.createElement('option');option.value=value;option.textContent=title;select.append(option)}
 label.append(select);body.append(label);return select;
}
const preference=field('Ülés preferencia',[['forward','Menetirány szerint, ha elérhető'],['window','Ablak mellett'],['aisle','Folyosó mellett'],['any','Mindegy']]);
const pax=field('Utasok száma',[['1','1 utas'],['2','2 utas'],['3','3 utas'],['4','4 utas'],['5','5 utas'],['6','6 utas']]);
const note=d.createElement('p');note.className='sh9-reservation-note-v986';
note.textContent=service==='volan'?'Busznál a grafikus helyválasztás csak az érintett járatokon, és jellemzően a kezdőállomáson felszállóknak elérhető.':'A menetirány és a szabad helyek a MÁV hivatalos kocsirajzán ellenőrizendők.';
const preview=d.createElement('div');preview.className='sh9-reservation-preview-v986';
const action=d.createElement('button');action.type='button';action.textContent='Útvonal átadása a MÁVPlusznak ↗';
function refresh(){
 const from=d.getElementById('from')?.value.trim()||'',to=d.getElementById('to')?.value.trim()||'';
 const date=d.getElementById('rail-date')?.value||'';
 preview.textContent=from&&to?'Útvonal: '+from+' → '+to+(date?' · '+date:''):'Előbb válassz indulási és érkezési helyet.';
}
head.addEventListener('click',()=>w.setTimeout(refresh,0));
action.addEventListener('click',()=>{
 refresh();
 try{
  const profile=w.localStorage.getItem('hh-profile')==='m'?'m':'z';
  w.localStorage.setItem('sh9-reservation-v986-'+profile+'-'+service,JSON.stringify({
   preference:preference.value,passengers:Number(pax.value),
   from:(d.getElementById('from')?.value||'').slice(0,120),
   to:(d.getElementById('to')?.value||'').slice(0,120),
   savedAt:new Date().toISOString()
  }));
 }catch(_){}
 // No undocumented booking deep link, no embedded payment or fabricated seats.
 const a=(d.getElementById('from')?.value||'').trim().toLowerCase(),b=(d.getElementById('to')?.value||'').trim().toLowerCase();
 const date=d.getElementById('rail-date')?.value||'',time=d.getElementById('rail-time')?.value||'';
 const origin=/^(budapest|budapest-keleti|budapest keleti|keleti pályaudvar)$/.test(a);
 const destination=/^kazincbarcika(?:,? vasútállomás)?$/.test(b);
 if(service==='mav'&&origin&&destination&&/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(date)&&/^[0-9]{2}:[0-9]{2}$/.test(time)){
  const params=new URLSearchParams({ui_itineraryView:'full',fromPlace:'BUDAPEST*::47.4978789,19.0402383::OSM:Budapest',toPlace:'Kazincbarcika, vasútállomás::48.263975,20.628052::hkir:hkir_213692_1',date,time,arriveBy:'false',mode:'WALK,TRANSIT',showIntermediateStops:'true',ignoreRealtimeUpdates:'true',numItineraries:'15'});
  w.location.assign('https://mavplusz.hu/#/?'+params.toString());return;
 }
 w.location.assign('https://mavplusz.hu/');
});
body.append(note,preview,action);
form.append(head,body);root.append(form);
/* v988: concrete result handoff. Never invent station identifiers. */
w.SH9_RESERVATION_V987=Object.freeze({
 openItinerary(j){
  const first=j?.legs?.[0],last=j?.legs?.[j.legs.length-1];
  if(!first||!last){w.location.assign('https://mavplusz.hu/');return false}
  const a=String(first.from||'').trim().toLowerCase(),b=String(last.to||'').trim().toLowerCase();
  const origin=/^(budapest|budapest-keleti|budapest keleti|keleti pályaudvar|budapest-keleti pályaudvar)$/.test(a);
  const dest=/^kazincbarcika(?:,? vasútállomás)?$/.test(b);
  const dt=new Date(first.departure);
  if(service==='mav'&&origin&&dest&&Number.isFinite(dt.getTime())){
   const local=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(dt);
   const p={};for(const x of local)p[x.type]=x.value;
   const date=p.year+'-'+p.month+'-'+p.day,time=p.hour+':'+p.minute;
   const args=new URLSearchParams({ui_itineraryView:'full',fromPlace:'BUDAPEST*::47.4978789,19.0402383::OSM:Budapest',toPlace:'Kazincbarcika, vasútállomás::48.263975,20.628052::hkir:hkir_213692_1',date,time,arriveBy:'false',mode:'WALK,TRANSIT',showIntermediateStops:'true',ignoreRealtimeUpdates:'true',numItineraries:'15'});
   w.location.assign('https://mavplusz.hu/#/?'+args.toString());return true;
  }
  // No confirmed place IDs for other destinations; use official planner.
  w.location.assign('https://mavplusz.hu/');return false;
 }
});
})(window,document);
