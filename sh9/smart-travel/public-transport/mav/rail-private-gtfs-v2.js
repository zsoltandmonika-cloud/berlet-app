/* SH9 Smart Rail · v2 private full-network MÁV GTFS importer.
 * No published train data, no external uploads, no Supabase, no tracking.
 * Operator-selected local-only JSON stays in this browser's IndexedDB.
 */
(function(w,d){
'use strict';
if(!w||!d)return;
const engine=w.SH9_MAV_GTFS_CORE_V1,ui=w.SH9_MAV_JOURNEYS_INSTANCE;
const $=id=>d.getElementById(id);
const planner=$('planner'),search=$('find'),refresh=$('refresh');
if(!engine||!ui?.showTimetable||!planner||!search||!refresh)return;
const DB='sh9-mav-private-gtfs-v2',STORE='datasets',KEY='household';
const MAX_FILE=22*1024*1024;
const prevFind=search.onclick,prevRefresh=refresh.onclick;
let data=null,processing=false,dbPromise=null,stationNames=[];
const section=d.createElement('details');
section.className='rail-private-gtfs-v2';
section.id='railPrivateGTFSV2';
const summary=d.createElement('summary');
summary.textContent='🚆 MÁV GTFS · saját menetrend betöltése';
const body=d.createElement('div');body.className='rail-private-gtfs-body-v2';
const expl=d.createElement('p');
expl.textContent='Az eredeti MÁV GTFS-ből készített helyi JSON-fájlt válaszd ki. Az adatok csak ezen a készüléken maradnak, nem kerülnek GitHubra, Dropboxba vagy a Supabase-be.';
const line=d.createElement('div');line.className='rail-private-gtfs-acts-v2';
const input=d.createElement('input');input.type='file';input.accept='.json,application/json';
input.id='railPrivateFileV2';input.setAttribute('aria-label','Saját MÁV menetrendi JSON betöltése');
const remove=d.createElement('button');remove.type='button';remove.textContent='Adatok törlése';
remove.id='railPrivateRemoveV2';
line.append(input,remove);
const info=d.createElement('p');info.id='railPrivateStatusV2';
info.className='rail-private-gtfs-status-v2';info.setAttribute('role','status');
info.setAttribute('aria-live','polite');
info.textContent='Helyi menetrend ellenőrzése…';
const hint=d.createElement('small');
hint.textContent='Menetrend szerinti, nem élő: késés és vágányadat nincs. A keresés a szokásos Útvonal keresése gombbal működik.';
body.append(expl,line,info,hint);
section.append(summary,body);
const quick=planner.querySelector('.rail-journey-quick')||planner.querySelector('.rail-journey-quick-v607');
if(quick)quick.insertAdjacentElement('afterend',section);
else planner.append(section);
function status(text){info.textContent=text}
function openDB(){
 if(dbPromise)return dbPromise;
 dbPromise=new Promise((resolve,reject)=>{
  if(!w.indexedDB){reject(Error('Az eszközön nem érhető el az IndexedDB-tároló.'));return}
  const req=w.indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Nem sikerült megnyitni a helyi tárhelyet.'));
 });
 return dbPromise;
}
async function readStored(){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const req=db.transaction(STORE,'readonly').objectStore(STORE).get(KEY);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>reject(req.error||Error('Nem olvasható a mentett menetrend.'));
 });
}
async function saveStored(value){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).put(value,KEY);
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||Error('Nem menthető a helyi menetrend.'));
  tx.onabort=()=>reject(tx.error||Error('A menetrend mentése megszakadt.'));
 });
}
async function clearStored(){
 const db=await openDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.objectStore(STORE).delete(KEY);
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||Error('Nem törölhető a helyi menetrend.'));
 });
}
function verified(raw){
 if(!raw||raw.rightsConfirmed!==false||raw.localOnly!==true||
   raw.schema!=='sh9-mav-gtfs-v1'||!engine.validate(raw,{allowPrivate:true}))return null;
 const start=String(raw.feedStart||''),end=String(raw.feedEnd||'');
 if(start&&!/^\d{8}$/.test(start)||end&&!/^\d{8}$/.test(end))return null;
 return raw;
}
function activate(raw){
 data=verified(raw);
 if(!data)return false;
 const stations=d.getElementById('rail-popular-stations');
 // All published GTFS station names are searchable, without uploading any
 // addresses. A bounded datalist avoids rendering 1200 options on S24.
 stationNames=[...new Set(data.stops.map(row=>row[1]))].sort((a,b)=>a.localeCompare(b,'hu'));
 const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu-HU');
 function suggestions(term){
  if(!stations)return;
  const t=fold(term).trim();
  const matching=t?stationNames.filter(n=>fold(n).includes(t)).slice(0,45):stationNames.filter(n=>
   /Budapest-Keleti|Budapest-Nyugati|Budapest-Déli|Miskolc-Tiszai|Kazincbarcika|Budapest-Kelenföld/.test(n)).slice(0,45);
  const frag=d.createDocumentFragment();
  for(const name of matching){
   const option=d.createElement('option');option.value=name;frag.append(option);
  }
  stations.replaceChildren(frag);
 }
 for(const key of ['from','to']){
  const field=$(key);if(!field||field.dataset.localGtfsSuggest==='yes')continue;
  field.dataset.localGtfsSuggest='yes';
  field.setAttribute('list','rail-popular-stations');
  field.addEventListener('input',()=>suggestions(field.value));
  field.addEventListener('focus',()=>suggestions(field.value));
 }
 suggestions($('from')?.value||'');
 status('✓ Saját MÁV menetrend használatra kész · '+data.trips.length.toLocaleString('hu-HU')+
  ' menet · '+stationNames.length.toLocaleString('hu-HU')+' állomás · verzió: '+
  String(data.feedVersion||'ismeretlen').slice(0,70)+'.');
 summary.textContent='✅ MÁV GTFS · saját menetrend aktív';
 return true;
}
function searchRoute(fallback){
 if(processing)return;
 if(!data){
  if(typeof fallback==='function')fallback();
  status('Nincs betöltött helyi menetrend. Válaszd ki a saját JSON-fájlt.');
  section.open=true;return;
 }
 const q=ui.currentQuery();
 if(!q){status('Add meg a két különböző állomást és az időpontot.');return}
 // Search is purely local. Synchronous route matching may be intensive for
 // 32k trips, but never spends network quota or polls a live service.
 processing=true;search.disabled=true;refresh.disabled=true;
 status('Vonatok keresése a helyi MÁV menetrendben…');
 w.setTimeout(()=>{
  try{
   const result=engine.route(data,q,{limit:3,maxTransfers:1,localOnly:true});
   ui.showTimetable(result,q);
   status(result.status==='ok'?
    'MÁV GTFS · '+result.journeys.length+' menetrendi útvonal · nem élő késés/vágány':
    'A menetrendi keresés nem adott ellenőrzött találatot. Ellenőrizd az állomások nevét.');
   d.getElementById('rail-journey-result')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(_){status('A helyi menetrend feldolgozása nem sikerült. Használd a MÁVPlusz-t.')}
  finally{processing=false;search.disabled=false;refresh.disabled=false}
 },0);
}
search.onclick=()=>searchRoute(prevFind);
refresh.onclick=()=>searchRoute(prevRefresh);
input.addEventListener('change',async()=>{
 const file=input.files?.[0];if(!file)return;
 input.disabled=true;status('Helyi fájl ellenőrzése…');
 try{
  if(file.size>MAX_FILE)throw Error('A JSON-fájl túl nagy (max. 22 MB).');
  const raw=JSON.parse(await file.text());
  if(!activate(raw))throw Error('Nem ellenőrzött, vagy nem saját használatra készített GTFS-állomány.');
  try{await saveStored(raw);status(info.textContent+' Az adatok mentve erre az eszközre.')}
  catch(_){status(info.textContent+' Figyelem: a böngésző nem tudta tartósan menteni; frissítés után újra be kell tölteni.')}
 }catch(e){status('⚠️ '+String(e?.message||'Nem sikerült beolvasni a GTFS-fájlt.'))}
 finally{input.value='';input.disabled=false}
});
remove.addEventListener('click',async()=>{
 try{
  await clearStored();data=null;stationNames=[];status('A saját menetrend törölve. A MÁV hivatalos keresője továbbra is elérhető.');
  summary.textContent='🚆 MÁV GTFS · saját menetrend betöltése';
 }catch(_){status('A helyi tároló törlése nem sikerült.')}
});
readStored().then(raw=>{
 if(!raw){status('Még nincs saját MÁV GTFS-fájl betöltve.');return}
 if(!activate(raw))status('A korábban mentett menetrend hibás vagy nem támogatott.');
}).catch(()=>status('Nem érhető el a helyi tároló. A JSON-fájlt ettől még kipróbálhatod.'));
w.SH9_MAV_PRIVATE_GTFS_V2=Object.freeze({get active(){return !!data},version:'2'});
})(typeof window!=='undefined'?window:null,typeof document!=='undefined'?document:null);
