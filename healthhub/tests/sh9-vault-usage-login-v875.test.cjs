'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'central-vault/usage-vault-return-v875.js'),'utf8');
test('only explicit login recovery route activates',()=>{
 let opens=0,redirect='';let listener=null;let logged=false;
 const win={location:{href:'https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/index.html?hhvault=usage',replace:s=>{redirect=s}},HH_DAILY_HEALTH_SYNC_V319:{getStatus:()=>({authenticated:logged}),openLogin:()=>{opens++}},addEventListener:(name,cb)=>{if(name==='healthhub:central-auth-changed')listener=cb}};
 vm.runInNewContext(source,{window:win,document:{readyState:'complete'},URL});
 assert.equal(opens,1);assert.equal(redirect,'');logged=true;listener();assert.match(redirect,/usage-control\/index\.html$/);
});
test('Home includes the new return helper after the Vault provider',()=>{const s=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.ok(s.indexOf('central-vault/usage-vault-return-v875.js')>s.indexOf('central-vault/daily-health-sync.js'));});
