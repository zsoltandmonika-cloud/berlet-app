/* SH9 × Léna Native Integration v1101 · isolated handover contract.
 * NO network calls, OAuth, background polling or production page changes.
 * The MCP server must independently authenticate the actor and verify profile
 * authorization in hh_profile_access. Never trust the requested profile.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_LENA_HANDOVER_V1101=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const SCHEMA='sh9.lena-handover/1';
 const MAX_BYTES=64000;
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const VALID_PROFILES=new Set(['m','z']);
 const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
  (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
 function parseEnvelope(raw,tripPackApi){
  if(!tripPackApi||typeof tripPackApi.normalize!=='function')throw Error('TripPack validator unavailable');
  let value=raw;
  if(typeof raw==='string'){
   if(raw.length>MAX_BYTES)throw Error('Handover payload too large');
   try{value=JSON.parse(raw)}catch(_){throw Error('Invalid handover JSON')}
  }
  if(!plain(value))throw Error('Handover must be a JSON object');
  if(JSON.stringify(value).length>MAX_BYTES)throw Error('Handover payload too large');
  const keys=Object.keys(value);
  const allowed=['schema','requestId','profile','tripPack'];
  if(keys.some(k=>!allowed.includes(k)))throw Error('Unknown handover field');
  if(value.schema!==SCHEMA)throw Error('Unsupported handover schema');
  if(typeof value.requestId!=='string'||!UUID.test(value.requestId))
   throw Error('Invalid idempotency UUID');
  if(!VALID_PROFILES.has(value.profile))throw Error('Invalid requested profile');
  if(!plain(value.tripPack))throw Error('Missing TripPack object');
  const normalized=tripPackApi.normalize(value.tripPack);
  return Object.freeze({
   schema:SCHEMA,requestId:value.requestId.toLowerCase(),profile:value.profile,
   tripPack:normalized
  });
 }
 function makeRecord(parsed,authorizedProfiles,serverTimestamp){
  if(!parsed||parsed.schema!==SCHEMA||!UUID.test(parsed.requestId))
   throw Error('Handover not validated');
  // 'authorizedProfiles' MUST come from a server-side database membership check,
  // never from the model, JSON payload, browser or caller-supplied trust assertion.
  if(!Array.isArray(authorizedProfiles)||!authorizedProfiles.includes(parsed.profile))
   throw Error('Access denied for requested household profile');
  if(!Number.isFinite(serverTimestamp)||serverTimestamp<=0)
   throw Error('Trusted server timestamp required');
  const id='tp-lena-'+parsed.requestId.replace(/-/g,'');
  const p=parsed.profile==='m'?'monika':'zsolt';
  return Object.freeze({
   profile_key:p,
   trip_id:id,
   trip_data:{...parsed.tripPack,id,savedAt:Math.trunc(serverTimestamp)}
  });
 }
 function fingerprint(t){
  if(!t||typeof t!=='object'||!Array.isArray(t.segments))return '';
  // Full logical itinerary. Exclude mutable user edits (rating/tracking) so
  // retrying a completed request cannot overwrite later annotations.
  const fields=['schema','title','travelDate','from','to','departure','arrival',
   'arrivalStatus','summary','segments','alerts','alternatives','sources'];
  return JSON.stringify(fields.map(k=>has(t,k)?t[k]:null));
 }
 function isSameRequest(existing,proposed){
  if(!existing||!proposed)return false;
  return existing.trip_id===proposed.trip_id&&
   existing.profile_key===proposed.profile_key&&
   fingerprint(existing.trip_data)===fingerprint(proposed.trip_data);
 }
 return Object.freeze({SCHEMA,MAX_BYTES,parseEnvelope,makeRecord,fingerprint,isSameRequest});
});
