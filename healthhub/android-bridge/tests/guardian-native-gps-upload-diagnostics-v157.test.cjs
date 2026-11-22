'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const src='healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/';
const relay=read(src+'FamilyGuardNativeRelay.kt');
const activity=read(src+'MainActivity.kt');
const gps=read(src+'Sh9GpsService.kt');
const ota=JSON.parse(read('healthhub/data/bridge-ota.json'));
const gradle=read('healthhub/android-bridge/app/build.gradle.kts');

test('native GPS diagnostics report only workflow stage plus sanitized HTTP/status',()=>{
 assert.match(relay,/const val KEY_FAILURE_DETAIL = "family_guard_native_failure_detail_v157"/);
 assert.match(relay,/const val KEY_ATTEMPT_AT = "family_guard_native_attempt_at_v157"/);
 assert.match(relay,/val code = Regex\(/);
 assert.match(relay,/safeFailure\(stage, e\)/);
 assert.match(relay,/stage = "Eszközellenőrzés"/);
 assert.match(relay,/stage = "Dropbox-mappa"/);
 assert.match(relay,/stage = "GPS feltöltés"/);
 assert.match(relay,/\.putString\(KEY_FAILURE_DETAIL, safeFailure\(stage, e\)\)/);
 assert.doesNotMatch(relay, /\.putString\(KEY_FAILURE_DETAIL,\s*e\.message/);
 assert.doesNotMatch(relay, /KEY_FAILURE_DETAIL,\s*e\.toString/);
});

test('retry is owner initiated, checks live consent, does not revoke or change credentials',()=>{
 const m=relay.match(/fun requestRetry\(context: Context\): Boolean \{([\s\S]*?)\n    \}/);
 assert.ok(m,'exposes explicit retry');
 assert.match(m[1],/if \(!enabled\(context\) \|\| !Sh9GpsService\.active\) return false/);
 assert.match(m[1],/lastFailureAt = 0L/);
 assert.match(m[1],/lastQueuedAt = 0L/);
 assert.doesNotMatch(m[1], /KEY_SHARE|KEY_AUTO_GPS|KEY_REMOTE_STOP|dropbox_refresh_token|\.disable\(|\.remove\(/);
 assert.match(activity,/FamilyGuardNativeRelay\.requestRetry\(this@MainActivity\)/);
 assert.match(activity,/startSh9Gps\(\)/);
 assert.match(activity,/feltöltés újrapróba \+ diagnosztika/);
 assert.match(gps,/FamilyGuardNativeRelay\.publish\(this, location, smartPolicy\.mode\)/);
});

test('re-approval clears stale upload throttle, revocation cannot deliberately overwrite renewed consent',()=>{
 const consent=relay.split('fun enable(context: Context): Boolean')[1].split('fun requestRetry(')[0];
 assert.match(consent,/cancelUniqueWork\(REVOKE_WORK\)/);
 assert.match(consent,/lastQueuedAt = 0L/);
 assert.match(consent,/lastFailureAt = 0L/);
 const revoke=relay.split('suspend fun revokeIfStopped(')[1].split('internal object GuardianLegacyRegistryDecision')[0];
 assert.match(revoke,/if \(enabled\(context\)\) return true/);
 assert.match(revoke,/ensureFolder\(context\)[\s\S]*if \(enabled\(context\)\) return true/);
});

test('diagnostics display last success as last phone ACK, not proven live status',()=>{
 assert.match(activity,/Utolsó sikeres telefonos GPS-feltöltés:/);
 assert.match(activity,/KEY_LAST_UPLOAD/);
 assert.match(activity,/KEY_FAILURE_DETAIL/);
 assert.match(activity,/GPS-feltöltés sikertelen/);
 assert.doesNotMatch(activity,/DropboxVaultClient\.ensureCredentialVersion\(prefs\)\s*;\s*prefs\.edit\(\)\.clear/);
});

test('never publish a debug APK or downgrade currently signed Samsung release',()=>{
 assert.equal(ota.version,'0.15.23');
 assert.equal(ota.versionCode,50);
 assert.deepEqual(ota.rolloutProfiles.sort(),['monika','zsolt'].sort());
 assert.match(ota.sha256,/^[a-f0-9]{64}$/);
 assert.match(gradle,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
 assert.doesNotMatch(relay,/Supabase|hh_guardian_live_locations|http:\/\/api\.dropbox/);
});
