/* SH9 Smart Trip TripPack v1078: user-selected ChatGPT JSON to profile-local saved itinerary.
 * No model/API calls; imported transit claims never count as live-verified.
 */
(function(root,factory){
 'use strict';const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root){root.SH9_SMART_TRIP_PACK_V1078=api;api.mount(root,root.document)}
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SCHEMA='sh9.trip-pack/1',MAX_BYTES=60000,MAX_SAVED=20;
 const MODES=new Set(['walk','bus','tram','metro','train','hev','other']),STATES=new Set(['timetable','estimated','unknown']);
 const safe=(v,n=180)=>typeof v==='string'?v.replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,n):'';
 const take=(v,n)=>Array.isArray(v)?v.slice(0,n):[];
 const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
  Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
 const validHour=v=>v===null||v===undefined||v===''||typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
 const key=p=>'sh9-smart-trip-pack-v1078-'+(p==='m'?'m':'z');
 const icons={walk:'🚶',bus:'🚌',tram:'🚋',metro:'🚇',train:'🚆',hev:'🚈',other:'🚏'};
 function normalize(input){
  let raw=input;
  if(typeof raw==='string'){
   if(raw.length>MAX_BYTES)throw Error('A fájl túl nagy. Maximum 60 KB.');
   const data=raw.trim().replace(/^\x60{3}(?:json)?\s*/i,'').replace(/\s*\x60{3}$/,'');
   try{raw=JSON.parse(data)}catch(_){throw Error('Nem érvényes JSON-fájl.')}
  }
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==SCHEMA)
   throw Error('Nem SH9 TripPack v1 fájl.');
  if(!validDay(raw.travelDate))throw Error('Hibás utazási dátum.');
  const from=safe(raw.from),to=safe(raw.to),title=safe(raw.title,140);
  if(from.length<2||to.length<2||from===to)throw Error('Hiányzik az indulás vagy a cél.');
  if(!validHour(raw.departure)||!validHour(raw.arrival))throw Error('Hibás indulási vagy érkezési idő.');
  if(!Array.isArray(raw.segments)||raw.segments.length<2||raw.segments.length>24)
   throw Error('2–24 útvonalszakasz szükséges.');
  const segments=raw.segments.map((x,i)=>{
   if(!x||!MODES.has(x.mode)||!validHour(x.departure)||!validHour(x.arrival))
    throw Error('Hibás útvonalszakasz: '+(i+1));
   const a=safe(x.from,120),b=safe(x.to,120);
   if(!a||!b)throw Error('Hiányzó szakaszmegálló: '+(i+1));
   return {mode:x.mode,line:safe(x.line,55),from:a,to:b,departure:x.departure||null,
    arrival:x.arrival||null,status:STATES.has(x.status)?x.status:'unknown',note:safe(x.note,300)};
  });
  if(!segments.some(x=>x.mode!=='walk'))throw Error('Hiányzik a közlekedési járat.');
  const alerts=take(raw.alerts,12).map(x=>({title:safe(x?.title,100),text:safe(x?.text,400)})).filter(x=>x.title&&x.text);
  const alternatives=take(raw.alternatives,8).map(x=>safe(x,500)).filter(Boolean);
  const sources=take(raw.sources,12).map(x=>{
   const name=safe(x?.name,95);let url='';
   try{const u=new URL(x?.url||'');if(u.protocol==='https:'&&!u.username&&!u.password)url=u.href}catch(_){}
   return {name,url};
  }).filter(x=>x.name);
  return {schema:SCHEMA,title:title||from+' → '+to,travelDate:raw.travelDate,from,to,
   departure:raw.departure||null,arrival:raw.arrival||null,
   arrivalStatus:STATES.has(raw.arrivalStatus)?raw.arrivalStatus:'estimated',
   summary:safe(raw.summary,600),segments,alerts,alternatives,sources};
 }
 function read(storage,p){
  try{
   const list=JSON.parse(storage.getItem(key(p))||'[]');
   if(!Array.isArray(list))return [];
   return list.slice(0,MAX_SAVED).flatMap(r=>{
    try{const j=normalize(r);return typeof r.id==='string'&&r.id.startsWith('tp-')?
      [{...j,id:safe(r.id,70),savedAt:Number(r.savedAt)||0}]:[]}catch(_){return[]}
   });
  }catch(_){return[]}
 }
 function save(storage,p,input,now=Date.now(),entropy=Math.random()){
  const item=normalize(input),list=read(storage,p);
  const stamp=x=>[x.travelDate,x.from,x.to,x.departure,x.segments.map(s=>s.line+':'+s.departure).join('|')].join('|');
  const prev=list.find(x=>stamp(x)===stamp(item));
  const record={...item,id:prev?.id||'tp-'+now.toString(36)+'-'+Math.round(entropy*1e8).toString(36),savedAt:now};
  try{storage.setItem(key(p),JSON.stringify([record,...list.filter(x=>x.id!==record.id)].slice(0,MAX_SAVED)))}
  catch(_){throw Error('Nem sikerült elmenteni az útitervet a készüléken.')}
  return record;
 }
 function remove(storage,p,id){
  const list=read(storage,p);if(!list.some(x=>x.id===id))return false;
  try{storage.setItem(key(p),JSON.stringify(list.filter(x=>x.id!==id)));return true}catch(_){return false}
 }
 function mount(w,d){
  if(!w||!d)return;
  const $=id=>d.getElementById(id),viewer=$('st22TripPackDialog'),importer=$('st22TripImportDialog');
  if(!viewer||!importer)return;
  const body=$('st22TripPackBody'),pasted=$('st22TripPackPaste'),file=$('st22TripPackFile');
  const message=$('st22TripPackStatus');
  const active=()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}};
  const say=x=>{message.textContent=x};
  const node=(tag,cls,value,parent)=>{const e=d.createElement(tag);if(cls)e.className=cls;
   if(value!==undefined&&value!==null)e.textContent=String(value);if(parent)parent.appendChild(e);return e};
  const close=el=>{if(el?.open)el.close()};
  const name=m=>({walk:'Séta',bus:'Autóbusz',tram:'Villamos',metro:'Metró',train:'Vonat',hev:'HÉV',other:'Egyéb'}[m]||'Útvonal');
  const when=t=>t||'Időpont nem igazolt';
  const proof=s=>s==='timetable'?'📋 Menetrendi adat (AI állítása)':s==='estimated'?'≈ Becsült':'? Ellenőrizetlen';
  function show(j){
   body.replaceChildren();
   const head=node('header','st22-tp-head',null,body);
   node('div','st22-tp-eyebrow','✨ SH9 · SMART TRIP AI · MENTETT ÚTITERV',head);
   node('h2','',j.title,head);
   node('p','',j.travelDate+' · '+j.from+' → '+j.to,head);
   const stats=node('div','st22-tp-stats',null,body);
   node('span','','Indulás: '+when(j.departure),stats);
   node('span','','Érkezés: '+when(j.arrival)+' · '+proof(j.arrivalStatus),stats);
   if(j.summary)node('p','st22-tp-summary',j.summary,body);
   node('p','st22-tp-limitation','ℹ️ ChatGPT-ből importált terv, nem élőben hitelesített járatinformáció. Indulás előtt ellenőrizd az időpontokat.',body);
   const timeline=node('ol','st22-tp-timeline',null,body);
   for(const leg of j.segments){
    const row=node('li','st22-tp-step st22-tp-'+leg.mode,null,timeline);
    node('div','st22-tp-icon',icons[leg.mode],row);
    const detail=node('div','st22-tp-detail',null,row);
    node('strong','',when(leg.departure)+' · '+(leg.line?leg.line+' · ':'')+name(leg.mode),detail);
    node('span','',leg.from+' → '+leg.to,detail);
    node('small','',proof(leg.status)+(leg.note?' · '+leg.note:''),detail);
   }
   if(j.alerts.length){
    const warnings=node('section','st22-tp-alerts',null,body);
    node('h4','','⚠️ Figyelmeztetések',warnings);
    for(const a of j.alerts){const item=node('div','',null,warnings);
     node('strong','',a.title,item);node('p','',a.text,item)}
   }
   if(j.alternatives.length){
    node('h4','st22-tp-heading','🔄 B terv',body);
    for(const a of j.alternatives)node('p','st22-tp-note',a,body);
   }
   if(j.sources.length){
    node('h4','st22-tp-heading','Források',body);
    for(const source of j.sources){
     if(source.url){const a=node('a','st22-tp-source',source.name,body);
      a.href=source.url;a.rel='noopener noreferrer';a.target='_blank'}
     else node('p','st22-tp-note',source.name,body);
    }
   }
   if(!viewer.open)viewer.showModal();
  }
  function showSaved(){
   body.replaceChildren();
   const h=node('header','st22-tp-head',null,body);
   node('h2','','💾 Mentett útvonaltervek',h);
   const items=read(w.localStorage,active());
   if(!items.length)node('p','st22-tp-note','Még nincs elmentett teljes útvonalterv ezen a készüléken.',body);
   for(const trip of items){
    const row=node('div','st22-tp-saved',null,body);
    node('strong','',trip.title,row);node('small','',trip.travelDate+' · '+trip.from+' → '+trip.to,row);
    const actions=node('div','st22-tp-actions',null,row);
    node('button','', 'Megnyitás',actions).addEventListener('click',()=>show(trip));
    node('button','', 'Törlés',actions).addEventListener('click',()=>{
     if(remove(w.localStorage,active(),trip.id))showSaved();
    });
   }
   if(!viewer.open)viewer.showModal();
  }
  function doImport(data){
   try{const item=save(w.localStorage,active(),data);
    close(importer);say('✓ Útiterv mentve');show(item);
   }catch(e){say('⚠️ '+(e instanceof Error?e.message:'Nem sikerült importálni.'))}
  }
  $('st22TripPackImport')?.addEventListener('click',()=>{
   say('Válassz .json fájlt vagy illeszd be a TripPack JSON-t.');
   pasted.value='';file.value='';if(!importer.open)importer.showModal();
  });
  $('st22TripPackSaved')?.addEventListener('click',showSaved);
  $('st22TripPackImportClose')?.addEventListener('click',()=>close(importer));
  $('st22TripPackClose')?.addEventListener('click',()=>close(viewer));
  $('st22TripPackDoImport')?.addEventListener('click',()=>doImport(pasted.value));
  file?.addEventListener('change',async()=>{
   const f=file.files?.[0];if(!f)return;
   if(f.size>MAX_BYTES){say('A JSON-fájl maximum 60 KB lehet.');return}
   try{doImport(await f.text())}catch(_){say('Nem olvasható a fájl.')}
  });
  const ASK='Léna, exportáld az előző teljes útitervet letölthető JSON-fájlba, SH9 TripPack v1 formátumban. A séta és az összes járat külön szakasz legyen; a becsült időpontot estimated, a nem igazoltat unknown jelölje. Szerkezet: {"schema":"sh9.trip-pack/1","title":"...","travelDate":"YYYY-MM-DD","from":"...","to":"...","departure":"HH:mm","arrival":"HH:mm","arrivalStatus":"estimated","summary":"...","segments":[{"mode":"walk|bus|tram|metro|train|hev|other","line":"...","from":"...","to":"...","departure":"HH:mm vagy null","arrival":"HH:mm vagy null","status":"timetable|estimated|unknown","note":"..."}],"alerts":[{"title":"...","text":"..."}],"alternatives":["..."],"sources":[{"name":"...","url":"https://..."}]}. Ahol nincs megbízható adat, ne találj ki. Ne legyen benne HTML.';
  $('st22TripPackCopy')?.addEventListener('click',()=>{
   const cb=w.navigator?.clipboard;if(!cb?.writeText){say('A vágólap nem érhető el.');return}
   void cb.writeText(ASK).then(()=>say('✓ Exportkérés másolva. Illeszd be a ChatGPT-be.'),
    ()=>say('A másolás nem sikerült.'));
  });
  w.addEventListener('storage',e=>{if(e.key==='hh-profile'){close(viewer);close(importer)}});
 }
 return Object.freeze({normalize,read,save,remove,mount,SCHEMA,MAX_BYTES,MAX_SAVED});
});