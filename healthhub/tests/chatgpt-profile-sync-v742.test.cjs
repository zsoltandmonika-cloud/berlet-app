'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../hh-chatgpt-profile-sync-v742.js'),'utf8');
const vault=new Map();
const localStorage={
 getItem:k=>vault.get(k)||null,
 setItem:(k,v)=>vault.set(k,v),
 removeItem:k=>vault.delete(k)
};
let uploaded=new Map(),knownFolders=new Set(),wrongRead=false,otherFolder=false,buildCalls=[];
const fakeData=(p)=>({
 schema:'healthhub.chatgpt.manual-24h-digital/1',profile:p,
 exportedAt:'2026-10-21T05:00:00Z',
 sources:[
  {kind:'healthConnect',status:'read',sourceReportedAt:'2026-10-21T04:45:00Z'},
  {kind:'digitalWellbeing',status:'read',sourceReportedAt:null},
  {kind:'nutrition',status:'unavailable'}
 ],
 warnings:['nutrition missing'],
 data:{
  healthConnect:{profile:p,records:{dailySteps:[{date:'2026-10-20',count:5}]}},
  digitalWellbeing:{profileKey:p,collectedAtMs:Date.parse('2026-10-21T04:50:00Z'),hours:[]}
 }
});
const W={
 crypto:webcrypto,localStorage,setInterval:()=>0,setTimeout:()=>0,
 addEventListener:()=>{},
 HH_CHATGPT_TARGET_AUTH_V739:{accessToken:async()=> 'token1'},
 HH_CHATGPT_TARGET_ONBOARD_V739:{
  verifyTargetFolder:async()=>({id:otherFolder?'id:WRONG':'id:n7qchVNGAogAAAAAAAAABQ',
   path:'/HealthHub-ChatGPT-Analytics'})
 },
 HH_CHATGPT_MANUAL_EXPORT_V738:{build:async p=>{buildCalls.push(p);return fakeData(p)}},
 fetch:async(url,args)=>{
  assert.equal(args.headers.Authorization,'Bearer token1');
  if(url.endsWith('/files/get_metadata')){
   const data=JSON.parse(args.body);
   assert.ok(data.path.startsWith('/HealthHub-ChatGPT-Analytics/'));
   return knownFolders.has(data.path)?{ok:true,json:async()=>({'.tag':'folder',path_lower:data.path.toLowerCase()})}:{ok:false,status:409};
  }
  if(url.endsWith('/files/create_folder_v2')){
   knownFolders.add(JSON.parse(args.body).path);
   return {ok:true,json:async()=>({metadata:{'.tag':'folder'}})};
  }
  if(url.endsWith('/files/upload')){
   const path=JSON.parse(args.headers['Dropbox-API-Arg']).path;
   assert.match(path,/^\/HealthHub-ChatGPT-Analytics\/(?:zsolt|monika)\/latest\.json$/);
   assert.equal(JSON.parse(new TextDecoder().decode(args.body)).profile,path.split('/')[2]);
   uploaded.set(path,args.body);
   return {ok:true,json:async()=>({path_lower:path.toLowerCase(),size:args.body.byteLength})};
  }
  if(url.endsWith('/files/download')){
   const path=JSON.parse(args.headers['Dropbox-API-Arg']).path;
   return {ok:true,arrayBuffer:async()=>wrongRead?new TextEncoder().encode('incorrect').buffer:uploaded.get(path)};
  }
  throw Error('Unexpected call: '+url);
 }
};
const D={readyState:'loading',hidden:false,addEventListener:()=>{},
 querySelectorAll:()=>[]};
vm.runInNewContext(source,{window:W,document:D,Date,JSON,TextEncoder,TextDecoder,Uint8Array,Array,Set,Intl});
const api=W.HH_CHATGPT_PROFILE_SYNC_V742;
(async()=>{
 assert.equal(api.version,'742');
 assert.deepEqual([...api.optin()],[]);
 await api.auto();assert.equal(buildCalls.length,0);
 let result=await api.run(['zsolt','monika'],true);
 assert.equal(result.results.length,2);assert.equal(result.errors.length,0);
 assert.equal(uploaded.size,2);
 assert.ok(uploaded.has('/HealthHub-ChatGPT-Analytics/zsolt/latest.json'));
 assert.ok(uploaded.has('/HealthHub-ChatGPT-Analytics/monika/latest.json'));
 assert.equal(api.last().zsolt.profile,'zsolt');
 assert.equal(api.last().monika.profile,'monika');
 assert.equal(api.last().zsolt.sources[0].status,'present');
 assert.equal(api.last().zsolt.sources[1].status,'present');
 assert.equal(api.last().zsolt.sources[2].status,'missing');
 assert.equal(vault.has('hh-chatgpt-snapshot-optin-v742'),false);
 await assert.rejects(api.run(['zsolt','zsolt'],true),/profilválasztás/);
 assert.throws(()=>api.verifyProfile({profile:'zsolt',
  data:{healthConnect:{records:{}},digitalWellbeing:{profileKey:'monika'}}},'zsolt'),/Profilütközés/);
 otherFolder=true;
 await assert.rejects(api.run(['zsolt'],true),/Eltérő Dropbox-fiók/);
 otherFolder=false;wrongRead=true;
 result=await api.run(['zsolt'],true);
 assert.equal(result.results.length,0);assert.equal(result.errors.length,1);
 assert.match(result.errors[0].error,/SHA-256/);
 assert.equal(api.last().zsolt.sha256!==undefined,true);
 assert.doesNotMatch(source,/console\.log\(|console\.info\(|App secret|API_KEY\s*=/);
 console.log('PASS v742: explicit consent, isolated profile paths, verified readback, bad target, failed readback, missing data warning.');
})().catch(e=>{console.error(e);process.exitCode=1});
