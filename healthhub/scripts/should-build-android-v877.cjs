#!/usr/bin/env node
'use strict';
/*
 * SH9 v877: Fail-open Android compile gate, not a release/security bypass.
 * Web-only HealthHub changes keep source-contract QA but skip Android SDK setup.
 * Manual builds and any unrecognized git state ALWAYS compile.
 */
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const SHA=/^[0-9a-f]{40}$/i;
function needsAndroid(paths){
 if(!Array.isArray(paths))return true;
 return paths.some(p=>
  p.startsWith('healthhub/android-bridge/')||
  p==='healthhub/data/bridge-ota.json'||
  p==='healthhub/scripts/should-build-android-v877.cjs'||
  p==='.github/workflows/hh-one-remote-v502-qa.yml'
 );
}
function select(event,base,head,exec=execFileSync){
 if(event!=='pull_request')return {build:true,why:'manual_or_unknown_event'};
 if(!SHA.test(base||'')||!SHA.test(head||''))return {build:true,why:'missing_commit_sha'};
 try{
  // Fetch exactly two commit objects; no costly full-history checkout.
  exec('git',['fetch','--quiet','--no-tags','--depth=1','origin',base,head],
   {encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
  const output=exec('git',['diff','--name-only',base,head,'--'],
   {encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']});
  const files=output.trim()?output.trim().split(/\r?\n/):[];
  return {build:needsAndroid(files),why:needsAndroid(files)?'native_files_changed':'web_only_change'};
 }catch(_){
  // A shallow/forked PR must never silently skip an Android build.
  return {build:true,why:'diff_unavailable_fail_open'};
 }
}
function main(env=process.env){
 const d=select(env.SH9_EVENT,env.SH9_BASE_SHA,env.SH9_HEAD_SHA);
 const line='android_build='+String(d.build)+'\n';
 if(env.GITHUB_OUTPUT)fs.appendFileSync(env.GITHUB_OUTPUT,line);
 process.stdout.write('SH9 Android QA: '+d.why+' · Android build '+(d.build?'required':'skipped')+'\n');
}
if(require.main===module)main();
module.exports={needsAndroid,select,main};
