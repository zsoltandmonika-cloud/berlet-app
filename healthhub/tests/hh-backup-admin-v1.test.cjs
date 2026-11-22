'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const page=fs.readFileSync(path.join(ROOT,'admin-backup/index.html'),'utf8');
const js=fs.readFileSync(path.join(ROOT,'admin-backup/backup-admin-v1.js'),'utf8');
const admin=fs.readFileSync(path.join(ROOT,'hh-admin-mobile-focus-v748.js'),'utf8');

test('existing SHO Admin Recovery category links to a real local Backup Center page',()=>{
 assert.match(admin,/hhAdminBackupRestoreV1/);
 assert.match(admin,/selected!=='recovery'/);
 assert.match(admin,/\.\/admin-backup\/index\.html/);
 assert.match(page,/backup-admin-v1\.js/);
 assert.match(page,/Mentések ellenőrzése/);
 assert.match(page,/Visszaállítási terv előkészítése/);
 assert.match(page,/SHO \/ Backups/);
});
test('no hidden restore, delete, automatic upload, service-role credentials, or forged state',()=>{
 assert.doesNotMatch(js,/fetch\s*\(\s*[^,]+,\s*\{\s*method\s*:\s*['"]POST/);
 assert.doesNotMatch(js,/localStorage\.setItem|sessionStorage\.setItem|storage\.clear|indexedDB\.deleteDatabase|rclone\s+delete/);
 assert.match(js,/method:'GET'/);
 assert.match(js,/status\?\.status!=='CLOUD_CORE_VERIFIED'/);
 assert.match(js,/status\?\.read_back_verified!==true/);
 assert.match(js,/status\?\.full_system!==false/);
 assert.match(js,/w\.confirm\(/);
 assert.match(js,/restoreMode:'plan-only'/);
 assert.match(page,/A GitHub megnyitása még nem indít mentést/);
 assert.match(page,/Fejlesztés állapota/);
});
function createContext(validSession=true, fakeResponses=[]){
 class Node{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.handlers={};this.value='';this.textContent='';this.disabled=false;this.hidden=false;this.type='';}
  append(...args){this.children.push(...args)}
  appendChild(n){this.children.push(n);return n}
  replaceChildren(...nodes){this.children=[...nodes]}
  addEventListener(name,fn){this.handlers[name]=fn}
 }
 const nodes=Object.fromEntries(['refresh','prepare','restoreId','restoreOutput','status','lastVerified','snapshotCount','backups','authHelp'].map(x=>[x,new Node()]));
 const calls=[];
 const local=new Map([['sh9-book-ms-config-v2',JSON.stringify({account:'zsolt.monika@outlook.com',clientId:'c'})]]);
 const session=new Map(validSession?[['sh9-book-ms-access-v2',JSON.stringify({account:'zsolt.monika@outlook.com',clientId:'c',accessToken:'TEST_TOKEN',expires:Date.now()+3600000})]]:[]);
 const win={
  localStorage:{getItem:k=>local.get(k)||null},
  sessionStorage:{getItem:k=>session.get(k)||null},
  fetch:async (url,opt)=>{
   calls.push({url,opt});
   const v=fakeResponses.shift();
   if(!v)throw Error('Unexpected Graph request '+url);
   return {ok:true,json:async()=>v};
  },confirm:()=>true
 };
 vm.runInNewContext(js,{window:win,document:{getElementById:id=>nodes[id],createElement:tag=>new Node(tag)},URL,Date,Set,Object,Number,String,Array,RegExp,Promise});
 return {win,nodes,calls};
}
test('no Microsoft auth means no Graph requests and no verified backups',async()=>{
 const {win,nodes,calls}=createContext(false);
 await win.HH_BACKUP_ADMIN_V1.refresh();
 assert.equal(calls.length,0);
 assert.equal(nodes.snapshotCount.textContent,'0');
 assert.equal(nodes.prepare.disabled,true);
 assert.match(nodes.status.textContent,/Book Studiót/);
});
test('one verified immutable cloud-core snapshot can be selected but NEVER restored automatically',async()=>{
 const id='20261122T001500Z-1234';
 const data=[
  {id:'BC1FF24AF37EA2B0'},
  {value:[{id:'folder1',name:id,folder:{}},{id:'folder2',name:'_setup-check',folder:{}}]},
  {value:[{id:'status1',name:'status.json',file:{}}]},
  {schema:'sho-backup-status/1',backup_id:id,status:'CLOUD_CORE_VERIFIED',read_back_verified:true,full_system:false,encrypted_archive_sha256:'a'.repeat(64)}
 ];
 const {win,nodes,calls}=createContext(true,data);
 await win.HH_BACKUP_ADMIN_V1.refresh();
 assert.equal(nodes.snapshotCount.textContent,'1');
 assert.equal(nodes.backups.children.length,1);
 const btn=nodes.backups.children[0].children[1];
 assert.equal(btn.disabled,false);
 btn.handlers.click();
 assert.equal(nodes.restoreId.value,id);
 nodes.prepare.handlers.click();
 assert.match(nodes.restoreOutput.textContent,/restore NEM indult/);
 assert.ok(calls.length>0);
 assert.ok(calls.every(({url,opt})=>opt.method==='GET'&&url.startsWith('https://graph.microsoft.com/v1.0/')&&opt.headers.Authorization==='Bearer TEST_TOKEN'));
});
test('invalid remote status is not a restore point',async()=>{
 const id='20261122T001500Z-55';
 const d=[{id:'BC1FF24AF37EA2B0'},{value:[{id:'f1',name:id,folder:{}}]},{value:[{id:'s1',name:'status.json',file:{}}]},{schema:'sho-backup-status/1',backup_id:id,status:'CLOUD_CORE_VERIFIED',read_back_verified:false,full_system:false,encrypted_archive_sha256:'a'.repeat(64)}];
 const {win,nodes}=createContext(true,d);
 await win.HH_BACKUP_ADMIN_V1.refresh();
 assert.equal(nodes.snapshotCount.textContent,'0');
 assert.equal(nodes.prepare.disabled,true);
 assert.equal(nodes.backups.children[0].children[1].disabled,true);
});
