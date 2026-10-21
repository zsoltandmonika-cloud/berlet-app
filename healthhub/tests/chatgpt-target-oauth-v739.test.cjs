'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const base=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(base,'hh-chatgpt-target-auth-v739.js'),'utf8');
const callback=fs.readFileSync(path.join(base,'chatgpt-dropbox-callback-v739.html'),'utf8');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const panel=fs.readFileSync(path.join(base,'hh-chatgpt-target-onboard-v739.js'),'utf8');
const store=new Map();let redirect=null;
const window={
 crypto:webcrypto,btoa,sessionStorage:{
  getItem:key=>store.get(key)||null,
  setItem:(key,val)=>store.set(key,val),removeItem:key=>store.delete(key)
 },
 location:{assign:url=>{redirect=new URL(url)}},
};
vm.runInNewContext(source,{window,TextEncoder,Uint8Array,Array,URL,URLSearchParams,Date});
const a=window.HH_CHATGPT_TARGET_AUTH_V739;
assert.equal(a.version,'739');
assert.equal(a.defaultAppKey,'dv5a4o8h09wwgtn');
assert.throws(()=>a.checkKey('not valid app secret'),/App key/);
assert.match(callback,/hh-chatgpt-target-auth-v739.js/);
assert.match(index,/hh-chatgpt-target-auth-v739.js\?v=739-pkce/);
assert.match(index,/hh-chatgpt-target-onboard-v739.js\?v=(?:739-consent|740-target-folder-read)/);
assert.match(panel,/Ez a külön engedély/);
assert.doesNotMatch(panel,/files\/upload|files\/download|dropboxapi\.com\/2\/files\/upload/);
(async()=>{
 await a.authorize();
 assert.equal(redirect.origin,'https://www.dropbox.com');
 assert.equal(redirect.pathname,'/oauth2/authorize');
 assert.equal(redirect.searchParams.get('client_id'),a.defaultAppKey);
 assert.equal(redirect.searchParams.get('token_access_type'),'offline');
 assert.equal(redirect.searchParams.get('code_challenge_method'),'S256');
 assert.equal(redirect.searchParams.get('redirect_uri'),a.callback);
 assert.equal(redirect.searchParams.get('scope'),
  'files.metadata.read files.metadata.write files.content.read files.content.write');
 const pending=JSON.parse(store.get('hh-chatgpt-target-pkce-v739'));
 assert.ok(pending.verifier.length>=43);
 assert.equal(pending.state,redirect.searchParams.get('state'));
 assert.equal(pending.appKey,a.defaultAppKey);
 assert.doesNotMatch(source,/\bAPP_SECRET\s*=/);
 console.log('PASS: v739 public app key, PKCE authorization URL, full-scope disclosure, private callback, read-only onboarding.');
})().catch(e=>{console.error(e);process.exitCode=1});
