/* SHO Ticket Transfer v1. Private originals only.
 * My Trips -> Smart Valet copy. Original remains in its source module.
 * Dedicated shared contract for future Sport Central and Events connectors;
 * those sources are NOT active until separately RLS-integrated.
 */
(function(w){
 'use strict';
 const DEST='hh-smart-valet-private',TABLE='hh_valet_items',SRC='hh-my-trip-tickets',MAX=15000000;
 const ALLOWED=Object.freeze({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',
  png:'image/png',webp:'image/webp'});
 function ext(n){return String(n||'').split('.').pop().toLowerCase()}
 const clean=(s,max)=>String(s||'').replace(/[\u0000-\u001f<>/\\]/g,' ').trim().slice(0,max||150);
 const validTrip=s=>typeof s==='string'&&/^tp-[A-Za-z0-9-]{1,67}$/.test(s);
 const validUUID=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(s);
 const current=()=>w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
 const asError=e=>String(e?.message||e||'Ismeretlen hiba').slice(0,220);
 function validateHeader(bytes,e){
  const a=new Uint8Array(bytes.slice(0,16));
  const word=Array.from(a,x=>String.fromCharCode(x)).join('');
  if(e==='pdf')return word.startsWith('%PDF-');
  if(e==='jpg'||e==='jpeg')return a[0]===255&&a[1]===216&&a[2]===255;
  if(e==='png')return a.slice(0,8).join(',')==='137,80,78,71,13,10,26,10';
  if(e==='webp')return word.slice(0,4)==='RIFF'&&word.slice(8,12)==='WEBP';
  return false;
 }
 async function authorized(c,profile){
  if(!c?.auth?.getUser||!['monika','zsolt'].includes(profile)||current()!==profile)
   throw Error('A kiválasztott profil nem egyezik.');
  const {data:{user}={},error:e}=await c.auth.getUser();
  if(e||!user?.id)throw Error('A privát fájlokhoz Family Guard-belépés szükséges.');
  const grant=await c.from('hh_profile_access').select('profile_key')
   .eq('user_id',user.id).eq('profile_key',profile).maybeSingle();
  if(grant.error||!grant.data)throw Error('Ehhez a profilhoz nincs jogosultság.');
 }
 async function copyMyTrips({client,profile,tripId,attachmentId}={}){
  const c=client;
  if(!validTrip(tripId)||!validUUID(attachmentId))throw Error('Érvénytelen útvonal vagy jegyazonosító.');
  await authorized(c,profile);
  const meta=await c.from('hh_my_trip_attachments')
   .select('id,profile_key,trip_id,file_name,file_type,bytes,storage_path')
   .eq('id',attachmentId).eq('profile_key',profile).eq('trip_id',tripId).maybeSingle();
  if(meta.error||!meta.data)throw Error('A forrásjegy nem érhető el.');
  const original=meta.data,filename=clean(original.file_name,180),suffix=ext(filename);
  const mime=ALLOWED[suffix];
  if(!mime||original.file_type!==mime)throw Error('Valetbe egyelőre PDF, JPG, PNG vagy WebP vihető át.');
  if(!original.bytes||original.bytes>MAX)throw Error('A forrásfájl túl nagy.');
  const expected=profile+'/'+tripId+'/'+attachmentId+'.'+suffix;
  if(original.storage_path!==expected)throw Error('Nem egyező forrásfájl-azonosító.');
  const download=await c.storage.from(SRC).download(expected);
  if(download.error||!download.data)throw Error('A privát forrásjegy letöltése nem sikerült.');
  const originalFile=download.data;
  if(originalFile.size!==original.bytes)throw Error('A forrásfájl mérete nem egyezik.');
  const bytes=await originalFile.arrayBuffer();
  if(!validateHeader(bytes,suffix))throw Error('Nem támogatott vagy sérült eredeti fájl.');
  if(current()!==profile)throw Error('Profilváltás miatt a másolás megszakadt.');
  const sha=await w.crypto.subtle.digest('SHA-256',bytes);
  const sha256=Array.from(new Uint8Array(sha),n=>n.toString(16).padStart(2,'0')).join('');
  let id=null,path=null,created=false;
  try{
   id=w.crypto.randomUUID();path=profile+'/'+id+'/original.'+suffix;
   const payload={id,profile_key:profile,category:'ticket',
    title:clean('Utazás · '+filename.replace(/\.[^.]+$/,''),160),
    file_name:filename,file_ext:suffix,mime_type:mime,byte_size:originalFile.size,
    sha256,storage_path:path,source_module:'my_trips',source_context_id:tripId,
    source_item_id:attachmentId};
   const inserted=await c.from(TABLE).insert(payload).select('id').single();
   if(inserted.error)throw inserted.error;
   created=true;
   const uploaded=await c.storage.from(DEST).upload(path,originalFile,{contentType:mime,upsert:false});
   if(uploaded.error)throw uploaded.error;
   const stamp=await c.from(TABLE).update({uploaded_at:new Date().toISOString()})
    .eq('id',id).eq('profile_key',profile).select('id').single();
   if(stamp.error)throw stamp.error;
   return {ok:true,id,profile,source:'my_trips',sourcePreserved:true};
  }catch(e){
   if(created){
    try{await c.storage.from(DEST).remove([path])}catch(_){}
    try{await c.from(TABLE).delete().eq('id',id).eq('profile_key',profile)}catch(_){}
   }
   if(e?.code==='23505')throw Error('Ez a jegy már szerepel a Smart Valetben.');
   throw Error('Valetbe másolás: '+asError(e));
  }
 }
 w.SHO_TICKET_TRANSFER_V1=Object.freeze({copyMyTrips,version:'1',
  availableSources:['my_trips'],reservedSources:['sport','events']});
})(window);
