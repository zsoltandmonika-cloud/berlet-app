/* SH9 My Trips v1100 · saved journey 1–5 star rating.
 * Private authenticated Supabase trip_data JSONB + existing local TripPack store.
 * No duplicate database/table, polling, external uploads or automatic rating.
 */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_TRIP_RATING_V1100=api;
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const TABLE='hh_my_trip_packs',AUTH_KEY='hh-guardian-family-auth-v785';
 const validId=id=>typeof id==='string'&&/^tp-[a-zA-Z0-9-]{1,67}$/.test(id);
 const ratingValue=value=>Number.isInteger(value)&&value>=1&&value<=5?value:null;
 const key=p=>'sh9-smart-trip-pack-v1078-'+p;
 let busy=false,client=null;
 const profile=p=>p==='m'?'m':'z';
 const cloudKey=p=>p==='m'?'monika':'zsolt';
 function getClient(){
  if(client)return client;
  const cfg=w?.HH_CENTRAL_VAULT;
  if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey||!w?.supabase?.createClient)
   throw Error('A privát felhőkapcsolat nem elérhető.');
  client=w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
   auth:{storageKey:AUTH_KEY,persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}
  });
  return client;
 }
 async function saveRating(p,id,stars){
  const n=ratingValue(stars);
  if(!n)throw Error('Válassz 1–5 csillagot.');
  if(!validId(id))throw Error('Az útiterv azonosítója nem megfelelő.');
  if(busy)throw Error('Már folyamatban van egy értékelés mentése.');
  const pack=w?.SH9_SMART_TRIP_PACK_V1078;
  if(!pack||!w?.localStorage)throw Error('A mentett útiterv nem érhető el.');
  if(profile(p)!==(w.localStorage.getItem('hh-profile')==='m'?'m':'z'))
   throw Error('Profilváltás történt. Nyisd meg újra az útitervet.');
  const found=pack.read(w.localStorage,p).find(t=>t.id===id);
  if(!found)throw Error('A mentett útiterv nem található.');
  busy=true;
  try{
   const c=getClient();
   const {data:session,error:authError}=await c.auth.getSession();
   if(authError||!session?.session?.user)
    throw Error('Az értékelés felhőmentéséhez jelentkezz be a Family Guardba.');
   const q=()=>c.from(TABLE).select('trip_data').eq('profile_key',cloudKey(p)).eq('trip_id',id);
   const {data:record,error:readError}=await q().maybeSingle();
   if(readError)throw Error('Az útiterv felhőadata nem olvasható: '+readError.message);
   const stamp=new Date().toISOString();
   const data={...(record?.trip_data||found),rating:n,ratedAt:stamp};
   if(record){
    const {data:done,error:writeError}=await c.from(TABLE).update({
     trip_data:data,updated_at:stamp
    }).eq('profile_key',cloudKey(p)).eq('trip_id',id).select('trip_id').single();
    if(writeError||!done)throw Error('A felhőmentés nem sikerült: '+(writeError?.message||'nincs visszaigazolás'));
   }else{
    const {data:done,error:writeError}=await c.from(TABLE).insert({
     profile_key:cloudKey(p),trip_id:id,trip_data:data
    }).select('trip_id').single();
    if(writeError||!done)throw Error('Az útiterv felhőmentése nem sikerült: '+(writeError?.message||'nincs visszaigazolás'));
   }
   const list=pack.read(w.localStorage,p);
   const updated=list.map(t=>t.id===id?{...t,rating:n,ratedAt:stamp}:t);
   w.localStorage.setItem(key(p),JSON.stringify(updated));
   if(typeof w.dispatchEvent==='function')w.dispatchEvent(new Event('sh9-my-trips-cloud-synced'));
   return {rating:n,ratedAt:stamp};
  }finally{busy=false}
 }
 return Object.freeze({ratingValue,saveRating});
});
