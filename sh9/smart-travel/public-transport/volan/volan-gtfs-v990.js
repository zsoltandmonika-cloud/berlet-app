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
/* v994: same device-local persistence principle as MÁV, no cloud traffic. */
const DB='sh9-volan-private-gtfs-v994',KEY='pilot';
function store(mode,payload){
 return new Promise((resolve,reject)=>{
  if(!w.indexedDB){reject(Error('Helyi tároló nem elérhető'));return}
  const req=w.indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('data'))req.result.createObjectStore('data')};
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{
   const db=req.result,tx=db.transaction('data',mode==='read'?'readonly':'readwrite');
   const op=mode==='read'?tx.objectStore('data').get(KEY):tx.objectStore('data').put(payload,KEY);
   op.onsuccess=()=>resolve(op.result);
   op.onerror=()=>reject(op.error);
   tx.oncomplete=()=>db.close();
  };
 });
}
store('read').then(raw=>{
 if(!raw||!core.validate(raw,{allowPrivate:true})||!String(raw.source||'').includes('Volán'))return;
 data=raw;status.textContent='✅ Helyi Volán menetrend visszatöltve · '+raw.trips.length+' járat · '+raw.stops.length+' megálló.';
 for(const id of ['from','to']){const input=$(id);if(input)renderStops(input,d.getElementById('volanStopsV993-'+id))}
}).catch(()=>{});

const normal=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
for(const id of ['from','to']){
 const input=$(id);if(!input)continue;
 const suggestions=d.createElement('datalist');suggestions.id='volanStopsV993-'+id;
 input.setAttribute('list',suggestions.id);input.setAttribute('autocomplete','off');input.parentElement?.append(suggestions);
 input.addEventListener('input',()=>renderStops(input,suggestions));
 input.addEventListener('focus',()=>renderStops(input,suggestions));
}
/* v995: Android-friendly tappable suggestions, without remote queries. */
for(const id of ['from','to']){
 const input=$(id);if(!input)continue;
 const list=d.createElement('div');list.id='volanPredictV995-'+id;
 list.className='volan-predict-v995';list.hidden=true;
 input.parentElement?.append(list);
 input.addEventListener('input',()=>predict(input,list));
 input.addEventListener('focus',()=>predict(input,list));
 input.addEventListener('blur',()=>w.setTimeout(()=>{list.hidden=true},180));
}
function predict(input,list){
 list.replaceChildren();
 if(!data||input.value.trim().length<2){list.hidden=true;return}
 const needle=normal(input.value);
 const names=[...new Set(data.stops.map(x=>x[1]))].filter(x=>normal(x).includes(needle));
 names.sort((a,b)=>Number(normal(b).startsWith(needle))-Number(normal(a).startsWith(needle))||a.localeCompare(b,'hu'));
 for(const name of names.slice(0,10)){
  const b=d.createElement('button');b.type='button';b.textContent='🚌 '+name;
  b.addEventListener('pointerdown',e=>e.preventDefault());
  b.addEventListener('click',()=>{input.value=name;list.hidden=true;input.dispatchEvent(new Event('change',{bubbles:true}));input.blur()});
  list.append(b);
 }
 list.hidden=!names.length;
}
function renderStops(input,target){
 target.replaceChildren();if(!data)return;
 const needle=normal(input.value),seen=new Set(),names=[];
 for(const item of data.stops){
  const name=item[1],normalized=normal(name);
  if(seen.has(name)||needle&&!normalized.includes(needle))continue;
  seen.add(name);names.push(name);
 }
 names.sort((a,b)=>{const aa=normal(a),bb=normal(b);return Number(bb.startsWith(needle))-Number(aa.startsWith(needle))||a.localeCompare(b,'hu')});
 for(const name of names.slice(0,24)){const option=d.createElement('option');option.value=name;target.append(option)}
}

file.addEventListener('change',async()=>{
 const f=file.files?.[0];if(!f)return;
 try{
  if(f.size>22*1024*1024)throw Error('22 MB-nál nagyobb fájl nem tölthető be.');
  const raw=JSON.parse(await f.text());
  if(!core.validate(raw,{allowPrivate:true})||!String(raw.source||'').includes('Volán'))throw Error('Nem megfelelő Volán menetrendi fájl.');
  data=raw;store('write',raw).catch(()=>{status.textContent='⚠️ A menetrend most használható, de nem sikerült tartósan menteni.'});for(const id of ['from','to']){const input=$(id);if(input)renderStops(input,d.getElementById('volanStopsV993-'+id))}status.textContent='✅ Volán menetrend betöltve · '+raw.trips.length+' járat · '+raw.stops.length+' megálló.';
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
 let from=$('from')?.value.trim(),to=$('to')?.value.trim();
 const available=new Set(data.stops.map(x=>x[1]));
 if(!available.has(from)&&normal(from)==='budapest, autobusz-allomas'&&available.has('Budapest, Stadion autóbusz-pályaudvar')){
  from='Budapest, Stadion autóbusz-pályaudvar';$('from').value=from;
 }
 if(!available.has(from)||!available.has(to)){
  status.textContent='Válassz a betöltött GTFS-ben szereplő pontos megállónevet (például Budapest, Stadion autóbusz-pályaudvar).';
  box.open=true;return;
 }
 if(!from||!to||from===to){status.textContent='Két különböző buszmegálló szükséges.';return}
 const mode=d.querySelector('[data-mode].on')?.dataset.mode||'now';
 const date=$('rail-date')?.value,time=$('rail-time')?.value;
 const when=mode==='now'?new Date():new Date(date+'T'+time+':00');
 if(!Number.isFinite(when.getTime())){status.textContent='Hibás dátum vagy időpont.';return}
 status.textContent='Keresés · '+from+' → '+to+' · '+new Intl.DateTimeFormat('hu-HU',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Budapest'}).format(when);
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
