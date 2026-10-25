const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.resolve(__dirname, '..', 'app', 'src', 'main', 'java', 'hu', 'zsoltmonika', 'healthhubbridge', name), 'utf8');
const vault = read('DropboxVaultClient.kt');
const activity = read('MainActivity.kt');
const resilient = read('ResilientHealthSync.kt');
const gps = read('Sh9GpsService.kt');

test('Dropbox marker migration does not silently delete grants', () => {
  const method = vault.match(/fun ensureCredentialVersion\([\s\S]*?\n    }/);
  assert.ok(method);
  assert.match(method[0], /marker\.isNullOrBlank\(\)/);
  assert.doesNotMatch(method[0], /remove\("dropbox_refresh_token"\)/);
  assert.doesNotMatch(method[0], /remove\("dropbox_access_token"\)/);
  assert.match(method[0], /error\("Dropbox OAuth/);
});

test('native Dropbox token refresh uses a serialized single authority', () => {
  assert.match(vault, /private val tokenRefreshLock = Mutex\(\)/);
  assert.match(vault, /return tokenRefreshLock\.withLock/);
  assert.match(activity, /private suspend fun getAccessToken\(\): String = DropboxVaultClient\.accessToken\(prefs\)/);
});

test('offline worker still uses Android network constraints and retry', () => {
  assert.match(resilient, /NetworkType\.CONNECTED/);
  assert.match(resilient, /BackoffPolicy\.EXPONENTIAL/);
  assert.match(resilient, /Result\.retry\(\)/);
});

test('native GPS is opt-in and not a background Family Guard publisher', () => {
  assert.match(gps, /START_NOT_STICKY/);
  assert.match(gps, /GPS leállítása/);
  assert.doesNotMatch(gps, /hh_guardian_live_locations|publishLocation|uploadLocation/);
});
