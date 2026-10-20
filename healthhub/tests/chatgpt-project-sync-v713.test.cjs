#!/usr/bin/env node
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert').strict;
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'chatgpt-project-sync-v713.js'),'utf8');
const button=fs.readFileSync(path.join(root,'chatgpt-project-shortcut-v712.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.indexOf('chatgpt-project-shortcut-v712.js')<html.indexOf('chatgpt-project-sync-v713.js'));
assert.equal(html.match(/name="healthhub-live-build" content="([^"]+)"/)?.[1],'v713-chatgpt-project-cloud');
assert.equal('v'+html.match(/var v='([^']+)'/)?.[1],'v713-chatgpt-project-cloud');
assert.equal(html.match(/window\.HH_LIVE_BUILD='([^']+)'/)?.[1],'v713-chatgpt-project-cloud');
assert(button.includes("healthhub:chatgpt-project-saved"));
assert(!src.includes('api.openai.com')&&!src.includes('medical-master.json')&&!src.includes('/functions/v1/'));
const cloud=new Map(),writes=[],pathIn='/HealthHub/master/ask-lena-chatgpt-project.json';
let connected=true;
const vault={connected:()=>connected,downloadJson:async p=>cloud.get(p)||null,uploadJson:async(p,v)=>{writes.push(p);cloud.set(p,JSON.parse(JSON.stringify(v)));}};
const url1='https://chatgpt.com/g/g-p-aaa-ask-lena/project',url2='https://chatgpt.com/g/g-p-bbb-ask-lena/project';
function instance(local={}) {
 const events=new Map(),ls=new Map(Object.entries(local));
 const localStorage={getItem:k=>ls.get(k)||null,setItem:(k,v)=>ls.set(k,v),removeItem:k=>ls.delete(k)};
 const root={localStorage,HH_DROPBOX_VAULT:vault,addEventListener:(k,cb)=>events.set(k,cb),HH_CHATGPT_PROJECT_SHORTCUT_V712:{
   normalizeProjectUrl:u=>{if(!/^https:\/\/chatgpt\.com\/g\/g-p-[a-z0-9-]+\/project$/.test(u))throw Error('bad url');return u},
   refresh:()=>{}
 }};
 const d={readyState:'loading',getElementById:()=>null,addEventListener:()=>{}};
 vm.runInNewContext(src,{window:root,document:d,setTimeout:()=>{},Date,Promise}, {timeout:2000});
 return {api:root.HH_CHATGPT_PROJECT_SYNC_V713,ls,events};
}
(async()=>{
 const first=instance({'hh-chatgpt-project-shortcut-v712':url1});
 assert.equal(await first.api.sync(),'empty','old local URL must not be auto-promoted');
 assert.equal(writes.length,0);
 first.events.get('healthhub:chatgpt-project-saved')({detail:{url:url2}});
 // Event handler starts asynchronous sync; run/await a serialized next request.
 await first.api.schedule(true);await Promise.resolve();await Promise.resolve();
 assert.equal(cloud.get(pathIn)?.projectUrl,url2,'new Ask Lena link saved to private Dropbox');
 assert.equal(writes.length,1);
 assert.equal(first.api.pending(),null,'pending cleared after cloud verification');
 const second=instance();
 assert.equal(await second.api.sync(),'remote');
 assert.equal(second.ls.get('hh-chatgpt-project-shortcut-v712'),url2);
 const stale=instance({'hh-chatgpt-project-link-pending-v713':JSON.stringify({schema:'healthhub.chatgpt-project-link/1',projectUrl:url1,updatedAt:'2021-01-01T00:00:00.000Z'})});
 assert.equal(await stale.api.sync(),'remote','old pending save must not overwrite new Dropbox');
 assert.equal(stale.ls.get('hh-chatgpt-project-shortcut-v712'),url2);
 assert.equal(writes.length,1);
 connected=false;
 const offline=instance();
 offline.events.get('healthhub:chatgpt-project-saved')({detail:{url:url1}});
 assert.ok(offline.api.pending(),'offline edit remains queued');
 connected=true;
 await offline.api.schedule(true);await Promise.resolve();await Promise.resolve();
 assert.equal(cloud.get(pathIn).projectUrl,url1,'offline explicit newer change uploads on reconnect');
 assert.deepEqual(writes,[pathIn,pathIn]);
 const unsafe=instance();
 assert.throws(()=>unsafe.api.valid({schema:'invalid',updatedAt:new Date().toISOString(),projectUrl:url1}));
 assert.equal(Object.keys(cloud.get(pathIn)).sort().join(','),'projectUrl,schema,updatedAt');
 console.log('PASS v713: no stale upload, cloud read/write/verify, 2-device hydration, offline edits, only safe URL in private Dropbox');
})().catch(e=>{console.error(e);process.exitCode=1});
