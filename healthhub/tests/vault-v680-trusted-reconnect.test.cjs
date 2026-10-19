'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../central-vault/daily-health-sync.js'),'utf8');
const index=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const REM='hh-health-vault-trusted-device-v332',SKEY='hh-supabase-health-session-v1';
const token=(label,delta)=>({access_token:'mock-access-'+label+'a'.repeat(24),
 refresh_token:'mock-refresh-'+label+'r'.repeat(24),
 expires_at:Math.floor(Date.now()/1000)+delta});
function storage(m){return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
function fixture(local){
 const sessions=new Map(),timeout=[],calls={refresh:0,password:0,profiles:0,settings:0};
 const winEvents={};const docEvents={};
 const window={
  HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://example.supabase.co',publishableKey:'test-pub-'+'x'.repeat(30)},
  addEventListener:(k,fn)=>winEvents[k]=fn,dispatchEvent(){}};
 const document={visibilityState:'visible',addEventListener:(k,fn)=>docEvents[k]=fn,getElementById:()=>null};
 const fetch=async (url)=>{
  let body;
  if(url.includes('grant_type=refresh_token')){calls.refresh++;body={...token('renewed',3600),expires_in:3600}}
  else if(url.includes('grant_type=password')){calls.password++;body={...token('login',3600),expires_in:3600}}
  else if(url.includes('/hh_profiles?')){calls.profiles++;body=[{profile_key:'monika'},{profile_key:'zsolt'}]}
  else if(url.includes('/hh_daily_health_settings?')){calls.settings++;body=[]}
  else throw Error('Unexpected mock transport');
  return {ok:true,status:200,text:async()=>JSON.stringify(body)};
 };
 vm.runInNewContext(source,{
  window,document,localStorage:storage(local),sessionStorage:storage(sessions),
  fetch,Event:class{constructor(type){this.type=type}},
  navigator:{locks:{request:async(_key,cb)=>cb()}},
  setTimeout:(cb,ms)=>{if(ms===0)timeout.push(cb);return 10},
  clearTimeout:()=>{},console
 });
 return {api:window.HH_DAILY_HEALTH_SYNC_V319,calls,runStartup:async()=>{
  while(timeout.length){timeout.shift()();await Promise.resolve()}
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
 },local};
}
test('trusted session refreshes token and restores BOTH profiles across full page reload without password',async()=>{
 const local=new Map([[REM,'yes'],[SKEY,JSON.stringify(token('expired',-5))]]);
 const first=fixture(local);await first.runStartup();
 assert.deepEqual(Array.from(first.api.getStatus().authorizedProfiles||[]),['monika','zsolt']);
 assert.equal(first.calls.refresh,1);
 assert.equal(first.calls.password,0);
 assert.match(JSON.parse(local.get(SKEY)).refresh_token,/renewed/);
 const again=fixture(local);await again.runStartup();
 assert.deepEqual(Array.from(again.api.getStatus().authorizedProfiles||[]),['monika','zsolt']);
 assert.equal(again.calls.refresh,0);
 assert.equal(again.calls.password,0);
});
test('simultaneous Health Vault GET requests share a single token refresh',async()=>{
 const local=new Map([[REM,'yes'],[SKEY,JSON.stringify(token('expired',-5))]]);
 const {api,calls}=fixture(local);
 await Promise.all([
  api.request('/rest/v1/hh_profiles?select=profile_key'),
  api.request('/rest/v1/hh_profiles?select=profile_key')
 ]);
 assert.equal(calls.refresh,1);
 assert.equal(calls.password,0);
});
test('no automatic login is attempted on devices without an opt-in session',async()=>{
 const {api,calls,runStartup}=fixture(new Map());
 await runStartup();
 assert.equal(api.getStatus().authenticated,false);
 assert.equal(calls.password,0);
 assert.equal(calls.refresh,0);
});
test('UI offers one-click trusted-device persistence for already logged-in user',()=>{
 assert.match(source,/data-auth-v332="remember"/);
 assert.match(source,/data-hh-sync-action="remember"/);
 assert.match(source,/sSave\(session,true\)/);
 assert.match(source,/Maradjak bejelentkezve ezen a saját, megbízható készüléken/);
 assert.match(source,/window\.addEventListener\('online',resumeVault\)/);
 assert.match(source,/setTimeout\(resumeVault,0\)/);
 assert.match(index,/v680-vault-trusted-auto-reconnect/);
 assert.match(index,/central-vault\/daily-health-sync\.js\?v=680-trusted-refresh/);
});