/* SH9 My Trips v1086 · secure family cloud sync for saved routes + ticket attachments.
 * Authenticated Supabase project; private Storage and RLS. No public file links,
 * anonymous writes, OpenAI API cost, or hidden background polling.
 */
(function(w,d){
 'use strict';
 const pack=w.SH9_SMART_TRIP_PACK_V1078,root=d.getElementById('mtTripList');
 if(!pack||!root)return;
 const $=id=>d.getElementById(id);
 const TRIPS='hh_my_trip_packs',FILES='hh_my_trip_attachments',BUCKET='hh-my-trip-tickets';
 const MAX_COUNT=12,MAX_BYTES=15e6,MAX_TOTAL=75e6;
 const ALLOWED={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',
  webp:'image/webp',heic:'image/heic',heif:'image/heif'};
 let api=null,busy=false,dialog=null,blobUrls=[];
 const profile=()=>{try{return w.localStorage.getItem('hh-profile')==='m'?'m':'z'}catch(_){return 'z'}};
 const cloudProfile=p=>p==='m'?'monika':'zsolt';
 const clean=s=>String(s||'').replace(/[\u0000-\u001f<>/\\]/g,' ').trim().slice(0,140);
 const msg=s=>{if($('mtSyncStatus'))$('mtSyncStatus').textContent=s};
 const status=s=>{if($('mtFilesStatus'))$('mtFilesStatus').textContent=s};
 const node=(tag,cls,text,parent)=>{
  const el=d.createElement(tag);if(cls)el.className=cls;
  if(text!==null&&text!==undefined)el.textContent=String(text);
  if(parent)parent.appendChild(el);
  return el;
 };
 function client(){
  if(api)return api;
  const cfg=w.HH_CENTRAL_VAULT;
  if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey||!w.supabase?.createClient)return null;
  api=w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
   auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,
    autoRefreshToken:false,detectSessionInUrl:false}
  });
  return api;
 }
 async function authorized(){
  const c=client();if(!c)throw Error('A Supabase-szolgáltatás nem elérhető.');
  const {data,error}=await c.auth.getSession();
  if(error||!data?.session?.user)throw Error('A szinkronhoz be kell jelentkezni a Family Guardba.');
  return c;
 }
 const validId=id=>typeof id==='string'&&/^tp-[a-zA-Z0-9-]{1,67}$/.test(id);
 function fileInfo(file){
  const label=clean(file?.name),ext=label.split('.').pop().toLowerCase(),mime=ALLOWED[ext];
  if(!label||!mime)throw Error('PDF, JPG, PNG, WEBP vagy HEIC jegyek támogatottak.');
  if(!file.size||file.size>MAX_BYTES)throw Error('Egy melléklet maximum 15 MB.');
  if(file.type&&file.type!=='application/octet-stream'&&file.type!==mime)
   throw Error('Nem megfelelő fájltípus.');
  return {file_name:label,file_type:mime,bytes:file.size,ext};
 }
 const localKey=p=>'sh9-smart-trip-pack-v1078-'+p;
 function fingerprint(t){return [t.travelDate,t.from,t.to,t.departure,t.segments?.map(s=>s.line+':'+s.departure).join('|')].join('|')}
 async function cloudSync(p){
  if(busy)return;
  busy=true;msg('Szinkronizálás…');
  try{
   const c=await authorized(),key=cloudProfile(p),local=pack.read(w.localStorage,p);
   const {data,error}=await c.from(TRIPS).select('trip_id,trip_data')
    .eq('profile_key',key).limit(60);
   if(error)throw Error(error.message);
   const remote=data||[],remoteIds=new Set(remote.map(x=>x.trip_id)),remoteFingerprints=new Map();
   for(const item of remote)try{
    if(validId(item.trip_id))remoteFingerprints.set(fingerprint(pack.normalize(item.trip_data)),item.trip_id);
   }catch(_){}
   // Reconcile independent imports of the exact same itinerary to ONE cloud ID.
   // Otherwise tickets might attach to different IDs on the two Galaxy phones.
   let changed=false;
   const merged=local.map(t=>{
    const canonical=remoteFingerprints.get(fingerprint(t));
    if(!canonical||canonical===t.id)return t;
    changed=true;
    try{
     const progressKey=id=>localKey(p)+'-manual-step-'+id;
     const state=w.localStorage.getItem(progressKey(t.id));
     if(state!==null&&w.localStorage.getItem(progressKey(canonical))===null)
      w.localStorage.setItem(progressKey(canonical),state);
    }catch(_){}
    return {...t,id:canonical};
   });
   // Never overwrite existing cloud documents (including first phone's metadata).
   for(const t of merged){
    if(!validId(t.id)||remoteIds.has(t.id)||remoteFingerprints.has(fingerprint(t)))continue;
    const {error:put}=await c.from(TRIPS).insert({profile_key:key,trip_id:t.id,trip_data:t});
    if(put&&put.code!=='23505')throw Error('Út mentése: '+put.message);
    remoteIds.add(t.id);remoteFingerprints.set(fingerprint(t),t.id);
   }
   const ids=new Set(merged.map(t=>t.id));
   const known=new Set(merged.map(fingerprint));
   for(const x of remote){
    if(ids.has(x.trip_id)||!validId(x.trip_id))continue;
    try{
     const j=pack.normalize(x.trip_data),f=fingerprint(j);
     if(known.has(f))continue;
     merged.push({...j,id:x.trip_id,savedAt:Number(x.trip_data?.savedAt)||Date.now()});
     known.add(f);ids.add(x.trip_id);changed=true;
    }catch(_){}
   }
   if(changed){
    merged.sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));
    w.localStorage.setItem(localKey(p),JSON.stringify(merged.slice(0,20)));
   }
   if(profile()===p){
    msg('✓ Szinkronizálva · jegyek és mentett utazások privát felhőben');
    if(changed)w.dispatchEvent(new Event('sh9-my-trips-cloud-synced'));
   }
  }catch(e){msg('⚠️ '+(e.message||'Szinkronizálási hiba'))}
  finally{busy=false}
 }
 async function ensureTrip(p,trip){
  if(!validId(trip?.id))throw Error('Hibás mentett útvonal.');
  const c=await authorized(),key=cloudProfile(p);
  const {data,error}=await c.from(TRIPS).select('trip_id')
   .eq('profile_key',key).eq('trip_id',trip.id).maybeSingle();
  if(error)throw Error(error.message);
  if(!data){
   const {error:put}=await c.from(TRIPS).insert({profile_key:key,trip_id:trip.id,trip_data:trip});
   if(put&&put.code!=='23505')throw Error('Az útvonal szinkronizálása nem sikerült: '+put.message);
  }
  return c;
 }
 const fmt=b=>b>=1e6?(b/1e6).toFixed(1)+' MB':Math.max(1,Math.ceil(b/1024))+' KB';
 async function rows(){
  if(!dialog)throw Error('Nincs kiválasztott útvonal.');
  const {p,trip}=dialog,c=await ensureTrip(p,trip);
  const {data,error}=await c.from(FILES).select('id,file_name,file_type,bytes,storage_path,created_at')
   .eq('profile_key',cloudProfile(p)).eq('trip_id',trip.id)
   .order('created_at',{ascending:false}).limit(25);
  if(error)throw Error('Jegyek lekérése: '+error.message);
  return {c,items:data||[]};
 }
 async function refreshFiles(){
  if(!dialog)return;
  const target=$('mtFilesList');target.replaceChildren();
  try{
   const {items}=await rows();
   $('mtFilesCount').textContent=items.length+' / '+MAX_COUNT+' csatolmány';
   status('Privát, kéttelefonos Supabase-szinkron · csak jogosult családtagoknak');
   if(!items.length)node('p','mt-file-empty','Ehhez az útvonalhoz még nincs feltöltött jegy.',target);
   for(const file of items){
    const card=node('div','mt-file-row',null,target);
    const desc=node('div','mt-file-info',null,card);
    node('strong','',(file.file_type==='application/pdf'?'📄 ':'🎟️ ')+file.file_name,desc);
    node('small','',fmt(file.bytes),desc);
    const open=node('button','mt-file-open','Megnyitás',card);
    open.type='button';open.addEventListener('click',()=>void openFile(file));
    const remove=node('button','mt-file-remove','Törlés',card);
    remove.type='button';remove.addEventListener('click',()=>void removeFile(file));
   }
  }catch(e){status('⚠️ '+(e.message||'A jegyek nem érhetők el.'))}
 }
 function openPanel(p,trip){
  if(!validId(trip?.id))return;
  dialog={p,trip};
  $('mtFilesTitle').textContent=trip.title;
  $('mtFilesCount').textContent='…';
  $('mtFilesList').replaceChildren();
  $('mtFileInput').value='';
  status('Menetjegyek lekérése…');
  const el=$('mtFilesDialog');if(!el.open)el.showModal();
  void refreshFiles();
 }
 async function upload(files){
  if(busy||!dialog||!files?.length)return;
  busy=true;$('mtFileInput').disabled=true;
  try{
   const {p,trip}=dialog,checked=[...files].map(file=>({...fileInfo(file),file}));
   if(p!==profile())throw Error('Megváltozott a profil.');
   const c=await ensureTrip(p,trip),current=await c.from(FILES)
    .select('bytes').eq('profile_key',cloudProfile(p)).eq('trip_id',trip.id).limit(25);
   if(current.error)throw Error(current.error.message);
   const existing=current.data||[];
   if(existing.length+checked.length>MAX_COUNT)throw Error('Legfeljebb '+MAX_COUNT+' csatolmány lehet egy úton.');
   if(existing.reduce((sum,x)=>sum+x.bytes,0)+checked.reduce((sum,x)=>sum+x.bytes,0)>MAX_TOTAL)
    throw Error('Az útvonal csatolmányainak méretkerete 75 MB.');
   let count=0;
   for(const item of checked){
    if(p!==profile())throw Error('Profilváltás: feltöltés megszakítva.');
    const id=w.crypto?.randomUUID?.();
    if(!id)throw Error('Biztonságos fájlazonosító nem érhető el.');
    const path=cloudProfile(p)+'/'+trip.id+'/'+id+'.'+item.ext;
    status('Feltöltés '+(count+1)+'/'+checked.length+' · '+item.file_name);
    const metadata={id,profile_key:cloudProfile(p),trip_id:trip.id,file_name:item.file_name,
     file_type:item.file_type,bytes:item.bytes,storage_path:path};
    const {error:dbErr}=await c.from(FILES).insert(metadata);
    if(dbErr)throw Error('Jegy regisztrálása: '+dbErr.message);
    const {error:fileErr}=await c.storage.from(BUCKET).upload(path,item.file,{
     upsert:false,contentType:item.file_type,cacheControl:'0'
    });
    if(fileErr){
     await c.from(FILES).delete().eq('id',id);
     throw Error('Jegy feltöltése: '+fileErr.message);
    }
    count++;
   }
   status('✓ '+count+' fájl feltöltve, mindkét telefonon elérhető');
   await refreshFiles();
  }catch(e){status('⚠️ '+(e.message||'Feltöltési hiba'))}
  finally{busy=false;$('mtFileInput').disabled=false;$('mtFileInput').value=''}
 }
 async function openFile(file){
  const isPdf=file.file_type==='application/pdf';
  // PDF in the SH9 fullscreen reader; non-PDF e-tickets use the established image flow.
  // New tabs for images must be opened synchronously inside the user click.
  const tab=isPdf?null:w.open('about:blank','_blank');
  try{
   status('Privát jegy letöltése…');
   const c=await authorized();
   const {data,error}=await c.storage.from(BUCKET).download(file.storage_path);
   if(error||!data)throw Error(error?.message||'Nem sikerült megnyitni.');
   if(isPdf){
    const reader=w.SH9_TRIP_PDF_VIEWER_V1087;
    if(!reader?.open)throw Error('A belső PDF-olvasó nincs betöltve.');
    await reader.open(data,file.file_name);
   }else{
    const url=w.URL.createObjectURL(data);
    blobUrls.push(url);
    if(tab)tab.location.href=url;
    else{
     const a=node('a','',null,d.body);
     a.href=url;a.download=file.file_name;a.click();a.remove();
    }
   }
   status('✓ Jegy megnyitva · '+file.file_name);
  }catch(e){if(tab)tab.close();status('⚠️ '+(e.message||'Nem sikerült megnyitni'))}
 }
 async function removeFile(file){
  if(busy||!w.confirm('Végleg törlöd mindkét telefonról?\n'+file.file_name))return;
  busy=true;
  try{
   const c=await authorized(),{error:deleted}=await c.storage.from(BUCKET).remove([file.storage_path]);
   if(deleted)throw Error(deleted.message);
   const {error:metaErr}=await c.from(FILES).delete().eq('id',file.id);
   if(metaErr)throw Error(metaErr.message);
   await refreshFiles();
  }catch(e){status('⚠️ Törlés: '+(e.message||'Sikertelen'))}
  finally{busy=false}
 }
 async function deleteTrip(p,id){
  if(busy)throw Error('Szinkronizálás folyamatban. Próbáld újra.');
  if(p!==profile()||!validId(id))throw Error('Érvénytelen profil vagy útvonal.');
  busy=true;msg('Útiterv biztonságos törlése…');
  try{
   const c=await authorized(),key=cloudProfile(p);
   if(p!==profile())throw Error('Közben megváltozott a profil.');
   const {data:attachments,error:listError}=await c.from(FILES)
    .select('id,storage_path').eq('profile_key',key).eq('trip_id',id).limit(100);
   if(listError)throw Error('Csatolmányok ellenőrzése: '+listError.message);
   const paths=(attachments||[]).map(x=>x.storage_path).filter(Boolean);
   if(paths.length){
    const {error:storageError}=await c.storage.from(BUCKET).remove(paths);
    if(storageError)throw Error('Jegyek törlése: '+storageError.message);
    const {error:fileError}=await c.from(FILES).delete().eq('profile_key',key).eq('trip_id',id);
    if(fileError)throw Error('Jegyadatok törlése: '+fileError.message);
   }
   const {error:tripError}=await c.from(TRIPS).delete().eq('profile_key',key).eq('trip_id',id);
   if(tripError)throw Error('Felhőből törlés: '+tripError.message);
   if(p!==profile())throw Error('Profilváltás történt; frissítsd a listát.');
   if(!pack.remove(w.localStorage,p,id))throw Error('Felhőből törölve, de a helyi mentés frissítése nem sikerült. Frissítsd az oldalt.');
   try{w.localStorage.removeItem(localKey(p)+'-manual-step-'+id)}catch(_){}
   msg('✓ Útiterv törölve a helyi és felhőbeli mentésekből');
   w.dispatchEvent(new Event('sh9-my-trips-cloud-synced'));
  }catch(e){msg('⚠️ '+(e.message||'Törlési hiba'));throw e}
  finally{busy=false}
 }
 w.SH9_MY_TRIPS_CLOUD_V1086=Object.freeze({deleteTrip});
 $('mtFilesClose')?.addEventListener('click',()=>{
  if($('mtFilesDialog').open)$('mtFilesDialog').close();
  dialog=null;for(const u of blobUrls)try{w.URL.revokeObjectURL(u)}catch(_){}blobUrls=[];
 });
 $('mtFilesReload')?.addEventListener('click',()=>void refreshFiles());
 $('mtFileInput')?.addEventListener('change',e=>void upload(e.target.files));
 w.addEventListener('sh9-my-trips-open-files',e=>{
  if(e.detail?.p===profile())openPanel(e.detail.p,e.detail.trip);
 });
 w.addEventListener('sh9-my-trips-cloud-sync-request',e=>{
  if(!w.navigator?.onLine){msg('⚠️ Offline · szinkron szükséges');return}
  void cloudSync(e.detail?.p||profile());
 });
 w.addEventListener('pageshow',()=>{if(w.navigator?.onLine)void cloudSync(profile())});
 w.addEventListener('online',()=>void cloudSync(profile()));
 w.addEventListener('beforeunload',()=>{for(const u of blobUrls)try{w.URL.revokeObjectURL(u)}catch(_){}});
 // Only on initial page entry, explicit reload, reconnect or profile change, not GPS polling.
 if(w.navigator?.onLine)void cloudSync(profile());
})(window,document);
