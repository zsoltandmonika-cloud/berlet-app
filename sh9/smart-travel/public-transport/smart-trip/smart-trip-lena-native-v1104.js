/* SH9 v1104 · opt-in Léna Native Search → automatic My Trips handover.
 * Existing ChatGPT default remains untouched. No OpenAI key or paid maps key
 * in browser. No polling, GPS tracking, health records or ChatGPT MCP token.
 */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_LENA_NATIVE_V1104=api;
})(typeof window!=='undefined'?window:null,function(w){
 'use strict';
 const ENDPOINT='/functions/v1/hh-lena-native-search-preview';
 const KEY='hh-guardian-family-auth-v785';
 let client=null,used=0,last=0,busy=false;
 function endpoint(){
  const cfg=w?.HH_CENTRAL_VAULT;
  if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey)return null;
  try{
   const u=new URL(cfg.supabaseUrl);
   if(u.protocol!=='https:'||u.hostname!=='vhsrupphzcjkdrusonzh.supabase.co'||
    u.pathname!=='/'||u.search||u.hash)return null;
   return {url:u.origin+ENDPOINT,key:cfg.publishableKey};
  }catch(_){return null}
 }
 function sessionClient(){
  const target=endpoint();
  if(!target||!w?.supabase?.createClient)return null;
  if(client)return client;
  client=w.supabase.createClient(w.HH_CENTRAL_VAULT.supabaseUrl,target.key,{
   auth:{storageKey:KEY,persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}
  });
  return client;
 }
 function cleanSelected(p,name){
  return p&&p.name===name&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&
   p.lat>=45&&p.lat<=49&&p.lng>=16&&p.lng<=23?
   {name:p.name,lat:p.lat,lng:p.lng}:null;
 }
 function buildRequest(query,when,points,profile,priority){
  if(!query||!['m','z'].includes(profile)||typeof when!=='string'||
   !/^\d{4}-\d\d-\d\dT/.test(when)||!Number.isFinite(Date.parse(when)))return null;
  if(!['balanced','wait','walk','transfers','duration','departure'].includes(priority))return null;
  const from=String(query.from||'').trim().slice(0,120),to=String(query.to||'').trim().slice(0,120);
  if(from.length<2||to.length<2||from===to)return null;
  return {from,to,date:query.date,time:query.time,mode:query.mode,when,
   priority,profile,origin:cleanSelected(points?.origin,from),
   destination:cleanSelected(points?.destination,to)};
 }
 function commitLocal(p,server){
  const pack=w.SH9_SMART_TRIP_PACK_V1078;
  const id=server?.tripId,stored=server?.tripPack;
  if(!pack||typeof id!=='string'||!/^tp-lena-[0-9a-f]{32}$/.test(id)||
   stored?.id!==id)throw Error('Hibás felhőválasz.');
  const copy=pack.normalize(stored);
  if(copy.schema!=='sh9.trip-pack/1')throw Error('Ismeretlen TripPack formátum.');
  if((w.localStorage.getItem('hh-profile')==='m'?'m':'z')!==p)
   throw Error('Időközben profilváltás történt.');
  const previous=pack.read(w.localStorage,p),existing=previous.find(x=>x.id===id);
  if(existing)return id;
  const record={...copy,id,savedAt:Number.isFinite(stored.savedAt)?stored.savedAt:Date.now()};
  const key='sh9-smart-trip-pack-v1078-'+p;
  w.localStorage.setItem(key,JSON.stringify([record,...previous].slice(0,pack.MAX_SAVED)));
  w.dispatchEvent(new Event('sh9-my-trips-cloud-synced'));
  return id;
 }
 async function search(query,when,points,profile,priority){
  const target=endpoint(),payload=buildRequest(query,when,points,profile,priority);
  if(!target)return {status:'service_missing'};
  if(!payload)return {status:'invalid_query'};
  if(busy)return {status:'busy'};
  if(used>=3)return {status:'session_limit'};
  if(last&&Date.now()-last<20000)return {status:'cooldown'};
  const auth=sessionClient();
  if(!auth?.auth?.getSession)return {status:'authentication_missing'};
  const session=await auth.auth.getSession();
  if(!session?.data?.session?.user?.id||!session.data.session.access_token)
   return {status:'authentication_missing'};
  const token=session.data.session.access_token;
  const now=Date.now();
  used++;last=now;busy=true;
  const ctl=new AbortController(),timer=w.setTimeout(()=>ctl.abort(),25000);
  try{
   const response=await w.fetch(target.url,{
    method:'POST',headers:{
     'Content-Type':'application/json','Authorization':'Bearer '+token,
     apikey:target.key
    },body:JSON.stringify(payload),cache:'no-store',credentials:'omit',
    redirect:'error',signal:ctl.signal
   });
   if(Number(response.headers.get('content-length')||0)>80000)return {status:'response_too_large'};
   const text=await response.text();
   if(text.length>80000)return {status:'response_too_large'};
   let parsed={};
   try{parsed=JSON.parse(text)}catch(_){return {status:'invalid_response'}}
   if(!response.ok)return {status:parsed.status||'http_error',code:response.status};
   if(parsed.status==='saved'||parsed.status==='already_saved'){
    if(parsed.saved!==true)return {status:'invalid_response'};
    try{
     const id=commitLocal(profile,parsed);
     return {status:'saved',tripId:id,alreadySaved:parsed.status==='already_saved'};
    }catch(_){return {status:'cloud_saved_local_failed',tripId:parsed.tripId}}
   }
   return {status:parsed.status||'unavailable'};
  }catch(_){return {status:'network_unavailable'}}
  finally{w.clearTimeout(timer);busy=false}
 }
 return Object.freeze({buildRequest,search,commitLocal});
});
