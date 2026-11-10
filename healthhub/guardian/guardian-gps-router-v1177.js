/* Family Guard v1177 · one profile, one physical phone GPS source.
 * Read-only facade. Reuses proven owner-specific Dropbox OAuth in v156.
 * No Supabase coordinate reads, GPS sensors, uploads, or silent fallback.
 */
(function(w){
 'use strict';
 const registry=w.HH_GUARDIAN_GPS_ROUTES_V1177;
 const relay=w.HH_GUARDIAN_NATIVE_V156;
 const configured=profile=>{
  const r=registry?.forProfile?.(profile);
  return r&&r.profile===profile&&r.nativePath==='/HealthHub/guardian/native-live/'+profile+'.json'&&
   r.id==='gps.'+profile&&
   r.activeReadAccount===(profile==='monika'?'gmail':'outlook')?r:null;
 };
 const connected=()=>!!relay?.connected?.();
 async function read(profile){
  const route=configured(profile);
  if(!route)return {status:'route-unconfigured',data:null};
  if(!connected())return {status:'not-connected',data:null,route_id:route.id};
  let out;
  try{out=await relay.read(profile)}
  catch(_){return {status:'error',data:null,route_id:route.id}}
  if(out?.status!=='ok')return {status:out?.status||'error',data:null,
   updated_at:out?.updated_at,route_id:route.id};
  const fix=out.data;
  if(!registry.assertMatchingFix(profile,fix)||fix?.source!=='HH One Native GPS')
   return {status:'invalid',data:null,route_id:route.id};
  return {status:'ok',route_id:route.id,read_account:route.activeReadAccount,
   data:{...fix,route_id:route.id,read_account:route.activeReadAccount}};
 }
 w.HH_GUARDIAN_GPS_ROUTER_V1177=Object.freeze({version:'1177',
  connected,read,forProfile:configured,label:profile=>registry?.label?.(profile)||'GPS'});
})(window);
