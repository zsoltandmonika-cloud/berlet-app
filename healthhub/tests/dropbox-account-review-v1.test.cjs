'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const get = p => fs.readFileSync(path.join(root, p), 'utf8');
const native = 'android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/';
const worker = get(native + 'OrchestratorWorker.kt');
const note = get(native + 'DropboxAccountReviewNotification.kt');
const main = get(native + 'MainActivity.kt');
const admin = get('live-v305.js');
const manifest = get('android-bridge/app/src/main/AndroidManifest.xml');
const build = get('android-bridge/app/build.gradle.kts');

test('request is owner-bound, explicitly consented, expiring and never a background Dropbox switch', () => {
  assert.match(worker, /requestedOwner != owner/);
  assert.match(worker, /cmd\.optString\("targetDeviceId"\) != id/);
  assert.match(worker, /"dropbox_account_review" in actionScopes/);
  assert.match(worker, /actionScopes\.size != 1/);
  assert.match(worker, /deadline\.isAfter\(issued\.plusSeconds\(3600\)\)/);
  assert.match(worker, /OneRemoteAdmin\.consent\(prefs\)/);
  assert.match(worker, /review\.length\(\) != 1/);
  assert.match(worker, /DropboxAccountMatch\.validExpected\(suffix\)/);
  assert.match(worker, /DropboxAccountReviewNotification\.request/);
  assert.match(worker, /"queued"/);
  assert.doesNotMatch(worker, /startDropboxAuth\(/);
});

test('notification is explicit, one-time and protected against exported-activity Intent forgery', () => {
  assert.match(note, /KEY_PENDING/);
  assert.match(note, /getSharedPreferences\(SyncScheduler\.PREFS/);
  assert.match(note, /fun consume\(context: Context, intent: Intent\?\)/);
  assert.match(note, /saved\.optString\("id"\) != id/);
  assert.match(note, /saved\.optString\("suffix"\) != suffix/);
  assert.match(note, /saved\.optString\("expiresAt"\) != expiryText/);
  assert.match(note, /prefs\.edit\(\)\.remove\(KEY_PENDING\)/);
  assert.match(note, /expiry\.isAfter\(Instant\.now\(\)\)/);
  assert.match(note, /POST_NOTIFICATIONS/);
  assert.match(note, /PendingIntent\.FLAG_IMMUTABLE/);
  assert.doesNotMatch(note, /startDropboxAuth|oauth2\/authorize|refresh_token|setInterval/);
});

test('phone displays simple Hungarian instructions and starts OAuth only on an owner button press', () => {
  const start = main.indexOf('private fun showDropboxAccountReviewRequest(');
  const end = main.indexOf('private fun openBackgroundLocationSettings()', start);
  assert.ok(start >= 0 && end > start);
  const flow = main.slice(start, end);
  assert.match(flow, /DropboxAccountReviewNotification\.consume\(this, request\)/);
  assert.match(flow, /OneRemoteAdmin\.consent\(prefs\)/);
  assert.match(flow, /deviceOwnerProfile\(\)/);
  assert.match(flow, /alreadyConnected/);
  assert.match(flow, /A beállításaid változatlanok/);
  assert.match(flow, /válaszd a közös Outlook-fiókot/);
  assert.match(flow, /Most nem/);
  assert.match(flow, /Folytatom/);
  assert.ok(flow.indexOf('setPositiveButton("Folytatom")') <
    flow.indexOf('startDropboxAuth(owner, targetSuffix)'));
  assert.match(flow, /deviceOwnerProfile\(\) == owner && OneRemoteAdmin\.consent\(prefs\)/);
  assert.match(main, /if \(expectedSuffix != null &&\s*!DropboxAccountMatch\.matches\(expectedSuffix, accountId\)/);
  assert.match(main, /A korábbi Dropbox-kapcsolat megmaradt/);
  assert.doesNotMatch(flow, /putString\("dropbox_refresh_token"/);
});

test('web Admin explicitly targets one capable phone and asks before sending', () => {
  assert.match(admin, /option value="dropbox_account_review"/);
  assert.match(admin, /profileScope==='all'\|\|selected\.length!==1/);
  assert.match(admin, /d\.capabilities\.includes\('dropbox_account_review'\)/);
  assert.match(admin, /Number\(d\.buildCode\)<47/);
  assert.match(admin, /window\.prompt\(/);
  assert.match(admin, /window\.confirm\(/);
  assert.match(admin, /targetAccountSuffix=entered\.trim\(\)/);
  assert.match(admin, /cmd\.accountReview=\{targetSuffix:targetAccountSuffix\}/);
  assert.match(admin, /dropbox_account_review'\]\.includes\(scope\)\?40\*60\*1000/);
  assert.match(admin, /eligiblePhone\(d,r,profileScope\)/);
  assert.match(admin, /verifiedPhoneRegistry\(\)/);
});

test('Android pilot stays unsigned until separate release; no new exported service or silent installer', () => {
  assert.match(build, /versionCode = 47/);
  assert.match(build, /versionName = "0\.15\.20"/);
  assert.doesNotMatch(manifest, /\.DropboxAccountReviewNotification/);
  assert.doesNotMatch(note, /PackageInstaller|requestPermissions|AccessibilityService/);
});
