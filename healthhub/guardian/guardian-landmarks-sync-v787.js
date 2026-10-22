/* HealthHub Family Guard v787 · shared Landmark cloud bridge.
 * Explicitly shared places only: all legacy bookmarks and new Private entries remain LOCAL.
 * Authenticated family-member RLS on Supabase; no service secrets, no GPS collection.
 * Online sync while the page is open; offline operations queue locally for retry.
 */
(function(w,d){
'use strict';
const TABLE='hh_guardian_shared_landmarks',OUTBOX='hh-guardian-shared-landmarks-outbox-v787';
const CACHE='hh-guardian-shared-landmarks-cache-v787',TICK=15000;
const $=id=>d.getElementById(id),landmarks=w.HH_GUARDIAN_LANDMARKS_V776;
let pending=read(OUTBOX),remote=[],running=false,ready=false;
function read(key){
 try{const x=JSON.parse(w.localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}
}
function write(key,value){w.localStorage.setItem(key,JSON.stringify(value))}
function validPoint(n,limit){return typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=limit}
function safePlace(x){
 if(!x||!/^[A-Za-z0-9_-]{3,40}$/.test(String(x.id||'')))return null;
 const kinds=['home','work','doctor','family','favorite','bus','tram','shopping','other'];
 const kind=String(x.kind||''),name=String(x.name||'').trim().slice(0,40);
 const lng=Number(x.lng!==undefined?x.lng:x.longitude),lat=Number(x.lat!==undefined?x.lat:x.latitude);
 if(!kinds.includes(kind)||!name||!validPoint(lng,180)||!validPoint(lat,90))return null;
 return {id:x.id,kind,name,lng,lat};
}
function client(){const live=w.HH_GUARDIAN_LIVE_V785;return live&&live.getClient&&live.getClient()}
function authorized(){const live=w.HH_GUARDIAN_LIVE_V785;return !!(live&&live.authenticated&&live.familyAuthorized&&client())}
function status(text){const el=$('guardianLandmarkSyncStatus');if(el)el.textContent=text}
function visible(){
 if(!ready||!landmarks)return;
 const merged=new Map();
 for(const row of remote){
  if(row.deleted_at)continue;
  const p=safePlace(row);if(p)merged.set(p.id,p);
 }
 for(const op of pending){
  if(op.action==='delete')merged.delete(op.id);
  else if(op.action==='save'){const p=safePlace(op.place);if(p)merged.set(p.id,p)}
 }
 landmarks.setSharedEntries(Array.from(merged.values()));
}
function enqueue(action,placeOrId){
 if(!authorized())throw Error('Családi Google-belépés szükséges');
 const place=action==='save'?safePlace(placeOrId):null;
 const id=action==='save'?(place&&place.id):String(placeOrId);
 if(!id||!/^[A-Za-z0-9_-]{3,40}$/.test(id))throw Error('Érvénytelen hely');
 const op=action==='save'?{action,id,place}:{action,id};
 const next=pending.filter(p=>p.id!==id).concat(op);
 write(OUTBOX,next);pending=next;
 visible();status('☁ Szinkronizációra vár: '+pending.length+' módosítás');
 w.setTimeout(sync,0);
}
function ownProfile(){
 const live=w.HH_GUARDIAN_LIVE_V785;
 return live&&live.boundProfile==='monika'?'monika':live&&live.boundProfile==='zsolt'?'zsolt':
 w.localStorage.getItem('hh-profile')==='m'?'monika':'zsolt';
}
async function commit(api,op){
 let error=null;
 if(op.action==='save'){
  const x=op.place;
  ({error}=await api.from(TABLE).upsert({
   id:x.id,profile_key:ownProfile(),kind:x.kind,name:x.name,
   longitude:x.lng,latitude:x.lat,updated_at:new Date().toISOString(),deleted_at:null
  },{onConflict:'id'}));
 }else{
  ({error}=await api.from(TABLE).update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',op.id));
 }
 if(error)throw error;
}
async function sync(){
 if(running||d.hidden||!landmarks)return;
 if(!authorized()){
  ready=false;remote=[];landmarks.setSharedEntries([]);
  status('🔒 Privát helyek elérhetők · közös helyekhez Google-belépés szükséges');
  return;
 }
 const api=client();if(!api)return;
 running=true;
 try{
  if(!ready){remote=read(CACHE);ready=true;visible()}
  // Flush pending changes in order. Keep failures in durable localStorage.
  while(pending.length){
   const op=pending[0];
   await commit(api,op);
   const remain=pending.slice(1);
   write(OUTBOX,remain);pending=remain;
  }
  const {data,error}=await api.from(TABLE).select('id,profile_key,kind,name,longitude,latitude,updated_at,deleted_at').order('updated_at',{ascending:false}).limit(250);
  if(error)throw error;
  remote=(data||[]).filter(x=>safePlace(x));write(CACHE,remote);visible();
  status('☁ Közös Landmarkok szinkronban · '+remote.filter(x=>!x.deleted_at).length+' hely');
 }catch(e){
  visible();
  status('☁ Kapcsolat később újrapróbálva'+(pending.length?' · '+pending.length+' függő módosítás':'')+' · '+(e&&e.message||'hálózati hiba'));
 }finally{running=false}
}
if(landmarks){
 landmarks.setBridge({
  create(place){enqueue('save',place)},
  remove(id){enqueue('delete',id)}
 });
}
const run=()=>{sync().catch(()=>{})};
w.addEventListener('online',run);
w.addEventListener('pageshow',run);
w.addEventListener('hh-guardian-auth-changed',run);
d.addEventListener('visibilitychange',()=>{if(!d.hidden)run()});
w.setInterval(run,TICK);
run();
w.HH_GUARDIAN_LANDMARK_SYNC_V787=Object.freeze({sync:get=>sync(),get pendingCount(){return pending.length}});
})(window,document);
