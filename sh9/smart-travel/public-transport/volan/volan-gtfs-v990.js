/* Volán Golden Standard v990 pilot. Local-only, user-supplied GTFS JSON.
   No network queries, live-delay claims or uploaded timetable data. */
(function(w,d){
'use strict';
const core=w.SH9_MAV_GTFS_CORE_V1,$=id=>d.getElementById(id),find=$('find'),planner=$('planner');
if(!core||!find||!planner)return;
const box=d.createElement('details');box.className='volan-gtfs-v990';
const summary=d.createElement('summary');summary.textContent='🚌 Volán GTFS · helyi menetrend betöltése';
const pane=d.createElement('div'),file=d.createElement('input');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','Volán GTFS keresési JSON');
const status=d.createElement('p');status.setAttribute('role','status');status.textContent='Tölts be egy ellenőrzött Volán GTFS-kivonatot. A fájl az eszközön marad.';
pane.append(file,status);box.append(summary,pane);planner.append(box);
const results=d.createElement('section');results.id='volanGtfsResultsV990';results.className='volan-results-v990';
results.setAttribute('aria-label','Volán menetrendi találatok');planner.insertAdjacentElement('afterend',results);
let data=null,audio=null;
file.addEventListener('change',async()=>{
 const f=file.files?.[0];if(!f)return;
 try{
  if(f.size>22*1024*1024)throw Error('22 MB-nál nagyobb fájl nem tölthető be.');
  const raw=JSON.parse(await f.text());
  if(!core.validate(raw,{allowPrivate:true})||!String(raw.source||'').includes('Volán'))throw Error('Nem megfelelő Volán menetrendi fájl.');
  data=raw;status.textContent='✅ Volán menetrend betöltve · '+raw.trips.length+' járat · '+raw.stops.length+' megálló.';
 }catch(e){data=null;status.textContent='⚠️ '+e.message}finally{file.value=''}
});
function clock(s){return new Intl.DateTimeFormat('hu-HU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'}).format(new Date(s))}
function el(tag,cls,t){const n=d.createElement(tag);if(cls)n.className=cls;if(t!==undefined)n.textContent=t;return n}
function tadaa(){
 try{
  if(!audio){const C=w.AudioContext||w.webkitAudioContext;if(!C)return;audio=new C()}
  audio.resume().catch(()=>{});
  const at=audio.currentTime;
  [659.25,830.61,1046.5].forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain(),s=at+i*.10;
   o.frequency.value=hz;g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(.07,s+.025);g.gain.exponentialRampToValueAtTime(.0001,s+.22);o.connect(g);g.connect(audio.destination);o.start(s);o.stop(s+.23)});
 }catch(_){}
}
function search(e){
 e.preventDefault();e.stopImmediatePropagation();
 if(!data){box.open=true;status.textContent='Először töltsd be a Volán GTFS keresési JSON-fájlt.';box.scrollIntoView({behavior:'smooth',block:'nearest'});return}
 const from=$('from')?.value.trim(),to=$('to')?.value.trim();
 if(!from||!to||from===to){status.textContent='Két különböző buszmegálló szükséges.';return}
 const mode=d.querySelector('[data-mode].on')?.dataset.mode||'now';
 const date=$('rail-date')?.value,time=$('rail-time')?.value;
 const when=mode==='now'?new Date():new Date(date+'T'+time+':00');
 if(!Number.isFinite(when.getTime())){status.textContent='Hibás dátum vagy időpont.';return}
 const route=core.route(data,{from,to,mode,when:when.toISOString()},{limit:40,maxTransfers:1,localOnly:true,ranking:'recommended'});
 results.replaceChildren();
 const title=el('h3','',route.status==='ok'?route.totalJourneys+' menetrendi útvonal':'Nincs ellenőrzött találat');results.append(title);
 if(route.status!=='ok'||!route.journeys?.length){results.append(el('p','','Próbálj másik megállót vagy dátumot. A GTFS nem élő adat.'));return}
 for(const j of route.journeys){
  const row=el('details','volan-trip-v990'),head=el('summary','',clock(j.departure)+' → '+clock(j.arrival)+' · '+j.durationMinutes+' perc · '+j.transfers+' átszállás');
  row.append(head);
  for(const leg of j.legs){
   row.append(el('p','','🚌 '+leg.service),el('p','','● '+clock(leg.departure)+' · '+leg.from));
   if(leg.intermediateStops?.length){
    const stops=el('details',''),h=el('summary','','Köztes megállók ('+leg.intermediateStops.length+')');stops.append(h);
    for(const st of leg.intermediateStops)stops.append(el('p','','· '+clock(st.arrival)+' '+st.name));
    row.append(stops);
   }
   row.append(el('p','','● '+clock(leg.arrival)+' · '+leg.to));
  }
  results.append(row);
 }
 results.append(el('p','volan-gtfs-note-v990','Tervezett Volán GTFS · nincs élő késés, foglaltság vagy megállóváltozás.'));
 const y=Math.max(0,results.getBoundingClientRect().top+w.scrollY-8);
 w.scrollTo({top:y,behavior:w.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 tadaa();
}
find.addEventListener('click',search,true);
})(window,document);
