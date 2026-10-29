/* HealthHub / SH9 v972 · one household-wide collection of 40 travel places.
 * Family Guard, BKK Grand, MÁV and Volán share a local first cache; authorized
 * sessions sync with private Supabase RLS (same existing family auth).
 * No GPS, no anonymous cloud access, no polling, no automatic geocoding.
 */
(function(w){
 'use strict';
 if(!w)return;
 const COUNT=40,KEY='hh-family-favorite-places-v972';
 const PENDING=KEY+'-pending',LEGACY='hh-smart-arrival-favorite-places-v806-';
 const LAST_READ=KEY+'-last-read',IMPORTED=KEY+'-legacy-imported',MIGRATION=KEY+'-legacy-awaiting-cloud',TTL=20*60*1000,TABLE='hh_travel_family_places';
 const NAMES=['Otthon','Munkahely','Orvos','Kórház','Család','Barátok','Bolt','Ügyintézés','Szabadidő','Egyéb'];
 const clean=s=>String(s||'').trim();
 const label=(s,i)=>clean(s).slice(0,40)||NAMES[i]||('Kedvenc '+(i+1));
 const valid=p=>!!p&&clean(p.name).length>0&&Number.isFinite(Number(p.lat))&&
  Number.isFinite(Number(p.lng))&&Math.abs(Number(p.lat))<=90&&Math.abs(Number(p.lng))<=180;
 const base=()=>Array.from({length:COUNT},(_,i)=>({label:label('',i),place:null}));
 function getJson(k,fallback){
  try{const v=JSON.parse(w.localStorage.getItem(k)||'null');return v===null?fallback:v}
  catch(_){return fallback}
 }
 function write(k,v){try{w.localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}}
 function normalize(raw){
  const a=base();if(!Array.isArray(raw))return a;
  raw.slice(0,COUNT).forEach((r,i)=>{
   if(!r||typeof r!=='object')return;
   a[i].label=label(r.label,i);
   if(valid(r.place))a[i].place={name:clean(r.place.name).slice(0,120),
    subtitle:clean(r.place.subtitle).slice(0,190),
    lat:Number(r.place.lat),lng:Number(r.place.lng)};
  });
  return a;
 }
 function same(p,q){
  if(!valid(p)||!valid(q))return false;
  const lat=(p.lat-q.lat)*111000,lng=(p.lng-q.lng)*111000*Math.cos(p.lat*Math.PI/180);
  return Math.hypot(lat,lng)<30;
 }
 function merge(primary,second){
  const a=normalize(primary),b=normalize(second);
  for(const row of b){
   if(!row.place||a.some(x=>same(x.place,row.place)))continue;
   const target=a.findIndex(x=>!x.place);
   if(target<0)break;
   a[target]={label:row.label,place:row.place};
  }
  return a;
 }
 function importLegacy(){
  let a=normalize(getJson(KEY,[]));
  if(w.localStorage?.getItem(IMPORTED)==='1')return a;
  // Read each legacy profile only ONCE; never delete its original data.
  for(const key of ['z','m']){
   const old=getJson(LEGACY+key,null);
   if(!Array.isArray(old))continue;
   const entries=old.slice(0,10).filter(x=>x&&valid(x.place));
   const candidates=base();
   entries.forEach((entry,i)=>{candidates[i]={label:label(entry.label,i),place:entry.place}});
   a=merge(a,candidates);
  }
  write(KEY,a);
  try{w.localStorage?.setItem(IMPORTED,'1');w.localStorage?.setItem(MIGRATION,'1')}catch(_){}
  return a;
 }
 let slots=importLegacy(),client=null,working=false;
 let pending=getJson(PENDING,{});
 if(!pending||typeof pending!=='object'||Array.isArray(pending))pending={};
 function notify(){
  if(typeof w.dispatchEvent==='function'&&typeof w.CustomEvent==='function')
   w.dispatchEvent(new w.CustomEvent('hh-travel-favorites-changed',{detail:{count:COUNT}}));
 }
 function publish(){write(KEY,slots);notify()}
 function getSlots(){return normalize(slots)}
 function queue(i,row){
  pending[i]={label:row.label,place:row.place,updatedAt:new Date().toISOString()};
  write(PENDING,pending);
 }
 function setSlots(input){
  const next=normalize(input);let changed=false;
  for(let i=0;i<COUNT;i++){
   const a=slots[i],b=next[i];
   if(JSON.stringify(a)!==JSON.stringify(b)){queue(i,b);changed=true}
  }
  if(changed){slots=next;publish();sync().catch(()=>{})}
  return true;
 }
 function favoritePlaces(){
  return slots.flatMap((row,i)=>row.place?[{...row.place,displayName:row.label,
   source:'favorite',slotIndex:i,profile:(w.localStorage?.getItem('hh-profile')==='m'?'m':'z')}]:[]);
 }
 function subscribe(fn){
  if(typeof fn!=='function')return()=>{};
  const handler=()=>fn(getSlots());w.addEventListener('hh-travel-favorites-changed',handler);
  return()=>w.removeEventListener('hh-travel-favorites-changed',handler);
 }
 function makeClient(){
  if(client)return client;
  const live=w.HH_GUARDIAN_LIVE_V785;
  if(live?.getClient()){client=live.getClient();if(client)return client}
  const cfg=w.HH_CENTRAL_VAULT;
  if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey||!w.supabase?.createClient)return null;
  client=w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{
   auth:{storageKey:'hh-guardian-family-auth-v785',persistSession:true,
    autoRefreshToken:false,detectSessionInUrl:false}
  });
  return client;
 }
 function rowFromEntry(i,entry){return{slot_index:i,label:entry.label,
  place_name:entry.place?.name||null,subtitle:entry.place?.subtitle||'',
  latitude:entry.place?.lat??null,longitude:entry.place?.lng??null,
  updated_at:new Date().toISOString()}}
 function slotFromRow(row){
  const n=Number(row.slot_index);if(!Number.isInteger(n)||n<0||n>=COUNT)return null;
  return {n,item:{label:label(row.label,n),
   place:row.place_name&&Number.isFinite(row.latitude)&&Number.isFinite(row.longitude)?
    {name:row.place_name,subtitle:row.subtitle||'',lat:row.latitude,lng:row.longitude}:null}};
 }
 async function sync(force=false){
  const api=makeClient();if(!api||working||w.document?.hidden||!w.navigator?.onLine)return false;
  const last=Number(w.localStorage?.getItem(LAST_READ)||0);
  if(!force&&!Object.keys(pending).length&&last&&Date.now()-last<TTL)return false;
  working=true;
  try{
   const session=await api.auth.getSession();
   if(!session?.data?.session?.user)return false; // never write before login
   const {data,error}=await api.from(TABLE)
    .select('slot_index,label,place_name,subtitle,latitude,longitude,updated_at')
    .order('slot_index',{ascending:true}).limit(COUNT);
   if(error)throw error;
   // Cloud rows take precedence at their occupied indexes. Local-only places
   // from legacy phones are appended to free slots by coordinate deduplication.
   const online=base(),occupied=new Set();
   for(const row of data||[]){
    const v=slotFromRow(row);if(!v)continue;
    online[v.n]=v.item;occupied.add(v.n);
   }
   const local=slots;
   // A cloud tombstone is intentional and must not resurrect an old slot,
   // unless an explicit locally pending change is newer.
   const merged=online.map((x,i)=>pending[i]?local[i]:x);
   const additions=[];
   // Import only once: stale local cache must not resurrect cloud deletions.
   const needsMigration=w.localStorage?.getItem(MIGRATION)==='1';
   for(const item of (needsMigration?local:[])){
    if(!item.place||merged.some(x=>same(x.place,item.place)))continue;
    const open=merged.findIndex((x,i)=>!occupied.has(i)&&!pending[i]&&!x.place);
    if(open<0)break;
    merged[open]=item;additions.push(open);occupied.add(open);
   }
   slots=normalize(merged);publish();
   for(const i of additions)queue(i,slots[i]);
   // Flush only changed rows: no repeated full-table writes.
   const indexes=Object.keys(pending).filter(k=>Number.isInteger(Number(k))&&Number(k)>=0&&Number(k)<COUNT);
   if(indexes.length){
    const rows=indexes.map(k=>rowFromEntry(Number(k),slots[Number(k)]));
    const up=await api.from(TABLE).upsert(rows,{onConflict:'slot_index'});
    if(up.error)throw up.error;
    for(const i of indexes)delete pending[i];
    write(PENDING,pending);
   }
   try{
    w.localStorage?.setItem(LAST_READ,String(Date.now()));
    w.localStorage?.removeItem(MIGRATION);
   }catch(_){}
   return true;
  }catch(e){
   // The pending queue stays local, including on authorization or network errors.
   return false;
  }finally{working=false}
 }
 w.addEventListener?.('storage',e=>{
  if(e.key===KEY){slots=normalize(getJson(KEY,[]));notify()}
  if(e.key===PENDING)pending=getJson(PENDING,{})||{};
 });
 w.addEventListener?.('online',()=>sync(true).catch(()=>{}));
 w.addEventListener?.('pageshow',()=>sync().catch(()=>{}));
 w.addEventListener?.('hh-guardian-auth-changed',()=>sync(true).catch(()=>{}));
 w.addEventListener?.('focus',()=>sync().catch(()=>{}));
 const api=Object.freeze({getSlots,setSlots,favoritePlaces,subscribe,sync,
  normalize,merge,same,version:'972',capacity:COUNT});
 w.HH_TRAVEL_FAVORITES_V972=api;
 // Boot is one lightweight local read + (at most) one authorized network read.
 if(w.document?.readyState==='loading')
  w.document.addEventListener('DOMContentLoaded',()=>sync().catch(()=>{}),{once:true});
 else sync().catch(()=>{});
})(typeof window!=='undefined'?window:null);
