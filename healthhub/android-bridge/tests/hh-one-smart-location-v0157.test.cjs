'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const gps=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9GpsService.kt');
const smart=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/SmartLocationPolicy.kt');
const owner=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/FamilyGuardContinuity.kt');
const worker=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OrchestratorWorker.kt');
const main=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
const gradle=read('healthhub/android-bridge/app/build.gradle.kts');
const admin=read('healthhub/hh-one-rag-v500.js');
test('v0.15.10 build37 is same OTA-signed application with verified FLP dependency',()=>{
 assert.match(gradle,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
 assert.match(gradle,/versionName = "0\.15\.10"/);
 assert.match(gradle,/versionCode = 38/);
 assert.match(gradle,/play-services-location:21\.3\.0/);
});
test('native background location FGS requests FLP before supported Android fallback',()=>{
 assert.match(gps,/LocationServices\.getFusedLocationProviderClient/);
 assert.match(gps,/LocationRequest\.Builder\(priority, ms\)/);
 assert.match(gps,/requestLocationUpdates\(request, callback, Looper\.getMainLooper\(\)\)/);
 assert.match(gps,/removeLocationUpdates\(callback\)/);
 assert.match(gps,/startLegacy\(generation\)/);
 assert.match(gps,/LocationManager\.NETWORK_PROVIDER/);
 assert.match(gps,/location\.isFromMockProvider/);
 assert.match(gps,/System\.currentTimeMillis\(\) - location\.time/);
 assert.match(gps,/age > 20_000L/);
 assert.match(gps,/FamilyGuardNativeRelay\.publish\(this, location, smartPolicy\.mode\)/);
 assert.match(gps,/FamilyGuardContinuity\.setApproved\(this, false\)/);
 assert.doesNotMatch(gps,/PowerManager\.WakeLock|PARTIAL_WAKE_LOCK|WAKE_LOCK|MediaRecorder|CameraManager/);
});
test('motion policy adapts 15/20/45 seconds without persisting paths or sensors',()=>{
 assert.match(smart,/enum class Mode \{ SEARCHING, MOVING, IDLE \}/);
 assert.match(smart,/speedMps >= 1\.3f/);
 assert.match(smart,/displacementMeters >= 20f/);
 assert.match(smart,/consecutiveStill >= 3/);
 assert.match(smart,/consecutivePoor >= 2/);
 assert.match(smart,/45_000L/);
 assert.doesNotMatch(smart,/LocationManager|SensorManager|DropboxVaultClient|saveHistory|pathHistory/);
});
test('boot permission permits fused provider while preserving prior phone consent',()=>{
 assert.match(owner,/manager\.isLocationEnabled/);
 assert.match(owner,/FamilyGuardContinuity/);
 assert.match(owner,/enabled\(context\) && hasOwner\(context\) && hasBackgroundLocation\(context\)/);
});
test('native vs cloud status separately visible on both phone and Admin Center',()=>{
 assert.match(worker,/smartLocationEngine/);
 assert.match(worker,/smartLocationMode/);
 assert.match(worker,/smartLocationLastFixAt/);
 assert.match(worker,/familyGuardUploadStatus/);
 assert.match(worker,/familyGuardLastUploadedAt/);
 assert.match(main,/Fused Location/);
 assert.match(main,/Android tartalék helymeghatározás/);
 assert.match(admin,/smartLocationLastFixAt/);
 assert.match(admin,/familyGuardLastUploadedAt/);
 assert.match(admin,/Dropboxot és az Eszközregisztert/);
});
