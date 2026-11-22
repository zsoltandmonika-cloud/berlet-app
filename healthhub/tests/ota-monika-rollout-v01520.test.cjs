'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const manifest = JSON.parse(read('data/bridge-ota.json'));
const gradle = read('android-bridge/app/build.gradle.kts');
const native = read('android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OtaUpdateManager.kt');

test('Monika and Zsolt share the same immutable, currently published signed OTA APK', () => {
  assert.equal(manifest.schema, 'healthhub.connect.ota/1');
  assert.equal(manifest.channel, 'signed-release');
  assert.equal(manifest.applicationId, 'hu.zsoltmonika.healthhubbridge');
  assert.equal(manifest.version, '0.15.23');
  assert.equal(manifest.versionCode, 50);
  assert.deepEqual(manifest.rolloutProfiles, ['zsolt', 'monika']);
  assert.equal(manifest.downloadUrl, 'https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/healthhub-connect-ota-v0.15.23/HealthHub-Connect-v0.15.23-ota.apk');
  assert.equal(manifest.sha256, 'da838c6467dd3fe37fffb9a886a01b357b3455e498e14533a02595a1366bd155');
  assert.ok(Number(gradle.match(/versionCode = (\d+)/)?.[1]) > manifest.versionCode);
  assert.match(gradle, /versionName = "0\.15\.24"/);
});
test('Both owner eligibility and integrity verification remain enforced on Android', () => {
  assert.match(native, /rolloutProfiles/);
  assert.match(native, /profiles\.optString\(it\) == owner/);
  assert.match(native, /code <= BuildConfig\.VERSION_CODE/);
  assert.match(native, /if \(actual != candidate\.sha256\) error/);
  assert.match(native, /android\.permission\.POST_NOTIFICATIONS|Manifest\.permission\.POST_NOTIFICATIONS/);
  assert.doesNotMatch(native, /PackageInstaller\.SessionParams|\.commit\(\)/);
});
