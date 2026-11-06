'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(ROOT,'healthhub/central-vault/google-login-v882.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'healthhub/index.html'),'utf8');
const PENDING='hh-vault-google-pending-v882',SKEY='hh-supabase-health-session-v1',REM='hh-health-vault-trusted-device-v332';
function setup(opts={}){
 const saved=new Map(),local=new Map(),nodes=new Map(),events={oauth:[],reload:0,login:0,select:0};
 const storage=m=>({getItem:key=>m.get(key)||null,setItem:(key,v)=>m.set(key,String(v)),removeItem:key=>m.delete(key)});
 const checkbox={checked:opts.remember===undefined?true:opts.remember};
 function element(tag){
  return {tag,children:[],hidden:false,disabled:false,dataset:{},textContent:'',id:'',className:'',
   setAttribute(){},addEventListener(){},
   appendChild(c){this.children.push(c);if(c.id)nodes.set(c.id,c)},
   append(...items){items.forEach(x=>this.appendChild(x))},
   replaceChildren(...items){this.children=items}};
 }
 const box=element('section');
 const doc={head:element('head'),createElement:element,getElementById:id=>nodes.get(id)||null,
  querySelector:q=>q==='#hhCentralAuthOverlayV332 .hhca-box'?box:
   q==='#hhcaLoginV332 input[name=remember]'?checkbox:null};
 const session={user:{id:'same-user'},access_token:'access-test-123456789012345678901234567890',
  refresh_token:'refresh-test-123456789012345678901234567890',
  expires_at:Math.floor(Date.now()/1000)+3600};
 const supabase={createClient:()=>({
  auth:{
   signInWithOAuth:async x=>{events.oauth.push(x);return{error:opts.oauthError||null}},
   getSession:async()=>({data:{session:opts.noSession?null:session},error:null}),
   getUser:async()=>({data:{user:{id:opts.otherUser?'impostor':'same-user'}},error:null})
  },
  from:table=>{assert.equal(table,'hh_profiles');return{select:async fields=>{
   assert.equal(fields,'profile_key');events.select++;
   return{data:opts.profiles||[{profile_key:'zsolt'},{profile_key:'monika'}],error:opts.aclError||null};
  }}}
 })};
 const vault={openLogin:()=>{events.login++;return 'legacy-login';},
  getStatus:()=>({authenticated:opts.alreadyLoggedIn===true})};
 const w={HH_DAILY_HEALTH_SYNC_V319:vault,
  HH_CENTRAL_VAULT:{enabled:true,supabaseUrl:'https://test-project.supabase.co',publishableKey:'sb_publishable_'+'x'.repeat(35)},
  supabase,sessionStorage:storage(saved),localStorage:storage(local),
  location:{origin:'https://github.example',pathname:'/healthhub/',reload(){events.reload++}}};
 if(opts.native)saved.set('hh-one-native-oauth-v1063','1');
 const ctx={window:w,document:doc,Date,Promise,JSON,Number,Error};
 vm.runInNewContext(src,ctx);
 return {w,box,doc,saved,local,events,checkbox,session,api:w.HH_VAULT_GOOGLE_V882};
}
test('one-click Google module loads after the existing v680 Vault, without modifying its code',()=>{
 assert.doesNotThrow(()=>new vm.Script(src));
 assert.match(html,/central-vault\/google-login-v882\.js\?v=882/);
 assert.ok(html.indexOf('google-login-v882.js')>html.indexOf('daily-health-sync.js'));
 assert.doesNotMatch(src,/service_role|indexedDB|\.upload\(|\.delete\(|hh_daily_health_settings.*(put|insert)|console\.(log|info)/);
 assert.match(src,/persistSession:false/);
 assert.match(src,/autoRefreshToken:false/);
});
test('existing password login is preserved; Google button starts only on explicit action',async()=>{
 const x=setup();
 assert.equal(x.events.oauth.length,0);
 assert.equal(x.w.HH_DAILY_HEALTH_SYNC_V319.openLogin(),'legacy-login');
 assert.equal(x.events.login,1);
 assert.equal(x.box.children.some(node=>node.id==='hhVaultGoogleV882'),true);
 await x.api.start();
 assert.equal(x.events.oauth.length,1);
 assert.equal(x.events.oauth[0].provider,'google');
 assert.equal(x.events.oauth[0].options.redirectTo,'https://github.example/healthhub/');
 assert.equal(JSON.parse(x.saved.get(PENDING)).remember,true);
 assert.equal(x.events.reload,0,'no unverified session handoff');
 assert.equal(x.saved.has(SKEY),false);
});
test('verified callback adopts the existing account and keeps profile ACL intact',async()=>{
 const x=setup();
 x.saved.set(PENDING,JSON.stringify({schema:1,at:Date.now(),remember:true}));
 const ok=await x.api.finish();
 assert.equal(ok,true);
 assert.equal(x.events.select,1);
 assert.equal(x.events.reload,1);
 assert.equal(x.saved.has(PENDING),false);
 const restored=JSON.parse(x.saved.get(SKEY));
 assert.equal(restored.access_token,x.session.access_token);
 assert.equal(restored.refresh_token,x.session.refresh_token);
 assert.equal(x.local.get(REM),'yes');
 assert.equal(JSON.parse(x.local.get(SKEY)).refresh_token,x.session.refresh_token);
});
test('Google callback without authorized family profile fails closed',async()=>{
 const x=setup({profiles:[]});
 x.saved.set(PENDING,JSON.stringify({schema:1,at:Date.now(),remember:false}));
 const ok=await x.api.finish();
 assert.equal(ok,false);
 assert.equal(x.events.reload,0);
 assert.equal(x.local.has(SKEY),false);
 assert.equal(x.saved.has(SKEY),false);
 assert.equal(x.saved.has(PENDING),false);
 assert.equal(x.events.login,1,'user is shown the existing login modal');
});
test('unverified OAuth identity never enters legacy Vault storage',async()=>{
 const x=setup({otherUser:true});
 x.saved.set(PENDING,JSON.stringify({schema:1,at:Date.now(),remember:true}));
 const ok=await x.api.finish();
 assert.equal(ok,false);
 assert.equal(x.events.select,0);
 assert.equal(x.events.reload,0);
 assert.equal(x.saved.has(SKEY),false);
});
test('non-trusted browser login remains session-only',async()=>{
 const x=setup();
 x.saved.set(PENDING,JSON.stringify({schema:1,at:Date.now(),remember:false}));
 const ok=await x.api.finish();
 assert.equal(ok,true);
 assert.equal(x.events.reload,1);
 assert.equal(x.local.has(REM),false);
 assert.equal(x.local.has(SKEY),false);
 assert.equal(x.saved.has(SKEY),true);
});
test('native WebView does not start browser-only Google OAuth and create an orphaned redirect',async()=>{
 const x=setup({native:true});
 await x.api.start();
 assert.equal(x.events.oauth.length,0);
 assert.equal(x.saved.has(PENDING),false);
});
