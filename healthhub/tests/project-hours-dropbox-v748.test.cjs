'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const dir=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(dir,'hh-project-hours-dropbox-v748.js'),'utf8');
const index=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const pc=fs.readFileSync(path.join(dir,'live-v142.js'),'utf8');
assert.match(index,/hh-project-hours-dropbox-v748\.js\?v=748-project-hours-sync/);
assert.match(index,/live-v142\.js\?v=748-cloud-project-hours/);
assert.match(pc,/hhPcHoursDropbox748/);
assert.match(pc,/HH_PROJECT_HOURS_V747=\{get:hourBook/);
assert.match(pc,/HH_PROJECT_HOURS_DROPBOX_V748\?\.onLocalChange\(\)/);
assert.doesNotMatch(source,/access_token\s*[:=]\s*['"][A-Za-z0-9]/);
assert.doesNotMatch(source,/localStorage\.clear\(/);
new vm.Script(source);
const L=new Map(),remote=new Map();
let guardCalls=0,uploadedCount=0,forceWrongRead=false,uiMessage='';
let local={baselineMinutes:13200,entries:[{minutes:60,at:'2026-10-20T08:00:00Z',kind:'manual'}],runningSince:null};
const ls={
 getItem:k=>L.get(k)||null,
 setItem:(k,v)=>L.set(k,String(v)),
 removeItem:k=>L.delete(k)
};
const dest='/HealthHub-ChatGPT-Analytics/project-hours.json';
const W={
 localStorage:ls,crypto:webcrypto,
 addEventListener:()=>{},setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,
 HH_PROJECT_HOURS_V747:{get:()=>local},
 HH_CHATGPT_TARGET_AUTH_V739:{accessToken:async()=> 'TEST_TOKEN'},
 HH_CHATGPT_PROFILE_SYNC_V742:{requireTarget:async()=>{guardCalls++;return {id:'id:n7qchVNGAogAAAAAAAAABQ',path:'/HealthHub-ChatGPT-Analytics'}}},
 fetch:async(url,args)=>{
  assert.equal(args.headers.Authorization,'Bearer TEST_TOKEN');
  assert.ok(url.startsWith('https://content.dropboxapi.com/2/files/'));
  const p=JSON.parse(args.headers['Dropbox-API-Arg']).path;
  assert.equal(p,dest);
  if(url.endsWith('/download')){
   if(!remote.has(p))return {ok:false,status:409};
   const bytes=remote.get(p);
   const data=forceWrongRead?new TextEncoder().encode('bad'):bytes;
   return {ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};
  }
  if(url.endsWith('/upload')){
   const opts=JSON.parse(args.headers['Dropbox-API-Arg']);
   assert.equal(opts.mode,'overwrite');assert.equal(opts.autorename,false);
   assert.equal(opts.mute,true);
   const bytes=Uint8Array.from(args.body);remote.set(p,bytes);uploadedCount++;
   return {ok:true,json:async()=>({path_lower:p.toLowerCase(),size:bytes.byteLength})};
  }
  throw Error('Unexpected endpoint '+url);
 }
};
const D={
 hidden:false,addEventListener:()=>{},getElementById:()=>null,
 querySelectorAll:()=>[{set textContent(v){uiMessage=v},get textContent(){return uiMessage}}]
};
vm.runInNewContext(source,{window:W,document:D,Date,JSON,Array,Set,Intl,TextEncoder,TextDecoder,Uint8Array});
const A=W.HH_PROJECT_HOURS_DROPBOX_V748;
(async()=>{
 assert.equal(A.version,'748');
 assert.equal(A.opted(),false);
 assert.equal((await A.sync()).skipped,true);
 assert.equal(guardCalls,0);
 const localSnap=A.snapshot();
 assert.equal(localSnap.schema,'healthhub.project-hours/1');
 assert.equal(localSnap.baseline.minutes,13200);
 assert.equal(localSnap.totals.snapshotHours,221);
 assert.equal(localSnap.entries.length,1);
 let out=await A.sync(true);
 assert.equal(out.verified,true);
 assert.equal(A.opted(),true);
 assert.equal(guardCalls,1);
 assert.equal(uploadedCount,1);
 assert.equal(JSON.parse(new TextDecoder().decode(remote.get(dest))).totals.snapshotHours,221);
 assert.ok(A.readStatus().verifiedAt);
 assert.ok(uiMessage.includes('SHA-256'));
 local.entries.push({minutes:30,at:'2026-10-21T09:00:00Z',kind:'timer'});
 out=await A.sync();
 assert.equal(out.verified,true);
 assert.equal(uploadedCount,2);
 assert.equal(JSON.parse(new TextDecoder().decode(remote.get(dest))).totals.snapshotHours,221.5);
 // The remote version may never be silently overwritten by another device.
 const foreign=new TextEncoder().encode('{"schema":"foreign-file","hours":999}');
 remote.set(dest,foreign);
 await assert.rejects(A.sync(),/felülírás letiltva/);
 assert.equal(uploadedCount,2);
 assert.equal(new TextDecoder().decode(remote.get(dest)),new TextDecoder().decode(foreign));
 A.stop();assert.equal(A.opted(),false);
 assert.equal((await A.sync()).skipped,true);
 // Reject an incorrect verified target even when the OAuth token is present.
 W.HH_CHATGPT_PROFILE_SYNC_V742.requireTarget=async()=>{throw Error('Eltérő Dropbox-fiók')};
 await assert.rejects(A.sync(true),/Eltérő Dropbox-fiók/);
 assert.equal(uploadedCount,2);
 console.log('PASS v748: opt-in, 220h historical baseline + entries, verified readback, safe overwrite guard, private destination, opt-out, target identity.');
})().catch(e=>{console.error(e);process.exitCode=1});
