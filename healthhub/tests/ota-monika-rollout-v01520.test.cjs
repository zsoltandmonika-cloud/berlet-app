'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const manifest = JSON.parse(read('data/bridge-ota.json'));
const gradle = read('android-bridge/app/build.gradle.kts');
const native = read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OtaUpdateManager.kt');

test('Monika and Zsolt receive exactly the same immutable signed 0.15.20 APK', () => {
  assert.equal(manifest.schema, 'healthhub.connect.ota/1');
  assert.equal(manifest.channel, 'signed-release');
  assert.equal(manifest.applicationId, 'hu.zsoltmonika.healthhubbridge');
  assert.equal(manifest.version, '0.15.20');
  assert.equal(manifest.versionCode, 47);
  assert.deepEqual(manifest.rolloutProfiles, ['zsolt', 'monika']);
  assert.equal(manifest.downloadUrl, 'https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/healthhub-connect-ota-v0.15.20/HealthHub-Connect-v0.15.20-ota.apk');
  assert.equal(manifest.sha256, '5c416b11cc61d660d84f6d8d0a1db5eab9c6507adef85c6a11efb4f40f43cd45');
  assert.match(gradle, /versionCode = 47/);
  assert.match(gradle, /versionName = "0\.15\.20"/);
});
test('Both owner eligibility and integrity verification remain enforced on Android', () => {
  assert.match(native, /rolloutProfiles/);
  assert.match(native, /profiles\.optString\(it\) == owner/);
  assert.match(native, /code <= BuildConfig\.VERSION_CODE/);
  assert.match(native, /if \(actual != candidate\.sha256\) error/);
  assert.match(native, /android\.permission\.POST_NOTIFICATIONS|Manifest\.permission\.POST_NOTIFICATIONS/);
  assert.doesNotMatch(native, /PackageInstaller\.SessionParams|\.commit\(\)/);
});
