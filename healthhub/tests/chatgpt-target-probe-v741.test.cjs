'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const js=fs.readFileSync(path.resolve(__dirname,'../hh-chatgpt-target-probe-v741.js'),'utf8');
let uploaded=null,fetchCount=0,failRead=false;
const w={crypto:webcrypto,setInterval:()=>0,
 HH_CHATGPT_TARGET_AUTH_V739:{read:async()=>({accountId:'account-test'}),accessToken:async()=> 'test-oauth-token'},
 HH_CHATGPT_TARGET_ONBOARD_V739:{verifyTargetFolder:async()=>({id:'id:TARGET',path:'/HealthHub-ChatGPT-Analytics'})},
 fetch:async(url,opts)=>{
  fetchCount++;
  const arg=JSON.parse(opts.headers['Dropbox-API-Arg']);
  assert.equal(arg.path,'/HealthHub-ChatGPT-Analytics/healthhub-connection-test-v741.json');
  assert.equal(opts.headers.Authorization,'Bearer test-oauth-token');
  if(url.endsWith('/files/upload')){
   assert.equal(arg.mode,'overwrite');
   uploaded=opts.body;
   const data=JSON.parse(uploaded);
   assert.equal(data.schema,'healthhub.dropbox.connection-test/1');
   assert.deepEqual(Object.keys(data).sort(),['generatedAt','nonce','purpose','schema']);
   assert.equal(data.purpose,'Non-medical Dropbox permission test only');
   return {ok:true,json:async()=>({path_lower:arg.path.toLowerCase(),size:Buffer.byteLength(uploaded)})};
  }
  assert.ok(url.endsWith('/files/download'));
  return {ok:true,text:async()=>failRead?'different-file':uploaded};
 }
};
const d={readyState:'loading',addEventListener:()=>{}};
vm.runInNewContext(js,{window:w,document:d,TextEncoder,JSON,Date,Uint8Array,Array});
(async()=>{
 const api=w.HH_CHATGPT_TARGET_PROBE_V741;
 const first=await api.probe();
 assert.equal(first.readback,true);
 assert.equal(first.folderId,'id:TARGET');
 assert.equal(fetchCount,2);
 failRead=true;
 await assert.rejects(api.probe(),/eltér/);
 assert.doesNotMatch(js,/health-connect\.json|digital-wellbeing\.json|nutrition\.json|medical-master\.json/);
 console.log('PASS v741: consent-only nonclinical test write, exact readback, mismatched-data failure.');
})().catch(e=>{console.error(e);process.exitCode=1});
