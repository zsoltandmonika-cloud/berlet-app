'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const relay=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/FamilyGuardNativeRelay.kt');
const central=read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/FamilyDeviceCentral.kt');
const gradle=read('android-bridge/app/build.gradle.kts');
const register=read('device-registry-v401.js');
const html=read('index.html');
const manifest=JSON.parse(read('data/bridge-ota.json'));
test('signed 0.15.20 build47 preserves package identity and supports both family profiles',()=>{
 assert.match(gradle,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
 assert.match(gradle,/versionCode = 47/);
 assert.match(gradle,/versionName = "0\.15\.20"/);
 assert.equal(manifest.version,'0.15.20');
 assert.equal(manifest.versionCode,47);
 assert.deepEqual(manifest.rolloutProfiles,['zsolt','monika']);
});
test('Existing GPS and battery consent and ownership remain mandatory',()=>{
 assert.match(relay,/getBoolean\(KEY_SHARE, false\)/);
 assert.match(relay,/getBoolean\(KEY_BATTERY_SHARE, false\)/);
 assert.match(relay,/FamilyGuardContinuity\.enabled\(context\)/);
 assert.match(relay,/owner\(context\) != null/);
 assert.match(relay,/DropboxVaultClient\.hasRefreshToken/);
 assert.match(relay,/Sh9GpsService\.active/);
 assert.match(relay,/isSelectedPhysicalPhone\(app, profile\)/);
 assert.match(relay,/if \(!batteryEnabled\(app\)\)/);
 const fallback=relay.slice(relay.indexOf('private suspend fun isSelectedPhysicalPhone('),relay.indexOf('private suspend fun ensureFolder('));
 assert.doesNotMatch(fallback,/putBoolean\(KEY_SHARE, true\)|enable\(context\)/);
});
test('Only an absent/unassigned legacy device may use live central owner proof',()=>{
 assert.match(relay,/GuardianLegacyRegistryDecision\.Result\.UNASSIGNED\s*->\s*FamilyDeviceCentral\.verifiedForNativeRelay/);
 assert.match(relay,/GuardianLegacyRegistryDecision\.Result\.CONFLICT,\s*GuardianLegacyRegistryDecision\.Result\.INVALID -> false/);
 assert.match(relay,/phones\.optString\(peer\) == deviceId/);
 assert.match(central,/heartbeat\(prefs, owner, deviceId, build\) == "verified"/);
 assert.match(central,/previous\.owner == owner/);
 assert.match(central,/previous\.deviceId == deviceId/);
 assert.match(central,/System\.currentTimeMillis\(\) \+ 90_000L/);
 assert.match(central,/private var relayProof:/);
 assert.doesNotMatch(central,/remove\("orchestrator_device_id_v1"\)|remove\("dropbox_refresh_token"\)/);
});
test('Central verified phone selection is explicit, fresh, server-refreshed and reversible',()=>{
 assert.match(register,/data-hh-reg-action="choose-central"/);
 assert.match(register,/await center\.refresh\(\)/);
 assert.match(register,/x\.profile_key===profile&&x\.device_id===dev&&x\.verified_at/);
 assert.match(register,/x\.state==='online'/);
 assert.match(register,/action==='choose'\|\|action==='choose-central'/);
 assert.match(register,/next\.activePhones\[other\]===d\.deviceId/);
 assert.match(register,/throw Error\('Ez a telefon már a másik profilhoz tartozik/);
 assert.match(register,/device-registry-backup-/);
 assert.match(register,/A visszaolvasott Dropbox-regiszter eltér/);
 assert.match(html,/centralchoose=819/);
});
test('No silent OTA, data deletion, pairing reset or fabricated indicator values',()=>{
 for(const code of [relay,central,register]){
  assert.doesNotMatch(code,/\.clear\(\)|deleteFile\(|remove\("device_owner_profile"\)|newRandomDeviceId/);
 }
 assert.match(relay,/battery_pct/);
 assert.match(relay,/battery_charging/);
 assert.match(relay,/updated_at/);
 assert.match(register,/A mentést nem sikerült visszaellenőrizni/);
});
