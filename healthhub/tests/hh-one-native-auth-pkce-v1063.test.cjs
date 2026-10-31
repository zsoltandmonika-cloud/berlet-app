'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const helper=read('healthhub/guardian/guardian-native-auth-v1063.js');
const guardian=read('healthhub/guardian/guardian-live-v785.js');
const tasks=read('sh9/family-hub/family-tasks-v880.js');
const guardianPage=read('healthhub/guardian/index.html');
const sh9Page=read('sh9/index.html');
const kotlin=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9WebActivity.kt');
const main=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
const manifest=read('healthhub/android-bridge/app/src/main/AndroidManifest.xml');
const gradle=read('healthhub/android-bridge/app/build.gradle.kts');
const vault=read('healthhub/live-v161.js');
const healthHub=read('healthhub/index.html');
const release=JSON.parse(read('healthhub/data/bridge-ota.json'));
const AUTH='https://vhsrupphzcjkdrusonzh.supabase.co/auth/v1/authorize';
const REDIRECT='https://zsoltandmonika-cloud.github.io/berlet-app/healthhub/guardian/';
function sampleAuth(){
 const q=new URLSearchParams({provider:'google',redirect_to:REDIRECT,code_challenge_method:'s256',
  code_challenge:'A'.repeat(43)});
 return AUTH+'?'+q;
}
function setup({native=true}={}){
 const saved=new Map(native?[['hh-one-native-oauth-v1063','1']]:[]);
 const navigations=[],events=[],messages=[];
 const api={auth:{
  signInWithOAuth:async()=>({data:{url:sampleAuth()},error:null}),
  exchangeCodeForSession:async code=>{messages.push(code);return {error:null}}
 }};
 const w={
  sessionStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},
  location:{search:'',assign:s=>navigations.push(s)},
  document:{getElementById:()=>null},dispatchEvent:event=>events.push(event.type),
  HH_GUARDIAN_LIVE_V785:{getClient:()=>api}};
 const ctx={window:w,URL,URLSearchParams,Error,CustomEvent:class{constructor(type){this.type=type}}};
 vm.runInNewContext(helper,ctx);
 return {bridge:w.HH_ONE_NATIVE_AUTH_V1063,api,navigations,events,messages};
}
test('Google OAuth PKCE starts only from an explicitly native, known app session',async()=>{
 const yes=setup(),no=setup({native:false});
 assert.equal(await yes.bridge.start(yes.api),true);
 assert.equal(yes.navigations.length,1);
 const deep=new URL(yes.navigations[0]);
 assert.equal(deep.protocol,'healthhubconnect:');
 assert.equal(deep.hostname,'auth-start');
 assert.equal(deep.searchParams.get('url'),sampleAuth());
 assert.equal(await no.bridge.start(no.api),false);
 assert.equal(no.navigations.length,0);
});
test('PKCE authorization rejects a wrong OAuth origin or provider before leaving app',async()=>{
 const x=setup();x.api.auth.signInWithOAuth=async()=>({data:{url:sampleAuth().replace('vhsrupphzcjkdrusonzh.supabase.co','invalid.example')}});
 await assert.rejects(()=>x.bridge.start(x.api),/PKCE/);
 assert.equal(x.navigations.length,0);
});
test('return exchanges a one-time code in WebView, never passes tokens to Android',async()=>{
 const x=setup(),code='code_abcdefgh123456';
 assert.equal(await x.bridge.complete(code),true);
 assert.deepEqual(x.messages,[code]);
 assert.deepEqual(x.events,['hh-guardian-auth-changed']);
 assert.equal(await x.bridge.complete('bad code'),false);
 assert.equal(x.navigations.length,0);
});
test('original Chrome implicit sessions remain unchanged, family pages use native PKCE only when flagged',()=>{
 assert.match(guardian,/flowType:NATIVE_OAUTH\?'pkce':'implicit'/);
 assert.match(tasks,/flowType:NATIVE_OAUTH\?'pkce':'implicit'/);
 assert.match(guardian,/HH_ONE_NATIVE_AUTH_V1063/);
 assert.match(tasks,/HH_ONE_NATIVE_AUTH_V1063/);
 assert.match(guardianPage,/guardian-native-auth-v1063\.js/);
 assert.match(sh9Page,/hh-one-native-oauth-v1063/);
 assert.match(guardianPage,/hh-one-native-pkce-return-v1063/);
 assert.match(guardianPage,/history\.replaceState\(history.state,'',location.pathname\+location.hash\)/);
});
test('Android callback requires pending 5-minute intent and a code, and accepts no tokens',()=>{
 assert.match(manifest,/android:host="auth-return"/);
 assert.match(kotlin,/vhsrupphzcjkdrusonzh\.supabase\.co/);
 assert.match(kotlin,/code_challenge_method/);
 assert.match(kotlin,/getQueryParameter\("provider"\) == "google"/);
 assert.match(kotlin,/getQueryParameter\("redirect_to"\) == AUTH_REDIRECT/);
 assert.match(kotlin,/JSONObject\.quote\(code\)/);
 assert.match(kotlin,/onPageFinished/);
 assert.match(main,/age in 0L\.\.300_000L/);
 assert.match(main,/remove\("pending_at"\)/);
 assert.match(main,/EXTRA_GOOGLE_AUTH_CODE_V1063/);
 assert.doesNotMatch(kotlin,/addJavascriptInterface\(/);
 const callback=main.slice(main.indexOf('private fun completeNativeOAuth'),main.indexOf('override fun onCreate'));
 assert.doesNotMatch(callback,/refresh_token|access_token/i);
});
test('candidate build41 stays unpublished, signed OTA baseline stays v0.15.13/build40',()=>{
 assert.match(gradle,/versionCode = 41/);
 assert.match(gradle,/versionName = "0\.15\.14"/);
 assert.equal(release.versionCode,40);
 assert.equal(release.version,'0.15.13');
});

test('WebView Dropbox PKCE state remains inside app; Chrome and native Dropbox modes are unchanged',()=>{
 assert.match(vault,/nativeOAuth\?'hhweb_':''/);
 assert.match(vault,/completeNativeOAuth:completeNativeOAuth/);
 assert.match(vault,/handleCallback\(code,state\)/);
 assert.match(vault,/state&&state\.indexOf\('hhbridge_'\)===0/);
 assert.match(healthHub,/hh-one-native-dropbox-return-v1063/);
 assert.match(healthHub,/dropbox-web-return\?code=/);
 assert.match(kotlin,/www\.dropbox\.com/);
 assert.match(kotlin,/hhweb_\[A-Za-z0-9_-\]/);
 assert.match(kotlin,/EXTRA_DROPBOX_AUTH_STATE_V1063/);
 assert.match(main,/data\.host == "dropbox-web-return"/);
 assert.match(main,/expected == state/);
 assert.match(main,/remove\("dropbox_state"\)\.remove\("dropbox_pending_at"\)/);
 assert.match(manifest,/android:host="dropbox-web-return"/);
 assert.doesNotMatch(kotlin,/addJavascriptInterface\(/);
});
