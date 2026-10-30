'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(base,p),'utf8');
const android='healthhub/android-bridge/app/src/main/';
const manifest=read(android+'AndroidManifest.xml');
const continuity=read(android+'java/hu/zsoltmonika/healthhubbridge/FamilyGuardContinuity.kt');
const gps=read(android+'java/hu/zsoltmonika/healthhubbridge/Sh9GpsService.kt');
const act=read(android+'java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
const notifier=read(android+'java/hu/zsoltmonika/healthhubbridge/GuardianEmergencyNotification.kt');
const worker=read(android+'java/hu/zsoltmonika/healthhubbridge/OrchestratorWorker.kt');
const scope=read('healthhub/live-v305.js');
const admin=read('healthhub/hh-one-rag-v500.js');
const gradle=read('healthhub/android-bridge/app/build.gradle.kts');

test('signed HH One v0.15.11 build38 keeps same physical app identity',()=>{
 assert.match(gradle,/versionCode = 38/);
 assert.match(gradle,/versionName = "0\.15\.11"/);
 assert.match(gradle,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
});
test('opted-in location service restores only after normal boot and owner + background permission',()=>{
 assert.match(manifest,/RECEIVE_BOOT_COMPLETED/);
 assert.match(manifest,/GuardianBootReceiver/);
 assert.match(manifest,/android:exported="false"/);
 assert.match(continuity,/Intent\.ACTION_BOOT_COMPLETED/);
 assert.match(continuity,/Intent\.ACTION_MY_PACKAGE_REPLACED/);
 assert.match(continuity,/hasOwner\(context\) && hasBackgroundLocation\(context\) && gpsAvailable\(context\)/);
 assert.match(continuity,/!enabled\(context\) -> "disabled"/);
 assert.match(continuity,/SyncScheduler\.scheduleAll/);
 assert.match(continuity,/ResilientHealthSync\.schedule/);
 assert.match(continuity,/OrchestratorScheduler\.schedule/);
 assert.match(continuity,/OtaUpdateManager\.schedule/);
 assert.match(gps,/START_STICKY/);
 assert.match(gps,/FamilyGuardContinuity\.canRestart/);
 assert.match(gps,/GPS leállítása/);
});
test('local owner consent, and STOP disables auto restart while permitting explicitly approved new requests',()=>{
 assert.match(act,/toggleGpsBootConsent\(\)/);
 assert.match(act,/Jóváhagyom/);
 assert.match(act,/FamilyGuardContinuity\.setApproved\(this, true\)/);
 assert.match(act,/FamilyGuardContinuity\.disable\(this\)/);
 assert.match(continuity,/putBoolean\(KEY_AUTO_GPS, false\)/);
 assert.match(continuity,/fun remoteStopAllowed/);
 assert.doesNotMatch(continuity,/getLastKnownLocation|uploadLocation|sendLocation|Geocoder/);
});
test('remote control is scoped, bounded and cannot remotely activate mic or camera',()=>{
 for(const name of ['gps_stop','gps_resume_request','sos_contact_request']){
  assert.ok(worker.includes('"'+name+'"'));
  assert.ok(scope.includes("'"+name+"'"));
  assert.ok(admin.includes("'"+name+"'"));
 }
 assert.match(worker,/requestedOwner != owner/);
 assert.match(worker,/deadline\.isAfter/);
 assert.match(worker,/GuardianEmergencyNotification\.request/);
 assert.match(worker,/FamilyGuardContinuity\.remoteStopAllowed/);
 assert.match(notifier,/POST_NOTIFICATIONS/);
 assert.match(notifier,/setContentIntent\(pending\)/);
 assert.match(notifier,/MainActivity::class\.java/);
 assert.match(act,/GPS indítása/);
 assert.match(act,/showFamilyGuardRequest/);
 assert.match(act,/vagy kamerát/);
 assert.match(scope,/40\*60\*1000/);
 assert.match(scope,/buildCode\)<33/);
 assert.doesNotMatch(notifier,/MediaRecorder|AudioRecord|CameraManager|Camera2|MediaProjection/);
 assert.doesNotMatch(worker,/requestPermissions|MediaRecorder|CameraManager|RECORD_AUDIO/);
 assert.doesNotMatch(manifest,/RECORD_AUDIO|FOREGROUND_SERVICE_CAMERA|FOREGROUND_SERVICE_MICROPHONE/);
});
