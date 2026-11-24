/* SHO Family Guard / TV: one-way encrypted, read-only snapshot codec v1.
 * Browser + Node library, NO network, no auth, no storage, no GPS access.
 * Keys are derived from a new random 120-bit TV-only code never sent to Realtime.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SHO_GUARDIAN_RO_CODEC_V1=Object.freeze(api);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const PREFIX='SHO-GUARDIAN-READONLY-v1|';
 const CONTEXT='SHO-GUARDIAN-READONLY-CIPHERTEXT-v1|';
 const FRESH_MS=75000,KNOWN_MS=12*60*60*1000,MAX_PACKET_MS=90000,MAX_FUTURE_MS=5000;
 const allowed=new Set(['zsolt','monika']);
 const getCrypto=x=>{const c=x||(typeof globalThis!=='undefined'?globalThis.crypto:null);
  if(!c?.subtle||!c?.getRandomValues)throw new Error('Secure WebCrypto unavailable');
  return c;
 };
 function makeCode(cryptoImpl){
  const c=getCrypto(cryptoImpl),buf=new Uint8Array(24);
  c.getRandomValues(buf);
  return [...buf].map(x=>ALPHABET[x&31]).join('');
 }
 function normalizeCode(code){
  const s=String(code||'').toUpperCase().replace(/[\s-]/g,'');
  if(s.length!==24||[...s].some(x=>!ALPHABET.includes(x)))throw new Error('Expected 24-character TV consent code');
  return s;
 }
 function displayCode(code){return normalizeCode(code).match(/.{4}/g).join(' ');}
 function bytesToB64(a){
  if(typeof btoa==='function')return btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  if(typeof Buffer!=='undefined')return Buffer.from(a).toString('base64url');
  throw Error('Base64 not supported');
 }
 function b64ToBytes(s,max=10000){
  if(typeof s!=='string'||s.length<1||s.length>max||!/^[A-Za-z0-9_-]+$/.test(s))
   throw Error('Invalid base64 envelope');
  if(typeof atob==='function'){
   const b=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
   return Uint8Array.from(b,x=>x.charCodeAt(0));
  }
  if(typeof Buffer!=='undefined')return new Uint8Array(Buffer.from(s,'base64url'));
  throw Error('Base64 not supported');
 }
 async function keyFor(code,cryptoImpl){
  const c=getCrypto(cryptoImpl);
  // Uniformly generated 120-bit secret, not a user password. SHA-256 KDF is
  // appropriate here: the 120-bit entropy remains the confidentiality bound.
  const bits=await c.subtle.digest('SHA-256',new TextEncoder().encode(PREFIX+normalizeCode(code)));
  return c.subtle.importKey('raw',bits,{name:'AES-GCM'},false,['encrypt','decrypt']);
 }
 function validTime(x,now=Date.now(),maxAge=KNOWN_MS){
  const t=Date.parse(x);
  return Number.isFinite(t)&&t<=now+MAX_FUTURE_MS&&now-t>=-MAX_FUTURE_MS&&now-t<=maxAge?t:null;
 }
 function sanitizedNative(profile,response,now=Date.now()){
  if(!allowed.has(profile))throw Error('Invalid owner');
  const status=response?.status;
  if(status!=='ok')return {profile,status:['revoked','not-connected','missing','invalid','error','route-unconfigured'].includes(status)?status:'error'};
  const f=response?.data;
  if(!f||f.profile_key!==profile||f.source!=='HH One Native GPS'||
     f.route_id!=='gps.'+profile||f.read_account!=='outlook'||
     !Number.isFinite(f.latitude)||Math.abs(f.latitude)>90||
     !Number.isFinite(f.longitude)||Math.abs(f.longitude)>180||
     !Number.isFinite(f.accuracy_m)||f.accuracy_m<0||f.accuracy_m>100||
     validTime(f.updated_at,now)===null)return {profile,status:'invalid'};
  // Deliberately drop unknown fields (refresh/access tokens, native IDs,
  // full Dropbox payload, auth session, detailed device registry, etc.).
  return {profile,status:'ok',fix:{
   profile_key:profile,route_id:'gps.'+profile,read_account:'outlook',
   source:'HH One Native GPS',latitude:f.latitude,longitude:f.longitude,
   accuracy_m:f.accuracy_m,updated_at:f.updated_at,
   speed_kmh:Number.isFinite(f.speed_kmh)&&f.speed_kmh>=0&&f.speed_kmh<=200?f.speed_kmh:null,
   battery_pct:Number.isInteger(f.battery_pct)&&f.battery_pct>=0&&f.battery_pct<=100?f.battery_pct:null,
   battery_charging:typeof f.battery_charging==='boolean'?f.battery_charging:null
  }};
 }
 function sanitizePayload(input,now=Date.now()){
  if(!input||input.v!==1||!Array.isArray(input.profiles)||
     input.profiles.length<1||input.profiles.length>2||
     !Number.isSafeInteger(input.at)||Math.abs(now-input.at)>MAX_PACKET_MS)return null;
  const seen=new Set(),profiles=[];
  for(const p of input.profiles){
   if(!p||!allowed.has(p.profile)||seen.has(p.profile))return null;
   seen.add(p.profile);
   if(p.status==='ok'){
    const s=sanitizedNative(p.profile,{status:'ok',data:p.fix},now);
    if(s.status!=='ok')return null;
    profiles.push(s);
   }else if(['revoked','not-connected','missing','invalid','error','route-unconfigured'].includes(p.status))
    profiles.push({profile:p.profile,status:p.status});
   else return null;
  }
  return {v:1,at:input.at,profiles};
 }
 function aad(seq,ts){return new TextEncoder().encode(CONTEXT+seq+'|'+ts);}
 async function seal(code,payload,seq,now=Date.now(),cryptoImpl){
  if(!Number.isSafeInteger(seq)||seq<=0)throw Error('Invalid sequence');
  const c=getCrypto(cryptoImpl),snapshot=sanitizePayload(payload,now);
  if(!snapshot)throw Error('Invalid or stale native snapshot');
  const iv=new Uint8Array(12);c.getRandomValues(iv);
  const box=await c.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(seq,now)},
   await keyFor(code,c),new TextEncoder().encode(JSON.stringify(snapshot)));
  return {v:1,seq,ts:now,iv:bytesToB64(iv),box:bytesToB64(new Uint8Array(box))};
 }
 async function unseal(code,packet,now=Date.now(),cryptoImpl){
  if(!packet||packet.v!==1||!Number.isSafeInteger(packet.seq)||packet.seq<=0||
    !Number.isSafeInteger(packet.ts)||packet.ts>now+MAX_FUTURE_MS||now-packet.ts>MAX_PACKET_MS)
   throw Error('Invalid/expired encrypted packet');
  const c=getCrypto(cryptoImpl),iv=b64ToBytes(packet.iv,32),box=b64ToBytes(packet.box,4096);
  if(iv.length!==12||box.length<17)throw Error('Invalid encrypted packet lengths');
  const plain=await c.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad(packet.seq,packet.ts)},
   await keyFor(code,c),box);
  let obj;try{obj=JSON.parse(new TextDecoder().decode(plain))}catch(_){throw Error('Invalid packet JSON')}
  const result=sanitizePayload(obj,now);
  if(!result||Math.abs(result.at-packet.ts)>5000)throw Error('Invalid source snapshot');
  return result;
 }
 function freshness(fix,now=Date.now()){
  const stamp=validTime(fix?.updated_at,now);
  return stamp===null?'invalid':now-stamp<=FRESH_MS?'live':'last-known';
 }
 return Object.freeze({makeCode,normalizeCode,displayCode,sanitizedNative,sanitizePayload,
  seal,unseal,freshness,FRESH_MS,KNOWN_MS,MAX_PACKET_MS});
});
