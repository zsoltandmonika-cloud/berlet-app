'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ot=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OtaUpdateManager.kt');
const activity=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OneTapOtaActivity.kt');
const guardian=read('guardian/guardian-ota-assistant-v1042.js');
const html=read('guardian/index.html');
const gradle=read('android-bridge/app/build.gradle.kts');
const workflow=read('../.github/workflows/healthhub-connect-ota-release.yml');
const published=JSON.parse(read('data/bridge-ota.json'));

test('next candidate is monotonic and the published signed manifest is unchanged until approved release',()=>{
 assert.match(gradle,/versionCode = 39/);
 assert.match(gradle,/versionName = "0\.15\.12"/);
 assert.equal(published.versionCode,39);
 assert.equal(published.version,'0.15.12');
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/Hard stop unless new APK and current OTA baseline have same signing certificate/);
});
test('automatic stage uses connected, validated, unmetered Wi-Fi and existing six-hour check',()=>{
 assert.match(ot,/PeriodicWorkRequestBuilder<OtaCheckWorker>\(6, TimeUnit.HOURS\)/);
 assert.match(ot,/TRANSPORT_WIFI/);
 assert.match(ot,/NET_CAPABILITY_VALIDATED/);
 assert.match(ot,/NET_CAPABILITY_NOT_METERED/);
 assert.match(ot,/automaticDownloadAllowed\(applicationContext\)/);
 assert.match(ot,/downloadVerified\(applicationContext, candidate\)/);
 assert.match(ot,/notifyAvailable\(applicationContext, candidate, prepared\)/);
});
test('same private APK reused only when its SHA matches the approved manifest; never silently installed',()=>{
 assert.match(ot,/target\.isFile && target\.length\(\) in 10000L\.\.MAX_APK_BYTES/);
 assert.match(ot,/hash == candidate\.sha256/);
 assert.match(ot,/target\.delete\(\)/);
 assert.match(ot,/FileProvider\.getUriForFile/);
 assert.doesNotMatch(ot,/PackageInstaller\.SessionParams|\.commit\(\)/);
 assert.match(activity,/OtaUpdateManager\.openSystemInstaller/);
 assert.match(activity,/Hagyd jóvá a telepítést az Androidon/);
});
test('Bluetooth, Wi-Fi and cellular proof is processed before OTA rollout gate even for Mónika',()=>{
 const pEvidence=guardian.indexOf("hh-guardian-device-evidence-v1053");
 const pRollout=guardian.indexOf("if(!validRelease(m,p))");
 assert.ok(pEvidence>0 && pRollout>pEvidence);
 assert.match(guardian,/bluetoothEnabled:typeof device\.bluetoothEnabled==='boolean'/);
 assert.match(html,/guardian-ota-assistant-v1042\.js\?v=1060-monika-network-refresh/);
 assert.match(guardian,/const CACHE_MS=5\*60000/);
 assert.match(guardian,/visibilitychange/);
 assert.doesNotMatch(guardian,/setInterval\(/);
});
