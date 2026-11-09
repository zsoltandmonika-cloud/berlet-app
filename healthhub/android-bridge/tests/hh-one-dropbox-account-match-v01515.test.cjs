'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const main=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
const vault=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/DropboxVaultClient.kt');
const guard=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/DropboxAccountMatch.kt');
const web=read('../device-registry-v401.js');
test('account comparison is explicit and protects existing credentials on failed OAuth',()=>{
 assert.match(main,/Dropbox-fiók ellenőrzése \/ váltása/);
 assert.match(main,/startDropboxAuth\(owner, expected\)/);
 assert.match(main,/force_reapprove/);
 assert.match(main,/DropboxAccountMatch\.matches\(expectedSuffix, accountId\)/);
 const callback=main.slice(main.indexOf('private fun handleDropboxCallback('),main.indexOf('private suspend fun getAccessToken()'));
 assert.ok(callback.indexOf('if (expectedSuffix != null &&')<callback.indexOf('.putString("dropbox_refresh_token", refresh)'));
 assert.match(callback,/return@launch/);
 assert.match(callback,/A korábbi Dropbox-kapcsolat megmaradt/);
 assert.match(callback,/\.putString\("dropbox_account_suffix_v1", actualSuffix\)/);
 assert.doesNotMatch(callback,/remove\("device_owner_profile"\)|remove\("orchestrator_device_id_v1"\)/);
 assert.match(vault,/\.remove\("dropbox_account_suffix_v1"\)/);
 assert.match(guard,/fun matches\(expected: String, accountId: String\?\): Boolean/);
});
test('web device registry identifies exact web Dropbox account and missing Android reports',()=>{
 assert.match(web,/Webes Dropbox fiókazonosító vége/);
 assert.match(web,/api\(\)\.accountHint\(\)/);
 assert.match(web,/Android-jelentések:/);
 assert.match(web,/A natív telefonazonosítót ne töröld/);
 assert.doesNotMatch(web,/localStorage\.removeItem\('hh-orchestrator-device-id-v1'\)/);
});
test('native app identity remains unchanged and release is a newer OTA candidate',()=>{
 const gradle=read('app/build.gradle.kts');
 assert.match(gradle,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
 assert.match(gradle,/versionCode = 42/);
 assert.match(gradle,/versionName = "0\.15\.15"/);
});
