'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.resolve(__dirname,'../hh-chatgpt-target-onboard-v739.js'),'utf8');
let called=0;
let response={ok:true,status:200,json:async()=>({
 '.tag':'folder',path_lower:'/healthhub-chatgpt-analytics',
 path_display:'/HealthHub-ChatGPT-Analytics',id:'id:TEST_FOLDER_ID'
})};
const w={
 HH_CHATGPT_TARGET_AUTH_V739:{
  read:async()=>({accountId:'dbid:TEST_ACCOUNT'}),
  accessToken:async()=> 'TEST_ACCESS_TOKEN'
 },
 fetch:async(url,request)=>{
  called++;
  assert.equal(url,'https://api.dropboxapi.com/2/files/get_metadata');
  assert.equal(request.method,'POST');
  assert.equal(JSON.parse(request.body).path,'/HealthHub-ChatGPT-Analytics');
  assert.equal(JSON.parse(request.body).include_deleted,false);
  assert.match(request.headers.Authorization,/^Bearer /);
  return response;
 }
};
const d={readyState:'loading',addEventListener:()=>{}};
vm.runInNewContext(code,{window:w,document:d,JSON,Date});
(async()=>{
 const result=await w.HH_CHATGPT_TARGET_ONBOARD_V739.verifyTargetFolder();
 assert.equal(result.id,'id:TEST_FOLDER_ID');
 assert.equal(result.path,'/HealthHub-ChatGPT-Analytics');
 assert.equal(called,1);
 response={ok:false,status:409};
 await assert.rejects(w.HH_CHATGPT_TARGET_ONBOARD_V739.verifyTargetFolder(),/nem olvasható/);
 response={ok:true,status:200,json:async()=>({'.tag':'file',id:'id:WRONG',
  path_lower:'/healthhub-chatgpt-analytics'})};
 await assert.rejects(w.HH_CHATGPT_TARGET_ONBOARD_V739.verifyTargetFolder(),/nem a várt mappát/);
 assert.doesNotMatch(code,/files\/upload|files\/download|content\.dropboxapi\.com/);
 console.log('PASS: actual target-folder read, missing folder, wrong target; no health transfer');
})().catch(e=>{console.error(e);process.exitCode=1});
