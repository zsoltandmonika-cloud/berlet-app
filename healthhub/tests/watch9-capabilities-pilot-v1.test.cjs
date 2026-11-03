'use strict';
/* Static regression: Watch9-primary, Watch5 Pro fallback, no new production side effects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = 'healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/';
const activity = fs.readFileSync(root+'MainActivity.kt','utf8');
const pairing = fs.readFileSync(root+'WatchPairedProbeV1.kt','utf8');
const vitals = fs.readFileSync(root+'WatchVitalsProbeV1.kt','utf8');
const matrix = fs.readFileSync(root+'Watch9CapabilityPlanV1.kt','utf8');
const spec = fs.readFileSync('healthhub/docs/WATCH9_REFERENCE_PILOT_V1.md','utf8');
const manifest = fs.readFileSync('healthhub/android-bridge/app/src/main/AndroidManifest.xml','utf8');

assert.match(matrix,/Watch9 \(40 mm LTE\) is the REFERENCE target/);
assert.match(spec,/Referencia: \*\*Mónika Galaxy Watch9 40 mm LTE\/eSIM/);
assert.match(spec,/Watch5 Pro/);
assert.match(matrix,/EDA: elektrodermális aktivitás[\s\S]{0,130}watch5ProFallback=false/);
assert.match(matrix,/MF-BIA: többfrekvenciás impedancia[\s\S]{0,130}watch5ProFallback=false/);
assert.match(activity,/text = "⌚ Watch9 \/ Watch5 Pro · vitális adatok \(read-only\)"/);
assert.match(activity,/text = "🩷 Watch9 · összes képesség és Watch5 Pro különbségek"/);
assert.match(activity,/Watch9CapabilityPlanV1\.summary\(\)/);
assert.match(activity,/WatchPairedProbeV1\.inspect\(this\)/);
assert.match(activity,/WatchVitalsProbeV1\.inspect\(client\)/);
assert.match(pairing,/A Bluetooth bond is NOT a live connection/);
assert.match(pairing,/adapter\.bondedDevices/);
assert.doesNotMatch(pairing,/\.address|startDiscovery|startScan|requestLocationUpdates|upload|Dropbox|Supabase/);
assert.match(vitals,/No uploads, database writes, continuous sensors/);
for(const record of ['HeartRateRecord','OxygenSaturationRecord','RestingHeartRateRecord','SleepSessionRecord','ExerciseSessionRecord','Vo2MaxRecord'])
  assert.match(vitals,new RegExp(record));
assert.match(vitals,/Health Connect source package does NOT verify the watch model/);
assert.doesNotMatch(vitals,/Dropbox|Supabase|https?:\/\/|WorkManager|foregroundService|SmsManager/);
assert.match(manifest,/android\.permission\.BLUETOOTH_CONNECT/);
assert.doesNotMatch(activity.slice(activity.indexOf('private fun showWatchPilotLocal()'),activity.indexOf('private fun buildUi()')),/SyncScheduler|OtaUpdateManager|Dropbox|Supabase|\.writeRecords\(/);
console.log('Watch9 primary / Watch5 Pro fallback / read-only guard PASS');
