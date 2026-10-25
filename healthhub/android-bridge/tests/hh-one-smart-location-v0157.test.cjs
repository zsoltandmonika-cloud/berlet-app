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
test('v0.15.8 build35 is same OTA-signed application with verified FLP dependency',()=>{
 assert.match(gradle,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
 assert.match(gradle,/versionName = "0\.15\.8"/);
 assert.match(gradle,/versionCode = 35/);
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
 assert.match(gps,/FamilyGuardNativeRelay\.publish\(this, location\)/);
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

test('bounded FLP stall recovery never loops indefinitely or restarts after STOP',()=>{
 assert.match(gps,/private fun startWatchdog\(generation: Int\)/);
 assert.match(gps,/150_000L/);
 assert.match(gps,/engine == "fused" && recoveryAttempts == 0/);
 assert.match(gps,/receiverStatus\("fused-retry"\)/);
 assert.match(gps,/receiverStatus\("fused-timeout-fallback"\)/);
 assert.match(gps,/startLegacy\(generation\)/);
 assert.match(gps,/watchdog\.postDelayed\(tick, 30_000L\)/);
 assert.match(gps,/watchdog\.removeCallbacks\(it\)/);
 assert.match(gps,/!active \|\| callbackGeneration != generation/);
 assert.match(gps,/FamilyGuardContinuity\.setApproved\(this, false\)/);
 assert.doesNotMatch(gps,/PowerManager\.WakeLock|PARTIAL_WAKE_LOCK|WAKE_LOCK/);
});
test('only fresh and plausible location updates can reset stall timer',()=>{
 assert.match(gps,/location\.elapsedRealtimeNanos <= previousFix!!\.elapsedRealtimeNanos/);
 assert.match(gps,/location\.accuracy !in 0f\.\.100f/);
 assert.match(gps,/location\.latitude !in -90\.0\.\.90\.0/);
 assert.match(gps,/lastAcceptedFixAt = SystemClock\.elapsedRealtime\(\)/);
});
test('native receiver health is separate from guarded family Dropbox result',()=>{
 assert.match(gps,/KEY_RECEIVER_STATUS/);
 assert.match(worker,/smartLocationReceiverStatus/);
 assert.match(worker,/familyGuardUploadStatus/);
 assert.match(main,/GPS-vevő: \$receiverLabel/);
 assert.match(main,/hasFreshFix/);
 assert.match(main,/külön engedélyezett helymegosztása/);
});

test('P1 GPS provider recovery uses bounded native retry, cleans up stale listeners and keeps STOP safe',()=>{
 assert.match(gps,/providerWasUnavailable = true/);
 assert.match(gps,/receiverStatus\("provider-restored"\)/);
 assert.match(gps,/startFused\(generation\)/);
 assert.match(gps,/recoveryAttempts < 3/);
 assert.match(gps,/receiverStatus\("native-retry"\)/);
 assert.match(gps,/startLegacy\(generation, alternateProvider = true\)/);
 assert.match(gps,/private fun clearLegacyUpdates\(\)/);
 assert.match(gps,/lm.removeUpdates\(old\)/);
 assert.match(gps,/listener === this/);
 assert.match(gps,/!active \|\| callbackGeneration != generation/);
 assert.doesNotMatch(gps,/PowerManager\.WakeLock|WAKE_LOCK/);
});
