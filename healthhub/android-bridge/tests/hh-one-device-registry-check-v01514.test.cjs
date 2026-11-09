'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const main=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
const schedule=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/OrchestratorScheduler.kt');
const worker=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/OrchestratorWorker.kt');
const receipt=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/DeviceRegistrationReceipt.kt');

test('explicit native button is next to existing Health Connect SYNC NOW, and is disabled while verifying',()=>{
 assert.match(main,/text = "🔄 SYNC MOST · kézi adatlekérés"/);
 assert.match(main,/text = "📱 Eszközregisztráció ellenőrzése"/);
 assert.ok(main.indexOf('text = "🔄 SYNC MOST · kézi adatlekérés"') <
   main.indexOf('text = "📱 Eszközregisztráció ellenőrzése"'));
 assert.match(main,/setOnClickListener \{ checkNativeDeviceRegistration\(\) \}/);
 assert.match(main,/registryCheckButton\?\.isEnabled = false/);
 assert.match(main,/registryCheckButton\?\.isEnabled = true/);
});

test('diagnostic observes the exact Android worker and verifies actual Dropbox readback',()=>{
 assert.match(schedule,/fun runNow\(context: Context\): UUID/);
 assert.match(schedule,/return req.id/);
 assert.match(main,/wm.getWorkInfoById\(workId\).get\(\)/);
 assert.match(main,/work\?\.state != WorkInfo.State.SUCCEEDED/);
 assert.match(main,/DropboxVaultClient.downloadTextOrNull\(prefs, path\)/);
 assert.match(main,/DeviceRegistrationReceipt.inspect\(/);
 assert.match(main,/orchestrator_device_id_v1/);
 assert.match(worker,/\.put\("deviceType", "android"\)/);
 assert.match(worker,/\.put\("lastSeenAt", java.time.Instant.now\(\).toString\(\)\)/);
 assert.match(receipt,/startedAtMillis - 15_000L/);
});

test('no false success from Health Connect, no ID deletion, no new profile bind and no destructive data changes',()=>{
 const inspect=main.substring(main.indexOf('private fun checkNativeDeviceRegistration()'),
   main.indexOf('private fun syncNow(requestedProfile'));
 assert.doesNotMatch(inspect,/syncNow\(|exportAndUpload\(|\.clear\(|remove\("orchestrator_device_id_v1"\)|\.putString\("device_owner_profile"/);
 assert.match(inspect,/val owner = deviceOwnerProfile\(\)/);
 assert.match(inspect,/DropboxVaultClient.hasRefreshToken\(prefs\)/);
 assert.match(inspect,/Ha ott továbbra sincs telefon/);
 assert.doesNotMatch(inspect,/DropboxVaultClient.uploadText|DropboxVaultClient.uploadHealthConnectSnapshot/);
});

test('version is unique newer native Android candidate; signed production release remains separate',()=>{
 const gradle=read('app/build.gradle.kts');
 assert.match(gradle,/versionName = "0.15.14"/);
 assert.match(gradle,/versionCode = 41/);
 assert.match(gradle,/Signed OTA promotion is separately approved/);
});
