/* Volán v1000 · transparent, verified itinerary handoff for official ticketing.
 * Never claims that ELVIRA pre-fills inputs, reserves seats, or accepts GTFS IDs.
 * Exact selected bus and stops are handed to the traveler in a copyable sheet.
 * No network requests, uploads, telemetry, or personal data transfer. */
(function(w,d){'use strict';
const OFFICIAL='https://jegy.mav.hu/';
const fmtTime=new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',hour:'2-digit',minute:'2-digit'});
const fmtDate=new Intl.DateTimeFormat('hu-HU',{timeZone:'Europe/Budapest',year:'numeric',month:'long',day:'numeric',weekday:'long'});
const el=(tag,cls,text)=>{const n=d.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
let current=null;
const prev=d.getElementById('sh9ReservationV986');
if(prev){prev.hidden=true;prev.setAttribute('aria-hidden','true')}
const profile=()=>d.documentElement?.dataset?.profile==='m'?'m':'z';
function preferences(){
 try{
  const p=JSON.parse(w.localStorage.getItem('sh9-reservation-v986-'+profile()+'-volan')||'null');
  return {passengers:Math.max(1,Math.min(6,Number(p?.passengers)||1)),seat:['forward','window','aisle','any'].includes(p?.preference)?p.preference:'any'};
 }catch(_){return {passengers:1,seat:'any'}}
}
function storePrefs(passengers,seat){
 try{w.localStorage.setItem('sh9-reservation-v986-'+profile()+'-volan',JSON.stringify({passengers,preference:seat,savedAt:new Date().toISOString()}))}catch(_){}
}
function sheet(item,count,seat){
 const seatName={forward:'Menetirány szerint, ha a szolgáltató lehetővé teszi',window:'Ablak mellett',aisle:'Folyosó mellett',any:'Nincs megkötés'};
 return [
 'Volán / MÁV-csoport · jegyvásárlási adatok (nem foglalás)',
 'Honnan: '+item.from,
 'Hová: '+item.to,
 'Indulás: '+fmtDate.format(item.depart)+' '+fmtTime.format(item.depart),
 'Érkezés: '+fmtDate.format(item.arrive)+' '+fmtTime.format(item.arrive),
 'Buszvonal: '+item.line,
 'Menetrendi járat azonosító (helyi GTFS, NEM hivatalos foglalási azonosító): '+item.tripId,
 'Utasok: '+count,
 'Ülési preferencia: '+seatName[seat],
 'Hivatalos jegyvásárlás: '+OFFICIAL,
 'Az ELVIRA mezőit szükség esetén kézzel kell kitölteni. A rendszer nem foglalt helyet.'
 ].join('\n')
}
async function copy(text,button){
 try{
  if(w.navigator.clipboard?.writeText){await w.navigator.clipboard.writeText(text)}
  else{
   const t=el('textarea');t.value=text;t.setAttribute('readonly','');t.style.cssText='position:fixed;left:-10000px;top:0';d.body.append(t);t.select();
   if(!d.execCommand('copy'))throw Error('Másolás nem támogatott');t.remove();
  }
  button.textContent='✓ Adatok másolva';
 }catch(_){button.textContent='Jelöld ki és másold az adatokat';}
}
function open(j,ctx){
 const anchor=ctx?.anchor,stopById=ctx?.stopById;
 if(!anchor||!j?.trip?.stops||!stopById)return false;
 const origin=stopById.get(j.trip.stops[j.start]?.[0])?.name||ctx.from||'';
 const destination=stopById.get(j.trip.stops[j.end]?.[0])?.name||ctx.to||'';
 const item={from:origin,to:destination,depart:new Date(j.depart),arrive:new Date(j.arrive),line:String(j.route?.number||j.trip?.number||'Nincs megadva'),tripId:String(j.trip.id||'Nincs megadva')};
 if(!item.from||!item.to||!Number.isFinite(item.depart.getTime())||!Number.isFinite(item.arrive.getTime()))return false;
 // One open handoff at a time; re-clicking a card does not multiply panels.
 if(current?.parentNode)current.remove();
 const panel=el('section','volan-ticket-handoff-v1000');panel.setAttribute('role','region');panel.setAttribute('aria-label','Jegy és helyjegy előkészítés');
 const heading=el('div','volan-ticket-heading-v1000');
 heading.append(el('strong','','🎫 Jegy / helyjegy · adatátadó'));
 const close=el('button','volan-ticket-close-v1000','✕');close.type='button';close.setAttribute('aria-label','Adatátadó bezárása');
 close.addEventListener('click',()=>{panel.remove();if(current===panel)current=null});
 heading.append(close);panel.append(heading);
 const itinerary=el('div','volan-ticket-route-v1000');
 itinerary.append(el('strong','',item.from+' → '+item.to));
 itinerary.append(el('span','',fmtDate.format(item.depart)+' · '+fmtTime.format(item.depart)+'–'+fmtTime.format(item.arrive)+' · '+item.line+'-es busz'));
 panel.append(itinerary);
 const fields=el('div','volan-ticket-fields-v1000');
 const passengersLabel=el('label','','Utasok');
 const passengers=el('select');
 for(let i=1;i<=6;i++){const option=el('option','',i+' utas');option.value=String(i);passengers.append(option)}
 const seatLabel=el('label','','Ülőhely-preferencia');
 const seat=el('select');
 for(const [value,label] of [['any','Mindegy'],['forward','Menetirány szerint'],['window','Ablak mellett'],['aisle','Folyosó mellett']]){const option=el('option','',label);option.value=value;seat.append(option)}
 const p=preferences();passengers.value=String(p.passengers);seat.value=p.seat;
 passengersLabel.append(passengers);seatLabel.append(seat);fields.append(passengersLabel,seatLabel);panel.append(fields);
 const preview=el('textarea','volan-ticket-copy-v1000');preview.readOnly=true;preview.rows=8;preview.setAttribute('aria-label','Másolható utazási adatok');
 const update=()=>{const n=Number(passengers.value),v=seat.value;storePrefs(n,v);preview.value=sheet(item,n,v)};
 passengers.addEventListener('change',update);seat.addEventListener('change',update);update();
 panel.append(preview);
 const actions=el('div','volan-ticket-actions-v1000');
 const copyButton=el('button','','📋 Adatok másolása');copyButton.type='button';copyButton.addEventListener('click',()=>copy(preview.value,copyButton));
 const official=el('a','','ELVIRA jegyvásárlás ↗');official.href=OFFICIAL;official.target='_blank';official.rel='noopener noreferrer';official.setAttribute('aria-label','Hivatalos ELVIRA jegyvásárlás megnyitása új lapon');
 actions.append(copyButton,official);panel.append(actions);
 panel.append(el('p','volan-ticket-disclaimer-v1000','A pontos útvonal és indulás a saját GTFS-menetrendből származik. Az ELVIRA nem kap automatikusan kitöltött mezőket; a helyjegy lehetősége, ára és az ülések elérhetősége ott ellenőrizhető. A másolás csak a készüléken történik.'));
 anchor.insertAdjacentElement('afterend',panel);current=panel;
 return true;
}
w.SH9_VOLAN_BOOKING_V1000=Object.freeze({open});
})(window,document);