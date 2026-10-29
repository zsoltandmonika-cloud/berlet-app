'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../sh9/smart-travel/public-transport');
const core=require(path.join(root,'transport-cloud-sync-v983.js'));
const mav=fs.readFileSync(path.join(root,'mav/rail-private-gtfs-v2.js'),'utf8');
const html=fs.readFileSync(path.join(root,'mav/index.html'),'utf8');
const styles=fs.readFileSync(path.join(root,'transport-cloud-sync-v983.css'),'utf8');
const source=fs.readFileSync(path.join(root,'transport-cloud-sync-v983.js'),'utf8');
function store(){
 const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
}
function feed(version,when){
 return {schema:'sh9-mav-gtfs-v1',timezone:'Europe/Budapest',
  rightsConfirmed:false,localOnly:true,
  generatedAt:when,feedVersion:version,source:'Private local-only MÁV GTFS',
  stops:[['A','Budapest-Keleti'],['B','Miskolc-Tiszai']],
  services:{all:{from:'20261001',to:'20261231',days:'1111111',exceptions:{}}},
  trips:[{id:'IC 586',service:'all',route:'IC 586 TOKAJ',
   stops:[['A',975,975],['B',1070,1070]]}]};
}
function fakeDropbox(){
 const files=new Map();let writes=0,reads=0;
 const connected=()=>true;
 async function meta(file){
  const x=files.get(file);
  return x?{'.tag':'file',rev:String(x.rev),size:x.bytes.length}:null;
 }
 async function download(file){reads++;
  if(!files.has(file))throw Object.assign(Error('not_found'),{status:409,summary:'path/not_found'});
  return files.get(file).bytes;
 }
 async function upload(file,bytes,mode='add'){
  writes++;const existing=files.get(file);
  if(existing&&mode==='add')throw Error('conflict:add');
  if(mode?.['.tag']==='update'&&String(existing?.rev)!==mode.update)throw Error('conflict:rev');
  const rev=1+(existing?.rev||0);files.set(file,{bytes:new Uint8Array(bytes),rev});
  return {path_lower:file.toLowerCase(),size:bytes.length,rev:String(rev)};
 }
 return {client:{connected,meta,download,upload,ensureDir:async()=>{}},
  files,stats:()=>({writes,reads})};
}
function device(cloud,initial){
 let data=initial;
 const win={localStorage:store(),crypto:webcrypto};
 const svc=core.createSync(win,{module:'mav',client:cloud.client,
  readLocal:()=>data,validate:d=>d?.schema==='sh9-mav-gtfs-v1'&&d.localOnly===true,
  importLocal:async raw=>{data=raw}});
 return {svc,get data(){return data},set data(x){data=x}};
}
test('MÁV deployment mounts shared transport sync ahead of private GTFS',()=>{
 assert.match(html,/transport-cloud-sync-v983\.js\?v=983/);
 assert.match(html,/transport-cloud-sync-v983\.css\?v=983/);
 assert.ok(html.indexOf('transport-cloud-sync-v983.js')<html.indexOf('rail-private-gtfs-v2.js'));
 assert.match(mav,/SH9_TRANSPORT_CLOUD_SYNC_V983\.mount/);
 assert.match(mav,/ready:restoreReady/);
 assert.match(mav,/importSyncedDataset/);
 assert.match(styles,/min-height:49px/);
 assert.match(html,/rail-nearby-v980\.js/);
 assert.match(html,/rail-station-board-v979\.js/);
});
test('Content-addressed Dropbox paths cannot escape transport module allowlist',()=>{
 assert.equal(core.paths('mav').manifest,'/HealthHub/transport/gtfs/mav/latest.json');
 assert.equal(core.paths('volan').manifest,'/HealthHub/transport/gtfs/volan/latest.json');
 assert.throws(()=>core.paths('../../public'));
 assert.throws(()=>core.paths('anything'));
});
test('No upload without a separate direct user confirmation',async()=>{
 const remote=fakeDropbox(),one=device(remote,feed('v1','2026-10-28T00:00:00Z'));
 await assert.rejects(one.svc.push(),/jóváhagyással/);
 assert.equal(remote.stats().writes,0);
});
test('One upload, no duplicate, and another phone recovers exact same private GTFS',async()=>{
 const remote=fakeDropbox(),one=device(remote,feed('v1','2026-10-28T00:00:00Z')),
  two=device(remote,null);
 const first=await one.svc.push(true);
 assert.equal(first.action,'uploaded');
 assert.equal(remote.stats().writes,2);
 assert.equal((await one.svc.push(true)).action,'unchanged');
 assert.equal(remote.stats().writes,2);
 assert.equal((await two.svc.pull()).action,'downloaded');
 assert.deepEqual(two.data,one.data);
 assert.equal((await two.svc.pull()).action,'unchanged');
});
test('Automatic checks are opt-in and rate-limited to one 24-hour window',async()=>{
 const remote=fakeDropbox(),one=device(remote,feed('v1','2026-10-28T00:00:00Z')),
  two=device(remote,null);
 await one.svc.push(true);
 assert.equal((await two.svc.check()).action,'disabled');
 two.svc.enable(true);
 assert.equal((await two.svc.check()).action,'downloaded');
 assert.equal((await two.svc.check()).action,'throttled');
 assert.equal(remote.stats().writes,2);
});
test('Newer feeds can replace older under opt-in auto, equal dates and downgrades cannot',async()=>{
 const remote=fakeDropbox(),one=device(remote,feed('v1','2026-10-28T00:00:00Z')),
  two=device(remote,feed('old','2026-10-27T00:00:00Z'));
 await one.svc.push(true);
 two.svc.enable(true);
 assert.equal((await two.svc.check()).action,'downloaded');
 assert.deepEqual(two.data,one.data);
 two.data=feed('different','2026-10-28T00:00:00Z');
 await assert.rejects(two.svc.push(true),/Automatikus felülírás letiltva/);
 two.data=feed('newer','2026-10-29T00:00:00Z');
 assert.equal((await two.svc.push(true)).action,'uploaded');
 one.svc.enable(true);
 assert.equal((await one.svc.check()).action,'downloaded');
 assert.deepEqual(one.data,two.data);
});
test('A corrupt cloud file never replaces an existing verified local dataset',async()=>{
 const remote=fakeDropbox(),one=device(remote,feed('v1','2026-10-28T00:00:00Z')),
  two=device(remote,feed('older','2026-10-27T00:00:00Z'));
 await one.svc.push(true);
 const manifest=JSON.parse(new TextDecoder().decode(remote.files.get(core.paths('mav').manifest).bytes));
 remote.files.set(manifest.path,{bytes:new TextEncoder().encode('{"bad":true}'),rev:1});
 await assert.rejects(two.svc.pull({allowReplace:true}),/ellenőrzőösszege/);
 assert.equal(two.data.feedVersion,'older');
});
test('Revision-based overwrite prevents stale concurrent writers',async()=>{
 const remote=fakeDropbox(),one=device(remote,feed('v1','2026-10-28T00:00:00Z'));
 await one.svc.push(true);
 const file=core.paths('mav').manifest,prior=await remote.client.meta(file);
 remote.files.set(file,{bytes:remote.files.get(file).bytes,rev:Number(prior.rev)+1});
 await assert.rejects(remote.client.upload(file,new TextEncoder().encode('{}'),
  {'.tag':'update',update:prior.rev}),/conflict:rev/);
});
test('Never starts invisible timers, pollers, GPS or public uploads',()=>{
 assert.doesNotMatch(source,/setInterval\(|watchPosition\(|supabase\.from\(|raw\.githubusercontent\.com/);
 assert.match(source,/document becomes visible|document becomes visible/);
 assert.match(source,/files\/upload/);
 assert.match(source,/crypto\.subtle|crypto\)/);
 assert.match(source,/MAX=24\*1024\*1024/);
});
