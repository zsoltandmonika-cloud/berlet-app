/* HealthHub v739 · Separate Dropbox FULL-access destination OAuth.
   OAuth tokens are kept in browser IndexedDB, not GitHub or ChatGPT messages.
   Each user must explicitly create/authorize their own destination Dropbox app.
   Caution: a compromised browser origin could still access these tokens. */
(function(w){
'use strict';
const DB='hh-chatgpt-target-v739',STORE='session',KEY='target';
const PKCE='hh-chatgpt-target-pkce-v739';
const CALLBACK='https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/chatgpt-dropbox-callback-v739.html';
const SCOPES='files.metadata.read files.metadata.write files.content.read files.content.write';
const MAX_AUTH_AGE=10*60*1000;
const utf8=s=>new TextEncoder().encode(s);
function openDb(){
 return new Promise((resolve,reject)=>{
  const req=w.indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function read(){
 const db=await openDb();
 try{return await new Promise((resolve,reject)=>{
  const req=db.transaction(STORE,'readonly').objectStore(STORE).get(KEY);
  req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
 })}finally{db.close()}
}
async function save(auth){
 const db=await openDb();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  tx.objectStore(STORE).put(auth,KEY);
 })}finally{db.close()}
}
async function remove(){
 const db=await openDb();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite');tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error);tx.objectStore(STORE).delete(KEY);
 })}finally{db.close()}
}
function randomToken(){
 const bytes=new Uint8Array(36);w.crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
function base64url(bytes){
 let s='';for(const b of bytes)s+=String.fromCharCode(b);
 return w.btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function challenge(verifier){
 return base64url(new Uint8Array(await w.crypto.subtle.digest('SHA-256',utf8(verifier))));
}
function checkKey(key){
 if(typeof key!=='string'||!/^[A-Za-z0-9_-]{10,80}$/.test(key.trim()))
  throw Error('Érvénytelen Dropbox App key. Az App Console nyilvános App key értékét add meg, nem App secretet.');
 return key.trim();
}
async function authorize(appKey){
 appKey=checkKey(appKey);
 const verifier=randomToken(),state=randomToken();
 w.sessionStorage.setItem(PKCE,JSON.stringify({verifier,state,appKey,createdAt:Date.now()}));
 const url=new URL('https://www.dropbox.com/oauth2/authorize');
 for(const [k,v] of Object.entries({client_id:appKey,response_type:'code',redirect_uri:CALLBACK,
  code_challenge:await challenge(verifier),code_challenge_method:'S256',
  token_access_type:'offline',scope:SCOPES,state}))url.searchParams.set(k,v);
 w.location.assign(url.toString());
}
async function exchange(urlString){
 const url=new URL(urlString);
 const raw=w.sessionStorage.getItem(PKCE);
 // Never leave OAuth code in browser history, even on failure.
 try{w.history.replaceState(w.history.state,'',CALLBACK)}catch(_){}
 w.sessionStorage.removeItem(PKCE);
 if(url.searchParams.get('error'))throw Error('Dropbox OAuth elutasítva: '+url.searchParams.get('error'));
 const code=url.searchParams.get('code'),state=url.searchParams.get('state');
 if(!raw||!code||!state)throw Error('Hiányzó Dropbox engedélyezési válasz vagy PKCE-állapot.');
 let pending;try{pending=JSON.parse(raw)}catch(_){throw Error('Sérült PKCE-állapot.')}
 if(pending.state!==state||Date.now()-pending.createdAt>MAX_AUTH_AGE)
  throw Error('Lejárt vagy hibás Dropbox OAuth-állapot.');
 const appKey=checkKey(pending.appKey);
 const body=new URLSearchParams({code,grant_type:'authorization_code',
  redirect_uri:CALLBACK,code_verifier:pending.verifier,client_id:appKey});
 const res=await w.fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',
  headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 if(!res.ok)throw Error('Dropbox OAuth token-csere sikertelen (HTTP '+res.status+').');
 const data=await res.json();
 if(!data.refresh_token||!data.access_token||!data.account_id)
  throw Error('Nem kaptunk offline hozzáférést. Ellenőrizd az alkalmazás jogait.');
 const auth={appKey,refreshToken:data.refresh_token,accessToken:data.access_token,
  expiresAt:Date.now()+Math.max(60,(Number(data.expires_in)||14400)-90)*1000,
  accountId:data.account_id,connectedAt:new Date().toISOString()};
 await save(auth);
 return {accountSuffix:data.account_id.slice(-8)};
}
async function accessToken(){
 const a=await read();if(!a||!a.refreshToken)throw Error('A ChatGPT-cél Dropbox még nincs csatlakoztatva.');
 if(a.accessToken&&Date.now()<a.expiresAt-45000)return a.accessToken;
 const body=new URLSearchParams({refresh_token:a.refreshToken,grant_type:'refresh_token',client_id:a.appKey});
 const res=await w.fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',
  headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
 if(!res.ok)throw Error('Cél Dropbox tokenfrissítés sikertelen (HTTP '+res.status+').');
 const data=await res.json();
 if(!data.access_token)throw Error('Hiányzó cél Dropbox hozzáférés.');
 const next={...a,accessToken:data.access_token,
  expiresAt:Date.now()+Math.max(60,(Number(data.expires_in)||14400)-90)*1000};
 await save(next);return next.accessToken;
}
w.HH_CHATGPT_TARGET_AUTH_V739={version:'739',callback:CALLBACK,authorize,exchange,
 accessToken,read,remove,checkKey};
})(window);