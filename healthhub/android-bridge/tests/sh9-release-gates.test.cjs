const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bridge = path.resolve(__dirname, '..');
const repo = path.resolve(bridge, '..', '..');
const read = p => fs.readFileSync(path.join(repo, p), 'utf8');
const gradle = read('healthhub/android-bridge/app/build.gradle.kts');
const ota = JSON.parse(read('healthhub/data/bridge-ota.json'));
const workflow = read('.github/workflows/healthhub-connect-ota-release.yml');
const manifest = read('healthhub/android-bridge/app/src/main/AndroidManifest.xml');
const activity = read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt');
const shell = read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9WebActivity.kt');
const gps = read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/Sh9GpsService.kt');
const code = Number(gradle.match(/versionCode\s*=\s*(\d+)/)?.[1]);
const version = gradle.match(/versionName\s*=\s*"([^"]+)"/)?.[1];

test('single signed HH One package identity and monotonic staged OTA version', () => {
  assert.match(gradle, /applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
  assert.match(gradle, /versionCode = 27/);
  assert.match(gradle, /versionName = "0\.15\.0"/);
  assert.equal(ota.applicationId, 'hu.zsoltmonika.healthhubbridge');
  assert.ok(Number.isInteger(code) && code >= ota.versionCode);
  if (code === ota.versionCode) assert.equal(version, ota.version);
  assert.ok(ota.downloadUrl.startsWith('https://github.com/zsoltandmonika-cloud/berlet-app/releases/download/'));
});

test('OTA publishing never starts just because native source changes', () => {
  assert.match(workflow, /^on:\s*\n\s*workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^on:\s*\n\s*push:/m);
  assert.match(workflow, /rollout:\s*\n[\s\S]*default:\s*"pilot"/);
  assert.match(workflow, /Hard stop unless new APK and current OTA baseline have same signing certificate/);
  assert.match(workflow, /apksigner/);
  assert.match(workflow, /expected|sha256|SHA/i);
});

test('GPS is opt-in, permission-gated, user-stoppable and does not request background location', () => {
  assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/);
  assert.match(manifest, /android\.permission\.FOREGROUND_SERVICE_LOCATION/);
  assert.match(manifest, /android:foregroundServiceType="location"/);
  assert.doesNotMatch(manifest, /ACCESS_BACKGROUND_LOCATION/);
  assert.doesNotMatch(manifest, /RECEIVE_BOOT_COMPLETED/);
  assert.match(gps, /START_NOT_STICKY/);
  assert.match(gps, /ACTION_STOP/);
  assert.match(gps, /Notification\.Builder/);
  assert.match(gps, /GPS leállítása/);
  assert.match(gps, /15, 30, 60/);
  assert.match(activity, /ActivityResultContracts\.RequestMultiplePermissions/);
  assert.match(activity, /SH9 legyen a kezdőoldal: KI/);
  assert.match(activity, /GPS bekapcsolása/);
  assert.match(activity, /GPS leállítása/);
});

test('SH9 native browser uses private browser-owned Microsoft session handoff', () => {
  assert.match(shell, /sh9native=1/);
  assert.match(shell, /sh9external/);
  assert.match(shell, /sh9calendar/);
  assert.match(shell, /Intent\.ACTION_VIEW/);
  assert.match(shell, /getQueryParameter\("sh9external"\) == "calendar"/);
  assert.match(shell, /clearQuery\(\)/);
  assert.doesNotMatch(shell, /addJavascriptInterface/);
  assert.match(shell, /origin != "https:\/\/" \+ HOST/);
  assert.match(shell, /window\.setSoftInputMode/);
});
