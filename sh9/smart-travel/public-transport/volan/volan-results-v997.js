/* SH9 Volán v997 · Golden Standard result cards over the full offline GTFS.
 * UI-only: respects the original ZIP, IndexedDB index and existing search. */
(function(w,d){'use strict';
const fmt=new Intl.DateTimeFormat('hu-HU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'});
const localFmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const dateFmt=new Intl.DateTimeFormat('hu-HU',{weekday:'short',year:'numeric',month:'short',day:'numeric',timeZone:'Europe/Budapest'});
const el=(tag,cls,text)=>{const x=d.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const time=n=>fmt.format(new Date(n));
const local=n=>{const p={};for(const x of localFmt.formatToParts(new Date(n)))p[x.type]=x.value;return p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute};
const duration=j=>Math.max(0,Math.round((j.arrive-j.depart)/60000));
const rideText=m=>m>=60?Math.floor(m/60)+' óra '+m%60+' perc':m+' perc';
const initialCount=20;
function render({list,from,to,when,results,stopById,wall}){
 if(!results||!Array.isArray(list)||!stopById)return false;
 const mode=d.querySelector('[data-mode].on')?.dataset.mode||'depart',pivot=when.getTime();
 let sorting='recommended',shown=initialCount;
 results.replaceChildren();results.classList.add('volan-golden-v997');
 const title=el('div','volan-golden-heading-v997');
 title.append(el('span','volan-golden-heading-icon-v997','🚌'),el('div','volan-golden-heading-text-v997'));
 title.lastChild.append(el('strong','','Volán útvonalak'),el('small','',list.length+' ellenőrzött menetrendi találat · közvetlen járatok'));
 results.append(title);
 const route=el('div','volan-golden-route-v997',from+' → '+to);results.append(route);
 const meta=el('p','volan-golden-meta-v997',(mode==='arrive'?'Érkezés eddig':mode==='now'?'Indulás most':'Indulás ekkor')+' · '+dateFmt.format(when)+' · '+time(pivot));results.append(meta);
 const controls=el('div','volan-golden-controls-v997');
 const label=el('label','','Találatok sorrendje');label.setAttribute('for','volanGoldenSortV997');
 const select=el('select','volan-golden-sort-v997');select.id='volanGoldenSortV997';
 for(const [key,text] of [['recommended','⭐ Ajánlott'],['departure','Indulás szerint'],['arrival','Érkezés szerint'],['duration','Legrövidebb menetidő']]){const opt=el('option','',text);opt.value=key;select.append(opt)}
 controls.append(label,select);
 const hint=el('small','','Helyi GTFS-menetrend · nem élő késésadat · utazási terv, nem jegyfoglalás');controls.append(hint);results.append(controls);
 const cards=el('div','volan-golden-cards-v997');results.append(cards);
 const more=el('button','volan-golden-more-v997','További találatok megjelenítése');more.type='button';results.append(more);
 const selected=(j)=>sorting==='departure'?j.depart:sorting==='arrival'?j.arrive:sorting==='duration'?duration(j):duration(j)+Math.max(0,(mode==='arrive'?pivot-j.arrive:j.depart-pivot)/60000)*.45;
 function ordered(){const a=list.slice();a.sort((x,y)=>selected(x)-selected(y)||x.depart-y.depart||x.arrive-y.arrive);return a}
 function point(cls,stamp,place){const p=el('div','volan-golden-point-v997 '+cls);p.append(el('strong','volan-golden-time-v997',time(stamp)),el('span','volan-golden-dot-v997',''),el('span','volan-golden-place-v997',place));return p}
 function save(j,button){
  const manager=w.SH9_VOLAN_JOURNEY_MANAGER_V3;
  if(!manager||!w.localStorage){button.textContent='Mentés nem elérhető';return}
  const p=d.documentElement.dataset.profile==='m'?'m':'z';
  const routeNumber=j.route?.number||j.trip?.number||'';
  const note='Volán GTFS · '+routeNumber+' · '+time(j.depart)+'–'+time(j.arrive)+' · tervezett menetrend, nem foglalás';
  const res=manager.create(w.localStorage,p,{from,to,mode:'depart',when:local(j.depart),note});
  if(res.ok){button.textContent='✓ Utazás elmentve';button.disabled=true;w.SH9_VOLAN_JOURNEYS_UI?.render?.();w.SH9_VOLAN_PLANNER_V3?.toast?.('Utazási terv elmentve · '+time(j.depart)+' indulás.')}
  else{w.SH9_VOLAN_PLANNER_V3?.toast?.(res.reason==='limit'?'Legfeljebb 30 utazási terv menthető.':'Az utazás mentése nem sikerült.')}
 }
 function card(j){
  const item=el('details','volan-golden-card-v997');
  const summary=el('summary','volan-golden-summary-v997');
  const upper=el('div','volan-golden-main-v997');
  const times=el('div','volan-golden-times-v997');
  times.append(el('strong','',time(j.depart)),el('span','','→'),el('strong','',time(j.arrive)));upper.append(times);
  const flags=el('div','volan-golden-flags-v997');
  flags.append(el('span','volan-golden-route-number-v997','🚌 '+(j.route?.number||j.trip?.number||'Volán')));
  flags.append(el('span','','0 átszállás'));upper.append(flags);
  const bottom=el('div','volan-golden-bottom-v997');
  const origin=stopById.get(j.trip.stops[j.start][0])?.name||from;
  const destination=stopById.get(j.trip.stops[j.end][0])?.name||to;
  bottom.append(el('span','',origin+' → '+destination));
  bottom.append(el('span','',rideText(duration(j))+' · '+(j.end-j.start+1)+' megálló · Részletek ▾'));
  summary.append(upper,bottom);item.append(summary);
  const detail=el('section','volan-golden-detail-v997');
  const heading=el('div','volan-golden-timeline-heading-v997');
  heading.append(el('strong','','🚌 Útvonal részletei'),el('span','','Menetrend'));detail.append(heading);
  const timeline=el('div','volan-golden-timeline-v997');
  timeline.append(point('departure',j.depart,origin));
  const ride=el('div','volan-golden-ride-v997');
  ride.append(el('strong','','🚌 '+(j.route?.number||'Volán járat')+' · '+(j.trip?.headsign||j.route?.name||'')));
  ride.append(el('span','',rideText(duration(j))+' · közvetlen járat'));timeline.append(ride);
  const middles=j.trip.stops.slice(j.start+1,j.end);
  if(middles.length){
   const intermediate=el('details','volan-golden-intermediate-v997');
   const toggle=el('summary','','Köztes megállók ('+middles.length+')');
   intermediate.append(toggle);
   const stops=el('ol','volan-golden-stops-v997');
   for(const stop of middles){
    const row=el('li','');
    const st=stopById.get(stop[0]),arr=wall(j.day,stop[1]),dep=wall(j.day,stop[2]);
    row.append(el('strong','',time(arr)));
    const name=el('span','',st?.name||stop[0]);
    if(stop[2]-stop[1]>0)name.append(el('small','','Érkezés '+time(arr)+' · indulás '+time(dep)+(stop[2]-stop[1]>=10?' · '+(stop[2]-stop[1])+' perc várakozás (WC nem igazolt)':'')));
    row.append(name);stops.append(row);
   }
   intermediate.append(stops);timeline.append(intermediate);
  }
  timeline.append(point('arrival',j.arrive,destination));detail.append(timeline);
  const actions=el('div','volan-golden-actions-v997');
  const button=el('button','volan-golden-save-v997','☆ Utazás mentése');button.type='button';
  button.addEventListener('click',()=>save(j,button));actions.append(button);
  const note=el('p','','Forrás: teljes, helyben tárolt Volán GTFS. A WC, késés és jegyfoglalás nincs igazolva.');
  detail.append(actions,note);item.append(detail);
  return item;
 }
 function draw(){
  cards.replaceChildren();
  if(!list.length){cards.append(el('p','volan-golden-empty-v997','Nincs közvetlen járat ebben az időablakban. Az átszállásos keresés még fejlesztés alatt áll.'))}
  else{for(const j of ordered().slice(0,shown))cards.append(card(j))}
  more.hidden=shown>=list.length;
  if(!more.hidden)more.textContent='További találatok ('+Math.min(initialCount,list.length-shown)+')';
 }
 select.addEventListener('change',()=>{sorting=select.value;shown=initialCount;draw()});
 more.addEventListener('click',()=>{shown+=initialCount;draw()});
 draw();
 w.requestAnimationFrame(()=>{const y=Math.max(0,results.getBoundingClientRect().top+w.scrollY-8);w.scrollTo({top:y,behavior:w.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'instant':'smooth'})});
 return true;
}
w.SH9_VOLAN_RESULTS_V997=Object.freeze({render});
})(window,document);
