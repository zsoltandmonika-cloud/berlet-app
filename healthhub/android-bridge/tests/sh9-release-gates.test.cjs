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
  assert.equal(code, 35);
  assert.equal(version, '0.15.8');
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

test('GPS is opt-in, permission-gated, user-stoppable with explicitly optional Always access', () => {
  assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/);
  assert.match(manifest, /android\.permission\.FOREGROUND_SERVICE_LOCATION/);
  assert.match(manifest, /android:foregroundServiceType="location"/);
  assert.match(manifest, /ACCESS_BACKGROUND_LOCATION/);
  assert.match(activity, /openBackgroundLocationSettings\(\)/);
  assert.match(activity, /ACTION_APPLICATION_DETAILS_SETTINGS/);
  assert.match(activity, /Mindig engedélyezett/);
  assert.match(activity, /gpsBackgroundSummary\.text/);
  assert.doesNotMatch(activity, /sh9GpsPermission\.launch\(arrayOf\([^)]*ACCESS_BACKGROUND_LOCATION/);
  assert.match(manifest, /RECEIVE_BOOT_COMPLETED/);
  assert.match(manifest, /GuardianBootReceiver/);
  assert.match(gps, /START_NOT_STICKY/);
  assert.match(gps, /ACTION_STOP/);
  assert.match(gps, /Notification\.Builder/);
  assert.match(gps, /GPS leállítása/);
  assert.match(gps, /15, 30, 60/);
  assert.match(activity, /ActivityResultContracts\.RequestMultiplePermissions/);
  assert.match(activity, /app icon opens the LIVE SH9 launcher/);
  assert.doesNotMatch(activity, /prefs.getBoolean\(SH9_START_DEFAULT/);
  assert.match(activity, /GPS bekapcsolása/);
  assert.match(activity, /GPS leállítása/);
});

test('SH9 native browser opens HH One settings in the SAME signed package without an SH9 loop',()=>{
  assert.match(manifest, /android:scheme="healthhubconnect" android:host="settings"/);
  assert.match(shell,/request\.isForMainFrame && u\.scheme == "healthhubconnect"/);
  assert.match(shell,/u\.host == "settings"/);
  assert.match(shell,/source\.host == HOST/);
  assert.match(shell,/Intent\(this@Sh9WebActivity, MainActivity::class\.java\)/);
  assert.match(shell,/FLAG_ACTIVITY_REORDER_TO_FRONT/);
  assert.match(shell,/finish\(\)/);
  assert.match(activity,/intent\?\.getBooleanExtra\("openNativeSettings", false\) != true/);
  assert.match(activity,/intent\?\.data == null/);
  assert.match(activity,/"settings" ->/);
  assert.doesNotMatch(shell,/addJavascriptInterface/);
});

test('one-tap SH9 startup and safe automatic signed OTA notifications',()=>{
  const updates=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/OtaUpdateManager.kt');
  assert.match(activity,/startActivity\(Intent\(this, Sh9WebActivity::class.java\)\)/);
  assert.match(activity,/intent\?\.getBooleanExtra\("openNativeSettings", false\) != true/);
  assert.match(updates,/PeriodicWorkRequestBuilder<OtaCheckWorker>\(6, TimeUnit.HOURS\)/);
  assert.match(updates,/ExistingPeriodicWorkPolicy.UPDATE/);
  assert.match(updates,/putExtra\("openNativeSettings", true\)/);
  assert.match(activity,/OtaUpdateManager.notifyAvailable\(this@MainActivity, found\)/);
  assert.doesNotMatch(updates,/ACTION_INSTALL_PACKAGE|REQUEST_DELETE_PACKAGES/);
});

test('SH9 native browser uses private browser-owned Microsoft session handoff', () => {
  assert.match(shell, /sh9native=1/);
  assert.match(shell, /WebSettings.LOAD_NO_CACHE/);
  assert.match(shell, /hhfresh=/);
  assert.match(shell, /sh9external/);
  assert.match(shell, /sh9calendar/);
  assert.match(shell, /Intent\.ACTION_VIEW/);
  assert.match(shell, /getQueryParameter\("sh9external"\) == "calendar"/);
  assert.match(shell, /clearQuery\(\)/);
  assert.doesNotMatch(shell, /addJavascriptInterface/);
  assert.match(shell, /origin != "https:\/\/" \+ HOST/);
  assert.match(shell, /window\.setSoftInputMode/);
});

test('Food Scanner requests only first-party Android camera permission and never microphone', () => {
  assert.match(manifest, /android\.permission\.CAMERA/);
  assert.match(manifest, /android:required="false"/);
  assert.match(shell, /override fun onPermissionRequest\(request: PermissionRequest\)/);
  assert.match(shell, /ActivityResultContracts\.RequestPermission\(\)/);
  assert.match(shell, /Manifest\.permission\.CAMERA/);
  assert.match(shell, /request\.resources\.contentEquals\(arrayOf\(PermissionRequest\.RESOURCE_VIDEO_CAPTURE\)\)/);
  assert.match(shell, /request\.grant\(arrayOf\(PermissionRequest\.RESOURCE_VIDEO_CAPTURE\)\)/);
  assert.match(shell, /request\.deny\(\)/);
  assert.match(shell, /trustedPage\(Uri\.parse\(web\?\.url/);
  assert.match(shell, /url\?\.scheme == "https"/);
  assert.match(shell, /url\.host == HOST/);
  assert.match(shell, /url\.path\?\.startsWith\(BASE\)/);
  assert.doesNotMatch(manifest, /RECORD_AUDIO/);
  assert.doesNotMatch(shell, /request\.grant\(request\.resources\)/);
  assert.doesNotMatch(shell, /addJavascriptInterface/);
});

test('Photo upload/capture needs an Android chooser and a dedicated restricted cache provider', () => {
  const paths=read('healthhub/android-bridge/app/src/main/res/xml/healthhub_ota_paths.xml');
  assert.match(shell,/override fun onShowFileChooser/);
  assert.match(shell,/ActivityResultContracts\.StartActivityForResult/);
  assert.match(shell,/fileResult\.launch\(params\.createIntent\(\)/);
  assert.match(shell,/FileProvider\.getUriForFile/);
  assert.match(shell,/MediaStore\.ACTION_IMAGE_CAPTURE/);
  assert.match(shell,/Intent\.FLAG_GRANT_WRITE_URI_PERMISSION/);
  assert.match(shell,/it\.scheme == "content"/);
  assert.match(shell,/it\.authority != packageName \+ "\.ota"/);
  assert.match(shell,/finishFileRequest\(null\)/);
  assert.match(paths,/path="web-camera\/"/);
  assert.match(paths,/path="ota\/"/);
  assert.doesNotMatch(shell,/allowFileAccess = true/);
  assert.doesNotMatch(shell,/allowUniversalAccessFromFileURLs = true/);
});

test('Family Battery Safety is separately approved, revocable, and never starts or uploads GPS',()=>{
  const relay=read('healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/FamilyGuardNativeRelay.kt');
  assert.match(relay,/KEY_BATTERY_SHARE = "family_guard_battery_share_v842"/);
  assert.match(relay,/fun batteryEnabled\(context: Context\): Boolean/);
  assert.match(relay,/enabled\(context\) && prefs\(context\)\.getBoolean\(KEY_BATTERY_SHARE, false\)/);
  assert.match(relay,/fun setBatterySharing\(context: Context, granted: Boolean\): Boolean/);
  assert.match(relay,/if \(granted && !enabled\(context\)\) return false/);
  assert.match(relay,/if \(batteryEnabled\(app\)\) try/);
  assert.match(relay,/if \(!batteryEnabled\(app\)\) \{/);
  assert.match(relay,/finalPayload\.put\("battery_pct", JSONObject\.NULL\)/);
  assert.match(relay,/\.putBoolean\(KEY_BATTERY_SHARE, false\)/);
  assert.match(activity,/private fun toggleBatterySharing\(\)/);
  assert.match(activity,/Family Battery Safety · külön hozzájárulás/);
  assert.match(activity,/Kifejezetten engedélyezem/);
  assert.match(activity,/Akkumulátormegosztás KI/);
  assert.match(activity,/FamilyGuardNativeRelay\.setBatterySharing\(this, false\)/);
  assert.match(activity,/FamilyGuardNativeRelay\.setBatterySharing\(this, true\)/);
  assert.match(activity,/root\.addView\(familyBatteryButton\)/);
  assert.doesNotMatch(relay,/requestPermissions|getCurrentLocation|startForegroundService/);
});
