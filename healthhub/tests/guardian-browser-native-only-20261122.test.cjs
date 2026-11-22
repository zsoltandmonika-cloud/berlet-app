'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../guardian/guardian-live-v785.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../guardian/index.html'),'utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function boot(profile,status){
 const store=new Map([
  ['hh-profile',profile==='monika'?'m':'z'],
  ['hh-guardian-own-phone-profile-v785',profile],
  ['hh-guardian-foreground-auto-v786',profile]
 ]);
 const elements=new Map(),calls={writes:0,reads:[]};
 const element=id=>{
  if(elements.has(id))return elements.get(id);
  const e={hidden:false,disabled:false,textContent:'',value:'',events:{},
   addEventListener(n,fn){this.events[n]=fn},
   click(){this.events.click?.()},
   classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){}};
  elements.set(id,e);return e;
 };
 const d={hidden:false,getElementById:element,createElement:()=>element('tmp'+elements.size),addEventListener(){}};
 const api={
  auth:{getUser:async()=>({data:{user:{id:'test-user'}},error:null}),onAuthStateChange(){}},
  from(table){return {select(){return this},eq(){return this},
   in:async()=>({data:[{profile_key:'monika'},{profile_key:'zsolt'}],error:null}),
   maybeSingle:async()=>({data:null,error:null}),
   upsert:async()=>{calls.writes++;return {error:null}},
   delete(){calls.writes++;return this}}}
 };
 const w={
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://test.invalid',publishableKey:'test'},
  supabase:{createClient(){return api}},
  HH_GUARDIAN_GPS_ROUTER_V1177:{
   connected(){return true},
   forProfile(p){return {profile:p}},
   async read(p){calls.reads.push(p);return status==='ok'?
    {status:'ok',data:{profile_key:p,updated_at:new Date().toISOString()}}:{status}}
  },
  addEventListener(){},setInterval(){return 1},clearInterval(){},
  setTimeout(){return 1},clearTimeout(){},
  navigator:{userAgent:'Android test',onLine:true},
  confirm(){throw Error('Retired browser sharing must not ask consent')}
 };
 vm.runInNewContext(source,{window:w,document:d,Date,Math,Number,Promise,Object,JSON});
 return {w,d,calls,element};
}
test('browser never writes or deletes legacy Supabase GPS and exposes verified Outlook reader',()=>{
 assert.doesNotMatch(source,/\.from\(TABLE\)\.upsert\(|\.from\(TABLE\)\.delete\(/);
 assert.match(source,/const router=w\.HH_GUARDIAN_GPS_ROUTER_V1177/);
 assert.match(html,/guardian-live-v785\.js\?v=[^"\n]*fix=native-only-20261122/);
 assert.match(html,/healthhubconnect:\/\/settings/);
});
for(const [profile,status,expected] of [
 ['zsolt','revoked',/vissza van vonva/],
 ['monika','invalid',/elavult vagy érvénytelen/],
 ['monika','ok',/hitelesített natív GPS-frissítés/]
]){
 test(profile+' '+status+': old automatic browser consent cannot publish or revoke GPS',async()=>{
  const t=boot(profile,status);
  await flush();
  assert.equal(t.w.HH_GUARDIAN_LIVE_V785.sharing,false);
  t.element('guardianLiveStart').click();
  await flush();
  assert.match(t.element('guardianLiveStatus').textContent,expected);
  assert.equal(t.calls.writes,0);
  assert.ok(t.calls.reads.includes(profile));
  assert.equal(t.element('guardianLiveStop').hidden,true);
  assert.match(t.element('guardianLiveAutoStatus').textContent,/Outlook Dropbox/);
 });
}
