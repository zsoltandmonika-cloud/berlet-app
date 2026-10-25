const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.resolve(__dirname, '..', 'app', 'src', 'main', 'java', 'hu', 'zsoltmonika', 'healthhubbridge', name), 'utf8');
const vault = read('DropboxVaultClient.kt');
const activity = read('MainActivity.kt');
const resilient = read('ResilientHealthSync.kt');
const gps = read('Sh9GpsService.kt');
const outbox = read('NativeHealthOutbox.kt');
const scheduled = read('ScheduledSyncWorker.kt');
const orchestrator = read('OrchestratorWorker.kt');

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

test('persistent Dropbox diagnostics never store raw HTTP bodies or OAuth text', () => {
  assert.match(resilient, /putString\(ResilientHealthSync\.KEY_LAST_ERROR, category\)/);
  assert.doesNotMatch(resilient, /putString\(ResilientHealthSync\.KEY_LAST_ERROR, msg\)/);
  assert.match(resilient, /HTTP 429/);
  assert.match(resilient, /Hálózati vagy kapcsolat-időtúllépési hiba/);
});

test('Health Connect snapshots persist atomically before any Dropbox attempt', () => {
  assert.match(outbox, /context\.noBackupFilesDir/);
  assert.match(outbox, /AtomicFile\(file\)/);
  assert.match(outbox, /atomic\.finishWrite\(stream\)/);
  assert.match(outbox, /persist\(context, owner, snapshot\)\s*\n\s*flushLocked/);
  assert.match(outbox, /DropboxVaultClient\.uploadHealthConnectSnapshot\(prefs, owner, payload\)/);
  assert.match(outbox, /check\(file\.delete\(\)\)/);
  assert.match(outbox, /snapshot\.optString\("profile"\) == owner/);
});

test('all native manual/periodic/remote/recovery exports use durable outbox', () => {
  assert.match(activity, /NativeHealthOutbox\.submit\(this@MainActivity, prefs, profile, json\)/);
  assert.match(scheduled, /NativeHealthOutbox\.submit\(applicationContext, prefs, profile, json\)/);
  assert.match(orchestrator, /NativeHealthOutbox\.submit\(applicationContext, prefs, owner, json\)/);
  assert.match(resilient, /NativeHealthOutbox\.submit\(applicationContext, prefs, owner, payload\)/);
  assert.match(resilient, /NativeHealthOutbox\.flush\(applicationContext, prefs, owner\)/);
  assert.match(scheduled, /NativeHealthOutbox\.flush\(applicationContext, prefs, profile\)/);
  assert.match(outbox, /private val gate = Mutex\(\)/);
});
