/* Family Guard v156: PRIVATE read-only Dropbox latest GPS bridge.
 * Uses the same-origin HealthHub Dropbox OAuth already accepted by this browser.
 * Never requests browser location, starts sharing, uploads data or stores tracks.
 */
(function(w){
 'use strict';
 const KEY='hh-dropbox-token-v2',APP='t68rmhh5f1l8d85';
 const PREFIX='/HealthHub/guardian/native-live/';
 const SAFE_PROFILES=['zsolt','monika'];
 const SCHEMA='healthhub.guardian.native/1';
 function tokenStored(){
  try{const raw=JSON.parse(w.localStorage.getItem(KEY)||'null');
   return raw&&typeof raw.refresh_token==='string'&&raw.refresh_token.length>10?raw:null;
  }catch(_){return null}
 }
 function connected(){return !!(w.HH_DROPBOX_VAULT&&w.HH_DROPBOX_VAULT.connected?.())||!!tokenStored()}
 async function getToken(){
  if(w.HH_DROPBOX_VAULT&&w.HH_DROPBOX_VAULT.connected?.())return w.HH_DROPBOX_VAULT.accessToken();
  const t=tokenStored();
  if(!t)throw Object.assign(new Error('Dropbox családi böngészős hozzáférés hiányzik'),{code:'NO_DROPBOX'});
  if(t.access_token&&Number(t.expires_at)>Date.now()+60_000)return t.access_token;
  const req=await w.fetch('https://api.dropboxapi.com/oauth2/token',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({refresh_token:t.refresh_token,grant_type:'refresh_token',client_id:APP})
  });
  if(!req.ok)throw new Error('Dropbox hozzáférés megújítása sikertelen');
  const response=await req.json();
  if(!response||typeof response.access_token!=='string')throw new Error('Dropbox érvénytelen hitelesítés');
  // Same credential format as the existing private HealthHub vault.
  if(w.localStorage.getItem(KEY)!==null){
   t.access_token=response.access_token;
   t.expires_at=Date.now()+(Number(response.expires_in)||14400)*1000-60_000;
   w.localStorage.setItem(KEY,JSON.stringify(t));
  }
  return response.access_token;
 }
 async function download(profile){
  if(!SAFE_PROFILES.includes(profile))throw Error('Érvénytelen Family Guard profil');
  if(!connected())return {status:'not-connected',data:null};
  const vault=w.HH_DROPBOX_VAULT;
  try{
   let raw;
   if(vault&&vault.connected?.()&&typeof vault.downloadJson==='function'){
    raw=await vault.downloadJson(PREFIX+profile+'.json');
   }else{
    const token=await getToken();
    const r=await w.fetch('https://content.dropboxapi.com/2/files/download',{
     method:'POST',headers:{Authorization:'Bearer '+token,
      'Dropbox-API-Arg':JSON.stringify({path:PREFIX+profile+'.json'})},
     cache:'no-store'
    });
    if(r.status===409)return {status:'missing',data:null};
    if(!r.ok)throw Error('Dropbox privát helyadat HTTP '+r.status);
    raw=await r.json();
   }
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
