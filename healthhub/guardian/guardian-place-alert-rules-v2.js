/* SHO Smart Buddy · Place Alert Rules v2
 * Non-GPS rule repository, shared between Family Guard & Notification Center.
 * Cloud source: RLS-protected hh_guardian_place_alert_rules_v2.
 * No background trackers, secret keys or unauthenticated writes.
 */
(function(w){
'use strict';
if(w.SHO_BUDDY_PLACE_RULES_V2)return;
const TABLE='hh_guardian_place_alert_rules_v2',KEY='sho-buddy-place-rules-v2';
const PROFILES=['zsolt','monika'],RADII=[100,150,200,300],SOUNDS=['chime','bell','digital','silent'];
let entries=read(),client=null,busy=null,lastSync=0;
function read(){try{const a=JSON.parse(w.localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.slice(0,100).map(normalize).filter(Boolean):[]}catch(_){return []}}
function storage(){try{w.localStorage.setItem(KEY,JSON.stringify(entries))}catch(_){}}
function emit(){try{w.dispatchEvent(new w.CustomEvent('sho:buddy-place-rules-changed'))}catch(_){}}
function validCoords(lat,lng){return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180}
function normalize(a){
 if(!a||!Number.isInteger(Number(a.slot_index))||Number(a.slot_index)<0||Number(a.slot_index)>=40||
 !PROFILES.includes(a.profile_key))return null;
 const lat=Number(a.place_lat),lng=Number(a.place_lng),radius=Number(a.radius_m);
 if(!validCoords(lat,lng)||!RADII.includes(radius)||!SOUNDS.includes(a.arrival_sound)||!SOUNDS.includes(a.departure_sound))return null;
 return {slot_index:Number(a.slot_index),profile_key:a.profile_key,place_lat:lat,place_lng:lng,
  arrival_enabled:a.arrival_enabled===true,departure_enabled:a.departure_enabled===true,
  radius_m:radius,arrival_sound:a.arrival_sound,departure_sound:a.departure_sound};
}
function list(){return entries.map(x=>({...x}))}
function forPlace(index,profile,lat,lng){
 const found=entries.find(x=>x.slot_index===index&&x.profile_key===profile);
 if(!found||!validCoords(Number(lat),Number(lng)))return null;
 // A favorite slot may be replaced; stale rules are ignored, not silently transferred.
 const dy=(Number(lat)-found.place_lat)*111195;
 const dx=(Number(lng)-found.place_lng)*111195*Math.cos(Number(lat)*Math.PI/180);
 return Math.hypot(dy,dx)<=25?{...found}:null;
}
function getClient(){
 const linked=w.HH_GUARDIAN_LIVE_V785?.getClient?.();
 if(linked)return linked;
 if(client)return client;
 const cfg=w.HH_CENTRAL_VAULT;
 if(!cfg?.enabled||!cfg.supabaseUrl||!cfg.publishableKey||!w.supabase?.createClient)return null;
 client=w.supabase.createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{
  storageKey:'hh-guardian-family-auth-v785',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false
 }});
 return client;
}
async function authorized(){
 const api=getClient();if(!api)return null;
 try{const r=await api.auth.getUser();return !r.error&&r.data?.user&&!r.data.user.is_anonymous?api:null}catch(_){return null}
}
async function sync(force=false){
 if(busy)return busy;
 if(!force&&Date.now()-lastSync<180000)return true;
 busy=(async()=>{
  const api=await authorized();if(!api)return false;
  const {data,error}=await api.from(TABLE).select('slot_index,profile_key,place_lat,place_lng,arrival_enabled,departure_enabled,radius_m,arrival_sound,departure_sound').limit(100);
  if(error)return false;
  entries=(data||[]).map(normalize).filter(Boolean);storage();lastSync=Date.now();emit();return true;
 })().catch(()=>false).finally(()=>{busy=null});
 return busy;
}
async function save(raw){
 const value=normalize(raw);
 if(!value)throw Error('Érvénytelen helyriasztási beállítás.');
 const current=w.HH_TRAVEL_FAVORITES_V972?.getSlots?.()?.[value.slot_index]?.place;
 if(!current||!validCoords(Number(current.lat),Number(current.lng)))throw Error('A kedvenc hely már nem létezik.');
 const dy=(Number(current.lat)-value.place_lat)*111195;
 const dx=(Number(current.lng)-value.place_lng)*111195*Math.cos(Number(current.lat)*Math.PI/180);
 if(Math.hypot(dy,dx)>25)throw Error('A kedvenc hely megváltozott. Frissítsd a listát.');
 const api=await authorized();if(!api)throw Error('Jelentkezz be a Family Guardba a felhőmentéshez.');
 const {error}=await api.from(TABLE).upsert({...value,updated_at:new Date().toISOString()},{onConflict:'slot_index,profile_key'});
 if(error)throw Error('Felhőmentés sikertelen. Az eredeti beállítás megmaradt.');
 entries=entries.filter(x=>x.slot_index!==value.slot_index||x.profile_key!==value.profile_key);
 entries.push(value);storage();emit();return {...value};
}
w.addEventListener?.('storage',event=>{if(event.key===KEY){entries=read();emit()}});
w.addEventListener?.('pageshow',()=>{if(!w.document?.hidden)void sync()});
w.addEventListener?.('focus',()=>{if(!w.document?.hidden)void sync()});
w.addEventListener?.('hh-guardian-auth-changed',()=>void sync(true));
w.SHO_BUDDY_PLACE_RULES_V2=Object.freeze({version:2,list,forPlace,sync,save,authorized,normalize});
if(w.document?.readyState==='loading')w.document.addEventListener('DOMContentLoaded',()=>void sync(),{once:true});
else void sync();
})(window);
