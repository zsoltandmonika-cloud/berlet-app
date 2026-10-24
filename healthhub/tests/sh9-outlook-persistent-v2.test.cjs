'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const vault=require('../../sh9/outlook-session-v2.js');
const app=read('sh9/outlook-agenda-v1.js');
const html=read('sh9/index.html');
const readme=read('sh9/outlook-agenda-README.md');
const uuid='c7f16654-67a5-4e2e-8b7e-db014598501d';
function fakeStorage(){
 const entries=new Map();
 const db={
  objectStoreNames:{contains:k=>k==='vault'&&entries.has('__created__')},
  createObjectStore:k=>{assert.equal(k,'vault');entries.set('__created__',true)},
  transaction(store,mode){
   assert.equal(store,'vault');
   const tr={oncomplete:null,onerror:null,onabort:null};
   tr.objectStore=()=>({
    get:key=>request('get',key),
    put:(value,key)=>request('put',key,value),
    delete:key=>request('delete',key)
   });
   function request(op,key,value){
    const r={result:null,onsuccess:null,onerror:null};
    queueMicrotask(()=>{
     if(op==='get')r.result=entries.get(key);
     if(op==='put')entries.set(key,value);
     if(op==='delete')entries.delete(key);
     r.onsuccess?.();queueMicrotask(()=>tr.oncomplete?.());
    });
    return r;
   }
   return tr;
  },
  close(){}
 };
 return {entries,env:{
  isSecureContext:true,crypto:webcrypto,
  indexedDB:{open(){
   const req={result:db,onsuccess:null,onerror:null,onupgradeneeded:null,onblocked:null};
   queueMicrotask(()=>{
    if(!entries.has('__created__'))req.onupgradeneeded?.();
    req.onsuccess?.();
   });
   return req;
  }}
 }};
}
test('private Outlook refresh session encrypts before IndexedDB and restores same-account token',async()=>{
 const {env,entries}=fakeStorage();
 assert.equal(vault.usable(env),true);
 const token='TEST_refresh_secret_never_plaintext_because_sensitive_012345';
 const time=Date.now();
 assert.equal(await vault.save(env,uuid,'someone@example.org',token,time),true);
 assert.ok(entries.get('refresh-record'));
 assert.ok(entries.get('encryption-key').extractable===false,'CryptoKey must be non-extractable');
 assert.equal(JSON.stringify(entries.get('refresh-record')).includes(token),false,'no plaintext in IDB record');
 const saved=await vault.load(env,uuid,'someone@example.org');
 assert.equal(saved.refreshToken,token);
 assert.equal(saved.issuedAt,time);
 assert.equal(await vault.load(env,uuid,'other@example.org'),null,'wrong account must never use cached refresh token');
 assert.equal(entries.has('refresh-record'),false,'invalid account association clears token');
});
test('explicit disconnect clears persisted secret without deleting calendar settings',async()=>{
 const {env,entries}=fakeStorage();
 assert.equal(await vault.save(env,uuid,'someone@example.org','TEST_refresh_rotate',Date.now()),true);
 assert.equal(await vault.clear(env),true);
 assert.equal(entries.has('refresh-record'),false);
 assert.equal(await vault.load(env,uuid,'someone@example.org'),null);
});
test('refresh token cannot be saved after Microsoft SPA 24 hour bound',async()=>{
 const {env}=fakeStorage();
 assert.equal(await vault.save(env,uuid,'someone@example.org','TEST_expired_refresh',
  Date.now()-vault.MAX_AGE),false);
 assert.equal(await vault.load(env,uuid,'someone@example.org'),null);
});
test('requires secure browser IndexedDB and WebCrypto, no raw token in localStorage',async()=>{
 const {env}=fakeStorage();
 assert.equal(vault.usable({...env,isSecureContext:false}),false);
 assert.equal(vault.usable({...env,indexedDB:null}),false);
 assert.equal(vault.usable({...env,crypto:null}),false);
 assert.equal(await vault.save({...env,indexedDB:null},uuid,'someone@example.org','TEST_x',Date.now()),false);
 assert.match(app,/const SCOPES='openid profile offline_access User\.Read Calendars\.Read'/);
 assert.match(app,/grant_type:'refresh_token'/);
 assert.match(app,/PERSIST\.load\(w,cfg\.clientId,cfg\.account\)/);
 assert.match(app,/await verifyAccount\(\);\s*await persistRefreshAfterVerify\(\)/);
 assert.match(app,/await forgetStoredSession\(\)/);
 assert.doesNotMatch(app,/saveLocal\(.*refreshToken|saveSession\(.*refreshToken|addJavascriptInterface|client_secret/);
 assert.match(html,/outlook-session-v2\.js\?v=2/);
 assert.match(html,/outlook-agenda-v1\.js\?v=6-persistent-ms/);
});
test('one top-level SSO redirect can reuse Microsoft cookie, but must not loop',()=>{
 assert.match(app,/u\.searchParams\.set\('prompt','none'\)/);
 assert.match(app,/SILENT_RETRY_MS=4\*60\*60\*1000/);
 assert.match(app,/priorApproved\(\)/);
 assert.match(app,/Date\.now\(\)-last<SILENT_RETRY_MS/);
 assert.match(app,/if\(refreshToken&&refreshIssuedAt&&Date\.now\(\)-refreshIssuedAt<23\*60\*60\*1000\)return false/);
 assert.match(app,/error==='login_required'/);
 assert.match(app,/if\(callback\.has\('code'\)\|\|callback\.has\('error'\)\)/);
 assert.match(app,/if\(NATIVE\)/);
 assert.match(app,/sh9external/);
 assert.match(app,/await getAccessToken\(\)/);
 assert.match(app,/Microsoft-belépés/);
 assert.equal((html.match(/class="tile" type="button" data-name=/g)||[]).length,9);
 assert.equal((html.match(/data-nav="/g)||[]).length,5);
});
