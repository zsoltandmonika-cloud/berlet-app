'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const r = 'healthhub/android-bridge/';
const phone = fs.readFileSync(r+'wearpilot-phone/build.gradle.kts','utf8');
const watch = fs.readFileSync(r+'wearpilot-watch/build.gradle.kts','utf8');
const settings = fs.readFileSync(r+'settings.gradle.kts','utf8');
const legacy = fs.readFileSync(r+'app/build.gradle.kts','utf8');
const phoneM = fs.readFileSync(r+'wearpilot-phone/src/main/AndroidManifest.xml','utf8');
const watchM = fs.readFileSync(r+'wearpilot-watch/src/main/AndroidManifest.xml','utf8');
const service = fs.readFileSync(r+'wearpilot-phone/src/main/java/hu/zsoltmonika/watchpilot/WatchPilotReceiver.kt','utf8');
const handset = fs.readFileSync(r+'wearpilot-phone/src/main/java/hu/zsoltmonika/watchpilot/PhonePilotActivity.kt','utf8');
const sender = fs.readFileSync(r+'wearpilot-watch/src/main/java/hu/zsoltmonika/watchpilot/WatchPilotActivity.kt','utf8');

assert.match(settings, /include\(":wearpilot-phone", ":wearpilot-watch"\)/);
for (const item of [phone,watch]) {
  assert.match(item, /applicationId = "hu\.zsoltmonika\.watchpilot"/);
  assert.match(item, /play-services-wearable:20\.0\.1/);
  assert.doesNotMatch(item, /signingConfig = signingConfigs\.getByName\("ota"\)/);
}
assert.match(legacy, /applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
assert.match(phoneM, /android:path="\/sh9\/watch\/pilot\/v1"/);
assert.match(phoneM, /MESSAGE_RECEIVED/);
assert.match(watchM, /android\.hardware\.type\.watch/);
assert.match(service, /if \(!prefs\.getBoolean\(KEY_ARMED, false\)\) return/);
assert.match(service, /existingNode.*null/);
assert.match(service, /node != existingNode/);
assert.match(service, /percent !in 0\.\.100/);
assert.match(service, /abs\(now - sentAt\) > 10 \* 60 \* 1000L/);
assert.match(service, /\.commit\(\)/);
assert.match(service, /sendMessage\(node, PATH_ACK, ack\)/);
assert.match(sender, /UUID\.randomUUID\(\)\.toString\(\)/);
assert.match(sender, /pendingNonce/);
assert.match(sender, /nodes\.size != 1/);
assert.match(sender, /BatteryManager\.EXTRA_LEVEL/);
assert.match(sender, /registerReceiver\(null, IntentFilter\(Intent\.ACTION_BATTERY_CHANGED\)\)/);
assert.match(sender, /sendMessage\(node\.id, PATH_REPORT, payload\)/);
assert.match(handset, /prefs\.edit\(\)\.clear\(\)/);
assert.match(handset, /15 \* 60 \* 1000L/);
for (const source of [handset,service,sender]) {
  assert.doesNotMatch(source, /\b(SupabaseClient|DropboxVaultClient|HealthConnectClient|WorkManager|HealthServicesClient|requestLocationUpdates|sendBroadcast)\s*\(/);
}
console.log('Watch9 Data Layer pilot isolation and protocol: PASS');
