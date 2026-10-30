'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../guardian/guardian-live-v785.js'),'utf8');

function boot(){
 const elements={},store={
  'hh-profile':'z',
  'hh-guardian-own-phone-profile-v785':'zsolt',
  'hh-guardian-foreground-auto-v786':'zsolt'
 };
 const counters={deleted:0,followed:0,users:0,dialogs:0};
 const handlers={};
 const element=()=>({
  value:'',textContent:'',hidden:false,disabled:false,classList:{add(){},remove(){}},
  setAttribute(){},addEventListener(k,cb){this[k]=cb}
 });
 const d={hidden:false,getElementById(id){return elements[id]||(elements[id]=element())},
  createElement:element,addEventListener(k,cb){handlers['doc:'+k]=cb}};
 let nextUser=[{data:{user:{id:'owner-z'}},error:null}],nextAcl=[],authHandler=null;
 const query=()=>({
  select(){return this},
  in(){return Promise.resolve(nextAcl.length?nextAcl.shift():{data:[{profile_key:'zsolt'},{profile_key:'monika'}],error:null})},
  eq(){return this},
  maybeSingle(){return Promise.resolve({data:null,error:null})},
  delete(){counters.deleted++;return this},
  then(fn){return Promise.resolve({error:null}).then(fn)}
 });
 const api={auth:{
  getUser(){counters.users++;return Promise.resolve(nextUser.length?nextUser.shift():{data:{user:{id:'owner-z'}},error:null})},
  onAuthStateChange(fn){authHandler=fn;return {data:{subscription:{unsubscribe(){}}}}}
 },from(){return query()}};
 const w={
  HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://test.invalid',publishableKey:'anon'},
  supabase:{createClient(){return api}},
  localStorage:{getItem(k){return store[k]??null},setItem(k,v){store[k]=v},removeItem(k){delete store[k]}},
  HH_GUARDIAN_V761:{active:false,startFollowing(){counters.followed++}},
  HH_GOLDEN_AVATARS_V529:{z:'owner-z',m:'owner-m'},
  location:{origin:'https://test.invalid',pathname:'/guardian/index.html'},
  navigator:{onLine:true},
  confirm(){counters.dialogs++;return true},
  setInterval(){return 1},clearInterval(){},clearTimeout(){},
  setTimeout(fn,ms){if(ms===0)Promise.resolve().then(fn);return 1},
  addEventListener(k,cb){handlers[k]=cb},
  dispatchEvent(){},CustomEvent:class{}
 };
 vm.runInNewContext(source,{window:w,document:d,Promise,Date,Math,Number,String,Object});
 const live=w.HH_GUARDIAN_LIVE_V785;
 return {live,elements,counters,handlers,
  pushUser(v){nextUser.push(v)},
  pushAcl(v){nextAcl.push(v)},
  emit(event){authHandler(event)}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('v1037 temporary 503 does not delete GPS; verified owner resumes without new consent',async()=>{
 const t=boot();
 await flush();
 assert.equal(t.live.sharing,true);
 assert.equal(t.counters.followed,1);
 assert.equal(t.counters.dialogs,0);
 t.pushUser({data:{user:null},error:{status:503,message:'network failure'}});
 t.emit('TOKEN_REFRESHED');
 await flush();
 assert.equal(t.live.sharing,false,'pause all unverified uploads');
 assert.equal(t.counters.deleted,0,'no destructive deletion on network error');
 assert.equal(t.live.authenticated,false);
 assert.equal(t.elements.guardianLiveLogin.hidden,true,'do not show relogin on transient failure');
 assert.match(t.elements.guardianLiveAuth.textContent,/Mentett bejelentkezés/);
 t.emit('SIGNED_IN');
 await flush();
 assert.equal(t.live.authenticated,true,'revalidated session');
 assert.equal(t.live.sharing,true,'restore only prior consented owner');
 assert.equal(t.counters.followed,2);
 assert.equal(t.counters.deleted,0);
});

test('v1037 transient ACL network error does not delete latest verified GPS fix',async()=>{
 const t=boot();
 await flush();
 assert.equal(t.live.sharing,true);
 t.pushAcl({data:null,error:{status:503,message:'network unavailable'}});
 t.emit('TOKEN_REFRESHED');
 await flush();
 assert.equal(t.counters.deleted,0);
 assert.equal(t.live.sharing,false);
 assert.equal(t.live.authenticated,false);
 t.emit('SIGNED_IN');
 await flush();
 assert.equal(t.live.sharing,true);
});

test('v1037 genuine signed-out session still stops consented sharing and deletes server row',async()=>{
 const t=boot();
 await flush();
 assert.equal(t.live.sharing,true);
 t.pushUser({data:{user:null},error:null});
 t.emit('SIGNED_OUT');
 await flush();
 assert.equal(t.live.sharing,false);
 assert.equal(t.counters.deleted,1);
 assert.equal(t.live.authenticated,false);
 assert.equal(t.elements.guardianLiveLogin.hidden,false);
});
