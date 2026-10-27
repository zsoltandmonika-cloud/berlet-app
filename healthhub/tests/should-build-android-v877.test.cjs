'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {needsAndroid,select,main}=require('../scripts/should-build-android-v877.cjs');
const SHA_A='a'.repeat(40),SHA_B='b'.repeat(40);
function fake(files){
 let n=0;
 return (_bin,args)=>{
  n++;
  if(n===1){
   assert.equal(args[0],'fetch');
   assert.ok(args.includes('--depth=1'));
   assert.equal(args.at(-2),SHA_A);assert.equal(args.at(-1),SHA_B);
   return '';
  }
  assert.deepEqual(args.slice(0,2),['diff','--name-only']);
  return files.join('\n')+'\n';
 };
}
test('Web index, billing dashboard and digital-health JS changes skip Android SDK',()=>{
 for(const p of ['healthhub/index.html','healthhub/usage-control/github-billing-v873.js',
  'healthhub/digital-health/digital-live-v507.js','healthhub/hh-one-rag-v500.js']){
  assert.equal(needsAndroid([p]),false,p);
  const r=select('pull_request',SHA_A,SHA_B,fake([p]));
  assert.deepEqual(r,{build:false,why:'web_only_change'});
 }
});
test('Android bridge, OTA build version, workflow itself and new gate always compile',()=>{
 for(const p of ['healthhub/android-bridge/app/src/main/AndroidManifest.xml',
  'healthhub/android-bridge/app/build.gradle.kts',
  'healthhub/data/bridge-ota.json','.github/workflows/hh-one-remote-v502-qa.yml',
  'healthhub/scripts/should-build-android-v877.cjs']){
  assert.equal(needsAndroid([p]),true,p);
  assert.equal(select('pull_request',SHA_A,SHA_B,fake([p])).build,true,p);
 }
});
test('Fail-open on manual dispatch, unknown event, missing SHA or git error',()=>{
 assert.equal(select('workflow_dispatch',null,null).build,true);
 assert.equal(select('push',SHA_A,SHA_B).build,true);
 assert.equal(select('pull_request','bad',SHA_B).build,true);
 assert.deepEqual(select('pull_request',SHA_A,SHA_B,()=>{throw Error('git unavailable')}),
 {build:true,why:'diff_unavailable_fail_open'});
});
test('Classifier writes required boolean output, never skips an unsafe uncertainty',()=>{
 const output=path.join(require('node:os').tmpdir(),'sh9-native-gate-test-'+process.pid);
 try{
  main({SH9_EVENT:'workflow_dispatch',GITHUB_OUTPUT:output});
  assert.equal(fs.readFileSync(output,'utf8'),'android_build=true\n');
 }finally{try{fs.unlinkSync(output)}catch(_){}}
});
test('Workflow preserves original web trigger and all source-contract tests',()=>{
 const file=fs.readFileSync(path.join(__dirname,'../../.github/workflows/hh-one-remote-v502-qa.yml'),'utf8');
 assert.match(file,/needs: source-contract/);
 assert.match(file,/needs\.source-contract\.outputs\.android_build == 'true'/);
 assert.match(file,/healthhub\/index\.html/);
 assert.match(file,/healthhub\/digital-health\/\*\*/);
 assert.match(file,/healthhub\/data\/bridge-ota\.json/);
 assert.match(file,/gradle :app:testDebugUnitTest :app:assembleDebug/);
 assert.match(file,/node --test healthhub\/tests\/should-build-android-v877\.test\.cjs/);
 assert.match(file,/node healthhub\/tests\/hh-one-remote-v502\.test\.cjs/);
});
