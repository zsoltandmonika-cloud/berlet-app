/* Volan v996 original GTFS ZIP importer. Preserves the byte-identical archive in
 * IndexedDB; derived offline route index never discards optional GTFS fields. */
(function(w,d){'use strict';
const $=id=>d.getElementById(id),planner=$('planner'),find=$('find');if(!planner||!find)return;
const api=w.SH9_VOLAN_FULL_V996={installed:true,ready:false},DB='hh-volan-full-gtfs-v996';
let db,stops=[],stopById=new Map(),stopNames=[],stopIds=new Map(),services=new Map(),routes=new Map(),loading=false;
let placeIndex=null,isSearching=false;
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const tick=()=>new Promise(r=>setTimeout(r,0));
function openDB(){return new Promise((ok,bad)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>{const b=q.result;for(const [name,key] of [['meta','key'],['stops','id'],['routes','id'],['services','id'],['trips','id'],['index','id']])if(!b.objectStoreNames.contains(name))b.createObjectStore(name,{keyPath:key})};q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)})}
function write(name,rows){if(!rows.length)return Promise.resolve();return new Promise((ok,bad)=>{const t=db.transaction(name,'readwrite'),s=t.objectStore(name);for(const row of rows)s.put(row);t.oncomplete=ok;t.onerror=()=>bad(t.error);t.onabort=()=>bad(t.error)})}
function get(name,key){return new Promise((ok,bad)=>{const q=db.transaction(name,'readonly').objectStore(name).get(key);q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)})}
function getMany(name,keys){
 if(!keys.length)return Promise.resolve([]);
 return new Promise((ok,bad)=>{
  const found=[],tx=db.transaction(name,'readonly'),store=tx.objectStore(name);
  tx.onerror=()=>bad(tx.error);tx.onabort=()=>bad(tx.error);
  tx.oncomplete=()=>ok(found);
  for(const key of keys){const q=store.get(key);q.onsuccess=()=>{if(q.result)found.push(q.result)}}
 });
}
function all(name){return new Promise((ok,bad)=>{const q=db.transaction(name,'readonly').objectStore(name).getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>bad(q.error)})}
async function chunks(name,rows,n=550){for(let i=0;i<rows.length;i+=n){await write(name,rows.slice(i,i+n));if(i%5500===0)await tick()}}
function csv(line){let a=[],cell='',quote=false;for(let i=0;i<line.length;i++){let c=line[i];if(c==='"'){if(quote&&line[i+1]==='"'){cell+='"';i++}else quote=!quote}else if(c===','&&!quote){a.push(cell);cell=''}else cell+=c}a.push(cell.replace(/\r$/,''));return a}
function obj(fields,head){let o={};for(let i=0;i<head.length;i++)o[head[i]]=fields[i]||'';return o}
async function zipEntries(file){const tail=await file.slice(-65557).arrayBuffer(),v=new DataView(tail);let end=-1;for(let i=tail.byteLength-22;i>=0;i--)if(v.getUint32(i,true)===0x06054b50){end=i;break}if(end<0)throw Error('Hiányzik a ZIP központi könyvtára');const at=v.getUint32(end+16,true),len=v.getUint32(end+12,true),b=await file.slice(at,at+len).arrayBuffer(),view=new DataView(b),entries=new Map();for(let p=0;p+46<=b.byteLength;){if(view.getUint32(p,true)!==0x02014b50)break;let n=view.getUint16(p+28,true),x=view.getUint16(p+30,true),c=view.getUint16(p+32,true),name=new TextDecoder().decode(new Uint8Array(b,p+46,n));entries.set(name,{name,method:view.getUint16(p+10,true),size:view.getUint32(p+20,true),offset:view.getUint32(p+42,true)});p+=46+n+x+c}return entries}
async function streamZip(file,e){if(!e)throw Error('Hiányzó GTFS-fájl');const b=await file.slice(e.offset,e.offset+30).arrayBuffer(),v=new DataView(b);if(v.getUint32(0,true)!==0x04034b50)throw Error('Érvénytelen ZIP-elem');let at=e.offset+30+v.getUint16(26,true)+v.getUint16(28,true),s=file.slice(at,at+e.size).stream();if(e.method===8){try{s=s.pipeThrough(new DecompressionStream('deflate-raw'))}catch(err){throw Error('A böngésző nem támogatja a ZIP kibontását: '+err.message)}}else if(e.method!==0)throw Error('Nem támogatott ZIP-tömörítés');return s}
async function rows(file,entry,fn){const reader=(await streamZip(file,entry)).getReader(),decoder=new TextDecoder();let carry='',head=null,count=0;while(true){const r=await reader.read();carry+=r.done?decoder.decode():decoder.decode(r.value,{stream:true});let idx;while((idx=carry.indexOf('\n'))>=0){const line=carry.slice(0,idx);carry=carry.slice(idx+1);if(!line.trim())continue;const parts=csv(line);if(!head){head=parts.map(s=>s.replace(/^\ufeff/,''));continue}await fn(obj(parts,head),parts);if(++count%3500===0)await tick()}if(r.done)break}if(carry.trim()&&head){await fn(obj(csv(carry),head),csv(carry));count++}return count}
function minute(s){const m=/^(\d{1,2}):(\d\d):\d\d$/.exec(s||'');return m?Number(m[1])*60+Number(m[2]):NaN}
function day(dte){const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'});const p={};for(const t of fmt.formatToParts(dte))p[t.type]=t.value;return p.year+'-'+p.month+'-'+p.day}
function wall(ymd,m){const [yy,mm,dd]=ymd.split('-').map(Number),target=Date.UTC(yy,mm-1,dd)+m*60000;let guess=target-3600000;const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});for(let i=0;i<4;i++){const o={};for(const p of fmt.formatToParts(new Date(guess)))o[p.type]=Number(p.value);const diff=target-Date.UTC(o.year,o.month-1,o.day,o.hour,o.minute);guess+=diff;if(!diff)break}return guess}
function valid(s,dte){if(!s)return false;const y=dte.replaceAll('-','');if(Object.prototype.hasOwnProperty.call(s.except,y))return s.except[y]===1;if(y<s.from||y>s.to)return false;const wd=(new Date(dte+'T12:00:00Z').getUTCDay()+6)%7;return s.days[wd]==='1'}
const panel=d.createElement('details');panel.className='volan-full-v996';panel.open=true;
panel.innerHTML='<summary>🚌 Teljes Volán GTFS · eredeti ZIP</summary><div class="volan-full-body"><p>Teljes országos menetrend. Egyszeri ZIP-import; az eredeti fájl minden adata megmarad ezen a készüléken.</p><input id="volan-full-file" type="file" accept=".zip,application/zip" aria-label="Eredeti Volán GTFS ZIP"><progress id="volan-full-progress" max="100" value="0" hidden></progress><p id="volan-full-status" role="status">Helyi állomány keresése…</p><button type="button" id="volan-full-backup" hidden>Eredeti ZIP exportálása</button></div>';
planner.append(panel);
const input=$('volan-full-file'),progress=$('volan-full-progress'),status=$('volan-full-status'),backup=$('volan-full-backup');
const old=d.querySelector('.volan-gtfs-v990');if(old)old.hidden=true;
const results=$('volanGtfsResultsV990');
function message(t,p){status.textContent=t;if(p!==undefined){progress.hidden=false;progress.value=p}}
async function ready(){db=db||await openDB();const done=await get('meta','complete');if(!done?.value){message('Az eredeti Volán ZIP-et egyszer be kell tölteni ezen a készüléken.');return}stops=await all('stops');placeIndex=w.SH9_VOLAN_STOP_RESOLVER_V998?.create(stops)||null;stopById=new Map(stops.map(s=>[s.id,s]));let unique=new Map();stopIds=new Map();for(const s of stops){let n=norm(s.name);if(!stopIds.has(n))stopIds.set(n,[]);stopIds.get(n).push(s.id);if(!unique.has(s.name))unique.set(s.name,n)}stopNames=[...unique].map(([name,norm])=>({name,norm}));services=new Map((await all('services')).map(s=>[s.id,s]));routes=new Map((await all('routes')).map(s=>[s.id,s]));api.ready=true;input.hidden=true;backup.hidden=false;progress.hidden=true;message('✅ Teljes GTFS · '+done.trips.toLocaleString('hu-HU')+' járat · '+stops.length.toLocaleString('hu-HU')+' megálló. Eredeti ZIP megőrizve.');panel.open=false}
ready().catch(e=>message('Helyi adatbázis hiba: '+e.message));
async function importZip(file){if(loading)return;loading=true;api.ready=false;input.disabled=true;try{
if(!/\.zip$/i.test(file.name))throw Error('A teljes, eredeti GTFS ZIP-et válaszd ki');
if(!('DecompressionStream' in w))throw Error('Friss Chrome/Edge böngésző szükséges a ZIP-hez');
message('Eredeti ZIP ellenőrzése…',1);const entries=await zipEntries(file);for(const f of ['stops.txt','routes.txt','trips.txt','calendar.txt','calendar_dates.txt','stop_times.txt'])if(!entries.has(f))throw Error('Hiányzó GTFS-adat: '+f);
db=db||await openDB();await write('meta',[{key:'complete',value:false}]);message('Eredeti 100 MB-os ZIP változatlan megőrzése…',3);await write('meta',[{key:'original',blob:file,name:file.name,bytes:file.size,date:new Date().toISOString()}]);
const stopsBuf=[];message('Megállók importálása…',7);await rows(file,entries.get('stops.txt'),o=>stopsBuf.push({id:o.stop_id,name:o.stop_name,lat:Number(o.stop_lat),lon:Number(o.stop_lon),location:o.location_type,parent:o.parent_station,platform:o.platform_code}));await chunks('stops',stopsBuf);
const routesBuf=[];message('Vonalak és részletes metaadatok…',14);await rows(file,entries.get('routes.txt'),o=>routesBuf.push({id:o.route_id,number:o.route_short_name,name:o.route_long_name,raw:o}));await chunks('routes',routesBuf);
const sv=new Map();message('Teljes menetrendi naptár…',19);await rows(file,entries.get('calendar.txt'),o=>sv.set(o.service_id,{id:o.service_id,from:o.start_date,to:o.end_date,days:[o.monday,o.tuesday,o.wednesday,o.thursday,o.friday,o.saturday,o.sunday].join(''),except:{},description:o.service_desc}));await rows(file,entries.get('calendar_dates.txt'),o=>{if(!sv.has(o.service_id))sv.set(o.service_id,{id:o.service_id,from:'99991231',to:'00000000',days:'0000000',except:{}});sv.get(o.service_id).except[o.date]=Number(o.exception_type)===1?1:0});await chunks('services',[...sv.values()]);
const tripMeta=new Map();message('Járatok és akadálymentességi információk…',24);await rows(file,entries.get('trips.txt'),o=>tripMeta.set(o.trip_id,{id:o.trip_id,route:o.route_id,service:o.service_id,number:o.trip_short_name,headsign:o.trip_headsign,wheelchair:o.wheelchair_accessible,shape:o.shape_id,raw:o}));
message('1,6 millió megállási idő és fel-/leszállási szabály…',27);
let current='',sequence=[],batch=[],count=0,stopCount=0;const byStop=new Map();
async function flush(){if(!current)return;let m=tripMeta.get(current);if(m&&sequence.length>=2){batch.push({...m,stops:sequence});for(let i=0;i<sequence.length;i++){let s=sequence[i];if(!byStop.has(s[0]))byStop.set(s[0],[]);byStop.get(s[0]).push([current,i,s[2]])}count++}if(batch.length>=450){await write('trips',batch);batch=[];if(count%9000<450){message('Feldolgozott járatok: '+count.toLocaleString('hu-HU')+' / '+tripMeta.size.toLocaleString('hu-HU'),27+Math.floor(count/tripMeta.size*52));await tick()}}}
await rows(file,entries.get('stop_times.txt'),async o=>{if(o.trip_id!==current){await flush();current=o.trip_id;sequence=[]}const a=minute(o.arrival_time),b=minute(o.departure_time);if(!Number.isFinite(a)||!Number.isFinite(b))return;sequence.push([o.stop_id,a,b,o.pickup_type,o.drop_off_type,Number(o.stop_sequence),o.shape_dist_traveled]);stopCount++});
await flush();await write('trips',batch);
message('Országos keresőindex mentése…',81);let out=[],done=0;for(const [id,refs] of byStop){out.push({id,refs});if(out.length>=100){await write('index',out);done+=out.length;out=[];if(done%2500<100){message('Keresőindex: '+done.toLocaleString('hu-HU')+' / '+byStop.size.toLocaleString('hu-HU'),81+Math.floor(done/byStop.size*17));await tick()}}}await write('index',out);
await write('meta',[{key:'complete',value:true,trips:count,stopTimes:stopCount,stops:stopsBuf.length,bytes:file.size}]);message('✅ Teljes eredeti GTFS feldolgozva; minden eredeti adat megőrizve.',100);await ready()
}catch(e){message('⚠️ Importálási hiba: '+e.message);console.error('Volán ZIP import:',e)}finally{loading=false;input.disabled=false}}
input.addEventListener('change',()=>{const f=input.files?.[0];if(f)importZip(f);input.value=''});
backup.addEventListener('click',async()=>{const o=await get('meta','original');if(!o?.blob){message('A ZIP nem található a helyi tárolóban');return}const url=URL.createObjectURL(o.blob),a=d.createElement('a');a.href=url;a.download=o.name||'volanbusz_gtfs.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)});
const suggest=d.createElement('div');suggest.className='volan-full-suggest';suggest.hidden=true;d.body.append(suggest);let focused=null;
function locate(){if(!focused)return;const r=focused.getBoundingClientRect(),h=w.visualViewport?.height||w.innerHeight;suggest.style.left=Math.max(8,r.left)+'px';suggest.style.width=Math.min(w.innerWidth-16,Math.max(260,r.width+100))+'px';suggest.style.top=(r.bottom+245<h?r.bottom+5:Math.max(8,r.top-245))+'px'}
function predictive(input){
 focused=input;suggest.replaceChildren();
 if(!api.ready||!placeIndex||norm(input.value).length<2){suggest.hidden=true;return}
 const entries=placeIndex.suggest(input.value,9);
 for(const item of entries){
  const b=d.createElement('button');b.type='button';
  b.classList.add('volan-suggestion-v998',item.kind==='city'?'volan-suggestion-city-v998':'volan-suggestion-stop-v998');
  const label=d.createElement('strong');label.textContent=(item.kind==='city'?'🏙️ ':'🚏 ')+item.label;
  const hint=d.createElement('small');hint.textContent=item.caption;
  b.append(label,hint);
  b.addEventListener('pointerdown',e=>e.preventDefault());
  b.addEventListener('click',()=>{input.value=item.label;suggest.hidden=true;input.dispatchEvent(new Event('change',{bubbles:true}));input.blur()});
  suggest.append(b);
 }
 suggest.hidden=!entries.length;locate()
}
for(const id of ['from','to']){let input=$(id);if(!input)continue;input.removeAttribute('list');input.addEventListener('input',()=>predictive(input));input.addEventListener('focus',()=>predictive(input));input.addEventListener('blur',()=>setTimeout(()=>suggest.hidden=true,280))}
(w.visualViewport||w).addEventListener('resize',locate);
const hh=t=>new Intl.DateTimeFormat('hu-HU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'}).format(new Date(t));
function display(list,from,to,when){if(!results)return;try{if(w.SH9_VOLAN_RESULTS_V997?.render?.({list,from,to,when,results,stopById,wall}))return}catch(err){console.error('Golden Standard render hiba, visszaállítás:',err)}results.replaceChildren();const title=d.createElement('h3');title.textContent=list.length+' menetrendi útvonal';results.append(title);const caption=d.createElement('p');caption.textContent=from+' → '+to+' · '+when.toLocaleString('hu-HU');results.append(caption);if(!list.length){const n=d.createElement('p');n.textContent='Ebben az időablakban nincs közvetlen járat. Az átszállásos keresés külön fejlesztési lépés.';results.append(n)}for(const j of list.slice(0,40)){const card=d.createElement('details');card.className='volan-trip-v990';const head=d.createElement('summary');head.textContent=hh(j.depart)+' → '+hh(j.arrive)+' · '+j.route.number+' · '+Math.round((j.arrive-j.depart)/60000)+' perc';card.append(head);const line=d.createElement('p');line.textContent='🚌 '+(j.trip.number||'')+' · '+(j.trip.headsign||j.route.name||'');card.append(line);for(const s of j.trip.stops.slice(j.start,j.end+1)){const p=d.createElement('p'),stop=stopById.get(s[0]);p.textContent='• '+hh(wall(j.day,s[1]))+' '+(stop?.name||s[0])+(s[2]-s[1]>=10?' · '+(s[2]-s[1])+' perc állás (WC nem igazolt)':'');card.append(p)}results.append(card)}w.scrollTo({top:Math.max(0,results.getBoundingClientRect().top+w.scrollY-8),behavior:'smooth'})}
async function search(e){
 e.preventDefault();e.stopImmediatePropagation();
 if(isSearching)return;
 if(!api.ready||!placeIndex){panel.open=true;message('A teljes GTFS még nem áll készen.');return}
 const from=$('from')?.value.trim(),to=$('to')?.value.trim();
 const origin=placeIndex.resolve(from),destination=placeIndex.resolve(to);
 if(!origin.ids.length||!destination.ids.length){
  panel.open=true;
  const missing=[!origin.ids.length?'indulás':'',!destination.ids.length?'érkezés':''].filter(Boolean).join(' és ');
  message('Nem egyértelmű '+missing+'. Írj be egy várost vagy pontos megállót; a kereséshez NEM kell tudnod a buszpályaudvar nevét.');
  return;
 }
 if(origin.normalized===destination.normalized){message('Az indulási és célváros nem lehet ugyanaz.');return}
 const mode=d.querySelector('[data-mode].on')?.dataset.mode||'now';
 const when=mode==='now'?new Date():new Date(($('rail-date')?.value||'')+'T'+($('rail-time')?.value||'')+':00');
 if(!Number.isFinite(when.getTime())){message('Hibás dátum vagy időpont.');return}
 isSearching=true;
 try{
  const pivot=when.getTime(),start=mode==='arrive'?pivot-12*3600000:pivot,end=mode==='arrive'?pivot:pivot+12*3600000;
  const dates=[-1,0,1].map(n=>day(new Date(pivot+n*86400000)));
  message('🔎 '+origin.label+' ('+origin.ids.length+' megállórekord) → '+destination.label+' ('+destination.ids.length+' megállórekord) · keresés…');
  // All city stop IDs are considered. The full GTFS remains unchanged.
  // One IndexedDB transaction per batch avoids thousands of sequential DB opens.
  const startIndexes=await getMany('index',origin.ids),dest=new Set(destination.ids),candidatePositions=new Map();
  for(const ix of startIndexes)for(const [id,pos,mins] of ix.refs||[]){
   if(!candidatePositions.has(id))candidatePositions.set(id,new Map());
   candidatePositions.get(id).set(pos,mins);
  }
  const tripIds=[...candidatePositions.keys()],res=[],seen=new Set();
  const active=new Map(),epoch=new Map();
  const isActive=(service,ymd)=>{
   const k=service+'|'+ymd;
   if(!active.has(k))active.set(k,valid(services.get(service),ymd));
   return active.get(k);
  };
  const at=(ymd,mins)=>{
   const k=ymd+'|'+mins;if(!epoch.has(k))epoch.set(k,wall(ymd,mins));return epoch.get(k);
  };
  for(let i=0;i<tripIds.length;i+=250){
   const batch=await getMany('trips',tripIds.slice(i,i+250));
   for(const trip of batch){
    const positions=candidatePositions.get(trip.id);
    if(!positions)continue;
    for(const ymd of dates){
     if(!isActive(trip.service,ymd))continue;
     for(const [pos,mins] of positions){
      const dep=at(ymd,mins);
      if(dep<start||dep>end||trip.stops[pos]?.[3]==='1')continue;
      for(let j=pos+1;j<trip.stops.length;j++){
       const s=trip.stops[j];if(!dest.has(s[0])||s[4]==='1')continue;
       const arr=at(ymd,s[1]);
       if(arr<=dep||arr>end)continue;
       const key=trip.id+'|'+ymd+'|'+pos+'|'+j;
       if(seen.has(key))continue;seen.add(key);
       res.push({trip,route:routes.get(trip.route)||{},start:pos,end:j,day:ymd,depart:dep,arrive:arr});
      }
     }
    }
   }
   if(i%1250===0){message('🚌 '+origin.label+' → '+destination.label+' · '+Math.min(i+250,tripIds.length).toLocaleString('hu-HU')+'/'+tripIds.length.toLocaleString('hu-HU')+' járat ellenőrizve');await tick()}
  }
  res.sort((a,b)=>mode==='arrive'?b.arrive-a.arrive:a.depart-b.depart||a.arrive-b.arrive);
  display(res,from,to,when);
  message('✅ '+res.length+' közvetlen menetrendi útvonal · '+origin.label+' → '+destination.label+'. A kártyák mutatják a pontos induló- és célmegállót.');
 }catch(err){console.error('Volán Smart Search:',err);message('⚠️ A keresés nem sikerült: '+err.message)}
 finally{isSearching=false}
}
planner.addEventListener('click',e=>{if(e.target===find||e.target.closest?.('#find'))search(e)},true);
})(window,document);