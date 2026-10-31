'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const activity=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
const manifest=read('app/src/main/AndroidManifest.xml');
const service=read('app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9GpsService.kt');
const build=read('app/build.gradle.kts');

test('v0.15.11 signed OTA candidate above installed build33',()=>{
 assert.match(build,/versionCode = 40/);
 assert.match(build,/versionName = "0\.15\.13"/);
 assert.match(build,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
});
test('user opted in to Android Always location in system settings, never auto-grant',()=>{
 assert.match(manifest,/android\.permission\.ACCESS_BACKGROUND_LOCATION/);
 assert.match(manifest,/android\.permission\.ACCESS_FINE_LOCATION/);
 assert.match(manifest,/android\.permission\.FOREGROUND_SERVICE_LOCATION/);
 assert.match(activity,/openBackgroundLocationSettings\(\)/);
 assert.match(activity,/AlertDialog\.Builder\(this\)/);
 assert.match(activity,/Settings\.ACTION_APPLICATION_DETAILS_SETTINGS/);
 assert.match(activity,/Manifest\.permission\.ACCESS_BACKGROUND_LOCATION/);
 assert.match(activity,/gpsBackgroundSummary\.text/);
 assert.match(activity,/Mindig engedélyezett/);
 assert.doesNotMatch(activity,/requestPermissions\([^)]*ACCESS_BACKGROUND_LOCATION/);
 assert.doesNotMatch(activity,/sh9GpsPermission\.launch\([^)]*ACCESS_BACKGROUND_LOCATION/);
 assert.match(manifest,/RECEIVE_BOOT_COMPLETED/);
 assert.match(service,/ACTION_STOP/);
 assert.match(service,/startForeground\(NOTIFICATION_ID, notification\(\)\)/);
 assert.match(service,/START_NOT_STICKY/);
});
test('Android permission alone does not grant natív family sharing',()=>{
 assert.match(activity,/Android helyengedély NEM engedélyezi automatikusan/);
 assert.match(activity,/Kifejezetten jóváhagyom/);
 assert.match(activity,/toggleNativeFamilyShare/);
 assert.match(activity,/Edge GPS-korlátait/);
 assert.match(service,/lastFixAtMillis = System\.currentTimeMillis\(\)/);
 assert.match(service,/FamilyGuardNativeRelay\.publish/);
 assert.doesNotMatch(service,/supabase|\.upload\(|\.insert\(|\.upsert\(|\.send\(/i);
});
