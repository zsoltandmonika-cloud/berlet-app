'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'admin-backup/backup-admin-v1.js'),'utf8');
const html=fs.readFileSync(path.join(root,'admin-backup/index.html'),'utf8');
const validSession=()=>({access_token:'OWNER_TEST_JWT',expires_at:Math.floor(Date.now()/1000)+3600});

function harness({session=true,ready=true,confirm=true,responseStatus=202}={}){
 const requests=[];
 class Elem {
  constructor(){this.value='';this.textContent='';this.disabled=false;this.hidden=false;this.children=[];this.handlers={};}
  addEventListener(name,fn){this.handlers[name]=fn}
  appendChild(c){this.children.push(c)}
  replaceChildren(...c){this.children=[...c]}
 }
 const ids=['refresh','prepare','restoreId','restoreOutput','status','lastVerified','snapshotCount','backups','authHelp',
 'manualCheck','manualDirect','manualRunStatus','manualStatus'];
 const nodes=Object.fromEntries(ids.map(id=>[id,new Elem()]));
 nodes.manualDirect.disabled=true;
 const storage=new Map();
 if(session)storage.set('hh-supabase-health-session-v1',JSON.stringify(validSession()));
 const win={
  HH_CENTRAL_VAULT:{
   publishableKey:'sb_publishable_testing',supabaseUrl:'https://vhsrupphzcjkdrusonzh.supabase.co'
  },
  sessionStorage:{getItem:k=>storage.get(k)||null},
  localStorage:{getItem:()=>null},
  confirm:()=>confirm,
  fetch:async (url,options)=>{
   requests.push({url,options});
   if(url.includes('mode=readiness'))return {ok:true,status:200,json:async()=>({
    ok:true,ready,workflow_active:true,runner_config_confirmed:true
   })};
   if(options.method==='POST')return {ok:responseStatus===202,status:responseStatus,json:async()=>responseStatus===202?{
    ok:true,status:'ACCEPTED_NOT_VERIFIED'
   }:{ok:false,error:'Blocked'}};
   if(url.includes('mode=last_run'))return {ok:true,status:200,json:async()=>({
    ok:true,last_run:{status:'in_progress',created_at:'2026-11-22T22:00:00Z',conclusion:null}
   })};
   throw Error('Unexpected request');
  }
 };
 vm.runInNewContext(js,{window:win,document:{getElementById:id=>nodes[id]||null,createElement:()=>new Elem()},Date,Promise,URL,Set,Object,Array,Number,String,RegExp});
 return {nodes,win,requests};
}

test('Admin one-tap backup requires a server endpoint, no raw github token in browser',()=>{
 assert.match(html,/Kézi teljes mentés indítása/);
 assert.match(html,/manualCheck/);
 assert.match(html,/manualRunStatus/);
 assert.match(html,/central-vault\/config.js/);
 assert.match(js,/hh-backup-control-v1/);
 assert.doesNotMatch(js,/api\.github\.com/);
 assert.doesNotMatch(js,/SHO_BACKUP_GITHUB_DISPATCH_TOKEN|service_role/);
});
test('no Central Vault session means manual backup stays disabled',async()=>{
 const t=harness({session:false});
 await t.nodes.manualCheck.handlers.click();
 assert.equal(t.requests.length,0);
 assert.equal(t.nodes.manualDirect.disabled,true);
 assert.match(t.nodes.manualStatus.textContent,/jelentkezz be/);
});
test('runner not ready disables direct start even with valid owner session',async()=>{
 const t=harness({ready:false});
 await t.nodes.manualCheck.handlers.click();
 assert.equal(t.nodes.manualDirect.disabled,true);
 assert.equal(t.requests.length,1);
 assert.equal(t.requests[0].options.method,'GET');
});
test('readiness + click confirmation sends one and only one backup dispatch to authenticated Edge',async()=>{
 const t=harness();
 await t.nodes.manualCheck.handlers.click();
 assert.equal(t.nodes.manualDirect.disabled,false);
 await t.nodes.manualDirect.handlers.click();
 const post=t.requests.filter(x=>x.options.method==='POST');
 assert.equal(post.length,1);
 assert.match(post[0].url,/\.supabase\.co\/functions\/v1\/hh-backup-control-v1/);
 assert.deepEqual(JSON.parse(post[0].options.body),{operation:'start_manual_full_backup'});
 assert.equal(post[0].options.headers.Authorization,'Bearer OWNER_TEST_JWT');
 assert.equal(post[0].options.headers.apikey,'sb_publishable_testing');
 assert.equal(post[0].options.headers['X-SHO-Backup-Confirm'],'true');
 assert.match(t.nodes.manualStatus.textContent,/még NEM igazolt/);
 assert.equal(t.nodes.manualDirect.disabled,true);
});
test('manual backup confirmation declined does not touch server',async()=>{
 const t=harness({confirm:false});
 await t.nodes.manualCheck.handlers.click();
 await t.nodes.manualDirect.handlers.click();
 assert.equal(t.requests.filter(x=>x.options.method==='POST').length,0);
});
test('server failure never marks backup as completed',async()=>{
 const t=harness({responseStatus:503});
 await t.nodes.manualCheck.handlers.click();
 await t.nodes.manualDirect.handlers.click();
 assert.match(t.nodes.manualStatus.textContent,/még nincs beállítva/);
 assert.doesNotMatch(t.nodes.manualStatus.textContent,/sikeres mentés/);
});
test('last run only gets Github workflow status, not a restore action',async()=>{
 const t=harness();
 await t.nodes.manualRunStatus.handlers.click();
 assert.equal(t.requests.length,1);
 assert.equal(t.requests[0].options.method,'GET');
 assert.match(t.nodes.manualStatus.textContent,/külön OneDrive-visszaellenőrzés/);
});
