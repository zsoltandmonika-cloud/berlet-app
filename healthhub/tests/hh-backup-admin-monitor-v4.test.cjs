'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(ROOT,'admin-backup/backup-admin-v1.js'),'utf8');
const html=fs.readFileSync(path.join(ROOT,'admin-backup/index.html'),'utf8');
const H='b'.repeat(64);
const runs=[
 ['dropbox','20261123T115107Z-45168816067',{
   status:'PARTIAL_RESTIC_READ_DATA_AND_FULL_FILE_RESTORE_VERIFIED',
   sources:['Dropbox HealthHub Cloud Vault','Dropbox healthhub-vault'],snapshot_ids:[H]}],
 ['git','20261123T153157Z-45206044740',{
   status:'GIT_EDGE_PARTIAL_RESTIC_READBACK_AND_RESTORE_VERIFIED',
   snapshot_id:H,git_repositories:4,edge_functions_listed:25,edge_bodies_included:25}],
 ['db','20261123T152227Z-45204363556',{
   status:'LOGICAL_POSTGRES_READONLY_DATA_RESTIC_SHA256_RESTORE_PASS',
   snapshot_id:H,pg_dump:false,tables:113,rows:3719,verified_files:118}],
 ['schema','20261123T152926Z-45205624842',{
   status:'POSTGRES_SCHEMA_CATALOG_RESTIC_SHA256_RESTORE_PASS',
   snapshot_id:H,pg_dump:false,catalog_categories:15,catalog_files_verified:16}],
 ['storage','20261123T150230Z-45200250455',{
   status:'STORAGE_RESTIC_READ_DATA_FULL_SHA256_RESTORE_PASS',
   snapshot_id:H,file_count:203,postgres_dump_included:false}]
].map(([kind,id,payload])=>({kind,id,status:{...payload,backup_id:id,full_system:false}}));

function createHarness({modify,extraInvalid=false}={}){
 class Node{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.handlers={};this.value='';this.textContent='';this.disabled=false;this.hidden=false;this.type='';}
  append(...ns){this.children.push(...ns)}
  appendChild(n){this.children.push(n);return n}
  replaceChildren(...ns){this.children=[...ns]}
  addEventListener(name,fn){this.handlers[name]=fn}
 }
 const ids=['refresh','prepare','restoreId','restoreOutput','status','lastVerified','snapshotCount','backups',
  'authHelp','stagingRuns','schedule','runnerState'];
 const nodes=Object.fromEntries(ids.map(x=>[x,new Node()]));
 const local=new Map([['sh9-book-ms-config-v2',JSON.stringify({account:'zsolt.monika@outlook.com',clientId:'test-client'})]]);
 const session=new Map([['sh9-book-ms-access-v2',JSON.stringify({
  account:'zsolt.monika@outlook.com',clientId:'test-client',accessToken:'ONLY_TEST_TOKEN',expires:Date.now()+3600000
 })]]);
 const sources=runs.map(x=>({kind:x.kind,id:x.id,status:{...x.status}}));
 if(modify)modify(sources);
 if(extraInvalid)sources.push({kind:'bad',id:'20261123T155959Z-45000000000',
  status:{backup_id:'20261123T155959Z-45000000000',status:'STORAGE_RESTIC_READ_DATA_FULL_SHA256_RESTORE_PASS',
   snapshot_id:H,file_count:203,full_system:true,postgres_dump_included:false}});
 const requests=[];
 const mockFetch=async(url,opt)=>{
  requests.push({url,method:opt.method});
  const u=new URL(url);const p=u.pathname;
  if(p==='/v1.0/me/drive')return {ok:true,json:async()=>({id:'BC1FF24AF37EA2B0'})};
  if(p.includes('/root:/SHO/Backups:/children'))return {ok:true,json:async()=>({value:[]})};
  if(p.includes('/root:/SHO/Backups/restic-partial-runs:/children')){
   return {ok:true,json:async()=>({value:sources.map(x=>({
    id:'folder_'+x.kind,name:x.id,folder:{}
   }))})};
  }
  const folder=/\/items\/folder_([^/]+)\/children/.exec(p);
  if(folder)return {ok:true,json:async()=>({value:[{id:'status_'+folder[1],name:'status.json',file:{}}]})};
  const status=/\/items\/status_([^/]+)\/content/.exec(p);
  if(status)return {ok:true,json:async()=>sources.find(s=>s.kind===status[1])?.status};
  throw Error('Unexpected Graph route '+url);
 };
 const win={
  localStorage:{getItem:k=>local.get(k)||null},
  sessionStorage:{getItem:k=>session.get(k)||null},
  fetch:mockFetch,confirm:()=>true
 };
 const doc={getElementById:k=>nodes[k]||null,createElement:tag=>new Node(tag)};
 vm.runInNewContext(code,{window:win,document:doc,URL,Date,Set,Map,Object,Array,RegExp,Promise,Number,String});
 return {nodes,requests,win};
}

test('five real RESTIC formats map into five monitored areas, and Graph only reads',async()=>{
 assert.match(html,/Éles mentésmonitor · 5 komponens/);
 assert.match(html,/restic-partial-runs/);
 assert.doesNotMatch(html,/sho-backup-unified\.yml/);
 const {nodes,requests,win}=createHarness();
 await win.HH_BACKUP_ADMIN_V1.refresh();
 assert.equal(nodes.snapshotCount.textContent,'5');
 assert.match(nodes.status.textContent,/5\/5 mentési terület/);
 assert.match(nodes.status.textContent,/NEM teljes PostgreSQL/);
 assert.equal(nodes.stagingRuns.children.length,6);
 for(const row of nodes.stagingRuns.children.slice(0,5))assert.equal(row.children[1].disabled,false);
 assert.ok(requests.length>=13);
 assert.ok(requests.every(x=>x.method==='GET'&&x.url.startsWith('https://graph.microsoft.com/v1.0/')));
 assert.ok(requests.some(x=>x.url.includes('restic-partial-runs')));
});
test('invalid status or full_system true never becomes verified',async()=>{
 const {win,nodes}=createHarness({
  modify:sources=>{sources.find(x=>x.kind==='db').status.full_system=true},
  extraInvalid:true
 });
 await win.HH_BACKUP_ADMIN_V1.refresh();
 assert.equal(nodes.snapshotCount.textContent,'4');
 assert.match(nodes.status.textContent,/4\/5 mentési terület/);
 assert.equal(nodes.stagingRuns.children[2].children[1].disabled,true);
 assert.match(nodes.stagingRuns.children[5].textContent,/|^$/);
});
test('selecting a verified RESTIC status generates an isolated plan, never runs restore',async()=>{
 const {win,nodes,requests}=createHarness();
 await win.HH_BACKUP_ADMIN_V1.refresh();
 nodes.stagingRuns.children[1].children[1].handlers.click();
 assert.equal(nodes.restoreId.value,runs.find(x=>x.kind==='git').id);
 nodes.prepare.handlers.click();
 assert.match(nodes.restoreOutput.textContent,/SHO\/Backups\/restic-partial-v1/);
 assert.match(nodes.restoreOutput.textContent,/restore NEM indult/);
 assert.match(nodes.restoreOutput.textContent,/natív dump/);
 assert.ok(requests.every(x=>x.method==='GET'));
});
