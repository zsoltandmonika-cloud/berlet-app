/* Family Guard v156: PRIVATE read-only Dropbox latest GPS bridge.
 * Uses the same-origin HealthHub Dropbox OAuth already accepted by this browser.
 * Never requests browser location, starts sharing, uploads data or stores tracks.
 */
(function(w){
 'use strict';
 const APP='t68rmhh5f1l8d85';
 const PREFIX='/HealthHub/guardian/native-live/';
 const SAFE_PROFILES=['zsolt','monika'];
 const SCHEMA='healthhub.guardian.native/1';
 // Only fingerprints of the verified Dropbox account IDs appear in the public source.
 // Gmail/Monika and Outlook/Zsolt have independent, already consented browser tokens.
 const ACCOUNT_SHA256=Object.freeze({
  monika:'eb35bda6b9e5b3328aaa6b0f2f7aeda74e86a31f5c1e33cadb2d4829863c9d64',
  zsolt:'5e7490869f879a4ca5a41189d2ce6d6998ed44833da8d10ed9251558a1d2973e'
 });
 const STORES=['hh-remote-service-token-v1','hh-dropbox-token-v2'];
 const refreshInFlight=new Map();
 function stored(key){
  try{
   const t=JSON.parse(w.localStorage?.getItem(key)||'null');
   return typeof t?.refresh_token==='string'&&t.refresh_token.length>10&&
    typeof t.account_id==='string'&&t.account_id.startsWith('dbid:')?t:null;
  }catch(_){return null}
 }
 function digest(s){
  if(!w.crypto?.subtle)return Promise.reject(Error('Biztonságos böngésző-környezet szükséges'));
  return w.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(bytes=>
   Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join(''));
 }
 // Browser storage is origin-scoped: the existing PC credentials can be reused,
 // but must NOT be presumed to exist on a different phone or browser.
 async function credential(profile){
  if(!SAFE_PROFILES.includes(profile))throw Error('Érvénytelen Family Guard profil');
  const found=[];
  for(const key of STORES){
   const t=stored(key);if(!t)continue;
   if(await digest(t.account_id)===ACCOUNT_SHA256[profile])found.push({key,token:t});
  }
  // A verified owner can have a separately authorized token in either store.
  // Prefer the standalone slot for Gmail and original HealthHub slot for Outlook.
  found.sort((a,b)=>{
   const desired=profile==='monika'?STORES[0]:STORES[1];
   return Number(b.key===desired)-Number(a.key===desired);
  });
  return found[0]||null;
 }
 function connected(profile){
  if(profile&& !SAFE_PROFILES.includes(profile))return false;
  return STORES.some(key=>!!stored(key)); // exact account is checked before every download
 }
 async function getToken(c){
  const key=c.key,t=c.token;
  if(t.access_token&&Number(t.expires_at)>Date.now()+60000)return t.access_token;
  if(refreshInFlight.has(key))return refreshInFlight.get(key);
  const work=(async()=>{
   const req=await w.fetch('https://api.dropboxapi.com/oauth2/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP})
   });
   if(!req.ok)throw Error('A Dropbox hozzáférés megújítása sikertelen');
   const next=await req.json();
   if(typeof next?.access_token!=='string')throw Error('Érvénytelen Dropbox token');
   t.access_token=next.access_token;
   t.expires_at=Date.now()+(Number(next.expires_in)||14400)*1000-60000;
   w.localStorage.setItem(key,JSON.stringify(t));
   return t.access_token;
  })();
  refreshInFlight.set(key,work);
  try{return await work}finally{refreshInFlight.delete(key)}
 }
 async function download(profile){
  if(!SAFE_PROFILES.includes(profile))throw Error('Érvénytelen Family Guard profil');
  try{
   const c=await credential(profile);
   if(!c)return {status:'not-connected',data:null,
    error:'Ehhez a profilhoz nincs külön hitelesített Dropbox-kapcsolat ebben a böngészőben.'};
   const token=await getToken(c);
   const r=await w.fetch('https://content.dropboxapi.com/2/files/download',{
    method:'POST',headers:{Authorization:'Bearer '+token,
     'Dropbox-API-Arg':JSON.stringify({path:PREFIX+profile+'.json'})},
    cache:'no-store'
   });
   if(r.status===409)return {status:'missing',data:null};
   if(!r.ok)throw Error('Dropbox privát helyadat HTTP '+r.status);
   const raw=await r.json();
   if(!raw||raw.schema!==SCHEMA||raw.profile!==profile||raw.source!=='HH One Native GPS')
    return {status:'invalid',data:null};
   if(raw.active===false)return {status:'revoked',data:null,updated_at:raw.updated_at};
   if(raw.active!==true)return {status:'invalid',data:null};
   // Require real numeric values and an authentic, bounded timestamp.
   const lat=raw.latitude,lon=raw.longitude,acc=raw.accuracy_m,dt=Date.parse(raw.updated_at);
   if(typeof lat!=='number'||typeof lon!=='number'||typeof acc!=='number'||
    !Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(acc)||
    Math.abs(lat)>90||Math.abs(lon)>180||acc<0||acc>100||
    !Number.isFinite(dt)||dt>Date.now()+5000||Date.now()-dt>12*3600*1000)
    return {status:'invalid',data:null};
   return {status:'ok',data:{
    profile_key:profile,latitude:lat,longitude:lon,accuracy_m:acc,
    updated_at:raw.updated_at,
    speed_kmh:typeof raw.speed_kmh==='number'&&Number.isFinite(raw.speed_kmh)?raw.speed_kmh:null,
    // Optional v841 battery fields. Old HH One APKs have neither field.
    // Never invent a reading for null, missing or malformed telemetry.
    battery_pct:Number.isInteger(raw.battery_pct)&&raw.battery_pct>=0&&raw.battery_pct<=100?raw.battery_pct:null,
    battery_charging:typeof raw.battery_charging==='boolean'?raw.battery_charging:null,
    source:'HH One Native GPS'
   }};
  }catch(e){
   if(e?.status===409)return {status:'missing',data:null};
   return {status:'error',data:null,error:String(e&&e.message||'kapcsolat').slice(0,100)};
  }
 }
 w.HH_GUARDIAN_NATIVE_V156=Object.freeze({connected,read:download});
})(window);
