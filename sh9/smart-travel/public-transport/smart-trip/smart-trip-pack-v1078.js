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
  const timeToMinute=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s)?
    Number(s.slice(0,2))*60+Number(s.slice(3,5)):null;
  function metrics(trip){
   const a=timeToMinute(trip.departure),b=timeToMinute(trip.arrival);
   const minutes=a===null||b===null?null:(b>=a?b-a:1440-a+b);
   const rides=trip.segments.filter(s=>s.mode!=='walk').length;
   return {duration:minutes===null?'Nem ismert':Math.floor(minutes/60)+' ó '+String(minutes%60).padStart(2,'0')+' p',
    transfers:Math.max(0,rides-1)};
  }
  const progressKey=(p,id)=>key(p)+'-manual-step-'+safe(id,70);
  function progress(trip,p){
   if(!trip?.id)return -1;
   try{
    const raw=w.localStorage.getItem(progressKey(p,trip.id));
    if(raw===null)return -1;
    const v=Number(raw);
    return Number.isInteger(v)&&v>=0&&v<=trip.segments.length?v:-1;
   }catch(_){return -1}
  }
  function setProgress(trip,p,step){
   if(!trip?.id||step<0||step>trip.segments.length)return false;
   try{w.localStorage.setItem(progressKey(p,trip.id),String(step));return true}catch(_){return false}
  }
  const progressLabel=(trip,p)=>{
   const step=progress(trip,p);
   return step===trip.segments.length?'✓ Befejezett':step>=0?'▶ Folyamatban · '+(step+1)+'/'+trip.segments.length:'◷ Tervezett';
  };
  function show(j){
   body.replaceChildren();body.scrollTop=0;
   const p=active(),m=metrics(j),at=progress(j,p);
   const head=node('header','st22-tp-head st22-tp-head-golden',null,body);
   const pre=node('div','st22-tp-pretitle',null,head);
   node('span','st22-tp-eyebrow','✦ SH9 · SMART TRIP AI',pre);
   node('span','st22-tp-datestamp',j.travelDate,pre);
   node('h2','',j.title,head);
   const journey=node('div','st22-tp-directions',null,head);
   node('span','',j.from,journey);node('span','st22-tp-route-arrow','→',journey);node('span','',j.to,journey);
   const times=node('div','st22-tp-clock-grid',null,head);
   const begin=node('div','st22-tp-clock',null,times);
   node('small','','INDULÁS',begin);node('strong','',when(j.departure),begin);
   const finish=node('div','st22-tp-clock',null,times);
   node('small','','ÉRKEZÉS',finish);node('strong','',when(j.arrival),finish);
   const stats=node('div','st22-tp-metrics',null,head);
   const duration=node('div','st22-tp-metric',null,stats);
   node('small','','TELJES MENETIDŐ',duration);node('strong','',m.duration,duration);
   const transfers=node('div','st22-tp-metric',null,stats);
   node('small','','ÁTSZÁLLÁSOK',transfers);node('strong','',String(m.transfers),transfers);
   const confidence=node('div','st22-tp-metric',null,stats);
   node('small','','ÉRKEZÉS STÁTUSZA',confidence);
   node('strong','',j.arrivalStatus==='timetable'?'Menetrendi':j.arrivalStatus==='estimated'?'Becsült':'Ellenőrizetlen',confidence);
   const tripStatus=node('div','st22-tp-trip-state',null,body);
   node('strong','',progressLabel(j,p),tripStatus);
   node('span','','Manuális követés · nem GPS vagy élő menetrend',tripStatus);
   if(j.summary)node('p','st22-tp-summary',j.summary,body);
   node('h3','st22-tp-timeline-title','Útvonal lépésről lépésre',body);
   const timeline=node('ol','st22-tp-timeline',null,body);
   for(let i=0;i<j.segments.length;i++){
    const leg=j.segments[i];
    const cls=at===j.segments.length||at>=0&&i<at?' st22-tp-done':at===i?' st22-tp-current':'';
    const row=node('li','st22-tp-step st22-tp-'+leg.mode+cls,null,timeline);
    node('div','st22-tp-icon',at===j.segments.length||at>=0&&i<at?'✓':icons[leg.mode],row);
    const detail=node('div','st22-tp-detail',null,row);
    const line=node('div','st22-tp-line',null,detail);
    node('strong','st22-tp-time',when(leg.departure),line);
    if(leg.line)node('span','st22-tp-service',leg.line,line);
    node('span','st22-tp-mode',name(leg.mode),line);
    node('span','st22-tp-stops',leg.from+' → '+leg.to,detail);
    node('small','st22-tp-proof',proof(leg.status)+(leg.note?' · '+leg.note:''),detail);
   }
   if(j.id){
    const controls=node('div','st22-tp-follow-actions',null,body);
    const next=node('button','st22-tp-next','',controls);
    next.textContent=at<0?'▶ Utazás indítása':at>=j.segments.length?'✓ Utazás befejezve':
      at===j.segments.length-1?'🏁 Utazás befejezése':'✓ Következő szakasz';
    next.disabled=at>=j.segments.length;
    next.addEventListener('click',()=>{if(setProgress(j,p,at+1))show(j)});
    if(at>=0){
     const reset=node('button','st22-tp-reset','↺ Követés újrakezdése',controls);
     reset.addEventListener('click',()=>{if(setProgress(j,p,0))show(j)});
    }
   }
   if(j.alerts.length){
    const warnings=node('section','st22-tp-alerts',null,body);
    const warningHead=node('div','st22-tp-alert-head',null,warnings);
    const warningIcon=node('span','st22-tp-alert-icon','⚠︎',warningHead);
    warningIcon.setAttribute('aria-hidden','true');
    const warningTitle=node('div','st22-tp-alert-title',null,warningHead);
    node('h4','','Fontos figyelmeztetések',warningTitle);
    node('small','','KÉRJÜK, OLVASD EL INDULÁS ELŐTT',warningTitle);
    for(const a of j.alerts){const item=node('div','st22-tp-alert-item',null,warnings);
     node('strong','',a.title,item);node('p','',a.text,item)}
   }
   if(j.alternatives.length){
    const backup=node('details','st22-tp-backup',null,body);
    node('summary','','🔄 B terv · ha változik az út',backup);
    for(const a of j.alternatives)node('p','st22-tp-note',a,backup);
   }
   if(j.sources.length){
    const src=node('section','st22-tp-sources',null,body);
    node('h4','st22-tp-heading','Menetrendi források',src);
    for(const source of j.sources){
     if(source.url){const a=node('a','st22-tp-source',source.name,src);
      a.href=source.url;a.rel='noopener noreferrer';a.target='_blank'}
     else node('p','st22-tp-note',source.name,src);
    }
   }
   const footer=node('div','st22-tp-viewer-footer',null,body);
   node('button','','← My Trips',footer).addEventListener('click',showSaved);
   if(!viewer.open)viewer.showModal();
  }
  function showSaved(){
   body.replaceChildren();body.scrollTop=0;
   const h=node('header','st22-tp-head st22-tp-list-head',null,body);
   node('div','st22-tp-eyebrow','✦ SH9 · SMART TRAVEL',h);
   node('h2','','💾 My Trips',h);
   node('p','','Mentett teljes útitervek · '+(active()==='m'?'Mónika':'Zsolt')+' profil',h);
   const items=read(w.localStorage,active());
   if(!items.length)node('p','st22-tp-note','Még nincs mentett teljes útiterv ezen a készüléken. A Smart Trip AI-ban importált JSON itt is megjelenik.',body);
   for(const trip of items){
    const row=node('article','st22-tp-saved',null,body);
    const upper=node('div','st22-tp-saved-top',null,row);
    node('strong','',trip.title,upper);
    node('span','st22-tp-saved-status',progressLabel(trip,active()),upper);
    node('small','',trip.travelDate+' · '+trip.from+' → '+trip.to,row);
    const m=metrics(trip);
    node('small','st22-tp-saved-meta',
     '🕓 '+when(trip.departure)+' → '+when(trip.arrival)+' · '+m.duration+' · '+m.transfers+' átszállás',row);
    const actions=node('div','st22-tp-actions',null,row);
    node('button','','Teljes képernyős megnyitás',actions).addEventListener('click',()=>show(trip));
    node('button','','Törlés',actions).addEventListener('click',()=>{
     if(remove(w.localStorage,active(),trip.id)){
      try{w.localStorage.removeItem(progressKey(active(),trip.id))}catch(_){}
      showSaved();
     }
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
  // A dedicated My Trips page links directly to this existing fullscreen viewer.
  try{
   const params=new URL(w.location.href).searchParams;
   if(params.has('trip')){
    const selected=read(w.localStorage,active()).find(t=>t.id===params.get('trip'));
    if(selected)show(selected);else showSaved();
   }else if(params.get('view')==='my-trips')showSaved();
   else if(w.location.hash==='#import'){
    say('Válassz .json fájlt vagy illeszd be a TripPack JSON-t.');
    if(!importer.open)importer.showModal();
   }
  }catch(_){}
 }
 return Object.freeze({normalize,read,save,remove,mount,SCHEMA,MAX_BYTES,MAX_SAVED});
});