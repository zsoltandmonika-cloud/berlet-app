'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..', '..');
const native = fs.readFileSync(path.join(root,
  'healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/DropboxVaultClient.kt'),'utf8');
const activity = fs.readFileSync(path.join(root,
  'healthhub/android-bridge/app/src/main/java/hu/zsoltmonika/healthhubbridge/MainActivity.kt'),'utf8');
const build = fs.readFileSync(path.join(root,
  'healthhub/android-bridge/app/build.gradle.kts'),'utf8');
const ota = JSON.parse(fs.readFileSync(path.join(root,'healthhub/data/bridge-ota.json'),'utf8'));

test('native Dropbox folder existence does not demand a scope the legacy login lacks',()=>{
  const folder = native.split('suspend fun ensureFolder(')[1].split('suspend fun uploadText(')[0];
  assert.ok(folder);
  assert.match(folder,/files\/create_folder_v2/);
  assert.match(folder,/existingFolderConflict\(response\)/);
  assert.doesNotMatch(folder,/files\/get_metadata/,'native folder check must not require files.metadata.read');
  assert.match(activity,/files\.metadata\.write files\.content\.read files\.content\.write/);
  assert.doesNotMatch(activity,/appendQueryParameter\("scope",\s*"[^"]*files\.metadata\.read/);
});

test('Dropbox 409 is accepted ONLY for an existing folder, never a file or unrelated conflict',()=>{
  const parser=native.split('internal fun existingFolderConflict(')[1].split('suspend fun uploadText(')[0];
  assert.match(parser,/getJSONObject\("error"\)/);
  assert.match(parser,/optString\("\.tag"\) == "path"/);
  assert.match(parser,/optJSONObject\("path"\)\?\.optString\("\.tag"\) == "conflict"/);
  assert.match(parser,/optJSONObject\("conflict"\)\?\.optString\("\.tag"\) == "folder"/);
  assert.match(parser,/catch \(_:\s*Exception\) \{ false \}/);
  assert.match(native,/if \(http == 409 && existingFolderConflict\(response\)\)/);
  assert.doesNotMatch(parser,/contains\("folder"\)/);
});

test('scope repair is non-destructive and cannot silently deploy an unsigned OTA',()=>{
  const folder=native.split('suspend fun ensureFolder(')[1].split('suspend fun uploadText(')[0];
  assert.doesNotMatch(folder,/\.remove\("dropbox_|clearToken|launch.*OAuth|\.remove\("device_owner_profile"/);
  assert.match(build,/applicationId = "hu\.zsoltmonika\.healthhubbridge"/);
  assert.match(build,/versionCode = 28/);
  assert.match(build,/versionName = "0\.15\.1"/);
  assert.equal(ota.version,'0.15.0');
  assert.equal(ota.versionCode,27);
});
