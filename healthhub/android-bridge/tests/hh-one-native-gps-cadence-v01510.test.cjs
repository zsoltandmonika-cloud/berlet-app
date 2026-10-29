'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const relay=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/FamilyGuardNativeRelay.kt');
const gps=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9GpsService.kt');
const policy=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/NativeGpsUploadPolicy.kt');
const android=read('healthhub/android-bridge/app/build.gradle.kts');
const baseline=JSON.parse(read('healthhub/data/bridge-ota.json'));

test('bus/idle/native relay v0.15.10 derives interval from real measured speed and accuracy only',()=>{
 assert.match(policy,/speedMetersPerSecond\?\.takeIf/);
 assert.match(policy,/measuredSpeed >= 2\.8f/);
 assert.match(policy,/accuracyMeters in 0f\.\.40f/);
 for(const minimum of ['15_000L','30_000L','60_000L'])assert.ok(policy.includes(minimum));
 assert.match(policy,/maxOf\(selectedMs, minimum\)/);
 assert.match(gps,/FamilyGuardNativeRelay\.publish\(this, location, smartPolicy\.mode\)/);
 assert.match(relay,/NativeGpsUploadPolicy\.minimumUploadMs/);
 assert.match(relay,/Sh9GpsService\.interval\(context\)/);
 assert.doesNotMatch(policy,/LocationManager|SensorManager|DropboxVaultClient|Supabase|history/i);
});
test('one active upload, no backlog, bounded network failures, selected phone & consent retained',()=>{
 assert.match(relay,/uploadInFlight\.compareAndSet\(false, true\)/);
 assert.match(relay,/uploadInFlight\.set\(false\)/);
 assert.match(relay,/lastFailureAt < 60_000L/);
 assert.match(relay,/lastFailureAt = System\.currentTimeMillis\(\)/);
 assert.match(relay,/foldersReady = true/);
 assert.match(relay,/if \(!enabled\(context\) \|\| !Sh9GpsService\.active\) return/);
 assert.match(relay,/isSelectedPhysicalPhone\(app, profile\)/);
 assert.match(relay,/batteryEnabled\(app\)/);
 assert.match(relay,/if \(!batteryEnabled\(app\)\)/);
 assert.match(relay,/uploadLock\.lock\(\)/);
 assert.doesNotMatch(relay,/Supabase|upsert\(|saveTrack|trackHistory/);
});
test('signed v0.15.9 remains published until manual gated v0.15.10 release',()=>{
 assert.match(android,/versionCode = 37/);
 assert.match(android,/versionName = "0\.15\.10"/);
 assert.equal(baseline.versionCode,36);
 assert.equal(baseline.version,'0.15.9');
});
