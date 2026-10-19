'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(base,'live-v292.js'),'utf8');
const admin=fs.readFileSync(path.join(base,'hh-mkb-batch-admin-v662.js'),'utf8');
const index=fs.readFileSync(path.join(base,'index.html'),'utf8');
const STATUS_KEY='hh-lena-drive-v292-authorized',TOKEN_KEY='hh-lena-drive-v292-token';
function storage(store){return {getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}}
function create(stored={},email='zsoltandmonika@gmail.com'){
 const local=new Map(Object.entries(stored.local||{}));
 const tab=new Map(Object.entries(stored.tab||{}));
 const calls={grant:0,verify:0},events={};
 const oauth={initTokenClient:()=>({
  callback(){},error_callback(){},requestAccessToken(){calls.grant++;this.callback({
    access_token:'valid-test-access',expires_in:3600
  })}})};
 const google={accounts:{oauth2:oauth}};
 const window={google,dispatchEvent:e=>{events[e.type]=(events[e.type]||0)+1},addEventListener(){}};
 const document={documentElement:{dataset:{}},visibilityState:'visible',getElementById:()=>null,
  addEventListener(){},querySelector:()=>null,head:{appendChild(){}}};
 const fetch=async()=>{calls.verify++;return {ok:true,json:async()=>({user:{emailAddress:email}})}};
 vm.runInNewContext(source,{
  window,document,google,localStorage:storage(local),sessionStorage:storage(tab),
  fetch,CustomEvent:class{constructor(type,detail){this.type=type;this.detail=detail?.detail}},
  setTimeout(){},clearTimeout(){},setInterval(){}
 });
 return {api:window,calls,events,local,tab};
}
test('prior approval without a live token is amber, not green',async()=>{
 const v=create({local:{[STATUS_KEY]:'1'}});
 const status=v.api.hhGoogleDriveConnectionStatus292();
 assert.equal(status.connected,false);
 assert.equal(status.previouslyAuthorized,true);
 await assert.rejects(v.api.hhGetGoogleDriveToken292(false));
 assert.equal(v.calls.grant,0);
});
test('manual user-requested renewal checks correct shared Google identity and signals new status',async()=>{
 const v=create({local:{[STATUS_KEY]:'1'}});
 await v.api.hhGetGoogleDriveToken292(true);
 const status=v.api.hhGoogleDriveConnectionStatus292();
 assert.equal(status.connected,true);
 assert.equal(v.calls.grant,1);
 assert.equal(v.calls.verify,1);
 assert.equal(v.events['healthhub:google-drive-token-changed'],1);
 assert.equal(v.local.has(TOKEN_KEY),false);
 assert.equal(v.tab.has(TOKEN_KEY),true);
});
test('expired or incorrect-account access token must not create a false green badge',()=>{
 for(const [account,expiresAt] of [
  ['different@example.com',Date.now()+3600000],
  ['zsoltandmonika@gmail.com',Date.now()-60000]
 ]){
  const v=create({local:{[STATUS_KEY]:'1'},tab:{[TOKEN_KEY]:JSON.stringify({
   access_token:'old',verifiedAccount:account,expiresAt
  })}});
  assert.equal(v.api.hhGoogleDriveConnectionStatus292().connected,false);
 }
});
test('v681 Medical Knowledge admin reports active vs previous grant distinctly',()=>{
 assert.match(admin,/function driveStateLabel\(\)/);
 assert.match(admin,/x\.connected\?'✅ Google Drive: kapcsolat aktív'/);
 assert.match(admin,/x\.previouslyAuthorized\?'🟠 Google Drive: engedély megvan, hozzáférés megújítandó'/);
 assert.match(admin,/healthhub:google-drive-token-changed/);
 assert.doesNotMatch(admin.split('async function refreshConnections(){')[1].split('function styles(){')[0],
  /await fn\(false\)/);
 assert.match(index,/v681-google-drive-authorization-status/);
 assert.match(index,/live-v292\.js\?v=681-drive-status-and-manual-renewal/);
 assert.match(index,/hh-mkb-batch-admin-v662\.js\?v=681-drive-status-sync/);
});
test('manual OAuth is the only route to renew token; no browser storage escalation',()=>{
 assert.doesNotMatch(source,/localStorage\.setItem\(TOKEN_KEY/);
 assert.match(source,/if\(!interactive\)return Promise\.reject/);
 assert.match(source,/verifyDriveAccount\(resp\.access_token\)/);
 assert.match(source,/login_hint:GOOGLE_ACCOUNT/);
 for(const s of [source,admin])assert.doesNotThrow(()=>new Function(s));
});