'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'remote-service/service.js'),'utf8');
const html=fs.readFileSync(path.join(root,'remote-service/index.html'),'utf8');
const main=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('standalone service loads no HealthHub, admin, interval, iframe or auto-reload',()=>{
 assert.match(html,/<script defer src=".\/service\.js\?v=2-account-info-scope"><\/script>/);
 assert.doesNotMatch(html,/<iframe|live-v300|live-v305|hh-unified-admin|bridge-control|refreshContent|setInterval|location\.reload/i);
 assert.doesNotMatch(source,/setInterval\(|setTimeout\(|location\.reload\(|window\.location\.reload\(|innerHTML\s*=|\.replaceChildren\(/);
 assert.match(main,/hh-remote-service-oauth-relay-v1/);
 assert.match(main,/^\s*var next=new URL\('\.\/remote-service\/',location\.href\);/m);
 assert.match(main,/history\.replaceState\(history\.state,'',location\.pathname\+location\.hash\)/);
 new Function(source);
});
test('Dropbox OAuth requests account_info.read for get_current_account and does not silently reuse under-scoped tokens',()=>{
 assert.match(source,/OAUTH_SCOPES='account_info\.read files\.metadata\.read/);
 assert.match(source,/scope:OAUTH_SCOPES,state/);
 assert.match(source,/r\.status===403/);
 assert.match(source,/hiányzik az account_info\.read jogosultság/);
 assert.match(source,/j\.scope\.split/);
 assert.match(source,/account_info\.read jogosultságot/);
});
test('source account and target device exact match gates are permanent',()=>{
 assert.match(source,/GMAIL='zsoltandmonika@gmail\.com'/);
 assert.match(source,/EXPECTED_DEVICE_BUILD=47/);
 assert.match(source,/reg\.activePhones\.monika/);
 assert.match(source,/reg\.archived\.includes\(id\)/);
 assert.match(source,/d\.activeProfile!=='monika'/);
 assert.match(source,/d\.remoteAdminAllowed!==true/);
 assert.match(source,/includes\('dropbox_account_review'\)/);
 assert.match(source,/Date\.now\(\)-dateMs\(d\.lastSeenAt\)/);
 assert.match(source,/40/);
});
function harness({account='zsoltandmonika@gmail.com',profile='monika',allowed=true,buildCode=47,registryDevice=null,stale=false}={}){
 const device='android-aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
 const files=new Map(),writes=[];
 const root='/HealthHub/orchestrator';
 files.set(root+'/device-registry-v401.json',{
  schema:'healthhub.device_registry/1',activePhones:{monika:registryDevice||device,zsolt:'android-bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'},archived:[]});
 files.set(root+'/devices/'+device+'.json',{
  deviceId:device,deviceType:'android',activeProfile:profile,remoteAdminAllowed:allowed,
  build:'0.15.20',buildCode,capabilities:['health','dropbox_account_review'],
  lastSeenAt:new Date(Date.now()-(stale?30:1)*60000).toISOString()
 });
 const stored=new Map([['hh-remote-service-token-v1',JSON.stringify({refresh_token:'test-refresh-token',
  access_token:'test-access-token',expires_at:Date.now()+3600000})]]);
 const localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)};
 const sessions=new Map(),sessionStorage={getItem:k=>sessions.get(k)||null,setItem:(k,v)=>sessions.set(k,v),removeItem:k=>sessions.delete(k)};
 const ids=['accountStatus','sendStatus','deviceId','deviceBuild','deviceConsent','deviceSeen','deviceNote','suffix','confirm','sendBtn','checkBtn','connectBtn','statusBtn'];
 const elements=Object.fromEntries(ids.map(id=>[id,{value:'',checked:false,textContent:'',dataset:{},disabled:false,listeners:{},
  addEventListener(type,fn){this.listeners[type]=fn}}]));
 const document={getElementById:id=>elements[id]};
 const fetch=async (url,options={})=>{
  if(url.includes('/2/users/get_current_account'))return {ok:true,json:async()=>({email:account,account_id:'dbid:source-gmail_abcdefgh'})};
  if(url.endsWith('/2/files/download')){
   const p=JSON.parse(options.headers['Dropbox-API-Arg']).path;
   if(!files.has(p))return {ok:false,status:409};
   return {ok:true,json:async()=>structuredClone(files.get(p))};
  }
  if(url.endsWith('/2/files/upload')){
   const p=JSON.parse(options.headers['Dropbox-API-Arg']).path;
   const v=JSON.parse(options.body);files.set(p,v);writes.push({path:p,value:v});
   return {ok:true,json:async()=>({path_lower:p.toLowerCase()})};
  }
  throw Error('Unexpected Dropbox request '+url);
 };
 const location={href:'https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/remote-service/',pathname:'/berlet-app/healthhub/remote-service/',assign(){throw Error('Unexpected login redirect')}};
 const window={confirm:()=>true};
 vm.runInNewContext(source,{window,document,fetch,localStorage,sessionStorage,location,history:{replaceState(){},state:null},URL,URLSearchParams,crypto:webcrypto,TextEncoder,Date,Set,Number,Promise,JSON,Array,String,Object,Error,parseInt,console,btoa});
 return {device,files,writes,elements};
}
const ready=()=>new Promise(resolve=>setTimeout(resolve,35));
test('verified Gmail + Monika 0.15.20 sends status BEFORE exactly one scoped request',async()=>{
 const x=harness();
 await ready();
 assert.match(x.elements.accountStatus.textContent,/Gmail forrásfiók hitelesítve/);
 assert.match(x.elements.deviceBuild.textContent,/build 47/);
 x.elements.suffix.value='Abc123_X';
 x.elements.confirm.checked=true;
 x.elements.suffix.listeners.input();
 assert.equal(x.elements.sendBtn.disabled,false);
 await x.elements.sendBtn.listeners.click();
 assert.equal(x.writes.length,2);
 assert.ok(x.writes[0].path.endsWith('/status/'+x.device+'.json'));
 assert.ok(x.writes[1].path.endsWith('/commands/'+x.device+'.json'));
 const cmd=x.writes[1].value,st=x.writes[0].value;
 assert.equal(cmd.schema,'healthhub.orchestrator.command/1');
 assert.equal(cmd.profileScope,'monika');
 assert.equal(cmd.targetDeviceId,x.device);
 assert.deepEqual(Array.from(cmd.scopes),['dropbox_account_review']);
 assert.equal(cmd.accountReview.targetSuffix,'Abc123_X');
 assert.equal(st.commandId,cmd.commandId);
 assert.equal(cmd.state,'pending');
 assert.ok(Date.parse(cmd.expiresAt)-Date.parse(cmd.issuedAt)<=40*60000);
 assert.match(x.elements.sendStatus.textContent,/Dropboxba került/);
});
test('wrong Dropbox account cannot send a command',async()=>{
 const x=harness({account:'zsolt.monika@outlook.com'});
 await ready();
 assert.equal(x.elements.sendBtn.disabled,true);
 assert.match(x.elements.accountStatus.textContent,/nem a Mónika telefonja által használt Gmail/);
 assert.equal(x.writes.length,0);
});
test('wrong profile, missing opt-in and wrong registry binding all refuse to send',async()=>{
 for(const variant of [{profile:'zsolt'},{allowed:false},{buildCode:46},{registryDevice:'android-11111111-1111-1111-1111-111111111111'}]){
  const x=harness(variant);await ready();
  assert.equal(x.elements.sendBtn.disabled,true);
  assert.equal(x.writes.length,0);
  assert.match(x.elements.sendStatus.textContent,/nem egyezik|Remote Admin|még nem igazolta|nem olvasható|telefonszintű|Dropbox-fájl/);
 }
});
test('20-minute-old heartbeat warns but does not invent recent online status',async()=>{
 const x=harness({stale:true});await ready();
 assert.match(x.elements.deviceNote.textContent,/20 percnél régebbi/);
});
test('a pending unexpired command is never overwritten',async()=>{
 const x=harness();await ready();
 const cpath='/HealthHub/orchestrator/commands/'+x.device+'.json';
 x.files.set(cpath,{schema:'healthhub.orchestrator.command/1',commandId:'active',state:'pending',expiresAt:new Date(Date.now()+120000).toISOString()});
 x.elements.suffix.value='Abc123_X';x.elements.confirm.checked=true;x.elements.suffix.listeners.input();
 await x.elements.sendBtn.listeners.click();
 assert.equal(x.writes.length,0);
 assert.match(x.elements.sendStatus.textContent,/aktív telefonparancs/);
});
