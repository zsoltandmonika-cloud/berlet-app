'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const live=fs.readFileSync(path.join(root,'guardian/guardian-live-pilot-v793.js'),'utf8');
const html=fs.readFileSync(path.join(root,'guardian/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'guardian/guardian-sh9-transit-v927.css'),'utf8');

function fakeEl(id){
 return {id,hidden:false,disabled:false,textContent:'',style:{},handlers:{},
  setAttribute(){},append(){},prepend(){},insertBefore(){},
  addEventListener(k,fn){this.handlers[k]=fn}};
}
function boot(session){
 const els=new Map();
 const el=id=>{if(!els.has(id))els.set(id,fakeEl(id));return els.get(id)};
 const d={hidden:false,getElementById:el,createElement:()=>{
   const e=fakeEl('created');let id='created';
   Object.defineProperty(e,'id',{get(){return id},set(v){id=v;els.set(v,e)}});
   return e;
  },addEventListener(){}};
 const calls=[],store=new Map(),client={
  auth:{
   getSession:async()=>({data:{session}}),
   signInWithOAuth:async x=>{calls.push({kind:'login',x});return{error:null}}
  }
 };
 const map={getBounds:()=>({getWest:()=>18.9,getEast:()=>19.2,getSouth:()=>47.3,getNorth:()=>47.7})};
 const w={location:{search:'?sh9Transit=1',origin:'https://example.org',pathname:'/berlet-app/healthhub/guardian/'},
  HH_BKK_LIVE_V793:{validate:()=>({ok:true,generatedAt:new Date().toISOString(),vehicles:[]})},
  HH_BKK_LIVE_MAP_V793:{render:()=>true,clear(){}},HH_GUARDIAN_V761:{map},
  HH_GUARDIAN_LIVE_V785:{getClient:()=>client},
  HH_CENTRAL_VAULT:{supabaseUrl:'https://abc.supabase.co',publishableKey:'public-key'},
  sessionStorage:{setItem(k,v){store.set(k,v)},removeItem(k){store.delete(k)}},
  CustomEvent:class {constructor(type){this.type=type}},
  addEventListener(){},dispatchEvent(e){calls.push({kind:'event',name:e.type})},
  setInterval:()=>1,clearInterval(){},
  fetch:async()=>({ok:true,json:async()=>({})})
 };
 vm.runInNewContext(live,{window:w,document:d,URLSearchParams});
 return {els,el,calls,store,w};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve()};

test('tablet-only Family Live sign-in appears on missing session and invokes existing Google OAuth',async()=>{
 const ui=boot(null);
 await flush();
 const btn=ui.el('hhSh9FamilyLiveLoginV949');
 assert.equal(btn.hidden,false);
 assert.match(btn.textContent,/Family Live bejelentkezés/);
 assert.match(ui.el('hhBkkLiveStatusV793').textContent,/bejelentkezés gombot/);
 await btn.handlers.click();
 const login=ui.calls.find(c=>c.kind==='login');
 assert.equal(login.x.provider,'google');
 assert.equal(login.x.options.redirectTo,'https://example.org/berlet-app/healthhub/guardian/');
 assert.equal(ui.store.get('hh-sh9-family-login-return-v949'),'1');
});
test('tablet sign-in button stays hidden when a Family Live session already exists',async()=>{
 const ui=boot({access_token:'valid-test-token'});
 await flush();
 assert.equal(ui.el('hhSh9FamilyLiveLoginV949').hidden,true);
});
test('SH9 theme uses existing profile variables, retains normal Family Guard and no GPS sharing',()=>{
 assert.match(css,/#hhSh9FamilyLiveLoginV949/);
 assert.match(css,/:root\[data-sh9-transit="on"\]/);
 assert.match(css,/var\(--sh9-tr-frame\)/);
 assert.match(css,/var\(--sh9-tr-glow\)/);
 assert.match(css,/#hhSh9FamilyLiveLoginV949\[hidden\]\{display:none!important\}/);
 assert.doesNotMatch(live,/startSharing\(|watchPosition\(|getCurrentPosition\(/);
 assert.match(live,/sh9AllMode\?d\.createElement\('button'\):null/);
});
test('OAuth return restores SH9 URL but preserves implicit auth hash',()=>{
 const script=html.match(/<script>\s*\/\* v949:[\s\S]*?<\/script>/)?.[0];
 assert.ok(script);
 const js=script.replace(/^<script>/,'').replace(/<\/script>$/,'');
 const loc={pathname:'/berlet-app/healthhub/guardian/',search:'',hash:'#access_token=example'};
 const cache=new Map([['hh-sh9-family-login-return-v949','1']]);
 const storage={getItem:k=>cache.get(k),removeItem:k=>cache.delete(k)};
 const hist={state:null,replaceState(_s,_t,u){
  const parsed=new URL(u,'https://example.org');
  loc.search=parsed.search;loc.hash=parsed.hash;
 }};
 const document={documentElement:{dataset:{}}};
 vm.runInNewContext(js,{sessionStorage:storage,location:loc,history:hist,document,URLSearchParams,URL});
 assert.equal(loc.search,'?sh9Transit=1');
 assert.equal(loc.hash,'#access_token=example');
 assert.equal(document.documentElement.dataset.sh9Transit,'on');
 assert.equal(cache.has('hh-sh9-family-login-return-v949'),false);
});
