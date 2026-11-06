'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const src=fs.readFileSync(path.join(root,'healthhub/central-vault/health-vault-profile-pdf-v881.js'),'utf8');
const boot=fs.readFileSync(path.join(root,'healthhub/index.html'),'utf8');
function sandbox(options={}){
 const nodes=new Map(),events=new Map(),calls=[],box=element('div');
 let allowed=options.allowed===undefined?['zsolt','monika']:options.allowed;
 let authenticated=options.authenticated===undefined?true:options.authenticated;
 let opens=0;
 function element(tag){
  return {tag,children:[],dataset:{},textContent:'',id:'',disabled:false,
   setAttribute(){},addEventListener(){},
   appendChild(c){this.children.push(c);if(c.id)nodes.set(c.id,c)},
   append(...args){args.forEach(c=>this.appendChild(c))},
   replaceChildren(...args){this.children=args},
   querySelector(){return null}};
 }
 const document={head:element('head'),createElement:element,
  getElementById:id=>nodes.get(id)||null,
  querySelector:q=>q==='#hhCentralAuthOverlayV332 .hhca-box'?box:null};
 const api={getStatus:()=>({authenticated,authorizedProfiles:allowed}),
  openLogin:()=>{opens++;return 'original-login'},
  stream:async(endpoint,body)=>{
   calls.push({endpoint,body});
   if(options.response) return options.response(body);
   return {ok:true,status:200,json:async()=>({profile:body.profile,files:[
    {mimeType:'application/pdf',appProperties:{profile:'zsolt'}},
    {mimeType:'application/pdf',appProperties:{profile:'zsolt'}},
    {mimeType:'application/pdf',appProperties:{profile:'monika'}},
    {mimeType:'image/jpeg',appProperties:{profile:'zsolt'}}]})};
  }};
 const window={HH_DAILY_HEALTH_SYNC_V319:api,addEventListener:(key,fn)=>events.set(key,fn)};
 const instrumented=src.replace('w.HH_VAULT_PROFILE_PDF_V881={mount};',
  'w.HH_VAULT_PROFILE_PDF_V881={mount,check,reset};');
 assert.notEqual(instrumented,src,'test hook found');
 vm.runInNewContext(instrumented,{window,document,console});
 const child=(el,tag)=>el.children.filter(x=>x.tag===tag);
 const labels=()=>{
  const panel=nodes.get('hhVaultProfilePdfV881');
  const grid=panel.children.find(x=>x.className==='hhpdf-grid');
  return grid.children.map(x=>({
   key:x.dataset.profile,permission:x.children[1].textContent,
   result:x.children[2].textContent,disabled:x.children[3].disabled,
   button:x.children[3].textContent
  }));
 };
 return {api,window,box,calls,labels,events,opens:()=>opens,
  setAuth:(a,p)=>{authenticated=a;allowed=p}};
}
test('isolated script parses and boots only after the trusted Vault client',()=>{
 new vm.Script(src);
 const old='central-vault/daily-health-sync.js?v=680-trusted-refresh';
 const addition='central-vault/health-vault-profile-pdf-v881.js?v=881';
 assert.ok(boot.includes(addition));
 assert.ok(boot.indexOf(addition)>boot.indexOf(old));
 assert.doesNotMatch(src,/localStorage|sessionStorage|setInterval|indexedDB|\.upload\(|\.delete\(|files\/upload/);
});
test('Zsolt and Mónika get independent ACL labels and on-demand archive counts',async()=>{
 const e=sandbox();
 assert.equal(e.labels().length,2);
 assert.match(e.labels()[0].permission,/engedélyezve/);
 assert.match(e.labels()[1].permission,/engedélyezve/);
 assert.equal(e.calls.length,0,'no background inventory polling');
 assert.equal(e.api.openLogin(),'original-login');
 assert.equal(e.opens(),1,'original Vault login remains unchanged');
 await e.window.HH_VAULT_PROFILE_PDF_V881.check('zsolt');
 assert.match(e.labels()[0].result,/2 profilhoz rendelt PDF/);
 assert.match(e.labels()[1].result,/Még nincs ellenőrizve/);
 await e.window.HH_VAULT_PROFILE_PDF_V881.check('monika');
 assert.match(e.labels()[1].result,/1 profilhoz rendelt PDF/);
 assert.equal(e.calls.length,2);
 assert.equal(e.calls[0].endpoint,'/functions/v1/hh-drive-oauth-v682');
 assert.deepEqual(JSON.parse(JSON.stringify(e.calls.map(x=>x.body))),[
  {action:'archive_inventory',profile:'zsolt'},
  {action:'archive_inventory',profile:'monika'}]);
});
test('no archive request without login or explicit profile permission',async()=>{
 const loggedOut=sandbox({authenticated:false});
 await loggedOut.window.HH_VAULT_PROFILE_PDF_V881.check('zsolt');
 assert.equal(loggedOut.calls.length,0);
 assert.match(loggedOut.labels()[0].permission,/bejelentkezés szükséges/);
 const partial=sandbox({allowed:['monika']});
 await partial.window.HH_VAULT_PROFILE_PDF_V881.check('zsolt');
 assert.equal(partial.calls.length,0);
 assert.match(partial.labels()[0].permission,/Nincs profiljogosultság/);
 assert.equal(partial.labels()[0].disabled,true);
 assert.equal(partial.labels()[1].disabled,false);
});
test('Drive disconnection reports warning, never a false green',async()=>{
 const e=sandbox({response:async()=>({ok:false,status:409})});
 await e.window.HH_VAULT_PROFILE_PDF_V881.check('zsolt');
 assert.match(e.labels()[0].result,/Drive-kapcsolat hiányzik/);
 assert.doesNotMatch(e.labels()[0].result,/✅/);
});
test('auth changes clear transient diagnostics and old responses cannot overwrite them',async()=>{
 let resolve;
 const pending=new Promise(ok=>{resolve=ok});
 const e=sandbox({response:()=>pending});
 const work=e.window.HH_VAULT_PROFILE_PDF_V881.check('zsolt');
 e.setAuth(false,[]);
 e.events.get('healthhub:central-auth-changed')();
 resolve({ok:true,status:200,json:async()=>({profile:'zsolt',files:[]})});
 await work;
 assert.match(e.labels()[0].result,/Még nincs ellenőrizve/);
 assert.match(e.labels()[0].permission,/bejelentkezés szükséges/);
});
